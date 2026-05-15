import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { initializeApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut
} from "firebase/auth";

const VITE_ENV = import.meta.env || {};
const RUNTIME_CONFIG = window.DAYFORGE_CONFIG || {};
const ENV_FIREBASE = {
  apiKey: VITE_ENV.VITE_FIREBASE_API_KEY || "",
  authDomain: VITE_ENV.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: VITE_ENV.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: VITE_ENV.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: VITE_ENV.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: VITE_ENV.VITE_FIREBASE_APP_ID || "",
  measurementId: VITE_ENV.VITE_FIREBASE_MEASUREMENT_ID || "",
};
const CONFIG = {
  apiBaseUrl: String(RUNTIME_CONFIG.apiBaseUrl || VITE_ENV.VITE_API_BASE_URL || "").trim(),
  appTimezone: RUNTIME_CONFIG.appTimezone || VITE_ENV.VITE_APP_TIMEZONE || "Asia/Kolkata",
  firebase: { ...ENV_FIREBASE, ...(RUNTIME_CONFIG.firebase || {}) }
};

const QUOTES = [
  "Discipline is the forge. Habits are the hammer. You are the blacksmith.",
  "Small wins today become visible confidence tomorrow.",
  "Keep the promise small enough to do and serious enough to matter.",
  "A warrior is built by repeated promises kept quietly.",
  "Forge Discipline. Build Legacy. Stay unstoppable.",
  "Consistency today. Mastery tomorrow. Keep forging momentum.",
  "The pain you feel today is the strength you feel tomorrow.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Your consistency is stronger than your motivation.",
  "I forge strength daily. Discipline today, power forever.",
  "Progress loves clarity. Check the box, then move again.",
  "One more rep. One more day. One more promise kept.",
  "Champions are made when nobody is watching.",
  "Every expert was once a beginner who refused to quit.",
];

const MISSION_LINES = [
  "You're forging momentum.", "Stay consistent. Stay unstoppable.",
  "Every small action compounds.", "Forge your legacy, one habit at a time.",
  "The grind is the glory.", "Discipline equals freedom.",
  "Build the habit. Become the person.", "Today's effort is tomorrow's strength.",
  "Your future self will thank you.", "Win the day. Win the month.",
];

const BOTTOM_QUOTES = [
  "Keep forging. You've got this.",
  "Your consistency is showing. Don't stop.",
  "Every checked box is a promise kept.",
  "Small wins stack into massive results.",
  "The streak doesn't build itself. You do.",
  "Momentum is built one habit at a time.",
  "Stay locked in. Stay dangerous.",
  "You're stronger than your excuses.",
];

const LEGACY_DEFAULT_HABIT_IDS = new Set([
  "clean-room", "assignments", "digital-files", "read",
  "exercise", "water", "plan", "meditate",
]);

