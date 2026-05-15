import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { initializeApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut
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
];

const QUOTES = [
  "Discipline is the forge. Habits are the hammer. You are the blacksmith.",
  "Small wins today become visible confidence tomorrow.",
  "Keep the promise small enough to do and serious enough to matter.",
  "A warrior is built by repeated promises kept quietly.",
  "Forge Discipline. Build Legacy. Stay unstoppable.",
  "Consistency today. Mastery tomorrow. Keep forging momentum.",
];

const MISSION_LINES = [
  "You're forging momentum.", "Stay consistent. Stay unstoppable.",
  "Every small action compounds.", "Forge your legacy, one habit at a time.",
  "The grind is the glory.", "Discipline equals freedom.",
];

const HERO_IMAGES = [
  // Gym & Weightlifting
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=360&q=55",
  "https://images.unsplash.com/photo-1549476464-37392f717541?w=360&q=55",
  "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=360&q=55",
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=360&q=55",
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=360&q=55",
  "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=360&q=55",
  "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=360&q=55",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=360&q=55",
  "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=360&q=55",
  "https://images.unsplash.com/photo-1605296867424-35fc25c9212a?w=360&q=55",
  // Boxing & Combat
  "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=360&q=55",
  "https://images.unsplash.com/photo-1615117950532-1f0252ad0a44?w=360&q=55",
  "https://images.unsplash.com/photo-1517438322307-e67111335449?w=360&q=55",
  // Running & Cardio
  "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=360&q=55",
  "https://images.unsplash.com/photo-1486218119243-13883505764c?w=360&q=55",
  "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=360&q=55",
  "https://images.unsplash.com/photo-1461896836934-bd45ba7d5820?w=360&q=55",
  "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=360&q=55",
  // Yoga & Meditation
  "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=360&q=55",
  "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=360&q=55",
  "https://images.unsplash.com/photo-1545389336-cf090694435e?w=360&q=55",
  // Crossfit & HIIT
  "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=360&q=55",
  "https://images.unsplash.com/photo-1556817411-31ae72fa3ea0?w=360&q=55",
  "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=360&q=55",
  "https://images.unsplash.com/photo-1550345332-09e3ac987658?w=360&q=55",
  // Nature & Mountains (discipline/adventure)
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=360&q=55",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=360&q=55",
  "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=360&q=55",
  "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=360&q=55",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=360&q=55",
  // Focus & Workspace
  "https://images.unsplash.com/photo-1488998427799-e3362cec87c3?w=360&q=55",
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=360&q=55",
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?w=360&q=55",
  // Dark moody / aesthetic
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=360&q=55",
  "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=360&q=55",
  "https://images.unsplash.com/photo-1551632811-561732d1e306?w=360&q=55",
  // Swimming & Water
  "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=360&q=55",
  "https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=360&q=55",
  // Martial Arts
  "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=360&q=55",
  "https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?w=360&q=55",
  // Athletic / Sports
  "https://images.unsplash.com/photo-1461897104016-0b3b00b1dce4?w=360&q=55",
  "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=360&q=55",
  "https://images.unsplash.com/photo-1547483238-f400e65ccd56?w=360&q=55",
  // Sunrise / Motivation
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=360&q=55",
  "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=360&q=55",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=360&q=55",
  // Night sky / Stars (cosmic theme)
  "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=360&q=55",
  "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=360&q=55",
  "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=360&q=55",
  "https://images.unsplash.com/photo-1520034475321-cbe63696469a?w=360&q=55",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function toDateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function monthDays(d) { const y=d.getFullYear(),m=d.getMonth(),t=new Date(y,m+1,0).getDate(); return Array.from({length:t},(_,i)=>new Date(y,m,i+1)); }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function readLocal(u,k) { try{return JSON.parse(localStorage.getItem(`dayforge_${u}_${k}`))||{}}catch{return{}} }
function writeLocal(u,k,v) { localStorage.setItem(`dayforge_${u}_${k}`,JSON.stringify(v)); }
function apiBase() { const c=String(CONFIG.apiBaseUrl||"").trim().replace(/\/$/,""); if(c) return c; if(location.hostname==="127.0.0.1"||location.hostname==="localhost") return "http://127.0.0.1:8000"; return location.origin; }
function hasFirebaseConfig() { const f=CONFIG.firebase||{}; return Boolean(f.apiKey&&f.authDomain&&f.projectId&&f.appId); }
function normalizeHabit(h) { return { id:String(h.id||uid()), title:String(h.title||"New habit").slice(0,90), category:String(h.category||"Focus").slice(0,40), targetPerWeek:Math.max(1,Math.min(7,Number(h.targetPerWeek||h.target||5))), active:h.active!==false, createdAt:h.createdAt||new Date().toISOString() }; }

function dayStats(checks={}, habits=[]) { const t=habits.length||1, d=habits.filter(h=>checks[h.id]).length; return {done:d,total:t,pct:Math.round((d/t)*100)}; }
function buildMonthStats(grid,days,habits) { const daily=days.map(d=>dayStats(grid[toDateKey(d)]||{},habits)); const done=daily.reduce((s,i)=>s+i.done,0); const total=daily.reduce((s,i)=>s+i.total,0)||1; return {daily,done,total,pct:Math.round((done/total)*100)}; }
function buildWeeklyStats(grid,days,habits) { const chunks=[]; for(let i=0;i<days.length;i+=7) chunks.push(days.slice(i,i+7)); return chunks.map((c,i)=>{const s=buildMonthStats(grid,c,habits); const f=c[0],l=c[c.length-1]; return {...s,label:`Week ${i+1}`,range:`${f.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${l.toLocaleDateString("en-US",{month:"short",day:"numeric"})}`};}); }
function habitRows(grid,days,habits) { return habits.map(h=>{const vals=days.map(d=>Boolean(grid[toDateKey(d)]?.[h.id])); const done=vals.filter(Boolean).length; let best=0,run=0; vals.forEach(v=>{run=v?run+1:0;best=Math.max(best,run)}); return {...h,done,total:days.length,pct:Math.round((done/days.length)*100),streak:best};}).sort((a,b)=>b.pct-a.pct||a.title.localeCompare(b.title)); }
function currentStreak(grid,habits) { const today=new Date(); let streak=0; for(let i=0;i<365;i++){const d=new Date(today);d.setDate(d.getDate()-i); const k=toDateKey(d),c=grid[k]||{}; const done=habits.filter(h=>c[h.id]).length; if(done>0)streak++;else break;} return streak; }
function longestStreak(grid,habits) { const today=new Date(); let best=0,run=0; for(let i=365;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i); const k=toDateKey(d),c=grid[k]||{}; if(habits.filter(h=>c[h.id]).length>0){run++;best=Math.max(best,run)}else{run=0}} return best; }
function focusScore(grid,days,habits) { if(!habits.length)return 0; const ms=buildMonthStats(grid,days,habits); const cs=Math.min(currentStreak(grid,habits)*3,30); return Math.min(100,Math.round(ms.pct*0.7+cs)); }

