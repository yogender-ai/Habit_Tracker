# DayForge

DayForge is a gamified habit and task tracker built from the old Momentum prototype. It uses a Vite/npm frontend, Firebase Authentication, a FastAPI backend, and Neon/Postgres storage with primary + fallback database support.

## Stack

- Frontend: Vite, vanilla JS, npm Firebase SDK
- Auth: Firebase Google sign-in
- Backend: FastAPI + SQLAlchemy
- Database: Neon Postgres primary, optional secondary fallback
- Deploy: Vercel frontend, Render backend

## Local Frontend

```bash
npm install
npm run dev
```

Firebase browser config lives in `public/config.js`. Set `apiBaseUrl` after your Render backend is deployed:

```js
window.DAYFORGE_CONFIG = {
  apiBaseUrl: "https://your-render-service.onrender.com",
  firebase: {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    appId: "..."
  },
  appTimezone: "Asia/Kolkata"
};
```

## Local Backend

```bash
pip install -r requirements.txt
uvicorn app:app --reload
```

If no database env vars are set, the backend uses local SQLite for testing.

## Render Env

Set the Neon connection string you gave me as `DATABASE_URL_PRIMARY` in Render, not in committed code. Add `DATABASE_URL_SECONDARY` later when your second Neon database is ready.

```bash
APP_TIMEZONE=Asia/Kolkata
CORS_ORIGINS=https://your-vercel-app.vercel.app
DATABASE_URL_PRIMARY=postgresql://...
DATABASE_URL_SECONDARY=postgresql://...
FIREBASE_PROJECT_ID=news-intel-d1bd3
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
ALLOW_DEV_AUTH=false
```

The API writes to the primary database first. If the primary write fails, it tries the secondary. Reads merge both stores so failover data still appears.

## Vercel

Vercel is configured through `vercel.json`:

- Install: `npm install`
- Build: `npm run build`
- Output: `dist`

## API

- `GET /health`
- `GET /api/snapshot?year=2026`
- `PUT /api/days/<YYYY-MM-DD>`

When Firebase Admin is configured, `/api/*` requires a Firebase bearer token. Past days are locked server-side, and future days can be planned but not scored.
