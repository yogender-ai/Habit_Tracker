import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import Column, DateTime, JSON, String, create_engine, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import declarative_base, sessionmaker

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth
    from firebase_admin import credentials
except ImportError:
    firebase_admin = None
    firebase_auth = None
    credentials = None


ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
PUBLIC = ROOT / "public"
Base = declarative_base()


def utc_now():
    return datetime.now(timezone.utc)


class DayEntry(Base):
    __tablename__ = "day_entries"

    user_id = Column(String(160), primary_key=True)
    date_key = Column(String(10), primary_key=True)
    payload = Column(JSON, nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


@dataclass
class Store:
    name: str
    url: str
    session_factory: sessionmaker


class StorageHub:
    def __init__(self):
        self.stores = []
        for name, url in self.database_urls():
            try:
                engine = create_engine(
                    normalize_database_url(url),
                    future=True,
                    pool_pre_ping=True,
                    pool_recycle=300,
                    connect_args={"check_same_thread": False} if url.startswith("sqlite") else {},
                )
                Base.metadata.create_all(engine)
                self.stores.append(Store(name, url, sessionmaker(bind=engine, expire_on_commit=False, future=True)))
            except Exception as exc:
                print(f"[storage] {name} unavailable during startup: {exc}")

        if not self.stores:
            raise RuntimeError("No usable database store is configured.")

    def database_urls(self):
        primary = os.getenv("DATABASE_URL_PRIMARY") or os.getenv("DATABASE_URL")
        secondary = os.getenv("DATABASE_URL_SECONDARY") or os.getenv("DATABASE_URL_FALLBACK")

        urls = []
        if primary:
            urls.append(("primary", primary))
        if secondary and secondary != primary:
            urls.append(("secondary", secondary))
        if not urls:
            urls.append(("local-sqlite", f"sqlite:///{ROOT / 'dayforge_local.db'}"))
        return urls

    def read_year(self, user_id, year):
        merged = {}
        stores = []
        prefix = f"{year}-"

        for store in self.stores:
            try:
                with store.session_factory() as session:
                    rows = session.execute(
                        select(DayEntry).where(
                            DayEntry.user_id == user_id,
                            DayEntry.date_key.like(f"{prefix}%"),
                        )
                    ).scalars().all()

                    for row in rows:
                        day = normalize_day(row.date_key, row.payload)
                        day["updatedAt"] = day.get("updatedAt") or row.updated_at.isoformat()
                        current = merged.get(row.date_key)
                        if not current or parse_updated_at(day) >= parse_updated_at(current):
                            merged[row.date_key] = day

                stores.append({"name": store.name, "ok": True})
            except SQLAlchemyError as exc:
                stores.append({"name": store.name, "ok": False, "error": str(exc.__class__.__name__)})

        return merged, stores

    def put_day(self, user_id, date_key, day):
        errors = []
        stamped_day = normalize_day(date_key, day)
        stamped_day["updatedAt"] = utc_now().isoformat()

        for store in self.stores:
            try:
                with store.session_factory.begin() as session:
                    entry = session.get(DayEntry, (user_id, date_key))
                    if entry is None:
                        session.add(DayEntry(
                            user_id=user_id,
                            date_key=date_key,
                            payload=stamped_day,
                            updated_at=utc_now(),
                        ))
                    else:
                        entry.payload = stamped_day
                        entry.updated_at = utc_now()
                return store.name, stamped_day
            except SQLAlchemyError as exc:
                errors.append(f"{store.name}: {exc.__class__.__name__}")

        raise RuntimeError("; ".join(errors) or "all stores failed")

    def health(self):
        checks = []
        for store in self.stores:
            try:
                with store.session_factory() as session:
                    session.execute(text("select 1"))
                checks.append({"name": store.name, "ok": True})
            except SQLAlchemyError as exc:
                checks.append({"name": store.name, "ok": False, "error": str(exc.__class__.__name__)})
        return checks


def normalize_database_url(url):
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def parse_updated_at(day):
    value = day.get("updatedAt") or ""
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.fromtimestamp(0, timezone.utc)


def normalize_day(date_key, payload):
    payload = payload if isinstance(payload, dict) else {}
    status = payload.get("status") if payload.get("status") in {"neutral", "won", "missed"} else "neutral"
    tasks = []

    for task in payload.get("tasks", [])[:80]:
        if not isinstance(task, dict):
            continue
        text_value = str(task.get("text", "")).strip()[:90]
        if not text_value:
            continue
        priority = task.get("priority") if task.get("priority") in {"low", "medium", "high"} else "medium"
        tasks.append({
            "id": str(task.get("id") or os.urandom(8).hex())[:80],
            "text": text_value,
            "done": bool(task.get("done")),
            "priority": priority,
            "createdAt": str(task.get("createdAt") or utc_now().isoformat())[:40],
            "completedAt": str(task.get("completedAt"))[:40] if task.get("completedAt") else None,
        })

    return {
        "dateKey": date_key,
        "status": status,
        "motivation": str(payload.get("motivation", "")).strip()[:120],
        "tasks": tasks,
        "updatedAt": str(payload.get("updatedAt") or utc_now().isoformat())[:40],
    }


def validate_date_key(date_key):
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_key or ""):
        raise HTTPException(status_code=400, detail="Invalid date key. Expected YYYY-MM-DD.")
    try:
        datetime.strptime(date_key, "%Y-%m-%d")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid calendar date.") from exc


