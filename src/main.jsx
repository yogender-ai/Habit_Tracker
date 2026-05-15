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
const DAY_START_HOUR = Math.max(0, Math.min(23, Number(RUNTIME_CONFIG.dayStartHour || VITE_ENV.VITE_DAY_START_HOUR || 6)));
const LOCAL_HERO_IMAGE = "/dayforge-visual.svg";

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
function dayforgeDate(now = new Date()) { const d = new Date(now); if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1); d.setHours(0,0,0,0); return d; }
function dayforgeTodayKey(now = new Date()) { return toDateKey(dayforgeDate(now)); }
function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function monthDays(d) { const y=d.getFullYear(),m=d.getMonth(),t=new Date(y,m+1,0).getDate(); return Array.from({length:t},(_,i)=>new Date(y,m,i+1)); }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function readLocal(u,k) { try{return JSON.parse(localStorage.getItem(`dayforge_${u}_${k}`))||{}}catch{return{}} }
function writeLocal(u,k,v) { localStorage.setItem(`dayforge_${u}_${k}`,JSON.stringify(v)); }
function readLocalWorkspace(u) { return readLocal(u, "workspace"); }
function writeLocalWorkspace(u, workspace) { writeLocal(u, "workspace", workspace); }
function readPrivacySettings(u) { return readLocal(u, "privacy"); }
function writePrivacySettings(u, settings) { writeLocal(u, "privacy", settings); }
function apiBase() { const c=String(CONFIG.apiBaseUrl||"").trim().replace(/\/$/,""); if(c) return c; if(location.hostname==="127.0.0.1"||location.hostname==="localhost") return "http://127.0.0.1:8000"; return location.origin; }
function hasFirebaseConfig() { const f=CONFIG.firebase||{}; return Boolean(f.apiKey&&f.authDomain&&f.projectId&&f.appId); }
function normalizeHabit(h) { return { id:String(h.id||uid()), title:String(h.title||"New habit").slice(0,90), category:String(h.category||"Focus").slice(0,40), targetPerWeek:Math.max(1,Math.min(7,Number(h.targetPerWeek||h.target||5))), active:h.active!==false, createdAt:h.createdAt||new Date().toISOString() }; }
function isLegacyDefaultHabit(h) { return LEGACY_DEFAULT_HABIT_IDS.has(String(h.id || "")); }
function privacyIsEnabled(settings = {}) { return Boolean(settings.enabled && settings.pinHash && settings.salt); }
function normalizePrivacySettings(settings = {}) {
  return {
    enabled: privacyIsEnabled(settings),
    salt: String(settings.salt || ""),
    pinHash: String(settings.pinHash || ""),
    updatedAt: settings.updatedAt || "",
  };
}
function privacyUpdatedAt(settings = {}) {
  const time = Date.parse(settings.updatedAt || "");
  return Number.isFinite(time) ? time : 0;
}
function newestPrivacySettings(localSettings = {}, remoteSettings = {}) {
  const local = normalizePrivacySettings(localSettings);
  const remote = normalizePrivacySettings(remoteSettings);
  if (!remote.updatedAt && !remote.pinHash) return local;
  if (!local.updatedAt && !local.pinHash) return remote;
  return privacyUpdatedAt(remote) >= privacyUpdatedAt(local) ? remote : local;
}
function defaultDisplayName(user) {
  const raw = user?.displayName || user?.email?.split("@")[0] || "Champion";
  return String(raw).trim() || "Champion";
}
function workspaceFor(user, habits, reminders = [], profile = {}, settings = {}, privacy = {}) {
  const email = settings.email || user?.email || "";
  const cleanPrivacy = normalizePrivacySettings(privacy);
  return {
    profile: {
      ...profile,
      displayName: String(profile.displayName || defaultDisplayName(user)).trim().slice(0, 80),
      mission: profile.mission || "Win the month.",
    },
    habits: habits.filter(h => !isLegacyDefaultHabit(h)),
    reminders,
    notificationSettings: {
      ...settings,
      enabled: Boolean(email),
      email,
      timezone: settings.timezone || CONFIG.appTimezone,
    },
    privacySettings: cleanPrivacy,
  };
}
async function apiMessage(response, fallback) { try { const body = await response.json(); return body.detail || body.error || fallback; } catch { return fallback; } }
function handleImageError(event) {
  const image = event.currentTarget;
  if (image.dataset.fallbackApplied) return;
  image.dataset.fallbackApplied = "true";
  image.src = LOCAL_HERO_IMAGE;
}
function prettyReminderDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const today = dayforgeTodayKey();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (value === today) return "Today";
  if (value === toDateKey(tomorrow)) return "Tomorrow";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function prettyReminderTime(value) {
  const [hour = "09", minute = "00"] = String(value || "09:00").split(":");
  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function reminderStamp(reminder) { return `${reminder.date || ""}T${reminder.time || "00:00"}`; }
function normalizeExtraItem(item = {}) {
  const title = String(item.title || item.text || "").trim().slice(0, 90);
  if (!title) return null;
  return {
    id: String(item.id || uid()),
    title,
    text: title,
    done: Boolean(item.done),
    priority: ["low", "medium", "high"].includes(item.priority) ? item.priority : "medium",
    createdAt: item.createdAt || new Date().toISOString(),
  };
}
function normalizeReminder(reminder = {}) {
  return {
    id: String(reminder.id || uid()),
    title: String(reminder.title || "Reminder").trim().slice(0, 120),
    date: reminder.date || dayforgeTodayKey(),
    time: reminder.time || "09:00",
    category: reminder.category || "focus",
    priority: reminder.priority === "high" ? "high" : "normal",
    notify: reminder.notify !== false,
    done: Boolean(reminder.done),
    lastNotifiedKey: reminder.lastNotifiedKey || "",
    createdAt: reminder.createdAt || new Date().toISOString(),
    updatedAt: reminder.updatedAt || new Date().toISOString(),
  };
}
function pinDigits(value) { return String(value || "").replace(/\D/g, "").slice(0, 4); }
function randomSalt() {
  const bytes = new Uint8Array(16);
  if (crypto.getRandomValues) crypto.getRandomValues(bytes);
  else bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
function simpleHash(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
async function hashPin(pin, salt) {
  const input = `${salt}:${pin}`;
  if (!crypto.subtle) return simpleHash(input);
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

function dayStats(checks={}, habits=[]) { const t=habits.length||1, d=habits.filter(h=>checks[h.id]).length; return {done:d,total:t,pct:Math.round((d/t)*100)}; }
function buildMonthStats(grid,days,habits) { const daily=days.map(d=>dayStats(grid[toDateKey(d)]||{},habits)); const done=daily.reduce((s,i)=>s+i.done,0); const total=daily.reduce((s,i)=>s+i.total,0)||1; return {daily,done,total,pct:Math.round((done/total)*100)}; }
function buildWeeklyStats(grid,days,habits) { const chunks=[]; for(let i=0;i<days.length;i+=7) chunks.push(days.slice(i,i+7)); return chunks.map((c,i)=>{const s=buildMonthStats(grid,c,habits); const f=c[0],l=c[c.length-1]; return {...s,label:`Week ${i+1}`,range:`${f.toLocaleDateString("en-US",{month:"short",day:"numeric"})} - ${l.toLocaleDateString("en-US",{month:"short",day:"numeric"})}`};}); }
function habitRows(grid,days,habits) { return habits.map(h=>{const vals=days.map(d=>Boolean(grid[toDateKey(d)]?.[h.id])); const done=vals.filter(Boolean).length; let best=0,run=0; vals.forEach(v=>{run=v?run+1:0;best=Math.max(best,run)}); return {...h,done,total:days.length,pct:Math.round((done/days.length)*100),streak:best};}).sort((a,b)=>b.pct-a.pct||a.title.localeCompare(b.title)); }
function currentStreak(grid,habits) { const today=dayforgeDate(); let streak=0; for(let i=0;i<365;i++){const d=new Date(today);d.setDate(d.getDate()-i); const k=toDateKey(d),c=grid[k]||{}; const done=habits.filter(h=>c[h.id]).length; if(done>0)streak++;else break;} return streak; }
function longestStreak(grid,habits) { const today=dayforgeDate(); let best=0,run=0; for(let i=365;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i); const k=toDateKey(d),c=grid[k]||{}; if(habits.filter(h=>c[h.id]).length>0){run++;best=Math.max(best,run)}else{run=0}} return best; }
function focusScore(grid,days,habits) { if(!habits.length)return 0; const ms=buildMonthStats(grid,days,habits); const cs=Math.min(currentStreak(grid,habits)*3,30); return Math.min(100,Math.round(ms.pct*0.7+cs)); }

function App() {
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [monthDate, setMonthDate] = useState(() => dayforgeDate());
  const [selectedDate, setSelectedDate] = useState(() => dayforgeTodayKey());
  const [habits, setHabits] = useState([]);
  const [grid, setGrid] = useState({});
  const [theme, setTheme] = useState(localStorage.getItem("dayforge_theme") || "dark");
  const [syncState, setSyncState] = useState("Waiting for sign in");
  const [habitDraft, setHabitDraft] = useState("");
  const [welcomeState, setWelcomeState] = useState("");
  const [profile, setProfile] = useState({});
  const [profileDraft, setProfileDraft] = useState("");
  const [notificationSettings, setNotificationSettings] = useState({});
  const [reminderState, setReminderState] = useState("Mail standby");
  const [privacyReady, setPrivacyReady] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({});
  const [privacyUnlocked, setPrivacyUnlocked] = useState(true);
  const [privacyPin, setPrivacyPin] = useState("");
  const [privacyUnlockPin, setPrivacyUnlockPin] = useState("");
  const [privacyMessage, setPrivacyMessage] = useState("");
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [heroImg] = useState(() => pick(HERO_IMAGES));
  const [quote] = useState(() => pick(QUOTES));
  const [missionLine] = useState(() => pick(MISSION_LINES));
  const [reminders, setReminders] = useState([]);
  const [reminderDraft, setReminderDraft] = useState({ title: "", date: dayforgeTodayKey(), time: "09:00", priority: "normal" });
  const [dailyExtras, setDailyExtras] = useState({});
  const [extraDraft, setExtraDraft] = useState("");

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
    if (!user) {
      setPrivacyReady(false);
      setPrivacyUnlocked(true);
      setPrivacyUnlockPin("");
      return;
    }
    const localWorkspace = readLocalWorkspace(user.uid);
    const localProfile = localWorkspace.profile || {};
    const nextProfile = { ...localProfile, displayName: localProfile.displayName || defaultDisplayName(user) };
    const localSettings = localWorkspace.notificationSettings || {};
    const localHabits = (localWorkspace.habits || []).map(normalizeHabit).filter(h => !isLegacyDefaultHabit(h));
    const localPrivacy = newestPrivacySettings(localWorkspace.privacySettings || {}, readPrivacySettings(user.uid));
    const privacyEnabled = privacyIsEnabled(localPrivacy);
    setPrivacySettings(localPrivacy);
    setPrivacyUnlocked(!privacyEnabled);
    setPrivacyMessage(privacyEnabled ? "PIN required" : "Privacy lock off");
    setPrivacyPin("");
    setPrivacyUnlockPin("");
    setPrivacyReady(privacyEnabled);
    setProfile(nextProfile);
    setProfileDraft(nextProfile.displayName || defaultDisplayName(user));
    setNotificationSettings(localSettings);
    setReminders((localWorkspace.reminders || []).map(normalizeReminder));
    setHabits(localHabits);
    setGrid(readLocal(user.uid, monthId));
    setDailyExtras(readLocal(user.uid, `${monthId}_extras`));
    syncFromBackend();
    sendWelcomeEmail();
  }, [user, monthId]);
  useEffect(() => { if (!user) return; writeLocal(user.uid, monthId, grid); }, [grid, monthId, user]);
  useEffect(() => { if (!user) return; writeLocal(user.uid, `${monthId}_extras`, dailyExtras); }, [dailyExtras, monthId, user]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextKey = dayforgeTodayKey();
      setSelectedDate(current => current === nextKey ? current : nextKey);
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!user) return;
    checkDueReminders();
    const timer = window.setInterval(() => checkDueReminders(), 60000);
    return () => window.clearInterval(timer);
  }, [user, reminders.length]);

  async function authHeaders() {
    const h = { "Content-Type": "application/json", "X-Demo-User": user?.uid || "dayforge-local" };
    if (auth?.currentUser) h.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
    return h;
  }

  function applyPrivacySettings(nextPrivacy, lockWhenEnabled = false) {
    if (!user) return normalizePrivacySettings(nextPrivacy);
    const cleanPrivacy = normalizePrivacySettings(nextPrivacy);
    const enabled = privacyIsEnabled(cleanPrivacy);
    writePrivacySettings(user.uid, cleanPrivacy);
    setPrivacySettings(cleanPrivacy);
    setPrivacyUnlocked(lockWhenEnabled ? !enabled : current => enabled ? current : true);
    setPrivacyMessage(enabled ? (lockWhenEnabled ? "PIN required" : "Privacy lock on") : "Privacy lock off");
    setPrivacyReady(true);
    return cleanPrivacy;
  }

  async function syncFromBackend() {
    if (!user) return;
    try {
      setSyncState("Syncing...");
      const r = await fetch(`${apiBase()}/api/snapshot?year=${monthDate.getFullYear()}`, { headers: await authHeaders() });
      if (!r.ok) throw new Error(await apiMessage(r, `Snapshot failed (${r.status})`));
      const p = await r.json();
      const wh = (p.workspace?.habits || []).map(normalizeHabit).filter(h => h.active && !isLegacyDefaultHabit(h));
      const syncedHabits = wh.length ? wh : activeHabits;
      if (wh.length) {
        setHabits(wh);
        writeLocalWorkspace(user.uid, { ...(p.workspace || {}), habits: wh });
      }
      const remoteProfile = p.workspace?.profile || {};
      const nextProfile = { ...profile, ...remoteProfile, displayName: remoteProfile.displayName || profile.displayName || defaultDisplayName(user) };
      const nextSettings = {
        ...notificationSettings,
        ...(p.workspace?.notificationSettings || {}),
        email: p.workspace?.notificationSettings?.email || user.email || notificationSettings.email || "",
        timezone: p.workspace?.notificationSettings?.timezone || CONFIG.appTimezone,
      };
      setProfile(nextProfile);
      setProfileDraft(nextProfile.displayName || defaultDisplayName(user));
      setNotificationSettings(nextSettings);
      setReminders((p.workspace?.reminders || []).map(normalizeReminder));
      const localPrivacy = newestPrivacySettings(readLocalWorkspace(user.uid).privacySettings || {}, readPrivacySettings(user.uid));
      const remotePrivacy = p.workspace?.privacySettings || {};
      const nextPrivacy = newestPrivacySettings(localPrivacy, remotePrivacy);
      applyPrivacySettings(nextPrivacy, privacyIsEnabled(nextPrivacy) && !privacyReady);
      if (privacyUpdatedAt(nextPrivacy) > privacyUpdatedAt(remotePrivacy)) {
        const mergedWorkspace = workspaceFor(user, wh.length ? wh : habits, p.workspace?.reminders || reminders, nextProfile, nextSettings, nextPrivacy);
        fetch(`${apiBase()}/api/workspace`, {
          method: "PUT",
          headers: await authHeaders(),
          body: JSON.stringify({ workspace: mergedWorkspace })
        }).catch(() => {});
      }
      const ng = {};
      const nextExtras = {};
      const habitIds = new Set(syncedHabits.map(h => h.id));
      days.forEach(d => {
        const k = toDateKey(d);
        ng[k] = p.days?.[k]?.habitChecks || {};
        const tasks = Array.isArray(p.days?.[k]?.tasks) ? p.days[k].tasks : [];
        const extras = tasks.filter(task => task && !habitIds.has(String(task.id)) && !habitIds.has(String(task.habitId))).map(normalizeExtraItem).filter(Boolean);
        if (extras.length) nextExtras[k] = extras;
      });
      setGrid(c => ({ ...ng, ...c }));
      setDailyExtras(c => ({ ...nextExtras, ...c }));
      setSyncState(`Backend connected: ${p.primaryStore || "backend"}`);
    } catch (error) { setPrivacyReady(true); setSyncState(`Backend offline: ${error.message}`); }
  }

  async function saveWorkspace(nh) {
    if (!user) return;
    const workspace = workspaceFor(user, nh, reminders, profile, notificationSettings, privacySettings);
    writeLocalWorkspace(user.uid, workspace);
    try {
      const r = await fetch(`${apiBase()}/api/workspace`, {
        method: "PUT", headers: await authHeaders(),
        body: JSON.stringify({ workspace })
      });
      if (!r.ok) throw new Error(await apiMessage(r, `Workspace save failed (${r.status})`));
      const p = await r.json();
      if (p.workspace) {
        writeLocalWorkspace(user.uid, p.workspace);
        setProfile(p.workspace.profile || workspace.profile);
        setNotificationSettings(p.workspace.notificationSettings || workspace.notificationSettings);
        applyPrivacySettings(p.workspace.privacySettings || workspace.privacySettings);
      }
      setSyncState(`Habits saved: ${p.store || "backend"}`);
    } catch (error) { setSyncState(`Saved locally: ${error.message}`); }
  }

  async function sendWelcomeEmail() {
    if (!user) return;
    if (!user.email) { setWelcomeState("No Google email found"); return; }
    try {
      setWelcomeState("Sending welcome...");
      const r = await fetch(`${apiBase()}/api/notifications/welcome`, { method: "POST", headers: await authHeaders(), body: JSON.stringify({ email: user.email, displayName: profile.displayName || user.displayName || defaultDisplayName(user) }) });
      if (!r.ok) throw new Error(await apiMessage(r, `Welcome failed (${r.status})`));
      const p = await r.json();
      setProfile(current => ({ ...current, displayName: current.displayName || defaultDisplayName(user), welcomeEmailSentAt: p.sentAt || current.welcomeEmailSentAt }));
      setNotificationSettings(current => ({ ...current, enabled: true, email: current.email || user.email, timezone: current.timezone || CONFIG.appTimezone }));
      setWelcomeState(p.alreadySent ? "Welcome already sent" : "Welcome sent");
    } catch (error) { setWelcomeState(`Welcome failed: ${error.message}`); }
  }

  function tasksForDay(dk, checks, extrasByDay = dailyExtras) {
    const extras = (extrasByDay[dk] || []).map(normalizeExtraItem).filter(Boolean);
    return [
      ...activeHabits.map(h => ({ id: h.id, title: h.title, text: h.title, done: Boolean(checks[h.id]), priority: "medium", habitId: h.id, estimateMins: 20 })),
      ...extras.map(item => ({ ...item, estimateMins: item.priority === "high" ? 45 : 25 })),
    ];
  }

  async function pushDay(dk, checks, extrasByDay = dailyExtras) {
    if (!user) return;
    try {
      const done = activeHabits.filter(h => checks[h.id]).length;
      const status = done === activeHabits.length ? "won" : done > 0 ? "neutral" : "missed";
      const r = await fetch(`${apiBase()}/api/days/${dk}`, {
        method: "PUT", headers: await authHeaders(),
        body: JSON.stringify({ day: { dateKey: dk, status, focusLine: quote, habitChecks: checks, tasks: tasksForDay(dk, checks, extrasByDay) } })
      });
      if (!r.ok) throw new Error(await apiMessage(r, `Day save failed (${r.status})`));
      setSyncState("Day saved");
    } catch (error) { setSyncState(`Saved locally: ${error.message}`); }
  }

  function toggleHabit(dk, hid) {
    setGrid(c => { const nc = { ...(c[dk] || {}), [hid]: !c[dk]?.[hid] }; pushDay(dk, nc); return { ...c, [dk]: nc }; });
  }

  function addExtraItem(e) {
    e.preventDefault();
    const item = normalizeExtraItem({ title: extraDraft, priority: "medium" });
    if (!item) return;
    const nextExtras = { ...dailyExtras, [selectedDate]: [...(dailyExtras[selectedDate] || []), item] };
    setDailyExtras(nextExtras);
    setExtraDraft("");
    pushDay(selectedDate, grid[selectedDate] || {}, nextExtras);
  }

  function toggleExtraItem(dateKey, itemId) {
    const nextExtras = {
      ...dailyExtras,
      [dateKey]: (dailyExtras[dateKey] || []).map(item => item.id === itemId ? { ...item, done: !item.done } : item)
    };
    setDailyExtras(nextExtras);
    pushDay(dateKey, grid[dateKey] || {}, nextExtras);
  }

  function deleteExtraItem(dateKey, itemId) {
    const nextItems = (dailyExtras[dateKey] || []).filter(item => item.id !== itemId);
    const nextExtras = { ...dailyExtras, [dateKey]: nextItems };
    if (!nextItems.length) delete nextExtras[dateKey];
    setDailyExtras(nextExtras);
    pushDay(dateKey, grid[dateKey] || {}, nextExtras);
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

  async function addReminder(e) {
    e.preventDefault();
    const t = reminderDraft.title.trim(); if (!t) return;
    if (reminderDraft.priority === "high" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    const nr = [...reminders, normalizeReminder({ id: uid(), title: t, date: reminderDraft.date, time: reminderDraft.time, priority: reminderDraft.priority, category: "focus", notify: true, done: false, createdAt: new Date().toISOString() })];
    setReminders(nr);
    setReminderDraft({ title: "", date: dayforgeTodayKey(), time: "09:00", priority: "normal" });
    await saveWorkspaceWithReminders(nr);
    await checkDueReminders(true);
  }

  function deleteReminder(rid) {
    const nr = reminders.filter(r => r.id !== rid);
    setReminders(nr);
    saveWorkspaceWithReminders(nr);
  }

  async function saveWorkspaceWithReminders(nr) {
    if (!user) return;
    const workspace = workspaceFor(user, habits, nr, profile, notificationSettings, privacySettings);
    writeLocalWorkspace(user.uid, workspace);
    try {
      const r = await fetch(`${apiBase()}/api/workspace`, {
        method: "PUT", headers: await authHeaders(),
        body: JSON.stringify({ workspace })
      });
      if (!r.ok) throw new Error(await apiMessage(r, `Save failed (${r.status})`));
      const p = await r.json();
      if (p.workspace) {
        writeLocalWorkspace(user.uid, p.workspace);
        setProfile(p.workspace.profile || workspace.profile);
        setNotificationSettings(p.workspace.notificationSettings || workspace.notificationSettings);
        applyPrivacySettings(p.workspace.privacySettings || workspace.privacySettings);
      }
      setSyncState("Reminders saved");
    } catch (error) { setSyncState(`Saved locally: ${error.message}`); }
  }

  async function saveProfileName(e) {
    e.preventDefault();
    if (!user) return;
    const name = profileDraft.trim();
    if (!name) return;
    const nextProfile = { ...profile, displayName: name };
    const workspace = workspaceFor(user, habits, reminders, nextProfile, notificationSettings, privacySettings);
    setProfile(nextProfile);
    writeLocalWorkspace(user.uid, workspace);
    try {
      const r = await fetch(`${apiBase()}/api/workspace`, {
        method: "PUT", headers: await authHeaders(),
        body: JSON.stringify({ workspace })
      });
      if (!r.ok) throw new Error(await apiMessage(r, `Profile save failed (${r.status})`));
      const p = await r.json();
      if (p.workspace) {
        writeLocalWorkspace(user.uid, p.workspace);
        setProfile(p.workspace.profile || workspace.profile);
        setNotificationSettings(p.workspace.notificationSettings || workspace.notificationSettings);
        applyPrivacySettings(p.workspace.privacySettings || workspace.privacySettings);
      }
      setSyncState("Profile saved");
    } catch (error) {
      setSyncState(`Profile saved locally: ${error.message}`);
    }
  }

  async function checkDueReminders(force = false) {
    if (!user || (!force && reminders.length === 0)) {
      if (user) setReminderState("Mail armed");
      return;
    }
    try {
      setReminderState("Checking mail");
      const r = await fetch(`${apiBase()}/api/notifications/my-due?window_minutes=180`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(await apiMessage(r, `Reminder check failed (${r.status})`));
      const p = await r.json();
      if (!p.ok) throw new Error(p.failures?.[0]?.error || "Reminder mail provider rejected the send.");
      if (p.workspace?.reminders) {
        setReminders(p.workspace.reminders.map(normalizeReminder));
        writeLocalWorkspace(user.uid, p.workspace);
      }
      const highPriority = (p.sentReminders || []).filter(item => item.priority === "high");
      if (highPriority.length && "Notification" in window && Notification.permission === "granted") {
        highPriority.slice(0, 3).forEach(item => {
          new Notification(`Priority: ${item.title}`, { body: "DayForge high-priority reminder is due now." });
        });
      }
      setReminderState(p.sent ? `${p.sent} email sent` : "Mail armed");
    } catch (error) {
      setReminderState(`Mail paused`);
    }
  }

  async function enablePrivacyLock(e) {
    e.preventDefault();
    if (!user) return;
    const pin = pinDigits(privacyPin);
    if (pin.length !== 4) {
      setPrivacyMessage("Use exactly 4 numbers");
      return;
    }
    const salt = randomSalt();
    const pinHash = await hashPin(pin, salt);
    const settings = { enabled: true, salt, pinHash, updatedAt: new Date().toISOString() };
    applyPrivacySettings(settings);
    setPrivacyUnlocked(true);
    setPrivacyPin("");
    setPrivacyMessage("Privacy lock on");
    await savePrivacySettings(settings);
  }

  async function disablePrivacyLock() {
    if (!user) return;
    const settings = { enabled: false, updatedAt: new Date().toISOString() };
    applyPrivacySettings(settings);
    setPrivacyUnlocked(true);
    setPrivacyPin("");
    setPrivacyUnlockPin("");
    setPrivacyMessage("Privacy lock off");
    await savePrivacySettings(settings);
  }

  async function savePrivacySettings(nextPrivacy) {
    if (!user) return;
    const workspace = workspaceFor(user, habits, reminders, profile, notificationSettings, nextPrivacy);
    const cached = { ...readLocalWorkspace(user.uid), ...workspace };
    writeLocalWorkspace(user.uid, cached);
    try {
      const r = await fetch(`${apiBase()}/api/workspace`, {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({ workspace })
      });
      if (!r.ok) throw new Error(await apiMessage(r, `Privacy save failed (${r.status})`));
      const p = await r.json();
      if (p.workspace) {
        writeLocalWorkspace(user.uid, p.workspace);
        applyPrivacySettings(p.workspace.privacySettings || nextPrivacy);
      }
      setSyncState("Privacy saved");
    } catch (error) {
      setSyncState(`Privacy saved locally: ${error.message}`);
    }
  }

  async function unlockPrivacy(e) {
    e.preventDefault();
    const pin = pinDigits(privacyUnlockPin);
    if (!privacySettings.pinHash || !privacySettings.salt) {
      setPrivacyUnlocked(true);
      return;
    }
    if (pin.length !== 4) {
      setPrivacyMessage("Enter 4 numbers");
      return;
    }
    const pinHash = await hashPin(pin, privacySettings.salt);
    if (pinHash !== privacySettings.pinHash) {
      setPrivacyUnlockPin("");
      setPrivacyMessage("Wrong PIN");
      return;
    }
    setPrivacyUnlocked(true);
    setPrivacyUnlockPin("");
    setPrivacyMessage("Unlocked");
  }

  function lockDashboard() {
    if (!privacySettings.enabled || !privacySettings.pinHash) return;
    setPrivacyUnlocked(false);
    setPrivacyUnlockPin("");
    setPrivacyMessage("PIN required");
  }

  async function handleAuth() { if (!auth) return; if (auth.currentUser) await signOut(auth); else await signInWithPopup(auth, new GoogleAuthProvider()); }

  if (!authReady) return (
    <div className="gate-screen">
      <div className="loading-splash">
        <div className="loading-bg"><img src={heroImg} alt="" onError={handleImageError} /></div>
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
            <img src={heroImg} alt="" onError={handleImageError} />
          </div>
        </section>
      </div>
    );
  }

  if (!privacyReady) {
    return (
      <div className="gate-screen">
        <section className="privacy-gate-card">
          <div className="privacy-lock-mark">••••</div>
          <span className="gate-kicker">DayForge</span>
          <h1>Preparing your private dashboard.</h1>
        </section>
      </div>
    );
  }

  const displayName = profile.displayName || defaultDisplayName(user);
  const firstName = displayName.split(" ")[0] || displayName;
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "D";
  const privacyEnabled = Boolean(privacySettings.enabled && privacySettings.pinHash && privacySettings.salt);

  if (activeHabits.length === 0) {
    return (
      <div className="gate-screen">
        <section className="gate-card first-habit-card">
          <div>
            <span className="gate-kicker">Almost there</span>
            <h1>Add your first habit to unlock the dashboard.</h1>
            <p>Start with one real habit. Your heatmap, streaks, and reminders activate once you add it.</p>
            <form className="name-capture" onSubmit={saveProfileName}>
              <label>
                <span>Your name</span>
                <input value={profileDraft} onChange={e => setProfileDraft(e.target.value)} placeholder="Yogender" maxLength={80} />
              </label>
              <button type="submit">Save</button>
            </form>
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
          <img src={heroImg} alt="" onError={handleImageError} />
        </section>
      </div>
    );
  }

  if (privacyEnabled && !privacyUnlocked) {
    return (
      <PrivacyGate
        displayName={displayName}
        initials={initials}
        pin={privacyUnlockPin}
        setPin={setPrivacyUnlockPin}
        message={privacyMessage}
        onUnlock={unlockPrivacy}
        onSignOut={handleAuth}
        theme={theme}
        setTheme={setTheme}
      />
    );
  }

  const ms = buildMonthStats(grid, days, activeHabits);
  const ws = buildWeeklyStats(grid, days, activeHabits);
  const todayKey = dayforgeTodayKey();
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
        <form className="profile-card" onSubmit={saveProfileName}>
          <div className="profile-avatar">{initials}</div>
          <div className="profile-copy">
            <span>Welcome back</span>
            <input value={profileDraft} onChange={e => setProfileDraft(e.target.value)} placeholder="Your name" maxLength={80} aria-label="Your name" />
          </div>
          <button type="submit" title="Save profile name">Save</button>
        </form>
        <div className="select-row">
          <label>Month<select value={monthDate.getMonth()} onChange={e => setMonthDate(new Date(monthDate.getFullYear(), Number(e.target.value), 1))}>
            {Array.from({length:12},(_,i)=><option key={i} value={i}>{new Date(2026,i,1).toLocaleDateString("en-US",{month:"long"})}</option>)}
          </select></label>
          <label>Year<select value={monthDate.getFullYear()} onChange={e => setMonthDate(new Date(Number(e.target.value), monthDate.getMonth(), 1))}>
            {[2025,2026,2027].map(y=><option key={y}>{y}</option>)}
          </select></label>
        </div>
        <figure className="focus-card">
          <img src={heroImg} alt="" onError={handleImageError} />
          <figcaption>&ldquo; {quote} &rdquo;</figcaption>
        </figure>
        <div className="habit-list-card">
          <h2>Daily Habits</h2>
          <ol>
            {activeHabits.map(h => (
              <li key={h.id}><span>{h.title}</span><button type="button" onClick={() => deleteHabit(h.id)} aria-label={`Delete ${h.title}`}>&times;</button></li>
            ))}
          </ol>
        </div>
        <form className="add-habit" onSubmit={addHabit}>
          <input value={habitDraft} onChange={e => setHabitDraft(e.target.value)} placeholder="Add a habit" maxLength={80} />
          <button type="submit">Add</button>
        </form>
        <div className="account-row">
          <button className="auth-button" type="button" onClick={handleAuth}>Sign out</button>
          <button className="privacy-word-button" type="button" onClick={() => setPrivacyOpen(true)}>Privacy</button>
          <button className="theme-button small" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></button>
        </div>
        <p className="sync-line">{syncState} - {welcomeState}</p>
      </section>
      {privacyOpen && (
        <PrivacyModal onClose={() => setPrivacyOpen(false)}>
          <PrivacyPanel
            enabled={privacyEnabled}
            pin={privacyPin}
            setPin={setPrivacyPin}
            message={privacyMessage}
            onSave={enablePrivacyLock}
            onDisable={disablePrivacyLock}
            onLock={lockDashboard}
          />
        </PrivacyModal>
      )}

      {/* CENTER PANEL */}
      <section className="center-panel" style={{"--days": days.length}}>
        <MissionBanner missionLine={missionLine} pct={ms.pct} firstName={firstName} todayStats={todayStats} cs={cs} ws={ws} activeHabits={activeHabits} />
        <ProgressBar pct={ms.pct} done={ms.done} total={ms.total} daysCount={days.length} />
        <Heatmap
          days={days}
          grid={grid}
          habits={activeHabits}
          todayKey={todayKey}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          onToggle={toggleHabit}
          monthDate={monthDate}
          extras={dailyExtras[selectedDate] || []}
          extraDraft={extraDraft}
          setExtraDraft={setExtraDraft}
          onAddExtra={addExtraItem}
          onToggleExtra={toggleExtraItem}
          onDeleteExtra={deleteExtraItem}
        />
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
        <ReminderCard reminders={reminders} draft={reminderDraft} setDraft={setReminderDraft} onAdd={addReminder} onDelete={deleteReminder} status={reminderState} />
        <DailyProgressCard rows={rows} daysCount={days.length} />
        <div className="quote-strip">{pick(BOTTOM_QUOTES)}</div>
      </section>
    </main>
  );
}

