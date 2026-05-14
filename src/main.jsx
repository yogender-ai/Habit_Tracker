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
  appTimezone: "Asia/Kolkata",
  firebase: {},
  ...(window.DAYFORGE_CONFIG || {}),
  firebase: { ...((window.DAYFORGE_CONFIG || {}).firebase || {}) }
};

const DEFAULT_HABITS = [
  { id: "clean-room", title: "Room clean routine", category: "Life", targetPerWeek: 7, active: true },
  { id: "assignments", title: "Complete assignments", category: "Study", targetPerWeek: 7, active: true },
  { id: "digital-files", title: "Organize digital files", category: "Focus", targetPerWeek: 5, active: true },
  { id: "read", title: "Read 10 pages of a book", category: "Growth", targetPerWeek: 7, active: true },
  { id: "exercise", title: "Exercise for 30 minutes", category: "Health", targetPerWeek: 5, active: true },
  { id: "water", title: "Drink 8 glasses of water", category: "Health", targetPerWeek: 7, active: true },
  { id: "plan", title: "Plan next day's schedule", category: "Focus", targetPerWeek: 6, active: true },
  { id: "meditate", title: "Meditate for 10 minutes", category: "Mind", targetPerWeek: 7, active: true },
  { id: "emails", title: "Check emails and updates", category: "Work", targetPerWeek: 5, active: true },
  { id: "language", title: "Practice language skills", category: "Growth", targetPerWeek: 5, active: true },
  { id: "flashcards", title: "Review flashcards", category: "Study", targetPerWeek: 7, active: true },
  { id: "journal", title: "Write in a journal", category: "Mind", targetPerWeek: 5, active: true }
];

const QUOTES = [
  "Focused, intentional, and ready for the month ahead.",
  "Small wins today become visible confidence tomorrow.",
  "Keep the promise small enough to do and serious enough to matter.",
  "Progress loves clarity. Check the box, then move again.",
  "A warrior is built by repeated promises kept quietly."
];

const WARRIOR_IMAGES = [
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=520&q=80",
  "https://images.unsplash.com/photo-1549476464-37392f717541?auto=format&fit=crop&w=520&q=80",
  "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=520&q=80"
];

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthDays(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const total = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: total }, (_, index) => new Date(year, month, index + 1));
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readLocal(userId, key) {
  try {
    return JSON.parse(localStorage.getItem(`dayforge_${userId}_${key}`)) || {};
  } catch {
    return {};
  }
}

function writeLocal(userId, key, value) {
  localStorage.setItem(`dayforge_${userId}_${key}`, JSON.stringify(value));
}

