# DayForge Momentum

DayForge is a recovery and focus dashboard for turning "remove addiction -> focus on goal -> build proof" into a daily game. It has tasks, goals, habit heatmaps, clean streaks, urge logging, recovery rescue plans, awards, calendar reminders, Firebase sign-in, cloud persistence, and Resend email notifications.

## Stack

- Frontend: Vite, vanilla JavaScript, Firebase browser auth
- Backend: FastAPI, SQLAlchemy, Postgres/SQLite
- Database: Neon/Postgres primary with optional secondary fallback
- Notifications: Resend email API
- Deploy: Vercel frontend, Render backend

## Local Frontend

```bash
npm install
npm run dev
```

Set `public/config.js` before using cloud sync from Vercel/local Vite:

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

The frontend always saves to `localStorage` first. If `apiBaseUrl` is empty, it works as a local-only app until the Render API is configured.

## Local Backend

```bash
pip install -r requirements.txt
uvicorn app:app --reload
```

If no database env vars are set, the backend uses local SQLite for testing.

## Render Env Vars

Save these in the Render web service environment:

```bash
APP_TIMEZONE=Asia/Kolkata
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:5173
DATABASE_URL_PRIMARY=postgresql://...
DATABASE_URL_SECONDARY=postgresql://...
FIREBASE_PROJECT_ID=news-intel-d1bd3
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
ALLOW_DEV_AUTH=false

RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=DayForge <noreply@your-verified-domain.com>
RESEND_REPLY_TO=your-email@example.com
NOTIFICATION_CRON_SECRET=use-a-long-random-secret
```

For Resend, `RESEND_FROM_EMAIL` must use a sender/domain verified in Resend. Keep `RESEND_API_KEY` secret.

## Scheduled Notifications

Create a cron job from Render Cron, cron-job.org, GitHub Actions, or any scheduler that calls:

```bash
POST https://your-render-service.onrender.com/api/notifications/due
X-Cron-Secret: your-NOTIFICATION_CRON_SECRET
```

Run it every 10-15 minutes. The backend sends due calendar reminders, morning launch emails, evening reviews, and relapse-shield emails through Resend.

## API

- `GET /health`
- `GET /api/snapshot?year=2026`
- `PUT /api/days/<YYYY-MM-DD>`
- `PUT /api/workspace`
- `POST /api/notifications/test`
- `POST /api/notifications/due`

When Firebase Admin is configured, `/api/*` requires a Firebase bearer token. In local development without Firebase Admin or database env vars, dev auth is allowed automatically.