/* SUB-COMPONENTS */

function PrivacyGate({ displayName, initials, pin, setPin, message, onUnlock, onSignOut, theme, setTheme }) {
  return (
    <div className="privacy-gate-screen">
      <section className="privacy-gate-card">
        <div className="privacy-avatar">{initials}</div>
        <span className="gate-kicker">Private Mode</span>
        <h1>{displayName}'s dashboard is locked.</h1>
        <form className="privacy-unlock-form" onSubmit={onUnlock}>
          <input
            value={pin}
            onChange={e => setPin(pinDigits(e.target.value))}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoFocus
            type="password"
            placeholder="0000"
            aria-label="4 digit PIN"
          />
          <button type="submit">Unlock</button>
        </form>
        <div className="privacy-dots" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => <i key={index} className={pin.length > index ? "filled" : ""} />)}
        </div>
        <p className="privacy-message">{message || "Enter your PIN"}</p>
        <div className="privacy-gate-actions">
          <button type="button" onClick={onSignOut}>Sign out</button>
          <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>Theme</button>
        </div>
      </section>
    </div>
  );
}

function PrivacyModal({ children, onClose }) {
  return (
    <div className="privacy-modal-backdrop" role="dialog" aria-modal="true" aria-label="Privacy settings">
      <section className="privacy-modal">
        <div className="privacy-modal-head">
          <div>
            <span>Privacy</span>
            <h2>Protect this dashboard</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close privacy settings">&times;</button>
        </div>
        {children}
      </section>
    </div>
  );
}