function apiBase() {
  const configured = String(CONFIG.apiBaseUrl || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  if (location.hostname === "127.0.0.1" || location.hostname === "localhost") return "http://127.0.0.1:8000";
  return location.origin;
}

function hasFirebaseConfig() {
  const fb = CONFIG.firebase || {};
  return Boolean(fb.apiKey && fb.authDomain && fb.projectId && fb.appId);
}

function normalizeHabit(habit) {
  return {
    id: String(habit.id || uid()),
    title: String(habit.title || "New habit").slice(0, 90),
    category: String(habit.category || "Focus").slice(0, 40),
    targetPerWeek: Math.max(1, Math.min(7, Number(habit.targetPerWeek || habit.target || 5))),
    active: habit.active !== false,
    createdAt: habit.createdAt || new Date().toISOString()
  };
}

function App() {
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [habits, setHabits] = useState(DEFAULT_HABITS);
  const [grid, setGrid] = useState({});
  const [theme, setTheme] = useState(localStorage.getItem("dayforge_theme") || "light");
  const [syncState, setSyncState] = useState("Waiting for sign in");
  const [habitDraft, setHabitDraft] = useState("");
  const [welcomeState, setWelcomeState] = useState("");

  const days = useMemo(() => monthDays(monthDate), [monthDate]);
  const monthId = monthKey(monthDate);
  const quote = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length];
  const image = WARRIOR_IMAGES[Math.floor(Date.now() / 86400000) % WARRIOR_IMAGES.length];
  const activeHabits = habits.filter((habit) => habit.active);

  useEffect(() => {
    if (!hasFirebaseConfig()) {
      setAuthReady(true);
      setSyncState("Firebase web config missing");
      return;
    }
    const firebaseApp = initializeApp(CONFIG.firebase);
    const nextAuth = getAuth(firebaseApp);
    setAuth(nextAuth);
    return onAuthStateChanged(nextAuth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      setSyncState(nextUser ? "Signed in" : "Sign in required");
    });
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem("dayforge_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    const cached = readLocal(user.uid, monthId);
    setGrid(cached);
    syncFromBackend();
    sendWelcomeEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, monthId]);

  useEffect(() => {
    if (!user) return;
    writeLocal(user.uid, monthId, grid);
  }, [grid, monthId, user]);

  async function authHeaders() {
    const headers = { "Content-Type": "application/json", "X-Demo-User": user?.uid || "dayforge-local" };
    if (auth?.currentUser) headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
    return headers;
  }

  async function syncFromBackend() {
    if (!user) return;
    try {
      setSyncState("Syncing month...");
      const response = await fetch(`${apiBase()}/api/snapshot?year=${monthDate.getFullYear()}`, {
        headers: await authHeaders()
      });
      if (!response.ok) throw new Error("snapshot failed");
      const payload = await response.json();
      const workspaceHabits = (payload.workspace?.habits || []).map(normalizeHabit).filter((habit) => habit.active);
      setHabits(workspaceHabits.length ? workspaceHabits : DEFAULT_HABITS);
      const nextGrid = {};
      days.forEach((date) => {
        const key = toDateKey(date);
        nextGrid[key] = payload.days?.[key]?.habitChecks || {};
      });
      setGrid((current) => ({ ...nextGrid, ...current }));
      setSyncState(`Synced to ${payload.primaryStore || "backend"}`);
    } catch {
      setSyncState("Backend offline, using local cache");
    }
  }

  async function saveWorkspace(nextHabits) {
    if (!user) return;
    try {
      await fetch(`${apiBase()}/api/workspace`, {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({
          workspace: {
            profile: {
              displayName: user.displayName || user.email || "Day Forge Warrior",
              mission: "Win the month one checked habit at a time."
            },
            habits: nextHabits,
            notificationSettings: {
              enabled: true,
              email: user.email || "",
              timezone: CONFIG.appTimezone || "Asia/Kolkata"
            }
          }
        })
      });
      setSyncState("Habits saved");
    } catch {
      setSyncState("Habits saved locally");
    }
  }

  async function sendWelcomeEmail() {
    if (!user) return;
    const key = `dayforge_welcome_${user.uid}`;
    if (localStorage.getItem(key)) return;
    try {
      setWelcomeState("Sending welcome email...");
      const response = await fetch(`${apiBase()}/api/notifications/welcome`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          email: user.email,
          displayName: user.displayName || "Warrior"
        })
      });
      if (!response.ok) throw new Error("welcome failed");
      localStorage.setItem(key, "sent");
      setWelcomeState("Welcome email sent");
    } catch {
      setWelcomeState("Welcome email pending");
    }
  }

  async function pushDay(dateKey, checks) {
    if (!user) return;
    try {
      const done = activeHabits.filter((habit) => checks[habit.id]).length;
      const status = done === activeHabits.length ? "won" : done > 0 ? "neutral" : "missed";
      await fetch(`${apiBase()}/api/days/${dateKey}`, {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({
          day: {
            dateKey,
            status,
            focusLine: quote,
            habitChecks: checks,
            tasks: activeHabits.map((habit) => ({
              id: habit.id,
              title: habit.title,
              text: habit.title,
              done: Boolean(checks[habit.id]),
              priority: "medium",
              estimateMins: 20
            }))
          }
        })
      });
      setSyncState("Saved to backend");
    } catch {
      setSyncState("Saved locally");
    }
  }

  function toggleHabit(dateKey, habitId) {
    setGrid((current) => {
      const nextChecks = { ...(current[dateKey] || {}), [habitId]: !current[dateKey]?.[habitId] };
      pushDay(dateKey, nextChecks);
      return { ...current, [dateKey]: nextChecks };
    });
  }

  function addHabit(event) {
    event.preventDefault();
    const title = habitDraft.trim();
    if (!title) return;
    const nextHabit = normalizeHabit({ id: uid(), title, category: "Focus", targetPerWeek: 5, active: true });
    const nextHabits = [...activeHabits, nextHabit];
    setHabits(nextHabits);
    setHabitDraft("");
    saveWorkspace(nextHabits);
  }

  function deleteHabit(habitId) {
    const nextHabits = habits.map((habit) => habit.id === habitId ? { ...habit, active: false } : habit);
    setHabits(nextHabits);
    saveWorkspace(nextHabits);
  }

  async function handleAuth() {
    if (!auth) return;
    if (auth.currentUser) await signOut(auth);
    else await signInWithPopup(auth, new GoogleAuthProvider());
  }

  if (!authReady) return <div className="gate-screen"><div className="gate-card">Loading Day Forge...</div></div>;

  if (!user) {
    return (
      <div className={`gate-screen ${theme}`}>
        <section className="gate-card">
          <div>
            <span className="gate-kicker">Day Forge</span>
            <h1>Sign in to enter your monthly habit command center.</h1>
            <p>Your habits, monthly grid, welcome email, and progress sync only after Google sign-in.</p>
            <button type="button" className="primary-button" onClick={handleAuth}>Sign in with Google</button>
            <button type="button" className="theme-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "Light theme" : "Dark theme"}
            </button>
            <small>{syncState}</small>
          </div>
          <img src={image} alt="Warrior training for discipline" />
        </section>
      </div>
    );
  }

  const monthStats = buildMonthStats(grid, days, activeHabits);
  const selectedStats = dayStats(grid[selectedDate] || {}, activeHabits);
  const weeklyStats = buildWeeklyStats(grid, days, activeHabits);

  return (
    <main className={`forge-screen ${theme}`}>
      <section className="left-panel">
        <div className="brand-block">
          <h1>{monthDate.toLocaleDateString("en-US", { month: "long" })}</h1>
          <span>Day Forge Tracker</span>
        </div>

        <div className="select-row">
          <label>Month<select value={monthDate.getMonth()} onChange={(e) => setMonthDate(new Date(monthDate.getFullYear(), Number(e.target.value), 1))}>
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{new Date(2026, i, 1).toLocaleDateString("en-US", { month: "long" })}</option>)}
          </select></label>
          <label>Year<select value={monthDate.getFullYear()} onChange={(e) => setMonthDate(new Date(Number(e.target.value), monthDate.getMonth(), 1))}>
            {[2025, 2026, 2027].map((year) => <option key={year}>{year}</option>)}
          </select></label>
        </div>

        <figure className="focus-card">
          <img src={image} alt="Warrior training for discipline" />
          <figcaption>I am...<br />{quote}</figcaption>
        </figure>

        <div className="habit-list-card">
          <h2>Daily Habits</h2>
          <ol>
            {activeHabits.map((habit) => (
              <li key={habit.id}>
                <span>{habit.title}</span>
                <button type="button" onClick={() => deleteHabit(habit.id)} aria-label={`Delete ${habit.title}`}>×</button>
              </li>
            ))}
          </ol>
        </div>

        <form className="add-habit" onSubmit={addHabit}>
          <input value={habitDraft} onChange={(e) => setHabitDraft(e.target.value)} placeholder="Add a habit" maxLength={80} />
          <button type="submit">Add</button>
        </form>

        <div className="account-row">
          <button className="auth-button" type="button" onClick={handleAuth}>Sign out</button>
          <button className="theme-button small" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
        <p className="sync-line">{syncState} · {welcomeState}</p>
      </section>

      <section className="center-panel" style={{ "--days": days.length, "--habits": Math.max(activeHabits.length, 1) }}>
        <AreaCurve days={days} grid={grid} habits={activeHabits} />
        <MonthlyBars days={days} grid={grid} habits={activeHabits} />
        <WeeklyRings weeks={weeklyStats} />
        <HabitMatrix
          days={days}
          habits={activeHabits}
          grid={grid}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          onToggle={toggleHabit}
        />
      </section>

      <section className="right-panel">
        <div className="top-metrics">
          <MetricCard title="Daily Progress" value={`${selectedStats.pct}%`} />
          <MetricCard title="Habits" value={`${monthStats.done} / ${monthStats.total}`} ring={monthStats.pct} />
        </div>
        <TopHabits grid={grid} days={days} habits={activeHabits} />
        <DailyProgress grid={grid} days={days} habits={activeHabits} />
        <div className="quote-strip">Over 100% on habits, keep going.</div>
      </section>
    </main>
  );
}

