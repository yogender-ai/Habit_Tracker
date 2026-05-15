import React, { useEffect, useMemo, useRef, useState } from "react";
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
  "Every temptation you resist makes you stronger.",
  "Your dopamine reset is in progress. Stay sharp.",
  "Replace the craving with the craft.",
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
function removeLocal(u,k) { localStorage.removeItem(`dayforge_${u}_${k}`); }
function readLocalWorkspace(u) { return readLocal(u, "workspace"); }
function writeLocalWorkspace(u, workspace) { writeLocal(u, "workspace", workspace); }
function readPrivacySettings(u) { return readLocal(u, "privacy"); }
function writePrivacySettings(u, settings) { writeLocal(u, "privacy", settings); }
function readLegacyTemptations() { try { return JSON.parse(localStorage.getItem("dayforge_temptations") || "[]"); } catch { return []; } }
function writeLegacyTemptations(temptations) { localStorage.setItem("dayforge_temptations", JSON.stringify(temptations)); }
function apiBase() { const c=String(CONFIG.apiBaseUrl||"").trim().replace(/\/$/,""); if(c) return c; if(location.hostname==="127.0.0.1"||location.hostname==="localhost") return "http://127.0.0.1:8000"; return location.origin; }
function hasFirebaseConfig() { const f=CONFIG.firebase||{}; return Boolean(f.apiKey&&f.authDomain&&f.projectId&&f.appId); }
function normalizeHabit(h) { return { id:String(h.id||uid()), title:String(h.title||"New habit").slice(0,90), category:String(h.category||"Focus").slice(0,40), targetPerWeek:Math.max(1,Math.min(7,Number(h.targetPerWeek||h.target||5))), active:h.active!==false, createdAt:h.createdAt||"1970-01-01T00:00:00.000Z", deletedAt:h.deletedAt||(h.active===false?(h.updatedAt||new Date().toISOString()):"") }; }
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
function normalizeTemptation(item = {}) {
  const label = String(item.label || item.title || "").trim().slice(0, 80);
  if (!label) return null;
  return {
    id: String(item.id || uid()),
    label,
    resisted: item.resisted !== false,
    time: item.time || item.createdAt || new Date().toISOString(),
  };
}
function normalizePreferences(preferences = {}) {
  return {
    theme: preferences.theme === "light" ? "light" : "dark",
  };
}
function workspaceFor(user, habits, reminders = [], profile = {}, settings = {}, privacy = {}, synced = {}) {
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
    temptations: (synced.temptations || []).map(normalizeTemptation).filter(Boolean).slice(0, 50),
    preferences: normalizePreferences(synced.preferences || {}),
    notificationSettings: {
      ...settings,
      enabled: Boolean(email),
      email,
      timezone: settings.timezone || CONFIG.appTimezone,
    },
    privacySettings: cleanPrivacy,
  };
}
function normalizePendingSync(queue = {}) {
  const days = {};
  if (queue.days && typeof queue.days === "object") {
    Object.entries(queue.days).forEach(([dateKey, item]) => {
      if (item?.day && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        days[dateKey] = { dateKey, day: item.day, queuedAt: item.queuedAt || item.day.updatedAt || new Date().toISOString() };
      }
    });
  }
  const workspace = queue.workspace?.workspace
    ? { workspace: queue.workspace.workspace, queuedAt: queue.workspace.queuedAt || queue.workspace.workspace.updatedAt || new Date().toISOString() }
    : null;
  return { workspace, days };
}
function readPendingSync(userId) { return normalizePendingSync(readLocal(userId, "pending_sync")); }
function writePendingSync(userId, queue) {
  const clean = normalizePendingSync(queue);
  if (!clean.workspace && Object.keys(clean.days).length === 0) removeLocal(userId, "pending_sync");
  else writeLocal(userId, "pending_sync", clean);
}
function queuePendingWorkspace(userId, workspace) {
  const queuedAt = new Date().toISOString();
  const queue = readPendingSync(userId);
  const stampedWorkspace = { ...workspace, updatedAt: queuedAt };
  queue.workspace = { workspace: stampedWorkspace, queuedAt };
  writePendingSync(userId, queue);
  writeLocalWorkspace(userId, stampedWorkspace);
  return queue.workspace;
}
function queuePendingDay(userId, dateKey, day) {
  const queuedAt = new Date().toISOString();
  const queue = readPendingSync(userId);
  queue.days[dateKey] = { dateKey, day: { ...day, updatedAt: queuedAt }, queuedAt };
  writePendingSync(userId, queue);
  return queue.days[dateKey];
}
function clearPendingWorkspace(userId, queuedAt) {
  const queue = readPendingSync(userId);
  if (queue.workspace?.queuedAt !== queuedAt) return false;
  queue.workspace = null;
  writePendingSync(userId, queue);
  return true;
}
function clearPendingDay(userId, dateKey, queuedAt) {
  const queue = readPendingSync(userId);
  if (queue.days[dateKey]?.queuedAt !== queuedAt) return false;
  delete queue.days[dateKey];
  writePendingSync(userId, queue);
  return true;
}
function parseTime(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
}
function hasWorkspaceData(workspace = {}) {
  return Boolean(
    (workspace.habits || []).length ||
    (workspace.reminders || []).length ||
    (workspace.temptations || []).length ||
    workspace.profile?.displayName ||
    privacyIsEnabled(workspace.privacySettings || {})
  );
}
function hasPrimaryWorkspaceData(workspace = {}) {
  return Boolean(
    (workspace.habits || []).length ||
    (workspace.reminders || []).length ||
    (workspace.temptations || []).length
  );
}
function mergeWorkspaceWithoutLosingRemote(remoteWorkspace = {}, pendingWorkspace = {}) {
  const remoteHasPrimary = hasPrimaryWorkspaceData(remoteWorkspace);
  const pendingHasPrimary = hasPrimaryWorkspaceData(pendingWorkspace);
  if (!remoteHasPrimary || pendingHasPrimary) return pendingWorkspace;

  const pendingProfile = pendingWorkspace.profile || {};
  const pendingSettings = pendingWorkspace.notificationSettings || {};
  const pendingPrivacy = pendingWorkspace.privacySettings || {};
  const pendingPreferences = pendingWorkspace.preferences || {};
  const nextPrivacy = newestPrivacySettings(remoteWorkspace.privacySettings || {}, pendingPrivacy);

  return {
    ...remoteWorkspace,
    profile: {
      ...(remoteWorkspace.profile || {}),
      ...(pendingProfile.displayName ? pendingProfile : {}),
    },
    notificationSettings: {
      ...(remoteWorkspace.notificationSettings || {}),
      ...(pendingSettings.email ? pendingSettings : {}),
    },
    privacySettings: nextPrivacy,
    preferences: {
      ...(remoteWorkspace.preferences || {}),
      ...pendingPreferences,
    },
  };
}
function shouldApplyWorkspaceResponse(userId, queuedAt, workspace) {
  const pending = readPendingSync(userId).workspace;
  if (pending && pending.queuedAt !== queuedAt) return false;
  const localTime = parseTime(readLocalWorkspace(userId).updatedAt);
  const remoteTime = parseTime(workspace?.updatedAt);
  return !localTime || !remoteTime || remoteTime >= localTime;
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

function habitBoundaryKey(value) { const d = new Date(value || "1970-01-01T00:00:00.000Z"); return Number.isNaN(d.getTime()) ? "1970-01-01" : toDateKey(dayforgeDate(d)); }
function habitsForDate(habits = [], date) {
  const key = typeof date === "string" ? date : toDateKey(date);
  return habits.filter(h => {
    if (isLegacyDefaultHabit(h)) return false;
    const start = habitBoundaryKey(h.createdAt);
    const end = h.deletedAt ? habitBoundaryKey(h.deletedAt) : "";
    return start <= key && (!end || key < end);
  });
}
function dayStats(checks={}, habits=[]) { const t=habits.length, d=habits.filter(h=>checks[h.id]).length; return {done:d,total:t,pct:t?Math.round((d/t)*100):0}; }
function buildMonthStats(grid,days,habits) { const daily=days.map(d=>dayStats(grid[toDateKey(d)]||{},habitsForDate(habits,d))); const done=daily.reduce((s,i)=>s+i.done,0); const total=daily.reduce((s,i)=>s+i.total,0)||1; return {daily,done,total,pct:Math.round((done/total)*100)}; }
function buildWeeklyStats(grid,days,habits) { const chunks=[]; for(let i=0;i<days.length;i+=7) chunks.push(days.slice(i,i+7)); return chunks.map((c,i)=>{const s=buildMonthStats(grid,c,habits); const f=c[0],l=c[c.length-1]; return {...s,label:`Week ${i+1}`,range:`${f.toLocaleDateString("en-US",{month:"short",day:"numeric"})} - ${l.toLocaleDateString("en-US",{month:"short",day:"numeric"})}`};}); }
function habitRows(grid,days,habits) { return habits.map(h=>{const eligible=days.filter(d=>habitsForDate([h],d).length); const vals=eligible.map(d=>Boolean(grid[toDateKey(d)]?.[h.id])); const done=vals.filter(Boolean).length; let best=0,run=0; vals.forEach(v=>{run=v?run+1:0;best=Math.max(best,run)}); const total=eligible.length||1; return {...h,done,total,pct:Math.round((done/total)*100),streak:best};}).sort((a,b)=>b.pct-a.pct||a.title.localeCompare(b.title)); }
function currentStreak(grid,habits) { const today=dayforgeDate(); let streak=0; for(let i=0;i<365;i++){const d=new Date(today);d.setDate(d.getDate()-i); const k=toDateKey(d),c=grid[k]||{}; const dayHabits=habitsForDate(habits,d); const done=dayHabits.filter(h=>c[h.id]).length; if(done>0)streak++;else break;} return streak; }
function longestStreak(grid,habits) { const today=dayforgeDate(); let best=0,run=0; for(let i=365;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i); const k=toDateKey(d),c=grid[k]||{}; const dayHabits=habitsForDate(habits,d); if(dayHabits.filter(h=>c[h.id]).length>0){run++;best=Math.max(best,run)}else{run=0}} return best; }
function focusScore(grid,days,habits) { if(!habits.length)return 0; const ms=buildMonthStats(grid,days,habits); const cs=Math.min(currentStreak(grid,habits)*3,30); return Math.min(100,Math.round(ms.pct*0.7+cs)); }