def app_timezone():
    name = os.getenv("APP_TIMEZONE", "Asia/Kolkata")
    try:
        return ZoneInfo(name)
    except Exception:
        return ZoneInfo("UTC")


def today_key():
    return datetime.now(app_timezone()).date().isoformat()


def enforce_lock_rules(date_key, day):
    today = today_key()
    if date_key < today:
        raise HTTPException(status_code=423, detail="Past days are locked. Progress cannot be changed.")

    if date_key > today:
        has_done_tasks = any(task.get("done") for task in day.get("tasks", []))
        if day.get("status") != "neutral" or has_done_tasks:
            raise HTTPException(status_code=409, detail="Future days can be planned, not scored.")


def init_firebase():
    if firebase_admin is None:
        return False

    if firebase_admin._apps:
        return True

    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    project_id = os.getenv("FIREBASE_PROJECT_ID")

    try:
        if service_account_json:
            service_account = json.loads(service_account_json)
            cred = credentials.Certificate(service_account)
            firebase_admin.initialize_app(cred, {"projectId": project_id or service_account.get("project_id")})
            return True

        if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            options = {"projectId": project_id} if project_id else None
            firebase_admin.initialize_app(credentials.ApplicationDefault(), options)
            return True
    except Exception as exc:
        print(f"[firebase] initialization failed: {exc}")

    return False


def configured_origins():
    raw = os.getenv("CORS_ORIGINS", "*")
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or ["*"]


FIREBASE_READY = init_firebase()
RUNNING_ON_RENDER = os.getenv("RENDER") == "true" or bool(os.getenv("RENDER_SERVICE_ID"))
HAS_CONFIGURED_DATABASE = bool(
    os.getenv("DATABASE_URL_PRIMARY")
    or os.getenv("DATABASE_URL")
    or os.getenv("DATABASE_URL_SECONDARY")
    or os.getenv("DATABASE_URL_FALLBACK")
)
ALLOW_DEV_AUTH = (
    os.getenv("ALLOW_DEV_AUTH", "false").lower() == "true"
    or (not FIREBASE_READY and not RUNNING_ON_RENDER and not HAS_CONFIGURED_DATABASE)
)
storage = StorageHub()

app = FastAPI(title="DayForge API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})


async def require_user(
    authorization: str = Header(default=""),
    x_demo_user: str = Header(default="local-player"),
):
    if FIREBASE_READY:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing Firebase ID token.")
        token = authorization.replace("Bearer ", "", 1).strip()
        try:
            decoded = firebase_auth.verify_id_token(token)
            return {
                "uid": decoded["uid"],
                "email": decoded.get("email", ""),
                "name": decoded.get("name", ""),
            }
        except Exception as exc:
            raise HTTPException(status_code=401, detail="Invalid Firebase ID token.") from exc

    if ALLOW_DEV_AUTH:
        safe_user = re.sub(r"[^a-zA-Z0-9:_.-]", "", x_demo_user)[:128] or "local-player"
        return {"uid": safe_user, "email": "", "name": "Development user"}

    raise HTTPException(status_code=401, detail="Authentication is not configured.")


@app.get("/health")
async def health():
    checks = storage.health()
    return {
        "ok": any(check["ok"] for check in checks),
        "firebaseReady": FIREBASE_READY,
        "devAuthAllowed": ALLOW_DEV_AUTH,
        "today": today_key(),
        "stores": checks,
    }


@app.get("/api/snapshot")
async def snapshot(year: str = Query(default_factory=lambda: str(datetime.now().year)), user=Depends(require_user)):
    if not re.match(r"^\d{4}$", year):
        raise HTTPException(status_code=400, detail="Invalid year.")

    days, stores = storage.read_year(user["uid"], year)
    primary_store = next((store["name"] for store in stores if store.get("ok")), None)
    return {
        "days": days,
        "primaryStore": primary_store,
        "stores": stores,
        "user": {"uid": user["uid"], "email": user.get("email", "")},
        "today": today_key(),
    }


@app.put("/api/days/{date_key}")
async def put_day(date_key: str, request: Request, user=Depends(require_user)):
    validate_date_key(date_key)
    body = await request.json()
    day = normalize_day(date_key, body.get("day") or {})
    enforce_lock_rules(date_key, day)

    try:
        store_name, saved_day = storage.put_day(user["uid"], date_key, day)
    except RuntimeError as exc:
        return JSONResponse(
            status_code=503,
            content={"error": "All configured databases rejected the write.", "details": str(exc)},
        )

    return {"day": saved_day, "store": store_name}


@app.get("/")
async def index():
    index_file = DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return FileResponse(ROOT / "index.html")


@app.get("/{path:path}")
async def static_file(path: str):
    candidates = [
        DIST / path,
        PUBLIC / path,
        ROOT / path,
    ]
    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return FileResponse(candidate)

    index_file = DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return FileResponse(ROOT / "index.html")