function dayStats(checks = {}, habits = []) {
  const total = habits.length || 1;
  const done = habits.filter((habit) => checks[habit.id]).length;
  return { done, total, pct: Math.round((done / total) * 100) };
}

function buildMonthStats(grid, days, habits) {
  const daily = days.map((date) => dayStats(grid[toDateKey(date)] || {}, habits));
  const done = daily.reduce((sum, item) => sum + item.done, 0);
  const total = daily.reduce((sum, item) => sum + item.total, 0) || 1;
  return { daily, done, total, pct: Math.round((done / total) * 100) };
}

function buildWeeklyStats(grid, days, habits) {
  const chunks = [];
  for (let i = 0; i < days.length; i += 7) chunks.push(days.slice(i, i + 7));
  return chunks.map((chunk, index) => {
    const stats = buildMonthStats(grid, chunk, habits);
    return { ...stats, label: `week ${index + 1}` };
  });
}

function habitRows(grid, days, habits) {
  return habits.map((habit) => {
    const values = days.map((date) => Boolean(grid[toDateKey(date)]?.[habit.id]));
    const done = values.filter(Boolean).length;
    return {
      ...habit,
      done,
      total: days.length,
      pct: Math.round((done / days.length) * 100),
      streak: longestRun(values)
    };
  }).sort((a, b) => b.pct - a.pct || a.title.localeCompare(b.title));
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

function Ring({ value, size = 96 }) {
  return (
    <svg className="ring" width={size} height={size} viewBox="0 0 100 100" style={{ "--value": value }}>
      <circle className="ring-bg" cx="50" cy="50" r="39" />
      <circle className="ring-fg" cx="50" cy="50" r="39" />
      <text x="50" y="55" textAnchor="middle">{value}%</text>
    </svg>
  );
}

function AreaCurve({ days, grid, habits }) {
  const stats = days.map((date) => dayStats(grid[toDateKey(date)] || {}, habits));
  const points = stats.map((day, index) => {
    const x = stats.length === 1 ? 0 : (index / (stats.length - 1)) * 100;
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

function MonthlyBars({ days, grid, habits }) {
  return (
    <div className="bar-card" style={{ "--days": days.length }}>
      {days.map((date, index) => {
        const key = toDateKey(date);
        const pct = dayStats(grid[key] || {}, habits).pct;
        return (
          <button key={key} type="button" className="bar-col" onClick={() => {}}>
            <span className="week-label">{index % 7 === 0 ? `week ${Math.floor(index / 7) + 1}` : ""}</span>
            <i style={{ height: `${Math.max(pct, 2)}%` }} className={index >= 7 && index < 14 ? "pink" : ""} />
            <b>{pct}%</b>
            <em>{date.getDate()}</em>
          </button>
        );
      })}
    </div>
  );
}

function WeeklyRings({ weeks }) {
  return (
    <div className="ring-row">
      {weeks.map((week) => (
        <div className="week-ring" key={week.label}>
          <Ring value={week.pct} size={88} />
          <span>{week.label}</span>
        </div>
      ))}
    </div>
  );
}

function HabitMatrix({ days, habits, grid, selectedDate, onSelect, onToggle }) {
  return (
    <div className="matrix-card" style={{ "--days": days.length, "--habits": Math.max(habits.length, 1) }}>
      <div className="matrix-header">
        <span></span>
        {days.map((date) => {
          const key = toDateKey(date);
          return <button key={key} type="button" className={selectedDate === key ? "selected-day" : ""} onClick={() => onSelect(key)}>{date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}</button>;
        })}
      </div>
      <div className="matrix-days">
        <span></span>
        {days.map((date) => {
          const key = toDateKey(date);
          return <button key={key} type="button" className={selectedDate === key ? "selected-day" : ""} onClick={() => onSelect(key)}>{date.getDate()}</button>;
        })}
      </div>
      {habits.map((habit) => (
        <div className="matrix-row" key={habit.id}>
          <span>{habit.title}</span>
          {days.map((date) => {
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

function TopHabits({ grid, days, habits }) {
  const rows = habitRows(grid, days, habits).slice(0, 10);
  return (
    <article className="table-card top-habits">
      <h3>Top 10 Habits</h3>
      <table>
        <thead><tr><th>#</th><th>daily habit</th><th>progress</th></tr></thead>
        <tbody>
          {rows.map((row, index) => <tr key={row.id}><td>{index + 1}</td><td>{row.title}</td><td>{row.pct}%</td></tr>)}
        </tbody>
      </table>
    </article>
  );
}

function DailyProgress({ grid, days, habits }) {
  const rows = habitRows(grid, days, habits);
  return (
    <article className="table-card progress-table">
      <h3>Daily Progress</h3>
      <p>{rows.reduce((sum, row) => sum + row.done, 0)} / {rows.length * days.length} completed</p>
      <table>
        <thead><tr><th>goal</th><th>percentage</th><th>count</th><th>streak</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.targetPerWeek}</td>
              <td><span className="mini-bar"><i style={{ width: `${row.pct}%` }} /></span>{row.pct}%</td>
              <td>{row.done} / {days.length}</td>
              <td>{row.streak}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

createRoot(document.getElementById("root")).render(<App />);
