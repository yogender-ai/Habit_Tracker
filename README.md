# DayForge

A focused habit tracker. Check in for today, keep an honest streak, and watch a month fill in like a contribution graph.

Hide / privacy lock is gone. Habits stay visible. The product is the tracker, not a dashboard of extra systems.

Live: [dayforge.yogender1.me](https://dayforge.yogender1.me)

## Why it is built this way

- **Today first.** Morning / day / evening groups, large tap targets, a ring, and a week of dots beside every habit.
- **Check or count.** Close a box, or count glasses / pages to a daily goal.
- **Honest streaks.** Missing today does not break a streak until the day is over. Skip a day and the streak holds. Unscheduled days never count as misses.
- **Yesterday catch-up.** The previous day stays editable so one late night does not wreck the graph.
- **Real schedules.** Daily, weekdays, weekends, or any mix of days, plus a weekly goal.
- **Calendar that tells the truth.** Each day fills by how much of the scheduled list you actually closed.
- **Insights.** Current / best streak, perfect days, weekly rings, and a year-style heatmap per habit.
- **Keys.** `1–9` close the next open habit. `t` `c` `i` switch views. `a` adds a habit.
- **Local first, cloud when signed in.** Google sign-in, offline queue, Firebase + API sync.

## Stack

- Frontend: Vite, React, Firebase Auth
- Backend: FastAPI, SQLAlchemy, Postgres/SQLite
- Deploy: Vercel (frontend), Render (API)

## Local

```bash
npm install
npm run dev
```

Optional API:

```bash
pip install -r requirements.txt
npm run api
```

Set `public/config.js` (or Vite env vars) for Firebase and the API base URL. An empty `apiBaseUrl` in local dev points at `http://127.0.0.1:8000`.

## Deploy

Frontend is a Vite app. `vercel.json` builds `dist` and rewrites to `index.html`.

Set `VITE_API_BASE_URL` in Vercel if the FastAPI backend is on Render.