function App() {
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [habits, setHabits] = useState(DEFAULT_HABITS);
  const [grid, setGrid] = useState({});
  const [theme, setTheme] = useState(localStorage.getItem("dayforge_theme") || "dark");
  const [syncState, setSyncState] = useState("Waiting for sign in");
  const [habitDraft, setHabitDraft] = useState("");
  const [welcomeState, setWelcomeState] = useState("");
  const [heroImg] = useState(() => pick(HERO_IMAGES));
  const [quote] = useState(() => pick(QUOTES));
  const [missionLine] = useState(() => pick(MISSION_LINES));

  const days = useMemo(() => monthDays(monthDate), [monthDate]);
  const monthId = monthKey(monthDate);
  const activeHabits = habits.filter(h => h.active);

  useEffect(() => {
    if (!hasFirebaseConfig()) { setAuthReady(true); setSyncState("Firebase config missing"); return; }
    const fa = initializeApp(CONFIG.firebase);
    const na = getAuth(fa);
    setAuth(na);
    return onAuthStateChanged(na, u => { setUser(u); setAuthReady(true); setSyncState(u ? "Signed in" : "Sign in required"); });
  }, []);

  useEffect(() => { document.body.dataset.theme = theme; localStorage.setItem("dayforge_theme", theme); }, [theme]);

  useEffect(() => { if (!user) return; setGrid(readLocal(user.uid, monthId)); syncFromBackend(); sendWelcomeEmail(); }, [user, monthId]);
  useEffect(() => { if (!user) return; writeLocal(user.uid, monthId, grid); }, [grid, monthId, user]);

  async function authHeaders() {
    const h = { "Content-Type": "application/json", "X-Demo-User": user?.uid || "dayforge-local" };
    if (auth?.currentUser) h.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
    return h;
  }

  async function syncFromBackend() {
    if (!user) return;
    try {
      setSyncState("Syncing...");
      const r = await fetch(`${apiBase()}/api/snapshot?year=${monthDate.getFullYear()}`, { headers: await authHeaders() });
      if (!r.ok) throw new Error("snapshot failed");
      const p = await r.json();
      const wh = (p.workspace?.habits || []).map(normalizeHabit).filter(h => h.active);
      setHabits(wh.length ? wh : DEFAULT_HABITS);
      const ng = {};
      days.forEach(d => { const k = toDateKey(d); ng[k] = p.days?.[k]?.habitChecks || {}; });
      setGrid(c => ({ ...ng, ...c }));
      setSyncState(`Synced → ${p.primaryStore || "backend"}`);
    } catch { setSyncState("Offline — using local cache"); }
  }

  async function saveWorkspace(nh) {
    if (!user) return;
    try {
      await fetch(`${apiBase()}/api/workspace`, {
        method: "PUT", headers: await authHeaders(),
        body: JSON.stringify({ workspace: { profile: { displayName: user.displayName || user.email || "Warrior", mission: "Win the month." }, habits: nh, notificationSettings: { enabled: true, email: user.email || "", timezone: CONFIG.appTimezone } } })
      });
      setSyncState("Habits saved");
    } catch { setSyncState("Saved locally"); }
  }

  async function sendWelcomeEmail() {
    if (!user) return;
    const k = `dayforge_welcome_${user.uid}`;
    if (localStorage.getItem(k)) return;
    try {
      setWelcomeState("Sending welcome...");
      const r = await fetch(`${apiBase()}/api/notifications/welcome`, { method: "POST", headers: await authHeaders(), body: JSON.stringify({ email: user.email, displayName: user.displayName || "Warrior" }) });
      if (!r.ok) throw new Error();
      localStorage.setItem(k, "sent");
      setWelcomeState("Welcome sent ✓");
    } catch { setWelcomeState("Welcome pending"); }
  }

  async function pushDay(dk, checks) {
    if (!user) return;
    try {
      const done = activeHabits.filter(h => checks[h.id]).length;
      const status = done === activeHabits.length ? "won" : done > 0 ? "neutral" : "missed";
      await fetch(`${apiBase()}/api/days/${dk}`, {
        method: "PUT", headers: await authHeaders(),
        body: JSON.stringify({ day: { dateKey: dk, status, focusLine: quote, habitChecks: checks, tasks: activeHabits.map(h => ({ id: h.id, title: h.title, text: h.title, done: Boolean(checks[h.id]), priority: "medium", estimateMins: 20 })) } })
      });
      setSyncState("Saved ✓");
    } catch { setSyncState("Saved locally"); }
  }

  function toggleHabit(dk, hid) {
    setGrid(c => { const nc = { ...(c[dk] || {}), [hid]: !c[dk]?.[hid] }; pushDay(dk, nc); return { ...c, [dk]: nc }; });
  }

  function addHabit(e) {
    e.preventDefault();
    const t = habitDraft.trim(); if (!t) return;
    const nh = [...activeHabits, normalizeHabit({ id: uid(), title: t, category: "Focus", targetPerWeek: 5, active: true })];
    setHabits(nh); setHabitDraft(""); saveWorkspace(nh);
  }

  function deleteHabit(hid) {
    const nh = habits.map(h => h.id === hid ? { ...h, active: false } : h);
    setHabits(nh); saveWorkspace(nh);
  }

  async function handleAuth() { if (!auth) return; if (auth.currentUser) await signOut(auth); else await signInWithPopup(auth, new GoogleAuthProvider()); }

  if (!authReady) return <div className="gate-screen"><div className="gate-card" style={{display:'grid',placeItems:'center'}}>Loading DayForge...</div></div>;

  if (!user) {
    return (
      <div className="gate-screen">
        <section className="gate-card">
          <div>
            <span className="gate-kicker">Day Forge</span>
            <h1>Sign in to enter your habit command center.</h1>
            <p>Track habits, build streaks, forge discipline. Your monthly grid syncs after Google sign-in.</p>
            <button type="button" className="primary-button" onClick={handleAuth}>⚡ Sign in with Google</button>
            <button type="button" className="theme-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
            <small>{syncState}</small>
          </div>
          <img src={heroImg} alt="Discipline training" />
        </section>
      </div>
    );
  }

  const ms = buildMonthStats(grid, days, activeHabits);
  const ws = buildWeeklyStats(grid, days, activeHabits);
  const todayKey = toDateKey(new Date());
  const todayStats = dayStats(grid[todayKey] || {}, activeHabits);
  const cs = currentStreak(grid, activeHabits);
  const ls = longestStreak(grid, activeHabits);
  const fs = focusScore(grid, days, activeHabits);
  const rows = habitRows(grid, days, activeHabits);

  return (
    <main className="forge-screen">
      {/* LEFT SIDEBAR */}
      <section className="left-panel">
        <div className="brand-block">
          <h1>{monthDate.toLocaleDateString("en-US", { month: "long" })}</h1>
          <span>Day Forge Tracker</span>
        </div>
        <div className="select-row">
          <label>Month<select value={monthDate.getMonth()} onChange={e => setMonthDate(new Date(monthDate.getFullYear(), Number(e.target.value), 1))}>
            {Array.from({length:12},(_,i)=><option key={i} value={i}>{new Date(2026,i,1).toLocaleDateString("en-US",{month:"long"})}</option>)}
          </select></label>
          <label>Year<select value={monthDate.getFullYear()} onChange={e => setMonthDate(new Date(Number(e.target.value), monthDate.getMonth(), 1))}>
            {[2025,2026,2027].map(y=><option key={y}>{y}</option>)}
          </select></label>
        </div>
        <figure className="focus-card">
          <img src={heroImg} alt="Warrior training" />
          <figcaption>❝ {quote} ❞</figcaption>
        </figure>
        <div className="habit-list-card">
          <h2>✦ Daily Habits</h2>
          <ol>
            {activeHabits.map(h => (
              <li key={h.id}><span>{h.title}</span><button type="button" onClick={() => deleteHabit(h.id)} aria-label={`Delete ${h.title}`}>×</button></li>
            ))}
          </ol>
        </div>
        <form className="add-habit" onSubmit={addHabit}>
          <input value={habitDraft} onChange={e => setHabitDraft(e.target.value)} placeholder="Add a habit" maxLength={80} />
          <button type="submit">Add</button>
        </form>
        <div className="account-row">
          <button className="auth-button" type="button" onClick={handleAuth}>Sign out</button>
          <button className="theme-button small" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀️" : "🌙"}</button>
        </div>
        <p className="sync-line">{syncState} · {welcomeState}</p>
      </section>

      {/* CENTER PANEL */}
      <section className="center-panel" style={{"--days": days.length}}>
        <MissionBanner missionLine={missionLine} pct={ms.pct} todayStats={todayStats} cs={cs} ws={ws} activeHabits={activeHabits} />
        <ProgressBar pct={ms.pct} done={ms.done} total={ms.total} daysCount={days.length} />
        <Heatmap days={days} grid={grid} habits={activeHabits} todayKey={todayKey} selectedDate={selectedDate} onSelect={setSelectedDate} onToggle={toggleHabit} monthDate={monthDate} />
        <WeeklySection weeks={ws} />
      </section>

      {/* RIGHT PANEL */}
      <section className="right-panel">
        <div className="stat-cards">
          <div className="stat-card"><div className="stat-icon">🔥</div><span className="stat-value">{cs}</span><div className="stat-label">Current Streak</div></div>
          <div className="stat-card"><div className="stat-icon">✅</div><span className="stat-value">{todayStats.done}</span><div className="stat-label">Done Today</div></div>
          <div className="stat-card"><div className="stat-icon">📈</div><span className="stat-value">{ms.pct}%</span><div className="stat-label">Completion</div></div>
          <div className="stat-card"><div className="stat-icon">🎯</div><span className="stat-value">{fs}</span><div className="stat-label">Focus Score</div></div>
        </div>
        <TopHabitsCard rows={rows} />
        <DailyProgressCard rows={rows} daysCount={days.length} />
        <div className="quote-strip">✦ Keep forging. You've got this. ✦</div>
      </section>
    </main>
  );
}

