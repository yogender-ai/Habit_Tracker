import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { initializeApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut
} from "firebase/auth";
import "../styles.css";

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

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const DOW_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const HABIT_COLORS = [
  { id: "indigo", hex: "#5b5ce6" },
  { id: "mint", hex: "#24a35a" },
  { id: "pink", hex: "#e85d9a" },
  { id: "amber", hex: "#e3a008" },
  { id: "cyan", hex: "#0ea5b7" },
  { id: "rose", hex: "#e11d48" },
  { id: "violet", hex: "#7c3aed" },
  { id: "blue", hex: "#2563eb" },
  { id: "orange", hex: "#ea580c" },
  { id: "lime", hex: "#65a30d" },
];
const COLOR_MAP = Object.fromEntries(HABIT_COLORS.map(c => [c.id, c.hex]));
const EMOJIS = ["🏃", "📖", "🧘", "💧", "🌙", "🥗", "✍️", "🎯", "💪", "🧠", "🚶", "🧹", "🙏", "🍎", "🧪", "☎️"];

const TEMPLATES = [
  { title: "Deep work", emoji: "🎯", color: "rose", days: WEEKDAYS, targetPerWeek: 5, when: "day", kind: "check" },
  { title: "Lift / train", emoji: "💪", color: "mint", days: ALL_DAYS, targetPerWeek: 5, when: "morning", kind: "check" },
  { title: "Sleep by 11", emoji: "🌙", color: "blue", days: ALL_DAYS, targetPerWeek: 6, when: "evening", kind: "check" },
  { title: "No phone first hour", emoji: "🧠", color: "violet", days: ALL_DAYS, targetPerWeek: 7, when: "morning", kind: "check" },
  { title: "Ship one thing", emoji: "🚀", color: "amber", days: WEEKDAYS, targetPerWeek: 5, when: "day", kind: "check" },
  { title: "Walk after meetings", emoji: "🚶", color: "cyan", days: WEEKDAYS, targetPerWeek: 5, when: "day", kind: "check" },
  { title: "LeetCode", emoji: "💻", color: "indigo", days: ALL_DAYS, targetPerWeek: 5, when: "day", kind: "check" },
  { title: "Read 10 pages", emoji: "📖", color: "pink", days: ALL_DAYS, targetPerWeek: 7, when: "evening", kind: "count", goal: 10 },
];
const TIME_GROUPS = [
  { id: "morning", label: "Morning" },
  { id: "day", label: "Day" },
  { id: "evening", label: "Evening" },
];
const WALLS = [
  { id: "gotham", src: "/walls/gotham.jpg", label: "Gotham" },
  { id: "aurora", src: "/walls/aurora.jpg", label: "Aurora" },
  { id: "nebula", src: "/walls/nebula.jpg", label: "Nebula" },
  { id: "dusk", src: "/walls/dusk.jpg", label: "Dusk" },
  { id: "silk", src: "/walls/silk.jpg", label: "Silk" },
  { id: "ember", src: "/walls/ember.jpg", label: "Ember" },
];
const QUOTES = [
  "You do not need more time. You need the same hour, every day.",
  "Busy is not the enemy. Untracked days are.",
  "Protect the hour. The rest of the day can be chaos.",
  "One box. Then the next. That is how careers are built.",
  "Consistency is the only flex that compounds.",
  "The heatmap does not care that you were tired.",
  "Show up like the work is already yours.",
  "Small reps. Public results. Private discipline.",
  "A full calendar is not a life. A filled heatmap is.",
  "Do the boring thing while the world is loud.",
  "Talent is common. The people who check the box win.",
  "Keep the promise small enough to keep on a brutal day.",
];
function quoteForDay(key) {
  const n = String(key || "").split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return QUOTES[n % QUOTES.length];
}

