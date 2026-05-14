import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "firebase/auth";

const CONFIG = {
  apiBaseUrl: "",
  firebase: {},
  appTimezone: "Asia/Kolkata",
  ...(window.DAYFORGE_CONFIG || {}),
  firebase: {
    ...((window.DAYFORGE_CONFIG || {}).firebase || {})
  }
};

const STORAGE_KEY = "dayforge_week_dashboard_v1";
const XP_BY_PRIORITY = { low: 18, medium: 32, high: 55 };

const HABITS = [
  { id: "clean-room", title: "Room clean routine", short: "Room", category: "Life", target: 7, color: "blue" },
  { id: "assignments", title: "Complete assignments", short: "Assignments", category: "Study", target: 7, color: "rose" },
  { id: "digital-files", title: "Organize digital files", short: "Files", category: "Focus", target: 5, color: "mint" },
  { id: "read", title: "Read 10 pages of a book", short: "Read", category: "Growth", target: 7, color: "gold" },
  { id: "exercise", title: "Exercise for 30 minutes", short: "Exercise", category: "Health", target: 5, color: "rose" },
  { id: "water", title: "Drink 8 glasses of water", short: "Water", category: "Health", target: 7, color: "blue" },
  { id: "plan", title: "Plan next day's schedule", short: "Plan", category: "Focus", target: 6, color: "mint" },
  { id: "meditate", title: "Meditate for 10 minutes", short: "Meditate", category: "Mind", target: 7, color: "gold" },
  { id: "emails", title: "Check emails and updates", short: "Email", category: "Work", target: 5, color: "blue" },
  { id: "language", title: "Practice language skills", short: "Language", category: "Growth", target: 5, color: "rose" },
  { id: "flashcards", title: "Review flashcards", short: "Cards", category: "Study", target: 7, color: "mint" },
  { id: "journal", title: "Write in a journal", short: "Journal", category: "Mind", target: 5, color: "gold" }
];