function PrivacyPanel({ enabled, pin, setPin, message, onSave, onDisable, onLock }) {
  return (
    <div className={`privacy-panel ${enabled ? "enabled" : ""}`}>
      <div className="privacy-panel-head">
        <div>
          <span>Privacy Lock</span>
          <strong>{enabled ? "PIN on" : "Optional"}</strong>
        </div>
        {enabled && <button type="button" onClick={onLock}>Lock</button>}
      </div>
      <form className="privacy-pin-form" onSubmit={onSave}>
        <input
          value={pin}
          onChange={e => setPin(pinDigits(e.target.value))}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          type="password"
          placeholder="4 digit PIN"
          aria-label="Set 4 digit PIN"
        />
        <button type="submit">{enabled ? "Change" : "Turn on"}</button>
      </form>
      <div className="privacy-panel-foot">
        <span>{message || (enabled ? "Dashboard asks PIN on open" : "Off by default")}</span>
        {enabled && <button type="button" onClick={onDisable}>Turn off</button>}
      </div>
    </div>
  );
}

function Ring({ value, size = 80 }) {
  return (
    <svg className="ring" width={size} height={size} viewBox="0 0 100 100" style={{ "--value": value }}>
      <circle className="ring-bg" cx="50" cy="50" r="39" />
      <circle className="ring-fg" cx="50" cy="50" r="39" />
      <text x="50" y="55" textAnchor="middle">{value}%</text>
    </svg>
  );
}