const HERO_IMAGES = [
  // Gym & Weightlifting
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=480&q=75",
  "https://images.unsplash.com/photo-1549476464-37392f717541?w=480&q=75",
  "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=480&q=75",
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=480&q=75",
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=480&q=75",
  "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=480&q=75",
  "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=480&q=75",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=480&q=75",
  "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=480&q=75",
  "https://images.unsplash.com/photo-1605296867424-35fc25c9212a?w=480&q=75",
  // Boxing & Combat
  "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=480&q=75",
  "https://images.unsplash.com/photo-1615117950532-1f0252ad0a44?w=480&q=75",
  "https://images.unsplash.com/photo-1517438322307-e67111335449?w=480&q=75",
  // Running & Cardio
  "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=480&q=75",
  "https://images.unsplash.com/photo-1486218119243-13883505764c?w=480&q=75",
  "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=480&q=75",
  "https://images.unsplash.com/photo-1461896836934-bd45ba7d5820?w=480&q=75",
  "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=480&q=75",
  // Yoga & Meditation
  "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=480&q=75",
  "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=480&q=75",
  "https://images.unsplash.com/photo-1545389336-cf090694435e?w=480&q=75",
  // Crossfit & HIIT
  "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=480&q=75",
  "https://images.unsplash.com/photo-1556817411-31ae72fa3ea0?w=480&q=75",
  "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=480&q=75",
  "https://images.unsplash.com/photo-1550345332-09e3ac987658?w=480&q=75",
  // Nature & Mountains (discipline/adventure)
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=480&q=75",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=480&q=75",
  "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=480&q=75",
  "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=480&q=75",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=480&q=75",
  // Focus & Workspace
  "https://images.unsplash.com/photo-1488998427799-e3362cec87c3?w=480&q=75",
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=480&q=75",
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?w=480&q=75",
  // Dark moody / aesthetic
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=480&q=75",
  "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=480&q=75",
  "https://images.unsplash.com/photo-1551632811-561732d1e306?w=480&q=75",
  // Swimming & Water
  "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=480&q=75",
  "https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=480&q=75",
  // Martial Arts
  "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=480&q=75",
  "https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?w=480&q=75",
  // Athletic / Sports
  "https://images.unsplash.com/photo-1461897104016-0b3b00b1dce4?w=480&q=75",
  "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=480&q=75",
  "https://images.unsplash.com/photo-1547483238-f400e65ccd56?w=480&q=75",
  // Sunrise / Motivation
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=480&q=75",
  "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=480&q=75",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=480&q=75",
  // Night sky / Stars (cosmic theme)
  "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=480&q=75",
  "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=480&q=75",
  "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=480&q=75",
  "https://images.unsplash.com/photo-1520034475321-cbe63696469a?w=480&q=75",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function toDateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function monthDays(d) { const y=d.getFullYear(),m=d.getMonth(),t=new Date(y,m+1,0).getDate(); return Array.from({length:t},(_,i)=>new Date(y,m,i+1)); }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function readLocal(u,k) { try{return JSON.parse(localStorage.getItem(`dayforge_${u}_${k}`))||{}}catch{return{}} }
function writeLocal(u,k,v) { localStorage.setItem(`dayforge_${u}_${k}`,JSON.stringify(v)); }
function readLocalWorkspace(u) { return readLocal(u, "workspace"); }
function writeLocalWorkspace(u, workspace) { writeLocal(u, "workspace", workspace); }
function apiBase() { const c=String(CONFIG.apiBaseUrl||"").trim().replace(/\/$/,""); if(c) return c; if(location.hostname==="127.0.0.1"||location.hostname==="localhost") return "http://127.0.0.1:8000"; return location.origin; }
function hasFirebaseConfig() { const f=CONFIG.firebase||{}; return Boolean(f.apiKey&&f.authDomain&&f.projectId&&f.appId); }
function normalizeHabit(h) { return { id:String(h.id||uid()), title:String(h.title||"New habit").slice(0,90), category:String(h.category||"Focus").slice(0,40), targetPerWeek:Math.max(1,Math.min(7,Number(h.targetPerWeek||h.target||5))), active:h.active!==false, createdAt:h.createdAt||new Date().toISOString() }; }
function isLegacyDefaultHabit(h) { return LEGACY_DEFAULT_HABIT_IDS.has(String(h.id || "")); }
function workspaceFor(user, habits, reminders = []) { return { profile: { displayName: user.displayName || user.email || "Warrior", mission: "Win the month." }, habits: habits.filter(h => !isLegacyDefaultHabit(h)), reminders, notificationSettings: { enabled: Boolean(user.email), email: user.email || "", timezone: CONFIG.appTimezone } }; }
async function apiMessage(response, fallback) { try { const body = await response.json(); return body.detail || body.error || fallback; } catch { return fallback; } }

function dayStats(checks={}, habits=[]) { const t=habits.length||1, d=habits.filter(h=>checks[h.id]).length; return {done:d,total:t,pct:Math.round((d/t)*100)}; }
function buildMonthStats(grid,days,habits) { const daily=days.map(d=>dayStats(grid[toDateKey(d)]||{},habits)); const done=daily.reduce((s,i)=>s+i.done,0); const total=daily.reduce((s,i)=>s+i.total,0)||1; return {daily,done,total,pct:Math.round((done/total)*100)}; }
function buildWeeklyStats(grid,days,habits) { const chunks=[]; for(let i=0;i<days.length;i+=7) chunks.push(days.slice(i,i+7)); return chunks.map((c,i)=>{const s=buildMonthStats(grid,c,habits); const f=c[0],l=c[c.length-1]; return {...s,label:`Week ${i+1}`,range:`${f.toLocaleDateString("en-US",{month:"short",day:"numeric"})} - ${l.toLocaleDateString("en-US",{month:"short",day:"numeric"})}`};}); }
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
  const [habits, setHabits] = useState([]);
  const [grid, setGrid] = useState({});
  const [theme, setTheme] = useState(localStorage.getItem("dayforge_theme") || "dark");
  const [syncState, setSyncState] = useState("Waiting for sign in");
  const [habitDraft, setHabitDraft] = useState("");
  const [welcomeState, setWelcomeState] = useState("");
  const [heroImg] = useState(() => pick(HERO_IMAGES));
  const [quote] = useState(() => pick(QUOTES));
  const [missionLine] = useState(() => pick(MISSION_LINES));
  const [reminders, setReminders] = useState([]);
  const [reminderDraft, setReminderDraft] = useState({ title: "", date: toDateKey(new Date()), time: "09:00" });

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

  useEffect(() => {
    if (!user) return;
    const localWorkspace = readLocalWorkspace(user.uid);
    const localHabits = (localWorkspace.habits || []).map(normalizeHabit).filter(h => !isLegacyDefaultHabit(h));
    setHabits(localHabits);
    setGrid(readLocal(user.uid, monthId));
    syncFromBackend();
    sendWelcomeEmail();
  }, [user, monthId]);
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
      if (!r.ok) throw new Error(await apiMessage(r, `Snapshot failed (${r.status})`));
      const p = await r.json();
      const wh = (p.workspace?.habits || []).map(normalizeHabit).filter(h => h.active && !isLegacyDefaultHabit(h));
      if (wh.length) {
        setHabits(wh);
        writeLocalWorkspace(user.uid, { ...(p.workspace || {}), habits: wh });
      }
      setReminders(p.workspace?.reminders || []);
      const ng = {};
      days.forEach(d => { const k = toDateKey(d); ng[k] = p.days?.[k]?.habitChecks || {}; });
      setGrid(c => ({ ...ng, ...c }));
      setSyncState(`Backend connected: ${p.primaryStore || "backend"}`);
    } catch (error) { setSyncState(`Backend offline: ${error.message}`); }
  }

  async function saveWorkspace(nh) {
    if (!user) return;
    const workspace = workspaceFor(user, nh, reminders);
    writeLocalWorkspace(user.uid, workspace);
    try {
      const r = await fetch(`${apiBase()}/api/workspace`, {
        method: "PUT", headers: await authHeaders(),
        body: JSON.stringify({ workspace })
      });
      if (!r.ok) throw new Error(await apiMessage(r, `Workspace save failed (${r.status})`));
      const p = await r.json();
      if (p.workspace) writeLocalWorkspace(user.uid, p.workspace);
      setSyncState(`Habits saved: ${p.store || "backend"}`);
    } catch (error) { setSyncState(`Saved locally: ${error.message}`); }
  }

  async function sendWelcomeEmail() {
    if (!user) return;
    if (!user.email) { setWelcomeState("No Google email found"); return; }
    try {
      setWelcomeState("Sending welcome...");
      const r = await fetch(`${apiBase()}/api/notifications/welcome`, { method: "POST", headers: await authHeaders(), body: JSON.stringify({ email: user.email, displayName: user.displayName || "Warrior" }) });
      if (!r.ok) throw new Error(await apiMessage(r, `Welcome failed (${r.status})`));
      const p = await r.json();
      setWelcomeState(p.alreadySent ? "Welcome already sent" : "Welcome sent");
    } catch (error) { setWelcomeState(`Welcome failed: ${error.message}`); }
  }

  async function pushDay(dk, checks) {
    if (!user) return;
    try {
      const done = activeHabits.filter(h => checks[h.id]).length;
      const status = done === activeHabits.length ? "won" : done > 0 ? "neutral" : "missed";
      const r = await fetch(`${apiBase()}/api/days/${dk}`, {
        method: "PUT", headers: await authHeaders(),
        body: JSON.stringify({ day: { dateKey: dk, status, focusLine: quote, habitChecks: checks, tasks: activeHabits.map(h => ({ id: h.id, title: h.title, text: h.title, done: Boolean(checks[h.id]), priority: "medium", estimateMins: 20 })) } })
      });
      if (!r.ok) throw new Error(await apiMessage(r, `Day save failed (${r.status})`));
      setSyncState("Day saved");
    } catch (error) { setSyncState(`Saved locally: ${error.message}`); }
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

  function addReminder(e) {
    e.preventDefault();
    const t = reminderDraft.title.trim(); if (!t) return;
    const nr = [...reminders, { id: uid(), title: t, date: reminderDraft.date, time: reminderDraft.time, category: "focus", done: false, createdAt: new Date().toISOString() }];
    setReminders(nr);
    setReminderDraft({ title: "", date: toDateKey(new Date()), time: "09:00" });
    saveWorkspaceWithReminders(nr);
  }

  function deleteReminder(rid) {
    const nr = reminders.filter(r => r.id !== rid);
    setReminders(nr);
    saveWorkspaceWithReminders(nr);
  }

  async function saveWorkspaceWithReminders(nr) {
    if (!user) return;
    const workspace = workspaceFor(user, habits, nr);
    writeLocalWorkspace(user.uid, workspace);
    try {
      const r = await fetch(`${apiBase()}/api/workspace`, {
        method: "PUT", headers: await authHeaders(),
        body: JSON.stringify({ workspace })
      });
      if (!r.ok) throw new Error(await apiMessage(r, `Save failed (${r.status})`));
      setSyncState("Reminders saved");
    } catch (error) { setSyncState(`Saved locally: ${error.message}`); }
  }

  async function handleAuth() { if (!auth) return; if (auth.currentUser) await signOut(auth); else await signInWithPopup(auth, new GoogleAuthProvider()); }

  if (!authReady) return (
    <div className="gate-screen">
      <div className="loading-splash">
        <div className="loading-bg"><img src={heroImg} alt="" onError={e => {e.target.style.display='none'}} /></div>
        <div className="loading-content">
          <div className="loading-ring">
            <svg viewBox="0 0 100 100" width="90" height="90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(167,139,250,0.08)" strokeWidth="3"/>
              <circle cx="50" cy="50" r="42" fill="none" stroke="url(#loadGrad)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="60 200" className="loading-arc"/>
              <defs><linearGradient id="loadGrad"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#f472b6"/></linearGradient></defs>
            </svg>
          </div>
          <h1 className="loading-brand">DayForge</h1>
          <p className="loading-tagline">Forging your discipline engine<span className="loading-dots"><span>.</span><span>.</span><span>.</span></span></p>
          <div className="loading-pills">
            <span>Heatmap</span>
            <span>Streaks</span>
            <span>Reminders</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="gate-screen">
        <section className="gate-card">
          <div>
            <span className="gate-kicker">Day Forge</span>
            <h1>Your habit command center awaits.</h1>
            <p>Track habits with a cosmic heatmap, build unbreakable streaks, get email reminders, and forge discipline that compounds.</p>
            <div className="gate-features">
              <span className="gate-feature"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg> Habit Heatmap</span>
              <span className="gate-feature"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> Email Reminders</span>
              <span className="gate-feature"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg> Streak Analytics</span>
            </div>
            <div className="gate-actions">
              <button type="button" className="primary-button gate-cta" onClick={handleAuth}>Sign in with Google</button>
            </div>
            <small className="gate-status">{syncState}</small>
          </div>
          <div className="gate-visual">
            <img src={heroImg} alt="" onError={e => {e.target.style.display='none'}} />
          </div>
        </section>
      </div>
    );
  }

  if (activeHabits.length === 0) {
    return (
      <div className="gate-screen">
        <section className="gate-card first-habit-card">
          <div>
            <span className="gate-kicker">Almost there</span>
            <h1>Add your first habit to unlock the dashboard.</h1>
            <p>Start with one real habit. Your heatmap, streaks, and reminders activate once you add it.</p>
            <form className="first-habit-form" onSubmit={addHabit}>
              <input value={habitDraft} onChange={e => setHabitDraft(e.target.value)} placeholder="e.g. Study for 45 minutes" maxLength={80} autoFocus />
              <button type="submit">Launch</button>
            </form>
            <div className="habit-suggestions">
              {["Exercise 30 min","Read 10 pages","Meditate 10 min","No junk food","Sleep by 11pm"].map(s => (
                <button key={s} type="button" className="suggestion-chip" onClick={() => setHabitDraft(s)}>{s}</button>
              ))}
            </div>
            <div className="first-habit-actions">
              <button className="auth-button" type="button" onClick={handleAuth}>Sign out</button>
              <button className="theme-button small" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>Theme</button>
            </div>
            <small>{syncState}</small>
          </div>
          <img src={heroImg} alt="" onError={e => {e.target.style.display='none'}} />
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
          <img src={heroImg} alt="" onError={e => {e.target.style.display='none'}} />
          <figcaption>â {quote} âž</figcaption>
        </figure>
        <div className="habit-list-card">
          <h2>âœ¦ Daily Habits</h2>
          <ol>
            {activeHabits.map(h => (
              <li key={h.id}><span>{h.title}</span><button type="button" onClick={() => deleteHabit(h.id)} aria-label={`Delete ${h.title}`}>Ã—</button></li>
            ))}
          </ol>
        </div>
        <form className="add-habit" onSubmit={addHabit}>
          <input value={habitDraft} onChange={e => setHabitDraft(e.target.value)} placeholder="Add a habit" maxLength={80} />
          <button type="submit">Add</button>
        </form>
        <div className="account-row">
          <button className="auth-button" type="button" onClick={handleAuth}>Sign out</button>
          <button className="theme-button small" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></button>
        </div>
        <p className="sync-line">{syncState} - {welcomeState}</p>
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
          <div className="stat-card"><div className="stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 23c-1.5 0-6-1-6-7 0-3 1.5-5 3-7 .5 2 2 3 3 3s2.5-1.5 3-4c2.5 3 3 5.5 3 8 0 6-4.5 7-6 7z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"/></svg></div><span className="stat-value">{cs}</span><div className="stat-label">Current Streak</div></div>
          <div className="stat-card"><div className="stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg></div><span className="stat-value">{todayStats.done}</span><div className="stat-label">Done Today</div></div>
          <div className="stat-card"><div className="stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg></div><span className="stat-value">{ms.pct}%</span><div className="stat-label">Completion</div></div>
          <div className="stat-card"><div className="stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="#22d3ee"/></svg></div><span className="stat-value">{fs}</span><div className="stat-label">Focus Score</div></div>
        </div>
        <TopHabitsCard rows={rows} />
        <ReminderCard reminders={reminders} draft={reminderDraft} setDraft={setReminderDraft} onAdd={addReminder} onDelete={deleteReminder} />
        <DailyProgressCard rows={rows} daysCount={days.length} />
        <div className="quote-strip">âœ¦ {pick(BOTTOM_QUOTES)} âœ¦</div>
      </section>
    </main>
  );
}