function App() {
  const authHeaderCache = useRef({});
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [monthDate, setMonthDate] = useState(() => dayforgeDate());
  const [selectedDate, setSelectedDate] = useState(() => dayforgeTodayKey());
  const [habits, setHabits] = useState([]);
  const [grid, setGrid] = useState({});
  const [theme, setTheme] = useState(localStorage.getItem("dayforge_theme") || "dark");
  const [syncState, setSyncState] = useState("Waiting for sign in");
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [habitDraft, setHabitDraft] = useState("");
  const [welcomeState, setWelcomeState] = useState("");
  const [profile, setProfile] = useState({});
  const [profileDraft, setProfileDraft] = useState("");
  const [profileEditing, setProfileEditing] = useState(false);
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
  const [temptations, setTemptations] = useState(() => readLegacyTemptations().map(normalizeTemptation).filter(Boolean));
  const [temptDraft, setTemptDraft] = useState("");

  const days = useMemo(() => monthDays(monthDate), [monthDate]);
  const monthId = monthKey(monthDate);
  const trackedHabits = habits.filter(h => !isLegacyDefaultHabit(h));
  const activeHabits = habitsForDate(trackedHabits, dayforgeTodayKey()).filter(h => h.active);

  useEffect(() => {
    if (!hasFirebaseConfig()) { setAuthReady(true); setSyncState("Firebase config missing"); return; }
    const fa = initializeApp(CONFIG.firebase);
    const na = getAuth(fa);
    setAuth(na);
    return onAuthStateChanged(na, u => {
      setUser(u);
      setAuthReady(true);
      setSyncState(u ? "Signed in" : "Sign in required");
      if (!u) {
        authHeaderCache.current = {};
        setWorkspaceReady(false);
        return;
      }
      authHeaderCache.current = { "Content-Type": "application/json", "X-Demo-User": u.uid };
      u.getIdToken()
        .then(token => { authHeaderCache.current = { "Content-Type": "application/json", "X-Demo-User": u.uid, Authorization: `Bearer ${token}` }; })
        .catch(() => {});
    });
  }, []);

  useEffect(() => { document.body.dataset.theme = theme; localStorage.setItem("dayforge_theme", theme); }, [theme]);
  useEffect(() => {
    if (!user || !workspaceReady) return;
    const storedTheme = normalizePreferences(readLocalWorkspace(user.uid).preferences || {}).theme;
    if (storedTheme === theme) return;
    const timer = window.setTimeout(() => {
      saveWorkspaceState(
        { theme },
        { saved: "Theme saved", failed: "Theme save failed", local: "Theme saved locally, will sync" }
      );
    }, 250);
    return () => window.clearTimeout(timer);
  }, [theme, user, workspaceReady]);

  useEffect(() => {
    if (!user) {
      setPrivacyReady(false);
      setWorkspaceReady(false);
      setPrivacyUnlocked(true);
      setPrivacyUnlockPin("");
      return;
    }
    const localWorkspace = readLocalWorkspace(user.uid);
    const pendingWorkspace = readPendingSync(user.uid).workspace?.workspace || {};
    const localProfile = localWorkspace.profile || {};
    const nextProfile = { ...localProfile, displayName: localProfile.displayName || defaultDisplayName(user) };
    const localSettings = localWorkspace.notificationSettings || {};
    const localHabits = (localWorkspace.habits || []).map(normalizeHabit).filter(h => !isLegacyDefaultHabit(h));
    const localTemptations = ((localWorkspace.temptations || []).length ? localWorkspace.temptations : readLegacyTemptations()).map(normalizeTemptation).filter(Boolean);
    const localPreferences = normalizePreferences(localWorkspace.preferences || {});
    const localPrivacy = newestPrivacySettings(localWorkspace.privacySettings || {}, readPrivacySettings(user.uid));
    const privacyEnabled = privacyIsEnabled(localPrivacy);
    setWorkspaceReady(hasPrimaryWorkspaceData(localWorkspace) || hasPrimaryWorkspaceData(pendingWorkspace));
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
    setTemptations(localTemptations);
    writeLegacyTemptations(localTemptations);
    if (localWorkspace.preferences?.theme) setTheme(localPreferences.theme);
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
  useEffect(() => {
    if (!user) return;
    const flushOnHide = () => {
      const pending = readPendingSync(user.uid);
      const headers = Object.keys(authHeaderCache.current || {}).length
        ? authHeaderCache.current
        : { "Content-Type": "application/json", "X-Demo-User": user.uid };
      if (pending.workspace) {
        const body = JSON.stringify({ workspace: pending.workspace.workspace });
        fetch(`${apiBase()}/api/workspace`, {
          method: "PUT",
          headers,
          body,
          keepalive: body.length < 60000,
        }).catch(() => {});
      }
      Object.entries(pending.days).forEach(([dateKey, item]) => {
        const body = JSON.stringify({ day: item.day });
        fetch(`${apiBase()}/api/days/${dateKey}`, {
          method: "PUT",
          headers,
          body,
          keepalive: body.length < 60000,
        }).catch(() => {});
      });
    };
    const flushWhenHidden = () => { if (document.visibilityState === "hidden") flushOnHide(); };
    window.addEventListener("pagehide", flushOnHide);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", flushOnHide);
      document.removeEventListener("visibilitychange", flushWhenHidden);
    };
  }, [user]);

  async function authHeaders() {
    const h = { "Content-Type": "application/json", "X-Demo-User": user?.uid || "dayforge-local" };
    const firebaseUser = auth?.currentUser || user;
    if (firebaseUser?.getIdToken) h.Authorization = `Bearer ${await firebaseUser.getIdToken()}`;
    authHeaderCache.current = h;
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

  function buildWorkspace(overrides = {}) {
    return workspaceFor(
      user,
      overrides.habits ?? habits,
      overrides.reminders ?? reminders,
      overrides.profile ?? profile,
      overrides.notificationSettings ?? notificationSettings,
      overrides.privacySettings ?? privacySettings,
      {
        temptations: overrides.temptations ?? temptations,
        preferences: { theme: overrides.theme ?? theme },
      }
    );
  }

  function applyWorkspacePayload(workspace = {}) {
    if (!user) return;
    const nextHabits = (workspace.habits || []).map(normalizeHabit).filter(h => !isLegacyDefaultHabit(h));
    const nextProfile = {
      ...(workspace.profile || {}),
      displayName: workspace.profile?.displayName || defaultDisplayName(user),
    };
    const nextSettings = {
      ...(workspace.notificationSettings || {}),
      email: workspace.notificationSettings?.email || user.email || "",
      timezone: workspace.notificationSettings?.timezone || CONFIG.appTimezone,
    };
    const nextReminders = (workspace.reminders || []).map(normalizeReminder);
    const nextTemptations = (workspace.temptations || []).map(normalizeTemptation).filter(Boolean);
    const nextPreferences = normalizePreferences(workspace.preferences || { theme });

    writeLocalWorkspace(user.uid, workspace);
    setHabits(nextHabits);
    setProfile(nextProfile);
    setProfileDraft(nextProfile.displayName || defaultDisplayName(user));
    setNotificationSettings(nextSettings);
    setReminders(nextReminders);
    setTemptations(nextTemptations);
    writeLegacyTemptations(nextTemptations);
    if (workspace.preferences?.theme) setTheme(nextPreferences.theme);
    applyPrivacySettings(workspace.privacySettings || privacySettings);
  }

  async function putJson(path, body) {
    const payload = JSON.stringify(body);
    return fetch(`${apiBase()}${path}`, {
      method: "PUT",
      headers: await authHeaders(),
      body: payload,
      keepalive: payload.length < 60000,
    });
  }

  async function saveWorkspaceState(overrides = {}, labels = {}) {
    if (!user) return null;
    const workspace = buildWorkspace(overrides);
    const queued = queuePendingWorkspace(user.uid, workspace);
    if (overrides.temptations) writeLegacyTemptations(overrides.temptations);
    try {
      const r = await putJson("/api/workspace", { workspace: queued.workspace });
      if (!r.ok) throw new Error(await apiMessage(r, labels.failed || `Workspace save failed (${r.status})`));
      const p = await r.json();
      const canApply = p.workspace && shouldApplyWorkspaceResponse(user.uid, queued.queuedAt, p.workspace);
      const cleared = clearPendingWorkspace(user.uid, queued.queuedAt);
      if (cleared && canApply) applyWorkspacePayload(p.workspace);
      setSyncState(labels.saved || `Workspace saved: ${p.store || "backend"}`);
      return p;
    } catch (error) {
      setSyncState(labels.local || `Saved locally, will sync: ${error.message}`);
      return null;
    }
  }

  function extrasFromDay(day = {}, habitIds = new Set()) {
    const tasks = Array.isArray(day.tasks) ? day.tasks : [];
    return tasks
      .filter(task => task && !habitIds.has(String(task.id)) && !habitIds.has(String(task.habitId)))
      .map(normalizeExtraItem)
      .filter(Boolean);
  }

  async function flushPendingSync(options = {}) {
    if (!user) return true;
    const flushWorkspace = options.workspace !== false;
    const flushDays = options.days !== false;
    const pending = readPendingSync(user.uid);
    let synced = 0;
    let failed = 0;

    if (flushWorkspace && pending.workspace) {
      try {
        const r = await putJson("/api/workspace", { workspace: pending.workspace.workspace });
        if (!r.ok) throw new Error(await apiMessage(r, `Workspace save failed (${r.status})`));
        const p = await r.json();
        const canApply = p.workspace && shouldApplyWorkspaceResponse(user.uid, pending.workspace.queuedAt, p.workspace);
        const cleared = clearPendingWorkspace(user.uid, pending.workspace.queuedAt);
        if (cleared) {
          synced += 1;
          if (canApply) applyWorkspacePayload(p.workspace);
        }
      } catch {
        failed += 1;
      }
    }

    if (flushDays) {
      const dayEntries = Object.entries(readPendingSync(user.uid).days);
      for (const [dateKey, item] of dayEntries) {
        try {
          const r = await putJson(`/api/days/${dateKey}`, { day: item.day });
          if (!r.ok) throw new Error(await apiMessage(r, `Day save failed (${r.status})`));
          if (clearPendingDay(user.uid, dateKey, item.queuedAt)) synced += 1;
        } catch {
          failed += 1;
        }
      }
    }

    if (synced) setSyncState(`Synced ${synced} pending change${synced === 1 ? "" : "s"}`);
    return failed === 0;
  }

  async function syncFromBackend() {
    if (!user) return;
    try {
      setSyncState("Syncing...");
      await flushPendingSync({ workspace: false });
      const r = await fetch(`${apiBase()}/api/snapshot?year=${monthDate.getFullYear()}`, { headers: await authHeaders() });
      if (!r.ok) throw new Error(await apiMessage(r, `Snapshot failed (${r.status})`));
      const p = await r.json();
      const remoteWorkspace = p.workspace || {};
      const localWorkspace = readLocalWorkspace(user.uid);
      const pending = readPendingSync(user.uid);
      let workspaceForMonth = pending.workspace?.workspace || remoteWorkspace;

      if (pending.workspace) {
        const workspaceToSync = mergeWorkspaceWithoutLosingRemote(remoteWorkspace, pending.workspace.workspace);
        const queue = readPendingSync(user.uid);
        queue.workspace = { workspace: { ...workspaceToSync, updatedAt: pending.workspace.queuedAt }, queuedAt: pending.workspace.queuedAt };
        writePendingSync(user.uid, queue);
        try {
          const saveResponse = await putJson("/api/workspace", { workspace: queue.workspace.workspace });
          if (!saveResponse.ok) throw new Error(await apiMessage(saveResponse, `Workspace save failed (${saveResponse.status})`));
          const saved = await saveResponse.json();
          clearPendingWorkspace(user.uid, pending.workspace.queuedAt);
          workspaceForMonth = saved.workspace || queue.workspace.workspace;
          applyWorkspacePayload(workspaceForMonth);
        } catch {
          workspaceForMonth = queue.workspace.workspace;
          applyWorkspacePayload(workspaceForMonth);
        }
      } else if (!hasWorkspaceData(remoteWorkspace) && hasWorkspaceData(localWorkspace)) {
        const localPrivacy = newestPrivacySettings(localWorkspace.privacySettings || {}, readPrivacySettings(user.uid));
        const localTemptations = ((localWorkspace.temptations || []).length ? localWorkspace.temptations : readLegacyTemptations()).map(normalizeTemptation).filter(Boolean);
        const saved = await saveWorkspaceState({
          habits: (localWorkspace.habits || []).map(normalizeHabit).filter(h => !isLegacyDefaultHabit(h)),
          reminders: (localWorkspace.reminders || []).map(normalizeReminder),
          profile: localWorkspace.profile || {},
          notificationSettings: localWorkspace.notificationSettings || {},
          privacySettings: localPrivacy,
          temptations: localTemptations,
          theme: normalizePreferences(localWorkspace.preferences || {}).theme,
        }, { saved: "Local workspace synced", local: "Local workspace queued for sync" });
        workspaceForMonth = saved?.workspace || readLocalWorkspace(user.uid);
        if (!saved?.workspace) applyWorkspacePayload(workspaceForMonth);
      } else {
        const localPrivacy = newestPrivacySettings(localWorkspace.privacySettings || {}, readPrivacySettings(user.uid));
        const remotePrivacy = remoteWorkspace.privacySettings || {};
        const nextPrivacy = newestPrivacySettings(localPrivacy, remotePrivacy);
        workspaceForMonth = { ...remoteWorkspace, privacySettings: nextPrivacy };
        applyWorkspacePayload(workspaceForMonth);
        if (privacyUpdatedAt(nextPrivacy) > privacyUpdatedAt(remotePrivacy)) {
          await saveWorkspaceState({
            habits: (workspaceForMonth.habits || []).map(normalizeHabit).filter(h => !isLegacyDefaultHabit(h)),
            reminders: (workspaceForMonth.reminders || []).map(normalizeReminder),
            profile: workspaceForMonth.profile || {},
            notificationSettings: workspaceForMonth.notificationSettings || {},
            privacySettings: nextPrivacy,
            temptations: (workspaceForMonth.temptations || []).map(normalizeTemptation).filter(Boolean),
            theme: normalizePreferences(workspaceForMonth.preferences || {}).theme,
          }, { saved: "Privacy synced", local: "Privacy queued for sync" });
        }
      }

      const syncedHabits = (workspaceForMonth.habits || []).map(normalizeHabit).filter(h => !isLegacyDefaultHabit(h));
      const ng = {};
      const nextExtras = {};
      const habitIds = new Set(syncedHabits.map(h => h.id));
      const localGrid = readLocal(user.uid, monthId);
      const localExtras = readLocal(user.uid, `${monthId}_extras`);
      const currentPendingDays = readPendingSync(user.uid).days;
      const daysToUpload = [];
      days.forEach(d => {
        const k = toDateKey(d);
        const pendingDay = currentPendingDays[k]?.day;
        const remoteDay = p.days?.[k];
        if (pendingDay) {
          ng[k] = pendingDay.habitChecks || localGrid[k] || {};
          const extras = extrasFromDay(pendingDay, habitIds);
          if (extras.length) nextExtras[k] = extras;
          else if ((localExtras[k] || []).length) nextExtras[k] = (localExtras[k] || []).map(normalizeExtraItem).filter(Boolean);
          return;
        }
        if (remoteDay) {
          ng[k] = remoteDay.habitChecks || {};
          const extras = extrasFromDay(remoteDay, habitIds);
          if (extras.length) nextExtras[k] = extras;
          return;
        }
        const checks = localGrid[k] || {};
        const extras = (localExtras[k] || []).map(normalizeExtraItem).filter(Boolean);
        ng[k] = checks;
        if (extras.length) nextExtras[k] = extras;
        if (Object.keys(checks).length || extras.length) {
          daysToUpload.push({ dateKey: k, checks, extras });
        }
      });
      setGrid(ng);
      setDailyExtras(nextExtras);
      daysToUpload.forEach(({ dateKey, checks, extras }) => {
        const extrasByDay = { ...localExtras, [dateKey]: extras };
        const day = buildDayPayload(dateKey, checks, extrasByDay, syncedHabits);
        const queued = queuePendingDay(user.uid, dateKey, day);
        putJson(`/api/days/${dateKey}`, { day: queued.day })
          .then(async dayResponse => {
            if (!dayResponse.ok) throw new Error(await apiMessage(dayResponse, `Day save failed (${dayResponse.status})`));
            clearPendingDay(user.uid, dateKey, queued.queuedAt);
          })
          .catch(() => {});
      });
      const remaining = readPendingSync(user.uid);
      const remainingCount = (remaining.workspace ? 1 : 0) + Object.keys(remaining.days).length;
      setSyncState(remainingCount ? `Backend connected, ${remainingCount} change${remainingCount === 1 ? "" : "s"} pending` : `Backend connected: ${p.primaryStore || "backend"}`);
      setWorkspaceReady(true);
    } catch (error) { setPrivacyReady(true); setWorkspaceReady(true); setSyncState(`Backend offline: ${error.message}`); }
  }

  async function saveWorkspace(nh) {
    if (!user) return;
    await saveWorkspaceState(
      { habits: nh },
      { saved: "Habits saved", failed: "Workspace save failed", local: "Habits saved locally, will sync" }
    );
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

  function habitsForDayKey(dk, sourceHabits = trackedHabits) {
    return habitsForDate(sourceHabits, dk).filter(h => h.active);
  }

  function tasksForDay(dk, checks, extrasByDay = dailyExtras, sourceHabits = trackedHabits) {
    const extras = (extrasByDay[dk] || []).map(normalizeExtraItem).filter(Boolean);
    const dayHabits = habitsForDayKey(dk, sourceHabits);
    return [
      ...dayHabits.map(h => ({ id: h.id, title: h.title, text: h.title, done: Boolean(checks[h.id]), priority: "medium", habitId: h.id, estimateMins: 20 })),
      ...extras.map(item => ({ ...item, estimateMins: item.priority === "high" ? 45 : 25 })),
    ];
  }

  function buildDayPayload(dk, checks, extrasByDay = dailyExtras, sourceHabits = trackedHabits) {
    const dayHabits = habitsForDayKey(dk, sourceHabits);
    const done = dayHabits.filter(h => checks[h.id]).length;
    const status = done === dayHabits.length && dayHabits.length ? "won" : done > 0 ? "neutral" : "missed";
    return { dateKey: dk, status, focusLine: quote, habitChecks: checks, tasks: tasksForDay(dk, checks, extrasByDay, sourceHabits) };
  }

  function canEditDay(dk) {
    return dk === dayforgeTodayKey();
  }

  function showDayLocked(dk) {
    const today = dayforgeTodayKey();
    setSyncState(dk < today ? `History locked: ${dk}` : `Only today is editable: ${dk}`);
  }

  async function pushDay(dk, checks, extrasByDay = dailyExtras) {
    if (!user) return;
    if (!canEditDay(dk)) {
      showDayLocked(dk);
      return;
    }
    const day = buildDayPayload(dk, checks, extrasByDay);
    const queued = queuePendingDay(user.uid, dk, day);
    try {
      const r = await putJson(`/api/days/${dk}`, { day: queued.day });
      if (!r.ok) throw new Error(await apiMessage(r, `Day save failed (${r.status})`));
      clearPendingDay(user.uid, dk, queued.queuedAt);
      setSyncState("Day saved");
    } catch (error) { setSyncState(`Saved locally, will sync: ${error.message}`); }
  }

  function toggleHabit(dk, hid) {
    if (!canEditDay(dk)) {
      setSelectedDate(dk);
      showDayLocked(dk);
      return;
    }
    setGrid(c => { const nc = { ...(c[dk] || {}), [hid]: !c[dk]?.[hid] }; pushDay(dk, nc); return { ...c, [dk]: nc }; });
  }

  function addExtraItem(e) {
    e.preventDefault();
    if (!canEditDay(selectedDate)) {
      showDayLocked(selectedDate);
      return;
    }
    const item = normalizeExtraItem({ title: extraDraft, priority: "medium" });
    if (!item) return;
    const nextExtras = { ...dailyExtras, [selectedDate]: [...(dailyExtras[selectedDate] || []), item] };
    setDailyExtras(nextExtras);
    setExtraDraft("");
    pushDay(selectedDate, grid[selectedDate] || {}, nextExtras);
  }

  function toggleExtraItem(dateKey, itemId) {
    if (!canEditDay(dateKey)) {
      setSelectedDate(dateKey);
      showDayLocked(dateKey);
      return;
    }
    const nextExtras = {
      ...dailyExtras,
      [dateKey]: (dailyExtras[dateKey] || []).map(item => item.id === itemId ? { ...item, done: !item.done } : item)
    };
    setDailyExtras(nextExtras);
    pushDay(dateKey, grid[dateKey] || {}, nextExtras);
  }

  function deleteExtraItem(dateKey, itemId) {
    if (!canEditDay(dateKey)) {
      setSelectedDate(dateKey);
      showDayLocked(dateKey);
      return;
    }
    const nextItems = (dailyExtras[dateKey] || []).filter(item => item.id !== itemId);
    const nextExtras = { ...dailyExtras, [dateKey]: nextItems };
    if (!nextItems.length) delete nextExtras[dateKey];
    setDailyExtras(nextExtras);
    pushDay(dateKey, grid[dateKey] || {}, nextExtras);
  }

  function addHabit(e) {
    e.preventDefault();
    const t = habitDraft.trim(); if (!t) return;
    const nh = [...trackedHabits, normalizeHabit({ id: uid(), title: t, category: "Focus", targetPerWeek: 5, active: true, createdAt: new Date().toISOString() })];
    setHabits(nh); setHabitDraft(""); saveWorkspace(nh);
  }

  function deleteHabit(hid) {
    const deletedAt = new Date().toISOString();
    const nh = habits.map(h => h.id === hid ? { ...h, active: false, deletedAt } : h);
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

  function saveTemptationList(next) {
    const clean = next.map(normalizeTemptation).filter(Boolean).slice(0, 50);
    setTemptations(clean);
    writeLegacyTemptations(clean);
    saveWorkspaceState(
      { temptations: clean },
      { saved: "Temptations saved", failed: "Temptation save failed", local: "Temptations saved locally, will sync" }
    );
  }

  async function saveWorkspaceWithReminders(nr) {
    if (!user) return;
    await saveWorkspaceState(
      { reminders: nr },
      { saved: "Reminders saved", failed: "Save failed", local: "Reminders saved locally, will sync" }
    );
  }

  async function saveProfileName(e) {
    e.preventDefault();
    if (!user) return;
    const name = profileDraft.trim();
    if (!name) return;
    const nextProfile = { ...profile, displayName: name };
    setProfile(nextProfile);
    setProfileEditing(false);
    await saveWorkspaceState(
      { profile: nextProfile },
      { saved: "Profile saved", failed: "Profile save failed", local: "Profile saved locally, will sync" }
    );
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
    await saveWorkspaceState(
      { privacySettings: nextPrivacy },
      { saved: "Privacy saved", failed: "Privacy save failed", local: "Privacy saved locally, will sync" }
    );
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
            <p>Track habits with a precision heatmap, build unbreakable streaks, resist temptations, and forge discipline that compounds daily.</p>
            <div className="gate-features">
              <span className="gate-feature"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg> Habit Heatmap</span>
              <span className="gate-feature"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> Email Reminders</span>
              <span className="gate-feature"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg> Streak Analytics</span>
              <span className="gate-feature"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> Temptation Log</span>
            </div>
            <div className="gate-actions">
              <button type="button" className="primary-button gate-cta" onClick={handleAuth}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>
                Sign in with Google
              </button>
            </div>
            <small className="gate-status">{syncState}</small>
          </div>
          <div className="gate-visual">
            <img src={heroImg} alt="" onError={handleImageError} />
            <div className="gate-visual-overlay">
              <span className="gate-stat-badge">Heatmap</span>
              <span className="gate-stat-badge">Streaks</span>
              <span className="gate-stat-badge">Resist Mode</span>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!privacyReady || !workspaceReady) {
    return (
      <div className="gate-screen">
        <section className="privacy-gate-card">
          <div className="privacy-lock-mark">••••</div>
          <span className="gate-kicker">DayForge</span>
          <h1>Preparing your private dashboard.</h1>
          <p className="privacy-message">{syncState}</p>
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
              {["Exercise 30 min","Read 10 pages","Meditate 10 min","No junk food","Sleep by 11pm","No phone 1hr","Cold shower","Journal 5 min"].map(s => (
                <button key={s} type="button" className="suggestion-chip" onClick={() => setHabitDraft(s)}>{s}</button>
              ))}
            </div>
            <div className="first-habit-actions">
              <button className="auth-button" type="button" onClick={handleAuth}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
                Sign out
              </button>
              <button className="theme-button small" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark"
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                }
                {theme === "dark" ? "Light" : "Dark"}
              </button>
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

  const ms = buildMonthStats(grid, days, trackedHabits);
  const ws = buildWeeklyStats(grid, days, trackedHabits);
  const todayKey = dayforgeTodayKey();
  const todayStats = dayStats(grid[todayKey] || {}, activeHabits);
  const cs = currentStreak(grid, trackedHabits);
  const ls = longestStreak(grid, trackedHabits);
  const fs = focusScore(grid, days, trackedHabits);
  const rows = habitRows(grid, days, activeHabits);
  const monthHabits = trackedHabits.filter(h => days.some(d => habitsForDate([h], d).length));

  return (
    <main className="forge-screen">
      {/* LEFT SIDEBAR */}
      <section className="left-panel">
        <div className="brand-block">
          <h1>{monthDate.toLocaleDateString("en-US", { month: "long" })}</h1>
          <span>Day Forge Tracker</span>
        </div>
        <form className={`profile-card ${profileEditing ? "editing" : ""}`} onSubmit={saveProfileName}>
          <div className="profile-avatar">{initials}</div>
          <div className="profile-copy">
            <span>Welcome back</span>
            {profileEditing ? (
              <input value={profileDraft} onChange={e => setProfileDraft(e.target.value)} placeholder="Your name" maxLength={80} aria-label="Your name" autoFocus onFocus={e => e.target.select()} />
            ) : (
              <strong className="profile-name">{displayName}</strong>
            )}
          </div>
          {profileEditing ? (
            <button className="profile-save-button" type="submit" title="Save profile name" aria-label="Save profile name">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </button>
          ) : (
            <button className="profile-edit-button" type="button" title="Edit profile name" aria-label="Edit profile name" onClick={() => { setProfileDraft(displayName); setProfileEditing(true); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
          )}
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
          <button className="theme-button small" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title={theme === "dark" ? "Switch to light" : "Switch to dark"}>{theme === "dark" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>}</button>
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
          habits={monthHabits}
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
        <ResistCard
          temptations={temptations}
          draft={temptDraft}
          setDraft={setTemptDraft}
          onLog={(e) => {
            e.preventDefault();
            const t = temptDraft.trim(); if (!t) return;
            const next = [{ id: uid(), label: t, resisted: true, time: new Date().toISOString() }, ...temptations].slice(0, 50);
            setTemptDraft("");
            saveTemptationList(next);
          }}
          onToggle={(id) => {
            const next = temptations.map(item => item.id === id ? { ...item, resisted: !item.resisted } : item);
            saveTemptationList(next);
          }}
          onDelete={(id) => {
            const next = temptations.filter(item => item.id !== id);
            saveTemptationList(next);
          }}
        />
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
          <button type="button" onClick={onSignOut}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg> Sign out</button>
          <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "\u2600\uFE0F Light" : "\uD83C\uDF19 Dark"}</button>
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
  const selectedHabits = habitsForDate(habits, selectedDate);
  const selectedStats = dayStats(selectedChecks, selectedHabits);
  const doneExtras = extras.filter(item => item.done).length;
  const selectedEditable = selectedDate === todayKey;
  const lockLabel = selectedEditable ? `Open until ${String(DAY_START_HOUR).padStart(2, "0")}:00` : selectedDate < todayKey ? "History locked" : "Not today";
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
            <div className="day-label habit-label" title={h.title}>{h.title.length > 8 ? h.title.slice(0,8) + ".." : h.title}</div>
            {days.map(d => {
              const k = toDateKey(d);
              const checked = Boolean((grid[k] || {})[h.id]);
              const available = habitsForDate([h], k).length > 0;
              const editable = k === todayKey && available && h.active;
              return (
                <button key={k}
                  className={`heatmap-cell ${checked ? "habit-done" : "habit-miss"} ${editable ? "today" : "locked"} ${available ? "" : "dormant"} ${k === selectedDate ? "selected" : ""}`}
                  onClick={() => editable ? onToggle(k, h.id) : onSelect(k)}
                  title={`${h.title} - ${k}: ${available ? (checked ? "Done" : "Not done") : "Not active"}${editable ? "" : " (view only)"}`}
                  aria-label={`${h.title} ${k} ${editable ? "editable today" : "view only"}`}
                />
              );
            })}
          </React.Fragment>
        ))}
        <div className="day-label" style={{fontWeight:800,color:'var(--muted)'}}>All</div>
        {days.map(d => {
          const k = toDateKey(d);
          const c = grid[k] || {};
          const dayHabits = habitsForDate(habits, k);
          const done = dayHabits.filter(h => c[h.id]).length;
          const pct = dayHabits.length ? done / dayHabits.length : 0;
          const lv = pct === 0 ? 0 : pct <= 0.25 ? 1 : pct <= 0.5 ? 2 : pct <= 0.75 ? 3 : pct < 1 ? 4 : 5;
          return (
            <button key={k}
              className={`heatmap-cell lv${lv} ${k === todayKey ? "today" : ""} ${k === selectedDate ? "selected" : ""}`}
              onClick={() => onSelect(k)}
              title={`${k}: ${done}/${dayHabits.length}`}
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
          <div>
            <span>{selectedDate}</span>
            <em>{lockLabel}</em>
          </div>
          <strong>{selectedStats.done}/{selectedStats.total} habits - {doneExtras}/{extras.length} extras</strong>
        </div>
        <div className="selected-day-checks">
          {selectedHabits.map(h => {
            const checked = Boolean(selectedChecks[h.id]);
            const habitEditable = selectedEditable && h.active;
            return (
              <label className={`selected-day-check ${checked ? "done" : ""} ${habitEditable ? "" : "locked"}`} key={h.id}>
                <input type="checkbox" checked={checked} disabled={!habitEditable} onChange={() => onToggle(selectedDate, h.id)} />
                <span>{h.title}</span>
              </label>
            );
          })}
          {selectedHabits.length === 0 && <div className="selected-day-empty">No habits were active on this day.</div>}
        </div>
        <div className={`today-extra-panel ${selectedEditable ? "" : "locked"}`}>
          <div className="today-extra-head">
            <span>Today Only</span>
            <strong>{selectedEditable ? "Meetings, assignments, calls" : "View only"}</strong>
          </div>
          <form className="today-extra-form" onSubmit={onAddExtra}>
            <input value={extraDraft} disabled={!selectedEditable} onChange={e => setExtraDraft(e.target.value)} placeholder={selectedEditable ? "Add meeting, assignment, contest..." : "Only today can be edited"} maxLength={90} />
            <button type="submit" disabled={!selectedEditable}>Add</button>
          </form>
          <div className="today-extra-list">
            {extras.length === 0 && <div className="today-extra-empty">No one-off items for this day.</div>}
            {extras.map(item => (
              <div className={`today-extra-item ${item.done ? "done" : ""}`} key={item.id}>
                <label>
                  <input type="checkbox" checked={item.done} disabled={!selectedEditable} onChange={() => onToggleExtra(selectedDate, item.id)} />
                  <span>{item.title}</span>
                </label>
                <button type="button" disabled={!selectedEditable} onClick={() => onDeleteExtra(selectedDate, item.id)} aria-label={`Delete ${item.title}`}>&times;</button>
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
            <Ring value={w.pct} size={82} />
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

function ResistCard({ temptations, draft, setDraft, onLog, onToggle, onDelete }) {
  const today = dayforgeTodayKey();
  const todayItems = temptations.filter(t => t.time && t.time.slice(0, 10) === today);
  const resisted = todayItems.filter(t => t.resisted).length;
  const total = todayItems.length;
  return (
    <div className="resist-card">
      <div className="card-header">
        <h3>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign:'middle',marginRight:4}}>
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          Temptation Log
        </h3>
        <span className="resist-score">{resisted}/{total || 0} resisted</span>
      </div>
      <div className="resist-summary">
        <span className="resist-badge">{resisted > 0 ? "\u{1F6E1}" : "\u26A0\uFE0F"} {resisted > 0 ? `${resisted} urge${resisted > 1 ? "s" : ""} defeated today` : "Log your first urge"}</span>
      </div>
      <form className="resist-form" onSubmit={onLog}>
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="What tempted you?" maxLength={60} />
        <button type="submit" title="I resisted!">Resisted</button>
      </form>
      <div className="resist-presets">
        {["Phone scroll", "Junk food", "Skipping workout", "Late sleep"].map(p => (
          <button key={p} type="button" onClick={() => setDraft(p)}>{p}</button>
        ))}
      </div>
      <div className="resist-list">
        {temptations.length === 0 && <div className="resist-empty">No temptations logged yet. Stay strong.</div>}
        {temptations.slice(0, 8).map(t => (
          <div className={`resist-item ${t.resisted ? "won" : "lost"}`} key={t.id}>
            <button type="button" className="resist-toggle" onClick={() => onToggle(t.id)} title={t.resisted ? "Mark as given in" : "Mark as resisted"}>{t.resisted ? "\u2713" : "\u2717"}</button>
            <span className="resist-label">{t.label}</span>
            <span className="resist-time">{new Date(t.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
            <button type="button" className="resist-del" onClick={() => onDelete(t.id)}>&times;</button>
          </div>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