function MissionBanner({ missionLine, pct, firstName, todayStats, cs, ws, activeHabits }) {
  return (
    <div className="mission-banner">
      <div>
        <div className="mission-kicker">Today's Mission</div>
        <h2>{firstName}, {missionLine.charAt(0).toLowerCase() + missionLine.slice(1)}</h2>
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

function Heatmap({ days, grid, habits, todayKey, selectedDate, onSelect, onToggle, monthDate, extras, extraDraft, setExtraDraft, onAddExtra, onToggleExtra, onDeleteExtra }) {
  const selectedChecks = grid[selectedDate] || {};
  const selectedStats = dayStats(selectedChecks, habits);
  const doneExtras = extras.filter(item => item.done).length;
  return (
    <div className="heatmap-card" style={{"--days": days.length}}>
      <div className="heatmap-title">{monthDate.toLocaleDateString("en-US",{month:"long",year:"numeric"})} - Habit Tracker</div>
      <div className="heatmap-grid">
        <div className="day-label"></div>
        {days.map(d => {
          const k = toDateKey(d);
          return <div key={k} className={`col-header ${k === todayKey ? "today-col" : ""}`}>{d.getDate()}</div>;
        })}
        {habits.map(h => (
          <React.Fragment key={h.id}>
            <div className="day-label habit-label" title={h.title}>{h.title.length > 6 ? h.title.slice(0,6) + ".." : h.title}</div>
            {days.map(d => {
              const k = toDateKey(d);
              const checked = Boolean((grid[k] || {})[h.id]);
              return (
                <button key={k}
                  className={`heatmap-cell ${checked ? "habit-done" : "habit-miss"} ${k === todayKey ? "today" : ""} ${k === selectedDate ? "selected" : ""}`}
                  onClick={() => onToggle(k, h.id)}
                  title={`${h.title} - ${k}: ${checked ? "Done" : "Not done"}`}
                />
              );
            })}
          </React.Fragment>
        ))}
        <div className="day-label" style={{fontWeight:800,color:'var(--muted)'}}>All</div>
        {days.map(d => {
          const k = toDateKey(d);
          const c = grid[k] || {};
          const done = habits.filter(h => c[h.id]).length;
          const pct = habits.length ? done / habits.length : 0;
          const lv = pct === 0 ? 0 : pct <= 0.25 ? 1 : pct <= 0.5 ? 2 : pct <= 0.75 ? 3 : pct < 1 ? 4 : 5;
          return (
            <button key={k}
              className={`heatmap-cell lv${lv} ${k === todayKey ? "today" : ""} ${k === selectedDate ? "selected" : ""}`}
              onClick={() => onSelect(k)}
              title={`${k}: ${done}/${habits.length}`}
            />
          );
        })}
      </div>
      <div className="heatmap-legend">
        <span><i className="heatmap-cell habit-done" style={{display:'inline-block'}} /> Done</span>
        <span><i className="heatmap-cell habit-miss" style={{display:'inline-block'}} /> Not done</span>
        <span style={{marginLeft:'auto',color:'var(--muted)'}}>Bottom = overall</span>
      </div>
      <div className="selected-day-panel">
        <div className="selected-day-head">
          <span>{selectedDate}</span>
          <strong>{selectedStats.done}/{selectedStats.total} habits · {doneExtras}/{extras.length} extras</strong>
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
        <div className="today-extra-panel">
          <div className="today-extra-head">
            <span>Today Only</span>
            <strong>Meetings, assignments, calls</strong>
          </div>
          <form className="today-extra-form" onSubmit={onAddExtra}>
            <input value={extraDraft} onChange={e => setExtraDraft(e.target.value)} placeholder="Add meeting, assignment, contest..." maxLength={90} />
            <button type="submit">Add</button>
          </form>
          <div className="today-extra-list">
            {extras.length === 0 && <div className="today-extra-empty">No one-off items for this day.</div>}
            {extras.map(item => (
              <div className={`today-extra-item ${item.done ? "done" : ""}`} key={item.id}>
                <label>
                  <input type="checkbox" checked={item.done} onChange={() => onToggleExtra(selectedDate, item.id)} />
                  <span>{item.title}</span>
                </label>
                <button type="button" onClick={() => onDeleteExtra(selectedDate, item.id)} aria-label={`Delete ${item.title}`}>&times;</button>
              </div>
            ))}
          </div>
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


function ReminderCard({ reminders, draft, setDraft, onAdd, onDelete, status }) {
  const sorted = [...reminders].sort((a, b) => reminderStamp(a).localeCompare(reminderStamp(b)));
  const today = dayforgeTodayKey();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const next = sorted.find(r => !r.done);
  return (
    <div className="reminder-card">
      <div className="card-header">
        <h3>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign:'middle',marginRight:4}}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          Reminders
        </h3>
        <span className="reminder-status"><i />{status}</span>
      </div>
      <div className="reminder-summary">
        <span>{reminders.length} set</span>
        <strong>{next ? `${prettyReminderDate(next.date)} at ${prettyReminderTime(next.time)}` : "No upcoming reminder"}</strong>
      </div>
      <form className="reminder-form" onSubmit={onAdd}>
        <label className="reminder-title-field">
          <span>Title</span>
          <input placeholder="Wake up bro" value={draft.title} onChange={e => setDraft({...draft, title: e.target.value})} maxLength={60} required />
        </label>
        <div className="reminder-priority-toggle" role="group" aria-label="Reminder priority">
          <button type="button" className={draft.priority !== "high" ? "active" : ""} onClick={() => setDraft({...draft, priority: "normal"})}>Normal</button>
          <button type="button" className={draft.priority === "high" ? "active high" : ""} onClick={() => setDraft({...draft, priority: "high"})}>Priority</button>
        </div>
        <label className="reminder-field">
          <span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="3"/></svg>
            Date
          </span>
          <input type="date" value={draft.date} onChange={e => setDraft({...draft, date: e.target.value})} required />
        </label>
        <label className="reminder-field">
          <span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            Time
          </span>
          <input type="time" value={draft.time} onChange={e => setDraft({...draft, time: e.target.value})} required />
        </label>
        <button className="reminder-add" type="submit" title="Add reminder">+</button>
      </form>
      <div className="reminder-quick-row">
        <button type="button" onClick={() => setDraft({...draft, date: today})}>Today</button>
        <button type="button" onClick={() => setDraft({...draft, date: toDateKey(tomorrow)})}>Tomorrow</button>
        <button type="button" onClick={() => setDraft({...draft, time: "21:00"})}>9 PM</button>
      </div>
      <div className="reminder-list">
        {sorted.length === 0 && <div className="reminder-empty">No reminders yet. Add one to get email notifications.</div>}
        {sorted.map(r => (
          <div className={`reminder-item ${r.priority === "high" ? "priority" : ""}`} key={r.id}>
            <span className="r-title">{r.title}</span>
            <span className="r-date">{prettyReminderDate(r.date)}</span>
            <span className="r-time">{prettyReminderTime(r.time)}</span>
            <button className="r-del" type="button" onClick={() => onDelete(r.id)} title="Delete">&times;</button>
          </div>
        ))}
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