/* SUB-COMPONENTS */

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
  const selectedChecks = grid[selectedDate] || {};
  const selectedStats = dayStats(selectedChecks, habits);

  function cellLevel(d) {
    const k = toDateKey(d), c = grid[k] || {};
    const done = habits.filter(h => c[h.id]).length;
    if (!habits.length || done === 0) return 0;
    const r = done / habits.length;
    if (r <= 0.25) return 1; if (r <= 0.5) return 2; if (r <= 0.75) return 3; if (r < 1) return 4; return 5;
  }

  // Build a 7-row x N-col grid where each day goes into its weekday row
  const firstDow = (days[0].getDay() + 6) % 7; // 0=Mon
  const totalCols = days.length;

  return (
    <div className="heatmap-card" style={{"--days": totalCols}}>
      <div className="heatmap-title">{monthDate.toLocaleDateString("en-US",{month:"long",year:"numeric"})} - Consistency Heatmap</div>
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
      <div className="selected-day-panel">
        <div className="selected-day-head">
          <span>{selectedDate}</span>
          <strong>{selectedStats.done}/{selectedStats.total} done</strong>
        </div>
        <div className="selected-day-checks">
          {habits.map(h => {
            const checked = Boolean(selectedChecks[h.id]);
            return (
              <label className={`selected-day-check ${checked ? "done" : ""}`} key={h.id}>
                <input type="checkbox" checked={checked} onChange={() => onToggle(selectedDate, h.id)} />
                <span>{h.title}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* monthDate passed via closure in App */

function WeeklySection({ weeks }) {
  return (
    <div className="weekly-card">
      <div className="weekly-title">Weekly Progress</div>
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
                <td className="streak">{r.streak}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function ReminderCard({ reminders, draft, setDraft, onAdd, onDelete }) {
  const sorted = [...reminders].sort((a, b) => (a.date + "T" + a.time).localeCompare(b.date + "T" + b.time));
  return (
    <div className="reminder-card">
      <div className="card-header">
        <h3>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign:'middle',marginRight:4}}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          Reminders
        </h3>
        <span className="view-all" style={{color:'var(--amber)'}}>{reminders.length} set</span>
      </div>
      <form className="reminder-form" onSubmit={onAdd}>
        <input placeholder="Reminder title" value={draft.title} onChange={e => setDraft({...draft, title: e.target.value})} maxLength={60} required />
        <input type="date" value={draft.date} onChange={e => setDraft({...draft, date: e.target.value})} required />
        <input type="time" value={draft.time} onChange={e => setDraft({...draft, time: e.target.value})} required />
        <button type="submit">+</button>
      </form>
      <div className="reminder-list">
        {sorted.length === 0 && <div className="reminder-empty">No reminders yet. Add one to get email notifications!</div>}
        {sorted.map(r => (
          <div className="reminder-item" key={r.id}>
            <span className="r-title">{r.title}</span>
            <span className="r-time">{r.time}</span>
            <span className="r-date">{r.date}</span>
            <button className="r-del" type="button" onClick={() => onDelete(r.id)} title="Delete">&times;</button>
          </div>
        ))}
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