/* ── SUB-COMPONENTS ────────────────── */

function Ring({ value, size = 80 }) {
  return (
    <svg className="ring" width={size} height={size} viewBox="0 0 100 100" style={{ "--value": value }}>
      <circle className="ring-bg" cx="50" cy="50" r="39" />
      <circle className="ring-fg" cx="50" cy="50" r="39" />
      <text x="50" y="55" textAnchor="middle">{value}%</text>
    </svg>
  );
}

function MissionBanner({ missionLine, pct, todayStats, cs, ws, activeHabits }) {
  return (
    <div className="mission-banner">
      <div>
        <div className="mission-kicker">Today's Mission</div>
        <h2>{missionLine}</h2>
        <p>Stay consistent. Every checked habit compounds into something extraordinary.</p>
      </div>
      <div className="mission-ring"><Ring value={pct} size={90} /></div>
    </div>
  );
}

function ProgressBar({ pct, done, total, daysCount }) {
  return (
    <div className="progress-banner">
      <div className="progress-banner-label"> Monthly Progress</div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      <div className="progress-meta">
        <span><strong>{done}</strong> of {total} completed</span>
        <span><strong>{pct}%</strong></span>
      </div>
    </div>
  );
}

function Heatmap({ days, grid, habits, todayKey, selectedDate, onSelect, onToggle, monthDate }) {
  const weekdays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  function cellLevel(d) {
    const k = toDateKey(d), c = grid[k] || {};
    const done = habits.filter(h => c[h.id]).length;
    if (!habits.length || done === 0) return 0;
    const r = done / habits.length;
    if (r <= 0.25) return 1; if (r <= 0.5) return 2; if (r <= 0.75) return 3; if (r < 1) return 4; return 5;
  }

  // Build a 7-row × N-col grid where each day goes into its weekday row
  const firstDow = (days[0].getDay() + 6) % 7; // 0=Mon
  const totalCols = days.length;

  return (
    <div className="heatmap-card" style={{"--days": totalCols}}>
      <div className="heatmap-title">🗓 {monthDate.toLocaleDateString("en-US",{month:"long",year:"numeric"})} · Consistency Heatmap</div>
      <div className="heatmap-grid">
        {/* Column headers: day numbers */}
        <div className="day-label"></div>
        {days.map(d => {
          const k = toDateKey(d);
          return <div key={k} className={`col-header ${k === todayKey ? "today-col" : ""}`}>{d.getDate()}</div>;
        })}

        {/* Weekday rows */}
        {weekdays.map((wd, wi) => (
          <React.Fragment key={wd}>
            <div className="day-label">{wd}</div>
            {days.map(d => {
              const dow = (d.getDay() + 6) % 7;
              const k = toDateKey(d);
              if (dow !== wi) return <div key={k} className="heatmap-cell lv0" style={{opacity:0,pointerEvents:'none'}} />;
              const lv = cellLevel(d);
              const st = dayStats(grid[k]||{}, habits);
              return (
                <button key={k}
                  className={`heatmap-cell lv${lv} ${k === todayKey ? "today" : ""} ${k === selectedDate ? "selected" : ""}`}
                  onClick={() => onSelect(k)}
                  title={`${k}: ${st.done}/${st.total}`}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="heatmap-legend">
        <span><i className="heatmap-cell lv0" style={{display:'inline-block'}} /> 0%</span>
        <span><i className="heatmap-cell lv1" style={{display:'inline-block'}} /> 1-25%</span>
        <span><i className="heatmap-cell lv2" style={{display:'inline-block'}} /> 26-50%</span>
        <span><i className="heatmap-cell lv3" style={{display:'inline-block'}} /> 51-75%</span>
        <span><i className="heatmap-cell lv4" style={{display:'inline-block'}} /> 76-99%</span>
        <span><i className="heatmap-cell lv5" style={{display:'inline-block'}} /> 100%</span>
      </div>
    </div>
  );
}

/* monthDate passed via closure in App */

function WeeklySection({ weeks }) {
  return (
    <div className="weekly-card">
      <div className="weekly-title">📊 Weekly Progress</div>
      <div className="ring-row">
        {weeks.map(w => (
          <div className="week-ring" key={w.label}>
            <Ring value={w.pct} size={72} />
            <span>{w.label}</span>
            <span className="week-meta">{w.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopHabitsCard({ rows }) {
  const top = rows.slice(0, 5);
  return (
    <div className="top-habits-card">
      <div className="card-header"><h3>Top Habits</h3><span className="view-all">View All</span></div>
      <div className="top-habits-list">
        {top.map((r, i) => (
          <div className="top-habit-row" key={r.id}>
            <div className="rank">{i + 1}</div>
            <div>
              <div className="top-habit-name">{r.title}</div>
              <div className="top-habit-bar"><div className="top-habit-fill" style={{ width: `${r.pct}%` }} /></div>
            </div>
            <div className="top-habit-pct">{r.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyProgressCard({ rows, daysCount }) {
  return (
    <div className="daily-progress-card">
      <div className="card-header"><h3>Daily Metrics</h3></div>
      <div className="daily-progress-list">
        <table className="dp-table">
          <thead><tr><th>Habit</th><th>Goal</th><th>Progress</th><th>Streak</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.targetPerWeek}/wk</td>
                <td><span className="mini-bar"><i style={{width:`${r.pct}%`}} /></span> {r.pct}%</td>
                <td className="streak">🔥 {r.streak}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