const QUOTES = [
  "Focused, intentional, and ready for the month ahead.",
  "Small wins today become visible confidence tomorrow.",
  "Keep the promise small enough to do and serious enough to matter.",
  "Progress loves clarity. Check the box, then move again.",
  "A clean week is built one honest mark at a time."
];

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function weekStart(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function readStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function apiBase() {
  const configured = String(CONFIG.apiBaseUrl || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
    return "http://127.0.0.1:8000";
  }
  return location.origin;
}

function hasFirebaseConfig() {
  const fb = CONFIG.firebase || {};
  return Boolean(fb.apiKey && fb.authDomain && fb.projectId && fb.appId);
}

function defaultWeekData(days) {
  const saved = readStorage();
  const data = {};
  days.forEach((date, dayIndex) => {
    const key = toDateKey(date);
    data[key] = saved[key] || {};
    HABITS.forEach((habit, habitIndex) => {
      if (typeof data[key][habit.id] === "boolean") return;
      data[key][habit.id] = dayIndex < 3 ? (habitIndex + dayIndex) % 5 !== 3 : false;
    });
  });
  return data;
}

function App() {
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDays = useMemo(() => {
    const start = addDays(weekStart(new Date()), weekOffset * 7);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [weekOffset]);
  const [grid, setGrid] = useState(() => defaultWeekData(weekDays));
  const [user, setUser] = useState(null);
  const [auth, setAuth] = useState(null);
  const [syncState, setSyncState] = useState("Local save ready");

  useEffect(() => {
    if (!hasFirebaseConfig()) return;
    const app = initializeApp(CONFIG.firebase);
    const authInstance = getAuth(app);
    setAuth(authInstance);
    return onAuthStateChanged(authInstance, (nextUser) => {
      setUser(nextUser);
      setSyncState(nextUser ? "Firebase connected" : "Sign in for cloud sync");
    });
  }, []);

  useEffect(() => {
    setGrid((current) => ({ ...defaultWeekData(weekDays), ...current }));
  }, [weekDays]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grid));
  }, [grid]);

  useEffect(() => {
    syncFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, weekOffset]);

  const selectedMap = grid[selectedDate] || {};
  const weekStats = useMemo(() => buildWeekStats(grid, weekDays), [grid, weekDays]);
  const selectedStats = dayStats(selectedMap);
  const quote = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length];

  async function headers() {
    const baseHeaders = { "Content-Type": "application/json", "X-Demo-User": user?.uid || "dayforge-local" };
    if (auth?.currentUser) {
      baseHeaders.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
    }
    return baseHeaders;
  }

  async function syncFromBackend() {
    try {
      setSyncState(user ? "Syncing cloud..." : "Local plus dev sync");
      const response = await fetch(`${apiBase()}/api/snapshot?year=${new Date().getFullYear()}`, {
        headers: await headers()
      });
      if (!response.ok) throw new Error("snapshot failed");
      const payload = await response.json();
      const incoming = {};
      weekDays.forEach((date) => {
        const key = toDateKey(date);
        incoming[key] = payload.days?.[key]?.habitChecks || {};
      });
      setGrid((current) => mergeWeek(current, incoming));
      setSyncState(`Synced to ${payload.primaryStore || "backend"}`);
    } catch {
      setSyncState("Saved locally");
    }
  }

  async function pushDay(dateKey, nextMap) {
    try {
      const done = Object.values(nextMap).filter(Boolean).length;
      const status = done === HABITS.length ? "won" : done > 0 ? "neutral" : "missed";
      const tasks = HABITS.map((habit) => ({
        id: habit.id,
        title: habit.title,
        text: habit.title,
        done: Boolean(nextMap[habit.id]),
        priority: "medium",
        estimateMins: 20
      }));
      const response = await fetch(`${apiBase()}/api/days/${dateKey}`, {
        method: "PUT",
        headers: await headers(),
        body: JSON.stringify({
          day: {
            dateKey,
            status,
            focusLine: quote,
            habitChecks: nextMap,
            tasks
          }
        })
      });
      if (!response.ok) throw new Error("save failed");
      setSyncState("Saved to backend");
    } catch {
      setSyncState("Saved locally");
    }
  }

  function toggleHabit(dateKey, habitId) {
    setGrid((current) => {
      const nextMap = { ...(current[dateKey] || {}), [habitId]: !current[dateKey]?.[habitId] };
      const next = { ...current, [dateKey]: nextMap };
      pushDay(dateKey, nextMap);
      return next;
    });
  }

  async function handleAuth() {
    if (!auth) {
      setSyncState("Firebase config missing");
      return;
    }
    if (auth.currentUser) {
      await signOut(auth);
      return;
    }
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  return (
    <main className="forge-screen">
      <section className="left-panel">
        <div className="brand-block">
          <h1>June</h1>
          <span>Habit Tracker</span>
        </div>

        <div className="select-row">
          <label>Month<select defaultValue="June"><option>June</option></select></label>
          <label>Year<select defaultValue="2026"><option>2026</option></select></label>
        </div>

        <figure className="focus-card">
          <img src="https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=420&q=80" alt="Focused morning habit practice" />
          <figcaption>I am...<br />{quote}</figcaption>
        </figure>

        <div className="habit-list-card">
          <h2>Daily Habits</h2>
          <ol>
            {HABITS.map((habit) => <li key={habit.id}>{habit.title}</li>)}
          </ol>
        </div>

        <button className="auth-button" type="button" onClick={handleAuth}>
          {user ? "Sign out" : "Sign in with Google"}
        </button>
        <p className="sync-line">{syncState}</p>
      </section>

      <section className="center-panel">
        <AreaCurve stats={weekStats} />
        <WeeklyBars stats={weekStats} />

        <div className="ring-row">
          {weekDays.map((date) => {
            const key = toDateKey(date);
            return (
              <button
                key={key}
                className={`day-ring ${selectedDate === key ? "active" : ""}`}
                type="button"
                onClick={() => setSelectedDate(key)}
              >
                <Ring value={dayStats(grid[key] || {}).pct} size={84} />
                <span>{date.toLocaleDateString("en-US", { weekday: "short" })}</span>
              </button>
            );
          })}
        </div>

        <HabitMatrix
          grid={grid}
          weekDays={weekDays}
          selectedDate={selectedDate}
          onToggle={toggleHabit}
        />
      </section>

      <section className="right-panel">
        <div className="top-metrics">
          <MetricCard title="Daily Progress" value={`${selectedStats.pct}%`} />
          <MetricCard title="Habits" value={`${weekStats.done} / ${weekStats.total}`} ring={Math.round((weekStats.done / weekStats.total) * 100)} />
        </div>
        <TopHabits grid={grid} weekDays={weekDays} />
        <DailyProgress grid={grid} weekDays={weekDays} />
        <div className="quote-strip">Over 100% on habits, keep going.</div>
      </section>
    </main>
  );
}

function mergeWeek(current, incoming) {
  const next = { ...current };
  Object.entries(incoming).forEach(([dateKey, checks]) => {
    next[dateKey] = { ...(next[dateKey] || {}), ...(checks || {}) };
  });
  return next;
}

function dayStats(map = {}) {
  const done = HABITS.filter((habit) => map[habit.id]).length;
  return { done, total: HABITS.length, pct: Math.round((done / HABITS.length) * 100) };
}

