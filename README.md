# DayForge Momentum

DayForge is a recovery and focus dashboard for turning "remove addiction -> focus on goal -> build proof" into a daily game. It has tasks, goals, habit heatmaps, clean streaks, urge logging, recovery rescue plans, awards, calendar reminders, Firebase sign-in, cloud persistence, and Resend email notifications.

## Stack

- Frontend: Vite, React, Firebase browser auth
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

You can also set the same connection at build time with Vite env vars:

```bash
VITE_API_BASE_URL=https://habit-tracker-9a2o.onrender.com
VITE_APP_TIMEZONE=Asia/Kolkata
```

The frontend always saves to `localStorage` first. In local dev, an empty `apiBaseUrl` points to `http://127.0.0.1:8000`. On Vercel, `vercel.json` proxies `/api/*` and `/health` to the Render backend before falling back to the SPA route.

## Local Backend

```bash
pip install -r requirements.txt
npm run api
```

If no database env vars are set, the backend uses local SQLite for testing.

## Render Env Vars

Save these in the Render web service environment:

```bash
APP_TIMEZONE=Asia/Kolkata
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:5173,http://127.0.0.1:5173
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
POST https://habit-tracker-9a2o.onrender.com/api/notifications/due
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