const LEGACY_DEFAULT_HABIT_IDS = new Set([
  "clean-room", "assignments", "digital-files", "read",
  "exercise", "water", "plan", "meditate",
]);

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function toDateKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function dayforgeDate(now = new Date()) {
  const d = new Date(now);
  if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function dayforgeTodayKey(now = new Date()) { return toDateKey(dayforgeDate(now)); }
function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function monthDays(d) {
  const y = d.getFullYear(), m = d.getMonth(), t = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: t }, (_, i) => new Date(y, m, i + 1));
}
function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function readLocal(u, k) { try { return JSON.parse(localStorage.getItem(`dayforge_${u}_${k}`)) || {}; } catch { return {}; } }
function writeLocal(u, k, v) { localStorage.setItem(`dayforge_${u}_${k}`, JSON.stringify(v)); }
function removeLocal(u, k) { localStorage.removeItem(`dayforge_${u}_${k}`); }
function readLocalWorkspace(u) { return readLocal(u, "workspace"); }
function writeLocalWorkspace(u, workspace) { writeLocal(u, "workspace", workspace); }
function readLegacySleepLog() { try { return JSON.parse(localStorage.getItem("dayforge_sleep") || "{}"); } catch { return {}; } }
function writeLegacySleepLog(log) { localStorage.setItem("dayforge_sleep", JSON.stringify(log)); }
function readLegacyTemptations() { try { return JSON.parse(localStorage.getItem("dayforge_temptations") || "[]"); } catch { return []; } }
function writeLegacyTemptations(temptations) { localStorage.setItem("dayforge_temptations", JSON.stringify(temptations)); }
function apiBase() {
  const c = String(CONFIG.apiBaseUrl || "").trim().replace(/\/$/, "");
  if (c) return c;
  if (location.hostname === "127.0.0.1" || location.hostname === "localhost") return "http://127.0.0.1:8000";
  return location.origin;
}
function hasFirebaseConfig() {
  const f = CONFIG.firebase || {};
  return Boolean(f.apiKey && f.authDomain && f.projectId && f.appId);
}
function colorOf(habit) { return COLOR_MAP[habit?.color] || HABIT_COLORS[0].hex; }
function guessEmoji(title = "") {
  const t = title.toLowerCase();
  if (/run|gym|walk|move|exercise|workout/.test(t)) return "🏃";
  if (/read|book/.test(t)) return "📖";
  if (/meditat|breath/.test(t)) return "🧘";
  if (/water|hydrat/.test(t)) return "💧";
  if (/sleep|bed/.test(t)) return "🌙";
  if (/food|eat|diet/.test(t)) return "🥗";
  if (/journal|write/.test(t)) return "✍️";
  if (/work|study|focus/.test(t)) return "🎯";
  return pick(EMOJIS);
}
function normalizeDays(days) {
  const list = Array.isArray(days) ? days.map(Number).filter(n => n >= 0 && n <= 6) : ALL_DAYS.slice();
  const unique = [...new Set(list.length ? list : ALL_DAYS)];
  return unique.sort((a, b) => a - b);
}
function sameDays(a, b) {
  const x = normalizeDays(a).join(",");
  const y = normalizeDays(b).join(",");
  return x === y;
}
function scheduleLabel(days) {
  const d = normalizeDays(days);
  if (sameDays(d, ALL_DAYS)) return "Every day";
  if (sameDays(d, WEEKDAYS)) return "Weekdays";
  if (sameDays(d, WEEKENDS)) return "Weekends";
  return d.map(n => DOW_FULL[n]).join(" · ");
}
function normalizeHabit(h) {
  const colors = HABIT_COLORS.map(c => c.id);
  const color = colors.includes(h.color) ? h.color : HABIT_COLORS[(String(h.id || "").length + String(h.title || "").length) % HABIT_COLORS.length].id;
  const when = ["morning", "day", "evening"].includes(h.when) ? h.when : "day";
  const kind = h.kind === "count" ? "count" : "check";
  return {
    id: String(h.id || uid()),
    title: String(h.title || "New habit").slice(0, 90),
    category: String(h.category || "Focus").slice(0, 40),
    targetPerWeek: Math.max(1, Math.min(7, Number(h.targetPerWeek || h.target || 7))),
    active: h.active !== false,
    color,
    emoji: String(h.emoji || guessEmoji(h.title)).slice(0, 4),
    days: normalizeDays(h.days),
    kind,
    goal: Math.max(1, Math.min(99, Number(h.goal || (kind === "count" ? 8 : 1)))),
    when,
    createdAt: h.createdAt || "1970-01-01T00:00:00.000Z",
    deletedAt: h.deletedAt || (h.active === false ? (h.updatedAt || new Date().toISOString()) : ""),
  };
}
function yesterdayKey(now = new Date()) {
  const d = dayforgeDate(now);
  d.setDate(d.getDate() - 1);
  return toDateKey(d);
}
function isSkipped(value) { return value === "skip"; }
function countOf(value, habit) {
  if (value === true || value === "skip") return Math.max(1, Number(habit?.goal || 1));
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}
function isClosed(value, habit) {
  if (isSkipped(value)) return true;
  if ((habit?.kind || "check") === "count") return countOf(value, habit) >= Math.max(1, Number(habit.goal || 1));
  return Boolean(value);
}
function habitClosedOn(grid, habit, dateKey) {
  return isClosed((grid[dateKey] || {})[habit.id], habit);
}
function isLegacyDefaultHabit(h) { return LEGACY_DEFAULT_HABIT_IDS.has(String(h.id || "")); }
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
  return { theme: preferences.theme === "light" ? "light" : "dark" };
}
function workspaceFor(user, habits, reminders = [], profile = {}, settings = {}, synced = {}) {
  const email = settings.email || user?.email || "";
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
    privacySettings: { enabled: false },
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
    workspace.profile?.displayName
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
  const pendingPreferences = pendingWorkspace.preferences || {};
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
    preferences: {
      ...(remoteWorkspace.preferences || {}),
      ...pendingPreferences,
    },
    privacySettings: { enabled: false },
  };
}
function shouldApplyWorkspaceResponse(userId, queuedAt, workspace) {
  const pending = readPendingSync(userId).workspace;
  if (pending && pending.queuedAt !== queuedAt) return false;
  const localTime = parseTime(readLocalWorkspace(userId).updatedAt);
  const remoteTime = parseTime(workspace?.updatedAt);
  return !localTime || !remoteTime || remoteTime >= localTime;
}
async function apiMessage(response, fallback) {
  try { const body = await response.json(); return body.detail || body.error || fallback; } catch { return fallback; }
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
function normalizeSleepEntry(entry = {}) {
  const time = String(entry.time || "").slice(0, 40);
  if (!time) return null;
  return {
    time,
    display: String(entry.display || "").slice(0, 20),
    woke: entry.woke ? String(entry.woke).slice(0, 40) : "",
    wokeDisplay: entry.wokeDisplay ? String(entry.wokeDisplay).slice(0, 20) : "",
  };
}
function normalizeSleepLog(log = {}) {
  const clean = {};
  if (!log || typeof log !== "object") return clean;
  Object.entries(log).forEach(([dateKey, entries]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !Array.isArray(entries)) return;
    const normalized = entries.map(normalizeSleepEntry).filter(Boolean).slice(0, 12);
    if (normalized.length) clean[dateKey] = normalized;
  });
  return clean;
}
function mergeSleepEntries(primary = [], secondary = []) {
  const seen = new Set();
  return [...primary, ...secondary].map(normalizeSleepEntry).filter(Boolean).filter(entry => {
    const key = `${entry.time}|${entry.woke || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}
function normalizeDailyNote(value = "") {
  return String(value || "").replace(/\r/g, "").trim().slice(0, 700);
}
function normalizeDailyNotes(notes = {}) {
  const clean = {};
  if (!notes || typeof notes !== "object") return clean;
  Object.entries(notes).forEach(([dateKey, value]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
    const note = normalizeDailyNote(value);
    if (note) clean[dateKey] = note;
  });
  return clean;
}
function readLocalSleepLog(userId) {
  const scoped = normalizeSleepLog(readLocal(userId, "sleep"));
  if (Object.keys(scoped).length) return scoped;
  return normalizeSleepLog(readLegacySleepLog());
}
function writeLocalSleepLog(userId, log) {
  const clean = normalizeSleepLog(log);
  writeLocal(userId, "sleep", clean);
  writeLegacySleepLog(clean);
}
function readLocalDailyNotes(userId) { return normalizeDailyNotes(readLocal(userId, "daily_notes")); }
function writeLocalDailyNotes(userId, notes) { writeLocal(userId, "daily_notes", normalizeDailyNotes(notes)); }
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
function habitBoundaryKey(value) {
  const d = new Date(value || "1970-01-01T00:00:00.000Z");
  return Number.isNaN(d.getTime()) ? "1970-01-01" : toDateKey(dayforgeDate(d));
}
function dateFromKey(key) { return new Date(`${key}T12:00:00`); }
function habitScheduledOn(habit, date) {
  const key = typeof date === "string" ? date : toDateKey(date);
  const start = habitBoundaryKey(habit.createdAt);
  const end = habit.deletedAt ? habitBoundaryKey(habit.deletedAt) : "";
  if (start > key || (end && key >= end)) return false;
  if (isLegacyDefaultHabit(habit)) return false;
  const days = normalizeDays(habit.days);
  return days.includes(dateFromKey(key).getDay());
}
function habitsForDate(habits = [], date) {
  return habits.filter(h => habitScheduledOn(h, date));
}
function dayStats(checks = {}, habits = []) {
  const t = habits.length, d = habits.filter(h => isClosed(checks[h.id], h)).length;
  return { done: d, total: t, pct: t ? Math.round((d / t) * 100) : 0 };
}
function buildMonthStats(grid, days, habits) {
  const daily = days.map(d => dayStats(grid[toDateKey(d)] || {}, habitsForDate(habits, d)));
  const done = daily.reduce((s, i) => s + i.done, 0);
  const total = daily.reduce((s, i) => s + i.total, 0) || 1;
  return { daily, done, total, pct: Math.round((done / total) * 100) };
}
function buildWeeklyStats(grid, days, habits) {
  const chunks = [];
  for (let i = 0; i < days.length; i += 7) chunks.push(days.slice(i, i + 7));
  return chunks.map((c, i) => {
    const s = buildMonthStats(grid, c, habits);
    const f = c[0], l = c[c.length - 1];
    return { ...s, label: `Week ${i + 1}`, range: `${f.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${l.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` };
  });
}
function habitCurrentStreak(grid, habit, todayKey = dayforgeTodayKey()) {
  const today = dayforgeDate();
  let streak = 0;
  for (let i = 0; i < 420; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (!habitScheduledOn(habit, d)) continue;
    const k = toDateKey(d);
    const value = (grid[k] || {})[habit.id];
    if (isSkipped(value)) continue;
    if (isClosed(value, habit)) streak += 1;
    else if (k === todayKey) continue;
    else break;
  }
  return streak;
}
function habitBestStreak(grid, habit) {
  const today = dayforgeDate();
  let best = 0, run = 0;
  for (let i = 400; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (!habitScheduledOn(habit, d)) continue;
    const value = (grid[toDateKey(d)] || {})[habit.id];
    if (isSkipped(value)) continue;
    if (isClosed(value, habit)) { run += 1; best = Math.max(best, run); }
    else run = 0;
  }
  return best;
}
function currentStreak(grid, habits) {
  const today = dayforgeDate();
  const todayKey = toDateKey(today);
  let streak = 0;
  for (let i = 0; i < 365; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = toDateKey(d);
    const dayHabits = habitsForDate(habits, d).filter(h => h.active !== false);
    if (!dayHabits.length) continue;
    const done = dayHabits.every(h => isClosed((grid[k] || {})[h.id], h));
    if (done) streak += 1;
    else if (k === todayKey) continue;
    else break;
  }
  return streak;
}
function longestStreak(grid, habits) {
  const today = dayforgeDate();
  let best = 0, run = 0;
  for (let i = 365; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = toDateKey(d);
    const dayHabits = habitsForDate(habits, d);
    if (!dayHabits.length) continue;
    if (dayHabits.every(h => isClosed((grid[k] || {})[h.id], h))) { run += 1; best = Math.max(best, run); }
    else run = 0;
  }
  return best;
}
function perfectDays(grid, habits, days) {
  return days.filter(d => {
    const hs = habitsForDate(habits, d);
    return hs.length && hs.every(h => isClosed((grid[toDateKey(d)] || {})[h.id], h));
  }).length;
}
function lastNDays(n, from = dayforgeDate()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(from);
    d.setDate(d.getDate() - (n - 1 - i));
    return d;
  });
}
function greetingFor(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return "Still going";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Wind down";
}
function emptyHabitDraft(partial = {}) {
  return {
    title: "",
    emoji: "🎯",
    color: "indigo",
    days: ALL_DAYS.slice(),
    targetPerWeek: 7,
    kind: "check",
    goal: 8,
    when: "day",
    ...partial,
  };
}

function Ring({ value, label = "today", size = 118 }) {
  const r = 39, circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="ring" style={{ "--size": `${size}px` }}>
      <svg viewBox="0 0 100 100">
        <circle className="track" cx="50" cy="50" r={r} />
        <circle
          className="value"
          cx="50" cy="50" r={r}
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ - (circ * pct) / 100}
        />
        <text className="center" x="50" y="52">{pct}%</text>
        <text className="sub" x="50" y="66">{label}</text>
      </svg>
    </div>
  );
}

function Mark() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="13" stroke="currentColor" strokeOpacity="0.18" strokeWidth="4" />
      <path d="M18 5a13 13 0 0 1 11.3 6.6" stroke="#5b5ce6" strokeWidth="4" strokeLinecap="round" />
      <circle cx="18" cy="18" r="5" fill="#24a35a" />
    </svg>
  );
}

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
  const [profile, setProfile] = useState({});
  const [profileDraft, setProfileDraft] = useState("");
  const [notificationSettings, setNotificationSettings] = useState({});
  const [reminderState, setReminderState] = useState("Mail standby");
  const [reminders, setReminders] = useState([]);
  const [reminderDraft, setReminderDraft] = useState({ title: "", date: dayforgeTodayKey(), time: "09:00", priority: "normal" });
  const [dailyExtras, setDailyExtras] = useState({});
  const [extraDraft, setExtraDraft] = useState("");
  const [temptations, setTemptations] = useState(() => readLegacyTemptations().map(normalizeTemptation).filter(Boolean));
  const [sleepLog, setSleepLog] = useState(() => normalizeSleepLog(readLegacySleepLog()));
  const [dailyNotes, setDailyNotes] = useState({});
  const [noteDraft, setNoteDraft] = useState("");
  const [welcomeState, setWelcomeState] = useState("");
  const [tab, setTab] = useState("today");
  const [wallId, setWallId] = useState(() => localStorage.getItem("dayforge_wall") || "gotham");
  const [clock, setClock] = useState(() => new Date());
  const [sheet, setSheet] = useState(null);
  const [habitDraft, setHabitDraft] = useState(() => emptyHabitDraft());
  const [editingHabitId, setEditingHabitId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [celebrate, setCelebrate] = useState(false);

  const days = useMemo(() => monthDays(monthDate), [monthDate]);
  const monthId = monthKey(monthDate);
  const trackedHabits = habits.filter(h => !isLegacyDefaultHabit(h));
  const todayKey = dayforgeTodayKey();
  const activeHabits = habitsForDate(trackedHabits, todayKey).filter(h => h.active);

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

  useEffect(() => {
    document.body.dataset.theme = "dark";
    localStorage.setItem("dayforge_theme", "dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "#070a12");
  }, [theme]);
  useEffect(() => { localStorage.setItem("dayforge_wall", wallId); }, [wallId]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

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
      setWorkspaceReady(false);
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
    const localSleep = readLocalSleepLog(user.uid);
    const localNotes = readLocalDailyNotes(user.uid);
    setWorkspaceReady(hasPrimaryWorkspaceData(localWorkspace) || hasPrimaryWorkspaceData(pendingWorkspace));
    setProfile(nextProfile);
    setProfileDraft(nextProfile.displayName || defaultDisplayName(user));
    setNotificationSettings(localSettings);
    setReminders((localWorkspace.reminders || []).map(normalizeReminder));
    setTemptations(localTemptations);
    writeLegacyTemptations(localTemptations);
    setSleepLog(localSleep);
    writeLocalSleepLog(user.uid, localSleep);
    setDailyNotes(localNotes);
    writeLocalDailyNotes(user.uid, localNotes);
    if (localWorkspace.preferences?.theme) setTheme(localPreferences.theme);
    setHabits(localHabits);
    setGrid(readLocal(user.uid, monthId));
    setDailyExtras(readLocal(user.uid, `${monthId}_extras`));
    syncFromBackend();
    sendWelcomeEmail();
  }, [user, monthId]);

  useEffect(() => { if (!user) return; writeLocal(user.uid, monthId, grid); }, [grid, monthId, user]);
  useEffect(() => { if (!user) return; writeLocal(user.uid, `${monthId}_extras`, dailyExtras); }, [dailyExtras, monthId, user]);
  useEffect(() => { if (!user) return; writeLocalSleepLog(user.uid, sleepLog); }, [sleepLog, user]);
  useEffect(() => { if (!user) return; writeLocalDailyNotes(user.uid, dailyNotes); }, [dailyNotes, user]);
  useEffect(() => { setNoteDraft(dailyNotes[selectedDate] || ""); }, [selectedDate, dailyNotes]);
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
        fetch(`${apiBase()}/api/workspace`, { method: "PUT", headers, body, keepalive: body.length < 60000 }).catch(() => {});
      }
      Object.entries(pending.days).forEach(([dateKey, item]) => {
        const body = JSON.stringify({ day: item.day });
        fetch(`${apiBase()}/api/days/${dateKey}`, { method: "PUT", headers, body, keepalive: body.length < 60000 }).catch(() => {});
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
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!user || !workspaceReady) return;
    const onKey = (event) => {
      if (event.target.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "a") openNewHabit();
      if (event.key === "w") {
        const i = WALLS.findIndex(w => w.id === wallId);
        setWallId(WALLS[(i + 1) % WALLS.length].id);
      }
      if (/^[1-9]$/.test(event.key)) {
        const remaining = habitsForDate(trackedHabits, dayforgeTodayKey()).filter(h => h.active && !isClosed((grid[dayforgeTodayKey()] || {})[h.id], h));
        const habit = remaining[Number(event.key) - 1];
        if (habit) {
          if (habit.kind === "count") bumpHabit(dayforgeTodayKey(), habit.id, 1);
          else toggleHabit(dayforgeTodayKey(), habit.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [user, workspaceReady, trackedHabits, grid, wallId]);

  async function authHeaders() {
    const h = { "Content-Type": "application/json", "X-Demo-User": user?.uid || "dayforge-local" };
    const firebaseUser = auth?.currentUser || user;
    if (firebaseUser?.getIdToken) h.Authorization = `Bearer ${await firebaseUser.getIdToken()}`;
    authHeaderCache.current = h;
    return h;
  }

  function buildWorkspace(overrides = {}) {
    return workspaceFor(
      user,
      overrides.habits ?? habits,
      overrides.reminders ?? reminders,
      overrides.profile ?? profile,
      overrides.notificationSettings ?? notificationSettings,
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
    writeLocalWorkspace(user.uid, { ...workspace, privacySettings: { enabled: false } });
    setHabits(nextHabits);
    setProfile(nextProfile);
    setProfileDraft(nextProfile.displayName || defaultDisplayName(user));
    setNotificationSettings(nextSettings);
    setReminders(nextReminders);
    setTemptations(nextTemptations);
    writeLegacyTemptations(nextTemptations);
    if (workspace.preferences?.theme) setTheme(nextPreferences.theme);
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
      } catch { failed += 1; }
    }
    if (flushDays) {
      const dayEntries = Object.entries(readPendingSync(user.uid).days);
      for (const [dateKey, item] of dayEntries) {
        try {
          const r = await putJson(`/api/days/${dateKey}`, { day: item.day });
          if (!r.ok) throw new Error(await apiMessage(r, `Day save failed (${r.status})`));
          if (clearPendingDay(user.uid, dateKey, item.queuedAt)) synced += 1;
        } catch { failed += 1; }
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
        const localTemptations = ((localWorkspace.temptations || []).length ? localWorkspace.temptations : readLegacyTemptations()).map(normalizeTemptation).filter(Boolean);
        const saved = await saveWorkspaceState({
          habits: (localWorkspace.habits || []).map(normalizeHabit).filter(h => !isLegacyDefaultHabit(h)),
          reminders: (localWorkspace.reminders || []).map(normalizeReminder),
          profile: localWorkspace.profile || {},
          notificationSettings: localWorkspace.notificationSettings || {},
          temptations: localTemptations,
          theme: normalizePreferences(localWorkspace.preferences || {}).theme,
        }, { saved: "Local workspace synced", local: "Local workspace queued for sync" });
        workspaceForMonth = saved?.workspace || readLocalWorkspace(user.uid);
        if (!saved?.workspace) applyWorkspacePayload(workspaceForMonth);
      } else {
        workspaceForMonth = { ...remoteWorkspace, privacySettings: { enabled: false } };
        applyWorkspacePayload(workspaceForMonth);
      }

      const syncedHabits = (workspaceForMonth.habits || []).map(normalizeHabit).filter(h => !isLegacyDefaultHabit(h));
      const ng = {};
      const nextExtras = {};
      const nextSleepLog = {};
      const nextNotes = {};
      const habitIds = new Set(syncedHabits.map(h => h.id));
      const localGrid = readLocal(user.uid, monthId);
      const localExtras = readLocal(user.uid, `${monthId}_extras`);
      const localSleep = readLocalSleepLog(user.uid);
      const localNotes = readLocalDailyNotes(user.uid);
      const currentPendingDays = readPendingSync(user.uid).days;
      const daysToUpload = [];
      const candidateDateKeys = new Set([
        ...days.map(toDateKey),
        ...Object.keys(p.days || {}),
        ...Object.keys(localSleep),
        ...Object.keys(localNotes),
        ...Object.keys(currentPendingDays),
      ]);
      Array.from(candidateDateKeys).sort().forEach(k => {
        const pendingDay = currentPendingDays[k]?.day;
        const remoteDay = p.days?.[k];
        if (pendingDay) {
          ng[k] = pendingDay.habitChecks || localGrid[k] || {};
          const extras = extrasFromDay(pendingDay, habitIds);
          const sleepEntries = (pendingDay.sleepEntries || localSleep[k] || []).map(normalizeSleepEntry).filter(Boolean);
          const note = normalizeDailyNote(pendingDay.reflection || localNotes[k]);
          if (extras.length) nextExtras[k] = extras;
          else if ((localExtras[k] || []).length) nextExtras[k] = (localExtras[k] || []).map(normalizeExtraItem).filter(Boolean);
          if (sleepEntries.length) nextSleepLog[k] = sleepEntries;
          if (note) nextNotes[k] = note;
          return;
        }
        if (remoteDay) {
          ng[k] = remoteDay.habitChecks || {};
          const extras = extrasFromDay(remoteDay, habitIds);
          const remoteSleepEntries = (remoteDay.sleepEntries || []).map(normalizeSleepEntry).filter(Boolean);
          const localSleepEntries = (localSleep[k] || []).map(normalizeSleepEntry).filter(Boolean);
          const sleepEntries = mergeSleepEntries(remoteSleepEntries, localSleepEntries);
          const remoteNote = normalizeDailyNote(remoteDay.reflection);
          const localNote = normalizeDailyNote(localNotes[k]);
          const note = remoteNote || localNote;
          if (extras.length) nextExtras[k] = extras;
          if (sleepEntries.length) nextSleepLog[k] = sleepEntries;
          if (note) nextNotes[k] = note;
          if (sleepEntries.length > remoteSleepEntries.length || (!remoteNote && localNote)) {
            daysToUpload.push({ dateKey: k, checks: ng[k], extras, sleepEntries, note });
          }
          return;
        }
        const checks = localGrid[k] || {};
        const extras = (localExtras[k] || []).map(normalizeExtraItem).filter(Boolean);
        const sleepEntries = (localSleep[k] || []).map(normalizeSleepEntry).filter(Boolean);
        const note = normalizeDailyNote(localNotes[k]);
        ng[k] = checks;
        if (extras.length) nextExtras[k] = extras;
        if (sleepEntries.length) nextSleepLog[k] = sleepEntries;
        if (note) nextNotes[k] = note;
        if (Object.keys(checks).length || extras.length || sleepEntries.length || note) {
          daysToUpload.push({ dateKey: k, checks, extras, sleepEntries, note });
        }
      });
      setGrid(ng);
      setDailyExtras(nextExtras);
      setSleepLog(nextSleepLog);
      setDailyNotes(nextNotes);
      writeLocalSleepLog(user.uid, nextSleepLog);
      writeLocalDailyNotes(user.uid, nextNotes);
      daysToUpload.forEach(({ dateKey, checks, extras, sleepEntries, note }) => {
        const extrasByDay = { ...localExtras, [dateKey]: extras };
        const sleepByDay = { ...localSleep, [dateKey]: sleepEntries };
        const notesByDay = { ...localNotes, [dateKey]: note };
        const day = buildDayPayload(dateKey, checks, extrasByDay, syncedHabits, sleepByDay, notesByDay);
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
      setSyncState(remainingCount ? `Connected · ${remainingCount} pending` : `Connected · ${p.primaryStore || "cloud"}`);
      setWorkspaceReady(true);
    } catch (error) {
      setWorkspaceReady(true);
      setSyncState(`Offline · ${error.message}`);
    }
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
      const r = await fetch(`${apiBase()}/api/notifications/welcome`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ email: user.email, displayName: profile.displayName || user.displayName || defaultDisplayName(user) })
      });
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
  function buildDayPayload(dk, checks, extrasByDay = dailyExtras, sourceHabits = trackedHabits, sleepByDay = sleepLog, notesByDay = dailyNotes) {
    const dayHabits = habitsForDayKey(dk, sourceHabits);
    const done = dayHabits.filter(h => checks[h.id]).length;
    const status = done === dayHabits.length && dayHabits.length ? "won" : done > 0 ? "neutral" : "missed";
    const sleepEntries = (sleepByDay[dk] || []).map(normalizeSleepEntry).filter(Boolean);
    const reflection = normalizeDailyNote(notesByDay[dk]);
    return { dateKey: dk, status, focusLine: "Keep the streak honest.", habitChecks: checks, tasks: tasksForDay(dk, checks, extrasByDay, sourceHabits), sleepEntries, reflection };
  }
  function canEditDay(dk) {
    return dk === dayforgeTodayKey() || dk === yesterdayKey();
  }
  function showDayLocked(dk) {
    const today = dayforgeTodayKey();
    setToast(dk < today ? "Only today and yesterday stay open." : "That day is not open yet.");
  }
  async function pushDay(dk, checks, extrasByDay = dailyExtras, sleepByDay = sleepLog, notesByDay = dailyNotes) {
    if (!user) return;
    if (!canEditDay(dk)) { showDayLocked(dk); return; }
    const day = buildDayPayload(dk, checks, extrasByDay, trackedHabits, sleepByDay, notesByDay);
    const queued = queuePendingDay(user.uid, dk, day);
    try {
      const r = await putJson(`/api/days/${dk}`, { day: queued.day });
      if (!r.ok) throw new Error(await apiMessage(r, `Day save failed (${r.status})`));
      clearPendingDay(user.uid, dk, queued.queuedAt);
      setSyncState("Saved");
    } catch (error) { setSyncState(`Saved locally · ${error.message}`); }
  }

  function writeDayChecks(dk, nextChecks) {
    setGrid(c => {
      const nextGrid = { ...c, [dk]: nextChecks };
      const scheduled = habitsForDayKey(dk);
      const allDone = scheduled.length && scheduled.every(h => isClosed(nextChecks[h.id], h));
      if (allDone) setCelebrate(true);
      pushDay(dk, nextChecks);
      return nextGrid;
    });
  }
  function toggleHabit(dk, hid) {
    if (!canEditDay(dk)) { setSelectedDate(dk); showDayLocked(dk); return; }
    const habit = trackedHabits.find(h => h.id === hid);
    const current = (grid[dk] || {})[hid];
    const next = { ...(grid[dk] || {}) };
    if ((habit?.kind || "check") === "count") {
      const goal = Math.max(1, Number(habit.goal || 1));
      next[hid] = isClosed(current, habit) ? 0 : goal;
    } else if (isSkipped(current) || current) {
      delete next[hid];
    } else {
      next[hid] = true;
    }
    writeDayChecks(dk, next);
  }
  function bumpHabit(dk, hid, delta) {
    if (!canEditDay(dk)) { setSelectedDate(dk); showDayLocked(dk); return; }
    const habit = trackedHabits.find(h => h.id === hid);
    if (!habit || habit.kind !== "count") return;
    const goal = Math.max(1, Number(habit.goal || 1));
    const next = { ...(grid[dk] || {}) };
    next[hid] = Math.max(0, Math.min(goal, countOf(next[hid], habit) + delta));
    if (next[hid] === 0) delete next[hid];
    writeDayChecks(dk, next);
  }
  function skipHabit(dk, hid) {
    if (!canEditDay(dk)) { setSelectedDate(dk); showDayLocked(dk); return; }
    const next = { ...(grid[dk] || {}) };
    const wasSkip = isSkipped(next[hid]);
    if (wasSkip) delete next[hid];
    else next[hid] = "skip";
    writeDayChecks(dk, next);
    setToast(wasSkip ? "Skip cleared" : "Skipped. Streak holds.");
  }

  function addExtraItem(e) {
    e.preventDefault();
    if (!canEditDay(selectedDate)) { showDayLocked(selectedDate); return; }
    const item = normalizeExtraItem({ title: extraDraft, priority: "medium" });
    if (!item) return;
    const nextExtras = { ...dailyExtras, [selectedDate]: [...(dailyExtras[selectedDate] || []), item] };
    setDailyExtras(nextExtras);
    setExtraDraft("");
    pushDay(selectedDate, grid[selectedDate] || {}, nextExtras);
  }
  function toggleExtraItem(dateKey, itemId) {
    if (!canEditDay(dateKey)) { setSelectedDate(dateKey); showDayLocked(dateKey); return; }
    const nextExtras = {
      ...dailyExtras,
      [dateKey]: (dailyExtras[dateKey] || []).map(item => item.id === itemId ? { ...item, done: !item.done } : item)
    };
    setDailyExtras(nextExtras);
    pushDay(dateKey, grid[dateKey] || {}, nextExtras);
  }
  function deleteExtraItem(dateKey, itemId) {
    if (!canEditDay(dateKey)) { setSelectedDate(dateKey); showDayLocked(dateKey); return; }
    const nextItems = (dailyExtras[dateKey] || []).filter(item => item.id !== itemId);
    const nextExtras = { ...dailyExtras, [dateKey]: nextItems };
    if (!nextItems.length) delete nextExtras[dateKey];
    setDailyExtras(nextExtras);
    pushDay(dateKey, grid[dateKey] || {}, nextExtras);
  }

  function openNewHabit(partial = {}) {
    setEditingHabitId("");
    setHabitDraft(emptyHabitDraft(partial));
    setSheet("habit");
  }
  function openEditHabit(habit) {
    setEditingHabitId(habit.id);
    setHabitDraft(emptyHabitDraft({
      title: habit.title,
      emoji: habit.emoji,
      color: habit.color,
      days: normalizeDays(habit.days),
      targetPerWeek: habit.targetPerWeek,
      kind: habit.kind,
      goal: habit.goal,
      when: habit.when,
    }));
    setSheet("habit");
  }
  function saveHabitForm(e) {
    e.preventDefault();
    const title = habitDraft.title.trim();
    if (!title) return;
    if (editingHabitId) {
      const nh = trackedHabits.map(h => h.id === editingHabitId ? normalizeHabit({ ...h, ...habitDraft, title, id: h.id }) : h);
      setHabits(nh);
      saveWorkspace(nh);
      setToast("Habit updated");
    } else {
      const nh = [...trackedHabits, normalizeHabit({ id: uid(), ...habitDraft, title, active: true, createdAt: new Date().toISOString() })];
      setHabits(nh);
      saveWorkspace(nh);
      setToast("Habit added");
    }
    setSheet(null);
    setEditingHabitId("");
  }
  function deleteHabit(hid) {
    const deletedAt = new Date().toISOString();
    const nh = habits.map(h => h.id === hid ? { ...h, active: false, deletedAt } : h);
    setHabits(nh);
    saveWorkspace(nh);
    setSheet(null);
    setToast("Habit removed");
  }
  function saveDailyNote(e) {
    e.preventDefault();
    if (!canEditDay(selectedDate)) { showDayLocked(selectedDate); return; }
    const note = normalizeDailyNote(noteDraft);
    const nextNotes = { ...dailyNotes };
    if (note) nextNotes[selectedDate] = note;
    else delete nextNotes[selectedDate];
    setDailyNotes(nextNotes);
    if (user) writeLocalDailyNotes(user.uid, nextNotes);
    pushDay(selectedDate, grid[selectedDate] || {}, dailyExtras, sleepLog, nextNotes);
    setToast(note ? "Note saved" : "Note cleared");
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
    await saveWorkspaceState({ reminders: nr }, { saved: "Reminder saved", failed: "Save failed", local: "Reminder saved locally" });
    await checkDueReminders(true);
  }
  function deleteReminder(rid) {
    const nr = reminders.filter(r => r.id !== rid);
    setReminders(nr);
    saveWorkspaceState({ reminders: nr }, { saved: "Reminder removed", local: "Reminder removed locally" });
  }
  async function saveProfileName(e) {
    e.preventDefault();
    if (!user) return;
    const name = profileDraft.trim();
    if (!name) return;
    const nextProfile = { ...profile, displayName: name };
    setProfile(nextProfile);
    await saveWorkspaceState({ profile: nextProfile }, { saved: "Name saved", local: "Name saved locally" });
    setToast("Name saved");
  }
  async function checkDueReminders(force = false) {
    if (!user || (!force && reminders.length === 0)) {
      if (user) setReminderState("Reminders ready");
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
          new Notification(`Priority: ${item.title}`, { body: "DayForge reminder is due now." });
        });
      }
      setReminderState(p.sent ? `${p.sent} email sent` : "Reminders ready");
    } catch {
      setReminderState("Mail paused");
    }
  }
  async function handleAuth() {
    if (!auth) return;
    if (auth.currentUser) await signOut(auth);
    else await signInWithPopup(auth, new GoogleAuthProvider());
  }

  const displayName = profile.displayName || defaultDisplayName(user);
  const firstName = displayName.split(" ")[0] || displayName;
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "D";
  const todayStats = dayStats(grid[todayKey] || {}, activeHabits);
  const yKey = yesterdayKey();
  const yesterdayHabits = habitsForDate(trackedHabits, yKey).filter(h => h.active);
  const yesterdayStats = dayStats(grid[yKey] || {}, yesterdayHabits);
  const catchUpOpen = yesterdayHabits.length > 0 && yesterdayStats.done < yesterdayStats.total;
  const groupedToday = TIME_GROUPS.map(group => ({
    ...group,
    habits: activeHabits
      .filter(h => (h.when || "day") === group.id)
      .sort((a, b) => Number(isClosed((grid[todayKey] || {})[a.id], a)) - Number(isClosed((grid[todayKey] || {})[b.id], b))),
  })).filter(group => group.habits.length);
  const ms = buildMonthStats(grid, days, trackedHabits);
  const ws = buildWeeklyStats(grid, days, trackedHabits);
  const cs = currentStreak(grid, trackedHabits);
  const ls = longestStreak(grid, trackedHabits);
  const perfect = perfectDays(grid, trackedHabits, days);
  const selectedHabits = habitsForDate(trackedHabits, selectedDate).filter(h => h.active);
  const selectedStats = dayStats(grid[selectedDate] || {}, selectedHabits);
  const weekSlice = lastNDays(7);
  const yearSlice = lastNDays(112);
  const upcomingReminder = [...reminders].filter(r => !r.done).sort((a, b) => reminderStamp(a).localeCompare(reminderStamp(b)))[0];
  const wall = WALLS.find(w => w.id === wallId) || WALLS[0];
  const quote = quoteForDay(todayKey);
  const monthHabits = trackedHabits.filter(h => h.active);
  const clockLabel = clock.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  function Wallpaper({ children, center }) {
    return (
      <div className={`stage ${center ? "center" : ""}`}>
        <div className="bg" aria-hidden="true">
          <img src={wall.src} alt="" className="bg-img" />
          <div className="vignette" />
          <div className="noise" />
        </div>
        {children}
      </div>
    );
  }

  if (!authReady) {
    return (
      <Wallpaper center>
        <div className="splash-card glass">
          <div className="wordmark">DayForge</div>
          <p className="lede">Building your day</p>
          <div className="spin" />
        </div>
      </Wallpaper>
    );
  }

  if (!user) {
    return (
      <Wallpaper center>
        <div className="gate-inner glass">
          <p className="kicker">One page. One heatmap.</p>
          <h1>Consistency for a brutal calendar.</h1>
          <p className="lede">Built for people who live in the browser and still want a private proof of the hour they protect.</p>
          <div className="features">
            <div className="feature">Heatmap first — every habit, every day, one screen.</div>
            <div className="feature">Click today. That is the whole system.</div>
            <div className="feature">Wallpaper, quote, streak. No notes. No extra rooms.</div>
          </div>
          <button type="button" className="primary" onClick={handleAuth}>Continue with Google</button>
          <p className="hint">{syncState}</p>
        </div>
      </Wallpaper>
    );
  }

  if (!workspaceReady) {
    return (
      <Wallpaper center>
        <div className="splash-card glass">
          <div className="wordmark">DayForge</div>
          <p className="lede">{syncState || "Loading your heatmap"}</p>
          <div className="spin" />
        </div>
      </Wallpaper>
    );
  }

  if (monthHabits.length === 0) {
    return (
      <Wallpaper center>
        <div className="gate-inner glass">
          <p className="kicker">Start here</p>
          <h1>One habit. The heatmap wakes up.</h1>
          <p className="lede">Pick something you can keep on a brutal day.</p>
          <form className="field" onSubmit={saveProfileName}>
            <span>Your name</span>
            <input value={profileDraft} onChange={e => setProfileDraft(e.target.value)} maxLength={80} />
          </form>
          <div className="starter">
            {TEMPLATES.map(t => (
              <button key={t.title} type="button" onClick={() => openNewHabit(t)}>
                <em>{t.emoji}</em> {t.title}
              </button>
            ))}
          </div>
          <form className="inline-form" onSubmit={saveHabitForm} style={{ marginTop: 14 }}>
            <input
              value={habitDraft.title}
              onChange={e => setHabitDraft(d => ({ ...d, title: e.target.value }))}
              placeholder="Or write your own"
              maxLength={80}
            />
            <button type="submit">Add</button>
          </form>
          <p className="hint">{syncState}</p>
          {sheet === "habit" && (
            <HabitSheet
              draft={habitDraft}
              setDraft={setHabitDraft}
              editing={Boolean(editingHabitId)}
              onClose={() => setSheet(null)}
              onSave={saveHabitForm}
            />
          )}
        </div>
      </Wallpaper>
    );
  }

  return (
    <Wallpaper>
      <header className="bar glass" onClick={() => menuOpen && setMenuOpen(false)}>
        <div className="brand">DayForge</div>
        <div className="bar-grow" />
        <div className="month-nav">
          <button className="ico" type="button" onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}>‹</button>
          <h2>{monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
          <button className="ico" type="button" onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}>›</button>
        </div>
        <div className="bar-grow" />
        <div className="walls" title="Wallpaper · W">
          {WALLS.map(item => (
            <button
              key={item.id}
              type="button"
              className={item.id === wallId ? "on" : ""}
              style={{ backgroundImage: `url(${item.src})` }}
              onClick={() => setWallId(item.id)}
              aria-label={item.label}
            />
          ))}
        </div>
        <button className={`ico ${upcomingReminder ? "dot" : ""}`} type="button" title="Reminders" onClick={() => setSheet("reminders")}>
          <BellIcon />
        </button>
        <div className="menu">
          <button className="avatar" type="button" onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}>{initials}</button>
          {menuOpen && (
            <div className="menu-pop" onClick={e => e.stopPropagation()}>
              <form onSubmit={saveProfileName} className="field" style={{ margin: "4px 0 8px" }}>
                <span>Name</span>
                <input value={profileDraft} onChange={e => setProfileDraft(e.target.value)} maxLength={80} />
              </form>
              <button type="button" onClick={() => setSheet("reminders")}>Reminders<span className="sub">{reminderState}</span></button>
              <button type="button" onClick={handleAuth}>Sign out<span className="sub">{user.email}</span></button>
            </div>
          )}
        </div>
      </header>

      <section className="hero-line">
        <div className="hero-copy">
          <div className="clock">{clockLabel}</div>
          <h1>{greetingFor()}, {firstName}.</h1>
          <p className="quote">“{quote}”</p>
          <div className="pills">
            <span><strong>{cs}</strong> day streak</span>
            <span><strong>{todayStats.done}/{todayStats.total || 0}</strong> today</span>
            <span><strong>{ms.pct}%</strong> this month</span>
            <span><strong>{perfect}</strong> perfect days</span>
          </div>
        </div>
        <div className="ring-mini"><Ring value={todayStats.pct} size={108} /></div>
      </section>

      {catchUpOpen && (
        <button className="catchup" type="button" onClick={() => setSelectedDate(yKey)}>
          Yesterday still has {yesterdayStats.total - yesterdayStats.done} open. Click that column.
        </button>
      )}

      <section className="heat glass">
        <div className="heat-top">
          <h3>Habit heatmap</h3>
          <em>
            {todayStats.total
              ? (todayStats.done === todayStats.total ? "Day closed. Protect it." : `${todayStats.total - todayStats.done} left today — click the gold column`)
              : "Add a habit. The grid is the product."}
            {" · "}Shift-click skips
          </em>
        </div>
        <div className="heat-scroll">
          <div className="heat-grid" style={{ "--days": days.length }}>
            <div />
            {days.map(d => {
              const k = toDateKey(d);
              return <div key={k} className={`colh ${k === todayKey ? "today" : ""}`}>{d.getDate()}</div>;
            })}
            {monthHabits.map(h => (
              <React.Fragment key={h.id}>
                <button className="lab" type="button" onClick={() => openEditHabit(h)} title={h.title}>
                  <span>{h.emoji}</span><b>{h.title}</b>
                </button>
                {days.map(d => {
                  const k = toDateKey(d);
                  const available = habitScheduledOn(h, k);
                  const closed = available && habitClosedOn(grid, h, k);
                  const skipped = available && isSkipped((grid[k] || {})[h.id]);
                  const live = available && canEditDay(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`cell ${closed ? "on" : ""} ${skipped ? "skip" : ""} ${live ? "live" : ""} ${available ? "" : "dormant"} ${k === todayKey ? "today" : ""} ${k === selectedDate ? "sel" : ""}`}
                      style={{ "--h": colorOf(h) }}
                      title={`${h.title} · ${k}${skipped ? " · skipped" : closed ? " · done" : ""}`}
                      onClick={event => {
                        if (live && event.shiftKey) skipHabit(k, h.id);
                        else if (live) toggleHabit(k, h.id);
                        else setSelectedDate(k);
                      }}
                    />
                  );
                })}
              </React.Fragment>
            ))}
            <div className="lab" style={{ color: "var(--faint)" }}>Day</div>
            {days.map(d => {
              const k = toDateKey(d);
              const s = dayStats(grid[k] || {}, habitsForDate(monthHabits, d));
              const lv = !s.total ? 0 : s.pct === 100 ? 4 : s.pct >= 75 ? 3 : s.pct >= 40 ? 2 : s.pct > 0 ? 1 : 0;
              return (
                <button
                  key={`all-${k}`}
                  type="button"
                  className={`cell lv${lv} ${k === todayKey ? "today" : ""} ${k === selectedDate ? "sel" : ""}`}
                  onClick={() => setSelectedDate(k)}
                  title={`${k}: ${s.done}/${s.total}`}
                />
              );
            })}
          </div>
        </div>
        <form className="add" onSubmit={saveHabitForm}>
          <input
            value={habitDraft.title}
            onChange={e => setHabitDraft(d => ({ ...d, title: e.target.value }))}
            placeholder="Add a habit you can keep on a brutal day"
            maxLength={80}
          />
          <button type="submit">Add</button>
          <button type="button" onClick={() => openNewHabit()} style={{ background: "transparent", color: "#fff", border: "1px solid var(--stroke)" }}>Tune</button>
        </form>
      </section>
      <p className="sync">{syncState}</p>

      {sheet === "habit" && (
        <HabitSheet
          draft={habitDraft}
          setDraft={setHabitDraft}
          editing={Boolean(editingHabitId)}
          onClose={() => setSheet(null)}
          onSave={saveHabitForm}
          onDelete={editingHabitId ? () => deleteHabit(editingHabitId) : null}
        />
      )}
      {sheet === "reminders" && (
        <ReminderSheet
          reminders={reminders}
          draft={reminderDraft}
          setDraft={setReminderDraft}
          status={reminderState}
          onAdd={addReminder}
          onDelete={deleteReminder}
          onClose={() => setSheet(null)}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
      {celebrate && todayStats.pct === 100 && <Burst />}
    </Wallpaper>
  );
}

function HabitRow({ habit, dateKey, grid, weekSlice, editable, compact, onToggle, onBump, onSkip, onEdit }) {
  const value = (grid[dateKey] || {})[habit.id];
  const done = isClosed(value, habit);
  const skipped = isSkipped(value);
  const streak = habitCurrentStreak(grid, habit, dayforgeTodayKey());
  const todayKey = dayforgeTodayKey();
  const count = countOf(value, habit);
  const goal = Math.max(1, Number(habit.goal || 1));
  return (
    <div className={`habit-row ${done ? "done" : ""} ${skipped ? "skipped" : ""} ${compact ? "compact" : ""}`} style={{ "--h": colorOf(habit) }}>
      {habit.kind === "count" ? (
        <div className="stepper">
          <button type="button" disabled={!editable} onClick={() => onBump(-1)} aria-label="Decrease">−</button>
          <strong>{Math.min(count, goal)}</strong>
          <button type="button" disabled={!editable} onClick={() => onBump(1)} aria-label="Increase">+</button>
        </div>
      ) : (
        <button className="check" type="button" disabled={!editable} onClick={onToggle} aria-label={done ? `Undo ${habit.title}` : `Complete ${habit.title}`}>
          <CheckIcon />
        </button>
      )}
      <button className="habit-copy" type="button" onClick={onEdit}>
        <div className="habit-title"><span>{habit.emoji}</span> {habit.title}</div>
        <div className="habit-meta">
          {skipped ? "Skipped" : habit.kind === "count" ? `${Math.min(count, goal)} / ${goal}` : scheduleLabel(habit.days)}
          {habit.kind !== "count" ? ` · ${habit.targetPerWeek}/week` : ""}
        </div>
      </button>
      <div className="habit-side">
        {streak > 0 && <div className="streak-chip">▲ {streak}</div>}
        {!compact && (
          <div className="week-dots">
            {weekSlice.map(d => {
              const k = toDateKey(d);
              const scheduled = habitScheduledOn(habit, d);
              const on = scheduled && habitClosedOn(grid, habit, k);
              const skip = scheduled && isSkipped((grid[k] || {})[habit.id]);
              return <i key={k} className={`${on ? "on" : ""} ${skip ? "skip" : ""} ${k === todayKey ? "today" : ""}`} title={k} />;
            })}
          </div>
        )}
        {editable && (
          <button className="skip-btn" type="button" onClick={onSkip}>{skipped ? "Unskip" : "Skip"}</button>
        )}
      </div>
    </div>
  );
}

function Burst() {
  return (
    <div className="burst" aria-hidden="true">
      {Array.from({ length: 20 }, (_, i) => <i key={i} style={{ "--i": i }} />)}
    </div>
  );
}

function HabitSheet({ draft, setDraft, editing, onClose, onSave, onDelete }) {
  return (
    <div className="backdrop" onClick={onClose}>
      <section className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <p className="kicker">{editing ? "Edit" : "New habit"}</p>
            <h2>{editing ? "Tune this habit" : "Make it specific"}</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose}>&times;</button>
        </div>
        {!editing && (
          <div className="templates">
            {TEMPLATES.map(t => (
              <button key={t.title} className="template" type="button" onClick={() => setDraft(emptyHabitDraft(t))}>
                <span>{t.emoji}</span>
                <strong>{t.title}</strong>
              </button>
            ))}
          </div>
        )}
        <form onSubmit={onSave}>
          <label className="field">
            <span>Name</span>
            <input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="Read 10 pages" maxLength={80} autoFocus />
          </label>
          <div className="field">
            <span>Icon</span>
            <div className="emojis">
              {EMOJIS.map(e => (
                <button key={e} className={draft.emoji === e ? "on" : ""} type="button" onClick={() => setDraft(d => ({ ...d, emoji: e }))}>{e}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>Color</span>
            <div className="swatches">
              {HABIT_COLORS.map(c => (
                <button key={c.id} className={`swatch ${draft.color === c.id ? "on" : ""}`} type="button" style={{ background: c.hex }} onClick={() => setDraft(d => ({ ...d, color: c.id }))} aria-label={c.id} />
              ))}
            </div>
          </div>
          <div className="field">
            <span>Type</span>
            <div className="chips">
              <button type="button" className={`chip ${draft.kind !== "count" ? "on" : ""}`} onClick={() => setDraft(d => ({ ...d, kind: "check" }))}>Check</button>
              <button type="button" className={`chip ${draft.kind === "count" ? "on" : ""}`} onClick={() => setDraft(d => ({ ...d, kind: "count" }))}>Count</button>
            </div>
          </div>
          {draft.kind === "count" && (
            <div className="field">
              <span>Daily count · {draft.goal}</span>
              <div className="chips">
                {[3, 5, 8, 10, 12, 20].map(n => (
                  <button key={n} type="button" className={`chip ${Number(draft.goal) === n ? "on" : ""}`} onClick={() => setDraft(d => ({ ...d, goal: n }))}>{n}</button>
                ))}
              </div>
            </div>
          )}
          <div className="field">
            <span>Time of day</span>
            <div className="chips">
              {TIME_GROUPS.map(g => (
                <button key={g.id} type="button" className={`chip ${draft.when === g.id ? "on" : ""}`} onClick={() => setDraft(d => ({ ...d, when: g.id }))}>{g.label}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>Schedule</span>
            <div className="chips">
              <button type="button" className={`chip ${sameDays(draft.days, ALL_DAYS) ? "on" : ""}`} onClick={() => setDraft(d => ({ ...d, days: ALL_DAYS.slice(), targetPerWeek: 7 }))}>Daily</button>
              <button type="button" className={`chip ${sameDays(draft.days, WEEKDAYS) ? "on" : ""}`} onClick={() => setDraft(d => ({ ...d, days: WEEKDAYS.slice(), targetPerWeek: 5 }))}>Weekdays</button>
              <button type="button" className={`chip ${sameDays(draft.days, WEEKENDS) ? "on" : ""}`} onClick={() => setDraft(d => ({ ...d, days: WEEKENDS.slice(), targetPerWeek: 2 }))}>Weekends</button>
            </div>
            <div className="chips" style={{ marginTop: 8 }}>
              {DOW_FULL.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  className={`chip ${draft.days.includes(i) ? "on" : ""}`}
                  onClick={() => setDraft(d => {
                    const has = d.days.includes(i);
                    const days = has ? d.days.filter(n => n !== i) : [...d.days, i];
                    return { ...d, days: normalizeDays(days.length ? days : [i]) };
                  })}
                >{label}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>Weekly goal · {draft.targetPerWeek} days</span>
            <div className="chips">
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <button key={n} type="button" className={`chip ${draft.targetPerWeek === n ? "on" : ""}`} onClick={() => setDraft(d => ({ ...d, targetPerWeek: n }))}>{n}</button>
              ))}
            </div>
          </div>
          <button className="primary" type="submit">{editing ? "Save habit" : "Add habit"}</button>
          {onDelete && <button className="danger-btn" type="button" onClick={onDelete}>Remove habit</button>}
        </form>
      </section>
    </div>
  );
}

function ReminderSheet({ reminders, draft, setDraft, status, onAdd, onDelete, onClose }) {
  const sorted = [...reminders].sort((a, b) => {
    if (Boolean(a.done) !== Boolean(b.done)) return a.done ? 1 : -1;
    return reminderStamp(a).localeCompare(reminderStamp(b));
  });
  const today = dayforgeTodayKey();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    <div className="backdrop" onClick={onClose}>
      <section className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <p className="kicker">{status}</p>
            <h2>Reminders</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose}>&times;</button>
        </div>
        {sorted.length === 0 && <p className="hint" style={{ marginBottom: 14 }}>Email yourself a nudge. High priority can also ping the browser.</p>}
        {sorted.map(r => (
          <div className={`reminder ${r.done ? "done" : ""}`} key={r.id}>
            <strong>{r.title}</strong>
            <span className={r.priority === "high" ? "priority" : ""}>{prettyReminderDate(r.date)}</span>
            <span>{prettyReminderTime(r.time)}</span>
            <button className="ghost" type="button" onClick={() => onDelete(r.id)}>&times;</button>
          </div>
        ))}
        <form onSubmit={onAdd} style={{ marginTop: 16 }}>
          <label className="field">
            <span>Title</span>
            <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Evening review" maxLength={60} required />
          </label>
          <div className="chips" style={{ marginBottom: 12 }}>
            <button type="button" className={`chip ${draft.priority !== "high" ? "on" : ""}`} onClick={() => setDraft({ ...draft, priority: "normal" })}>Normal</button>
            <button type="button" className={`chip ${draft.priority === "high" ? "on" : ""}`} onClick={() => setDraft({ ...draft, priority: "high" })}>Priority</button>
            <button type="button" className="chip" onClick={() => setDraft({ ...draft, date: today })}>Today</button>
            <button type="button" className="chip" onClick={() => setDraft({ ...draft, date: toDateKey(tomorrow) })}>Tomorrow</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            <label className="field" style={{ margin: 0 }}>
              <span>Date</span>
              <input type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} required />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span>Time</span>
              <input type="time" value={draft.time} onChange={e => setDraft({ ...draft, time: e.target.value })} required />
            </label>
          </div>
          <button className="primary" type="submit">Add reminder</button>
        </form>
      </section>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 14.8A8.5 8.5 0 1 1 9.2 3 7 7 0 0 0 21 14.8z" />
    </svg>
  );
}

createRoot(document.getElementById("root")).render(<App />);