function buildWeekStats(grid, weekDays) {
  const daily = weekDays.map((date) => {
    const key = toDateKey(date);
    return { key, ...dayStats(grid[key] || {}) };
  });
  const done = daily.reduce((sum, day) => sum + day.done, 0);
  const total = daily.reduce((sum, day) => sum + day.total, 0);
  return { daily, done, total, pct: Math.round((done / total) * 100) };
}

function Ring({ value, size = 98 }) {
  return (
    <svg className="ring" width={size} height={size} viewBox="0 0 100 100" style={{ "--value": value }}>
      <circle className="ring-bg" cx="50" cy="50" r="39" />
      <circle className="ring-fg" cx="50" cy="50" r="39" />
      <text x="50" y="55" textAnchor="middle">{value}%</text>
    </svg>
  );
}

function AreaCurve({ stats }) {
  const points = stats.daily.map((day, index) => {
    const x = (index / (stats.daily.length - 1)) * 100;
    const y = 86 - day.pct * 0.72;
    return `${x},${y}`;
  }).join(" ");
  return (
    <div className="area-card">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#b9c8ff" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#dfe6ff" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${points} 100,100`} fill="url(#areaFill)" />
        <polyline points={points} fill="none" stroke="#91a9ec" strokeWidth="1.4" />
      </svg>
    </div>
  );
}

function WeeklyBars({ stats }) {
  return (
    <div className="bar-card">
      {stats.daily.map((day, index) => (
        <div className="bar-col" key={day.key}>
          <span className="week-label">week 1</span>
          <i style={{ height: `${Math.max(day.pct, 4)}%` }} className={index > 2 ? "pink" : ""} />
          <b>{day.pct}%</b>
          <em>{index + 1}</em>
        </div>
      ))}
    </div>
  );
}

function HabitMatrix({ grid, weekDays, selectedDate, onToggle }) {
  return (
    <div className="matrix-card">
      <div className="matrix-header">
        <span></span>
        {weekDays.map((date) => <b key={toDateKey(date)}>{date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}</b>)}
      </div>
      <div className="matrix-days">
        <span></span>
        {weekDays.map((date) => <b key={toDateKey(date)}>{date.getDate()}</b>)}
      </div>
      {HABITS.map((habit) => (
        <div className="matrix-row" key={habit.id}>
          <span>{habit.title}</span>
          {weekDays.map((date) => {
            const key = toDateKey(date);
            const checked = Boolean(grid[key]?.[habit.id]);
            return (
              <button
                className={`${checked ? "checked" : ""} ${selectedDate === key ? "selected-col" : ""}`}
                key={key}
                type="button"
                aria-label={`${habit.title} ${key}`}
                onClick={() => onToggle(key, habit.id)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MetricCard({ title, value, ring }) {
  return (
    <article className="metric-card">
      <h3>{title}</h3>
      {typeof ring === "number" ? <Ring value={ring} size={92} /> : <strong>{value}</strong>}
      {typeof ring === "number" ? <span>{value}</span> : null}
    </article>
  );
}

function TopHabits({ grid, weekDays }) {
  const rows = habitRows(grid, weekDays).slice(0, 10);
  return (
    <article className="table-card top-habits">
      <h3>Top 10 Habits</h3>
      <table>
        <thead><tr><th>#</th><th>daily habit</th><th>progress</th></tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id}><td>{index + 1}</td><td>{row.title}</td><td>{row.pct}%</td></tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function DailyProgress({ grid, weekDays }) {
  const rows = habitRows(grid, weekDays);
  return (
    <article className="table-card progress-table">
      <h3>Daily Progress</h3>
      <p>{rows.reduce((sum, row) => sum + row.done, 0)} / {rows.length * weekDays.length} completed</p>
      <table>
        <thead><tr><th>goal</th><th>percentage</th><th>count</th><th>streak</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.target}</td>
              <td><span className="mini-bar"><i style={{ width: `${row.pct}%` }} /></span>{row.pct}%</td>
              <td>{row.done} / {weekDays.length}</td>
              <td>{row.streak}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function habitRows(grid, weekDays) {
  return HABITS.map((habit) => {
    const values = weekDays.map((date) => Boolean(grid[toDateKey(date)]?.[habit.id]));
    const done = values.filter(Boolean).length;
    return {
      ...habit,
      done,
      pct: Math.round((done / weekDays.length) * 100),
      streak: longestRun(values)
    };
  }).sort((a, b) => b.pct - a.pct);
}

function longestRun(values) {
  let best = 0;
  let run = 0;
  values.forEach((value) => {
    run = value ? run + 1 : 0;
    best = Math.max(best, run);
  });
  return best;
}

createRoot(document.getElementById("root")).render(<App />);
