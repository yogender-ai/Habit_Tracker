import html
import json
import os
import re
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
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

PRIORITIES = {"low", "medium", "high"}
DAY_STATUSES = {"neutral", "won", "missed"}
REMINDER_CATEGORIES = {"focus", "meeting", "contest", "health", "recovery", "learning", "personal"}


def utc_now():
    return datetime.now(timezone.utc)


class DayEntry(Base):
    __tablename__ = "day_entries"

    user_id = Column(String(160), primary_key=True)
    date_key = Column(String(10), primary_key=True)
    payload = Column(JSON, nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class UserDocument(Base):
    __tablename__ = "user_documents"

    user_id = Column(String(160), primary_key=True)
    doc_key = Column(String(60), primary_key=True)
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

    def read_workspace(self, user_id):
        merged = None
        stores = []

        for store in self.stores:
            try:
                with store.session_factory() as session:
                    row = session.get(UserDocument, (user_id, "workspace"))
                    if row:
                        workspace = normalize_workspace(row.payload)
                        workspace["updatedAt"] = workspace.get("updatedAt") or row.updated_at.isoformat()
                        if merged is None or parse_updated_at(workspace) >= parse_updated_at(merged):
                            merged = workspace
                stores.append({"name": store.name, "ok": True})
            except SQLAlchemyError as exc:
                stores.append({"name": store.name, "ok": False, "error": str(exc.__class__.__name__)})

        return normalize_workspace(merged or {}), stores

    def put_workspace(self, user_id, workspace):
        errors = []
        stamped_workspace = normalize_workspace(workspace)
        stamped_workspace["updatedAt"] = utc_now().isoformat()

        for store in self.stores:
            try:
                with store.session_factory.begin() as session:
                    entry = session.get(UserDocument, (user_id, "workspace"))
                    if entry is None:
                        session.add(UserDocument(
                            user_id=user_id,
                            doc_key="workspace",
                            payload=stamped_workspace,
                            updated_at=utc_now(),
                        ))
                    else:
                        entry.payload = stamped_workspace
                        entry.updated_at = utc_now()
                return store.name, stamped_workspace
            except SQLAlchemyError as exc:
                errors.append(f"{store.name}: {exc.__class__.__name__}")

        raise RuntimeError("; ".join(errors) or "all stores failed")

    def list_workspaces(self):
        seen = set()
        workspaces = []

        for store in self.stores:
            try:
                with store.session_factory() as session:
                    rows = session.execute(
                        select(UserDocument).where(UserDocument.doc_key == "workspace")
                    ).scalars().all()
                    for row in rows:
                        if row.user_id in seen:
                            continue
                        seen.add(row.user_id)
                        workspace = normalize_workspace(row.payload)
                        workspace["updatedAt"] = workspace.get("updatedAt") or row.updated_at.isoformat()
                        workspaces.append({"userId": row.user_id, "workspace": workspace})
                if workspaces:
                    return workspaces
            except SQLAlchemyError as exc:
                print(f"[storage] list_workspaces failed on {store.name}: {exc}")

        return workspaces

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


class ResendClient:
    def __init__(self):
        self.api_key = os.getenv("RESEND_API_KEY", "").strip()
        self.from_email = os.getenv("RESEND_FROM_EMAIL", "").strip()
        self.reply_to = os.getenv("RESEND_REPLY_TO", "").strip()

    @property
    def configured(self):
        return bool(self.api_key and self.from_email)

    def send_email(self, to_email, subject, html_body):
        if not self.configured:
            raise RuntimeError("Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.")

        payload = {
            "from": self.from_email,
            "to": [to_email],
            "subject": subject[:180],
            "html": html_body,
        }
        if self.reply_to:
            payload["reply_to"] = self.reply_to

        request = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "DayForge/2.0",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else {"ok": True}
        except urllib.error.HTTPError as exc:
            details = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Resend rejected the email: {details}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Resend request failed: {exc.reason}") from exc


def normalize_database_url(url):
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def parse_updated_at(payload):
    value = (payload or {}).get("updatedAt") or ""
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.fromtimestamp(0, timezone.utc)


def clean_text(value, limit=120):
    return str(value or "").strip()[:limit]


def clean_id(value):
    raw = clean_text(value, 80)
    if raw:
        return re.sub(r"[^a-zA-Z0-9:_.-]", "", raw)[:80] or os.urandom(8).hex()
    return os.urandom(8).hex()


def clean_date(value):
    value = clean_text(value, 10)
    if re.match(r"^\d{4}-\d{2}-\d{2}$", value or ""):
        try:
            datetime.strptime(value, "%Y-%m-%d")
            return value
        except ValueError:
            return ""
    return ""


def clean_time(value, fallback="09:00"):
    value = clean_text(value, 5)
    if re.match(r"^\d{2}:\d{2}$", value or ""):
        hour, minute = value.split(":")
        if 0 <= int(hour) <= 23 and 0 <= int(minute) <= 59:
            return value
    return fallback


def clamp_number(value, minimum, maximum, fallback):
    try:
        number = int(value)
    except (TypeError, ValueError):
        return fallback
    return max(minimum, min(maximum, number))


def safe_list(value, limit=12):
    if not isinstance(value, list):
        return []
    cleaned = []
    for item in value[:limit]:
        text_value = clean_text(item, 140)
        if text_value:
            cleaned.append(text_value)
    return cleaned


def safe_timezone(name):
    requested = clean_text(name, 80) or os.getenv("APP_TIMEZONE", "Asia/Kolkata")
    try:
        ZoneInfo(requested)
        return requested
    except Exception:
        return "UTC"


def normalize_day(date_key, payload):
    payload = payload if isinstance(payload, dict) else {}
    status = payload.get("status") if payload.get("status") in DAY_STATUSES else "neutral"
    tasks = []

    for task in payload.get("tasks", [])[:100]:
        if not isinstance(task, dict):
            continue
        title = clean_text(task.get("title") or task.get("text"), 110)
        if not title:
            continue
        priority = task.get("priority") if task.get("priority") in PRIORITIES else "medium"
        tasks.append({
            "id": clean_id(task.get("id")),
            "title": title,
            "text": title,
            "done": bool(task.get("done")),
            "priority": priority,
            "goalId": clean_text(task.get("goalId"), 80),
            "habitId": clean_text(task.get("habitId"), 80),
            "estimateMins": clamp_number(task.get("estimateMins"), 5, 480, 25),
            "createdAt": clean_text(task.get("createdAt") or utc_now().isoformat(), 40),
            "completedAt": clean_text(task.get("completedAt"), 40) if task.get("completedAt") else None,
        })

    habit_checks = {}
    if isinstance(payload.get("habitChecks"), dict):
        for key, value in payload.get("habitChecks", {}).items():
            habit_id = clean_text(key, 80)
            if habit_id:
                habit_checks[habit_id] = bool(value)

    focus_line = clean_text(payload.get("focusLine") or payload.get("motivation"), 180)

    return {
        "dateKey": date_key,
        "status": status,
        "focusLine": focus_line,
        "motivation": focus_line,
        "mood": clamp_number(payload.get("mood"), 1, 5, 3),
        "energy": clamp_number(payload.get("energy"), 1, 5, 3),
        "urge": clamp_number(payload.get("urge"), 0, 10, 0),
        "relapse": bool(payload.get("relapse")),
        "gratitude": clean_text(payload.get("gratitude"), 220),
        "reflection": clean_text(payload.get("reflection"), 700),
        "habitChecks": habit_checks,
        "tasks": tasks,
        "updatedAt": clean_text(payload.get("updatedAt") or utc_now().isoformat(), 40),
    }


def normalize_goal(goal):
    title = clean_text(goal.get("title"), 90)
    if not title:
        return None
    status = goal.get("status") if goal.get("status") in {"active", "paused", "completed"} else "active"
    return {
        "id": clean_id(goal.get("id")),
        "title": title,
        "why": clean_text(goal.get("why"), 220),
        "targetDate": clean_date(goal.get("targetDate")),
        "status": status,
        "skill": clean_text(goal.get("skill"), 80),
        "color": clean_text(goal.get("color"), 24) or "mint",
        "createdAt": clean_text(goal.get("createdAt") or utc_now().isoformat(), 40),
    }


def normalize_habit(habit):
    title = clean_text(habit.get("title"), 90)
    if not title:
        return None
    return {
        "id": clean_id(habit.get("id")),
        "title": title,
        "category": clean_text(habit.get("category"), 40) or "focus",
        "goalId": clean_text(habit.get("goalId"), 80),
        "targetPerWeek": clamp_number(habit.get("targetPerWeek"), 1, 7, 5),
        "active": habit.get("active", True) is not False,
        "createdAt": clean_text(habit.get("createdAt") or utc_now().isoformat(), 40),
    }


def normalize_reminder(reminder):
    title = clean_text(reminder.get("title"), 120)
    if not title:
        return None
    category = reminder.get("category") if reminder.get("category") in REMINDER_CATEGORIES else "focus"
    return {
        "id": clean_id(reminder.get("id")),
        "title": title,
        "notes": clean_text(reminder.get("notes"), 400),
        "date": clean_date(reminder.get("date")) or today_key(),
        "time": clean_time(reminder.get("time"), "09:00"),
        "category": category,
        "goalId": clean_text(reminder.get("goalId"), 80),
        "notify": reminder.get("notify", True) is not False,
        "done": bool(reminder.get("done")),
        "lastNotifiedKey": clean_text(reminder.get("lastNotifiedKey"), 40),
        "createdAt": clean_text(reminder.get("createdAt") or utc_now().isoformat(), 40),
        "updatedAt": clean_text(reminder.get("updatedAt") or utc_now().isoformat(), 40),
    }


def normalize_workspace(payload):
    payload = payload if isinstance(payload, dict) else {}
    profile = payload.get("profile") if isinstance(payload.get("profile"), dict) else {}
    recovery = payload.get("recovery") if isinstance(payload.get("recovery"), dict) else {}
    settings = payload.get("notificationSettings") if isinstance(payload.get("notificationSettings"), dict) else {}

    goals = []
    for goal in payload.get("goals", [])[:24]:
        if isinstance(goal, dict):
            normalized = normalize_goal(goal)
            if normalized:
                goals.append(normalized)

    habits = []
    for habit in payload.get("habits", [])[:40]:
        if isinstance(habit, dict):
            normalized = normalize_habit(habit)
            if normalized:
                habits.append(normalized)

    reminders = []
    for reminder in payload.get("reminders", [])[:180]:
        if isinstance(reminder, dict):
            normalized = normalize_reminder(reminder)
            if normalized:
                reminders.append(normalized)

    return {
        "profile": {
            "displayName": clean_text(profile.get("displayName"), 80),
            "mission": clean_text(profile.get("mission"), 180),
            "identity": clean_text(profile.get("identity"), 160) or "I am the kind of person who keeps promises to myself.",
            "welcomeEmailSentAt": clean_text(profile.get("welcomeEmailSentAt"), 40),
        },
        "recovery": {
            "addictionName": clean_text(recovery.get("addictionName"), 60) or "porn",
            "why": clean_text(recovery.get("why"), 300),
            "triggers": safe_list(recovery.get("triggers"), 10),
            "rescuePlan": safe_list(recovery.get("rescuePlan"), 10),
        },
        "goals": goals,
        "habits": habits,
        "reminders": reminders,
        "notificationSettings": {
            "enabled": bool(settings.get("enabled")),
            "email": clean_text(settings.get("email"), 180),
            "timezone": safe_timezone(settings.get("timezone")),
            "morningDigest": settings.get("morningDigest", True) is not False,
            "morningTime": clean_time(settings.get("morningTime"), "07:30"),
            "eveningReview": settings.get("eveningReview", True) is not False,
            "eveningTime": clean_time(settings.get("eveningTime"), "21:30"),
            "relapseShield": settings.get("relapseShield", True) is not False,
            "relapseShieldTime": clean_time(settings.get("relapseShieldTime"), "22:45"),
            "lastMorningDigestKey": clean_text(settings.get("lastMorningDigestKey"), 20),
            "lastEveningReviewKey": clean_text(settings.get("lastEveningReviewKey"), 20),
            "lastRelapseShieldKey": clean_text(settings.get("lastRelapseShieldKey"), 20),
        },
        "updatedAt": clean_text(payload.get("updatedAt") or utc_now().isoformat(), 40),
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


def notification_html(title, intro, lines):
    clean_lines = [line for line in lines if line]
    line_html = "".join(
        f"""
        <tr>
          <td style="width:34px;padding:0 0 12px 0;vertical-align:top">
            <div style="width:24px;height:24px;border-radius:999px;background:#efe8ff;color:#6d45d8;text-align:center;line-height:24px;font-size:12px;font-weight:800">{index}</div>
          </td>
          <td style="padding:2px 0 12px 0;color:#2f3440;font-size:14px;line-height:1.55;font-weight:600">{html.escape(line)}</td>
        </tr>
        """
        for index, line in enumerate(clean_lines, start=1)
    )
    app_url = clean_text(os.getenv("APP_PUBLIC_URL") or os.getenv("PUBLIC_APP_URL"), 240)
    cta_html = ""
    if app_url:
        cta_html = f"""
        <tr>
          <td style="padding:8px 0 4px 0">
            <a href="{html.escape(app_url, quote=True)}" style="display:inline-block;background:#7c5cff;color:#ffffff;text-decoration:none;border-radius:10px;padding:13px 18px;font-size:14px;font-weight:800">Open DayForge</a>
          </td>
        </tr>
        """

    preview = html.escape(f"{title}. {intro}"[:140])
    return f"""
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#f3f0ea;font-family:Inter,Arial,sans-serif;color:#111827">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">{preview}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f0ea;padding:32px 16px">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:660px;background:#ffffff;border:1px solid #ded7ca;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(31,35,48,0.10)">
                <tr>
                  <td style="background:#11131c;padding:28px 30px">
                    <div style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#b9a7ff;font-weight:900">DayForge</div>
                    <div style="margin-top:12px;font-size:30px;line-height:1.15;color:#ffffff;font-weight:900">{html.escape(title)}</div>
                    <div style="margin-top:12px;max-width:540px;color:#d9d6e8;font-size:15px;line-height:1.65">{html.escape(intro)}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 30px 26px 30px">
                    <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#7c5cff;font-weight:900;margin-bottom:14px">Your next moves</div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">{line_html}</table>
                    <table role="presentation" cellspacing="0" cellpadding="0">{cta_html}</table>
                  </td>
                </tr>
                <tr>
                  <td style="background:#faf8f4;border-top:1px solid #eee7dc;padding:18px 30px;color:#747988;font-size:12px;line-height:1.5">
                    Keep it small. Mark it honestly. Come back tomorrow.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """


def local_dt_for(settings):
    timezone_name = settings.get("timezone") or os.getenv("APP_TIMEZONE", "Asia/Kolkata")
    try:
        tz = ZoneInfo(timezone_name)
    except Exception:
        tz = ZoneInfo("UTC")
    return utc_now().astimezone(tz)


def is_due_time(local_now, hhmm, window_minutes):
    scheduled = datetime.strptime(f"{local_now.date().isoformat()} {hhmm}", "%Y-%m-%d %H:%M")
    scheduled = scheduled.replace(tzinfo=local_now.tzinfo)
    return scheduled <= local_now <= scheduled + timedelta(minutes=window_minutes)


def reminder_is_due(local_now, reminder, window_minutes):
    if reminder.get("done") or not reminder.get("notify"):
        return False
    if reminder.get("date") != local_now.date().isoformat():
        return False
    scheduled = datetime.strptime(f"{reminder['date']} {reminder['time']}", "%Y-%m-%d %H:%M")
    scheduled = scheduled.replace(tzinfo=local_now.tzinfo)
    return scheduled <= local_now <= scheduled + timedelta(minutes=window_minutes)


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
resend = ResendClient()

app = FastAPI(title="DayForge API", version="2.0.0")
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


def require_cron_secret(x_cron_secret: str):
    configured = os.getenv("NOTIFICATION_CRON_SECRET", "").strip()
    if configured and x_cron_secret != configured:
        raise HTTPException(status_code=401, detail="Invalid notification cron secret.")
    if RUNNING_ON_RENDER and not configured:
        raise HTTPException(status_code=400, detail="Set NOTIFICATION_CRON_SECRET before enabling scheduled sends.")


@app.get("/health")
async def health():
    checks = storage.health()
    return {
        "ok": any(check["ok"] for check in checks),
        "firebaseReady": FIREBASE_READY,
        "devAuthAllowed": ALLOW_DEV_AUTH,
        "today": today_key(),
        "stores": checks,
        "notifications": {
            "resendConfigured": resend.configured,
            "cronSecretConfigured": bool(os.getenv("NOTIFICATION_CRON_SECRET", "").strip()),
        },
    }


@app.get("/api/snapshot")
async def snapshot(year: str = Query(default_factory=lambda: str(datetime.now().year)), user=Depends(require_user)):
    if not re.match(r"^\d{4}$", year):
        raise HTTPException(status_code=400, detail="Invalid year.")

    days, day_stores = storage.read_year(user["uid"], year)
    workspace, workspace_stores = storage.read_workspace(user["uid"])
    primary_store = next((store["name"] for store in day_stores + workspace_stores if store.get("ok")), None)
    return {
        "days": days,
        "workspace": workspace,
        "primaryStore": primary_store,
        "stores": day_stores,
        "workspaceStores": workspace_stores,
        "user": {"uid": user["uid"], "email": user.get("email", ""), "name": user.get("name", "")},
        "today": today_key(),
        "notifications": {"resendConfigured": resend.configured},
    }


@app.put("/api/days/{date_key}")
async def put_day(date_key: str, request: Request, user=Depends(require_user)):
    validate_date_key(date_key)
    body = await request.json()
    day = normalize_day(date_key, body.get("day") or {})

    try:
        store_name, saved_day = storage.put_day(user["uid"], date_key, day)
    except RuntimeError as exc:
        return JSONResponse(
            status_code=503,
            content={"error": "All configured databases rejected the day write.", "details": str(exc)},
        )

    return {"day": saved_day, "store": store_name}


@app.put("/api/workspace")
async def put_workspace(request: Request, user=Depends(require_user)):
    body = await request.json()
    workspace = normalize_workspace(body.get("workspace") or body)

    try:
        store_name, saved_workspace = storage.put_workspace(user["uid"], workspace)
    except RuntimeError as exc:
        return JSONResponse(
            status_code=503,
            content={"error": "All configured databases rejected the workspace write.", "details": str(exc)},
        )

    return {"workspace": saved_workspace, "store": store_name}


@app.post("/api/notifications/test")
async def send_test_notification(request: Request, user=Depends(require_user)):
    body = await request.json()
    workspace, _ = storage.read_workspace(user["uid"])
    settings = workspace.get("notificationSettings", {})
    to_email = clean_text(body.get("email") or settings.get("email") or user.get("email"), 180)

    if not to_email:
        raise HTTPException(status_code=400, detail="Add an email address before sending a test.")

    try:
        result = resend.send_email(
            to_email,
            "DayForge test reminder",
            notification_html(
                "Your DayForge notification channel is ready",
                "This is your reminder system checking in. Use it for meetings, contests, focus blocks, and recovery guardrails.",
                [
                    "Plan the next action before motivation fades.",
                    "Protect your streak with one clean decision at a time.",
                    "Use the panic plan when urges spike; no shame, just action.",
                ],
            ),
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {"ok": True, "provider": "resend", "result": result}


@app.post("/api/notifications/welcome")
async def send_welcome_notification(request: Request, user=Depends(require_user)):
    body = await request.json()
    workspace, _ = storage.read_workspace(user["uid"])
    profile = workspace.get("profile", {})
    settings = workspace.get("notificationSettings", {})
    to_email = clean_text(body.get("email") or settings.get("email") or user.get("email"), 180)
    display_name = clean_text(body.get("displayName") or user.get("name") or profile.get("displayName") or "Warrior", 80)

    if not to_email:
        raise HTTPException(status_code=400, detail="No email address is available for the welcome email.")

    if profile.get("welcomeEmailSentAt"):
        return {"ok": True, "alreadySent": True, "sentAt": profile.get("welcomeEmailSentAt")}

    try:
        result = resend.send_email(
            to_email,
            "Your DayForge dashboard is ready",
            notification_html(
                f"Welcome, {display_name}",
                "Your habit dashboard is ready. Start with one honest mark today, then let the month show you the momentum you are building.",
                [
                    "Keep your habit list simple enough that you can actually show up every day.",
                    "Open today's date and mark only what you truly completed.",
                    "Use the streak and heatmap as feedback, not pressure. The goal is consistency.",
                ],
            ),
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    profile["displayName"] = profile.get("displayName") or display_name
    profile["welcomeEmailSentAt"] = utc_now().isoformat()
    settings["email"] = settings.get("email") or to_email
    settings["enabled"] = settings.get("enabled", True)
    workspace["profile"] = profile
    workspace["notificationSettings"] = settings

    try:
        storage.put_workspace(user["uid"], workspace)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {"ok": True, "provider": "resend", "result": result, "sentAt": profile["welcomeEmailSentAt"]}


@app.post("/api/notifications/due")
async def send_due_notifications(
    x_cron_secret: str = Header(default=""),
    window_minutes: int = Query(default=20, ge=1, le=120),
):
    require_cron_secret(x_cron_secret)

    sent = 0
    skipped = 0
    failures = []

    for item in storage.list_workspaces():
        user_id = item["userId"]
        workspace = item["workspace"]
        settings = workspace.get("notificationSettings", {})
        email_address = settings.get("email")
        if not settings.get("enabled") or not email_address:
            skipped += 1
            continue

        local_now = local_dt_for(settings)
        date_key = local_now.date().isoformat()
        changed = False

        for reminder in workspace.get("reminders", []):
            notify_key = f"{reminder.get('date')}T{reminder.get('time')}"
            if reminder.get("lastNotifiedKey") == notify_key:
                continue
            if not reminder_is_due(local_now, reminder, window_minutes):
                continue

            try:
                resend.send_email(
                    email_address,
                    f"Reminder: {reminder['title']}",
                    notification_html(
                        reminder["title"],
                        reminder.get("notes") or "This is the thing future-you asked current-you to remember.",
                        [
                            f"Time: {reminder['date']} at {reminder['time']}",
                            f"Category: {reminder.get('category', 'focus')}",
                            "Open DayForge and mark the next step done.",
                        ],
                    ),
                )
                reminder["lastNotifiedKey"] = notify_key
                sent += 1
                changed = True
            except RuntimeError as exc:
                failures.append({"userId": user_id, "error": str(exc)})

        if settings.get("morningDigest") and settings.get("lastMorningDigestKey") != date_key:
            if is_due_time(local_now, settings.get("morningTime", "07:30"), window_minutes):
                due_today = [
                    reminder["title"]
                    for reminder in workspace.get("reminders", [])
                    if reminder.get("date") == date_key and not reminder.get("done")
                ][:5]
                try:
                    resend.send_email(
                        email_address,
                        "DayForge morning launch",
                        notification_html(
                            "Morning launch",
                            "Start with clarity, not chaos. Pick one clean win and move.",
                            due_today or ["Choose the first quest for today.", "Write the trigger you will avoid.", "Protect your attention for the first hour."],
                        ),
                    )
                    settings["lastMorningDigestKey"] = date_key
                    sent += 1
                    changed = True
                except RuntimeError as exc:
                    failures.append({"userId": user_id, "error": str(exc)})

        if settings.get("eveningReview") and settings.get("lastEveningReviewKey") != date_key:
            if is_due_time(local_now, settings.get("eveningTime", "21:30"), window_minutes):
                try:
                    resend.send_email(
                        email_address,
                        "DayForge evening review",
                        notification_html(
                            "Evening review",
                            "Close the loop. Log the truth, take the lesson, and make tomorrow easier.",
                            [
                                "Mark completed quests.",
                                "Record urges honestly without shame.",
                                "Plan one task for tomorrow.",
                            ],
                        ),
                    )
                    settings["lastEveningReviewKey"] = date_key
                    sent += 1
                    changed = True
                except RuntimeError as exc:
                    failures.append({"userId": user_id, "error": str(exc)})

        if settings.get("relapseShield") and settings.get("lastRelapseShieldKey") != date_key:
            if is_due_time(local_now, settings.get("relapseShieldTime", "22:45"), window_minutes):
                plan = workspace.get("recovery", {}).get("rescuePlan", [])
                try:
                    resend.send_email(
                        email_address,
                        "DayForge relapse shield",
                        notification_html(
                            "Relapse shield",
                            "The risky hour is where systems beat willpower. Run the plan now.",
                            plan or ["Put the phone away from bed.", "Leave the room for two minutes.", "Message an accountability friend or start a focus block."],
                        ),
                    )
                    settings["lastRelapseShieldKey"] = date_key
                    sent += 1
                    changed = True
                except RuntimeError as exc:
                    failures.append({"userId": user_id, "error": str(exc)})

        if changed:
            workspace["notificationSettings"] = settings
            try:
                storage.put_workspace(user_id, workspace)
            except RuntimeError as exc:
                failures.append({"userId": user_id, "error": str(exc)})

    return {"ok": not failures, "sent": sent, "skipped": skipped, "failures": failures[:10]}


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
