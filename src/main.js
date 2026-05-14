import { initializeApp } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut
} from "firebase/auth";

const DEFAULT_CONFIG = {
    apiBaseUrl: "",
    firebase: {
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: "",
        measurementId: ""
    },
    appTimezone: "Asia/Kolkata"
};

const CONFIG = {
    ...DEFAULT_CONFIG,
    ...(window.DAYFORGE_CONFIG || {}),
    firebase: {
        ...DEFAULT_CONFIG.firebase,
        ...((window.DAYFORGE_CONFIG || {}).firebase || {})
    }
};

const XP_BY_PRIORITY = { low: 18, medium: 32, high: 55 };
const PRIORITY_LABELS = { low: "Small", medium: "Core", high: "Boss" };
const LEVEL_SIZE = 650;

const QUOTES = [
    ["One clean decision can restart the whole day.", "DayForge"],
    ["You do not need a perfect mood. You need the next honest action.", "DayForge"],
    ["Discipline is remembering what you want most when the shortcut appears.", "DayForge"],
    ["The urge is a wave. Your plan is the shore.", "DayForge"],
    ["Build proof quietly. The confidence arrives after the reps.", "DayForge"],
    ["Win the next ten minutes, then ask again.", "DayForge"],
    ["Shame hides the problem. Truth gives you handles.", "DayForge"],
    ["A streak is not magic. It is a trail of protected moments.", "DayForge"],
    ["Make the good choice easier to see than the bad choice.", "DayForge"],
    ["Your future self is watching the small promises.", "DayForge"]
];

const DEFAULT_GOALS = [
    {
        id: "goal-clean-mind",
        title: "Remove addiction",
        why: "Protect attention, confidence, and self-respect.",
        targetDate: "",
        status: "active",
        skill: "Recovery",
        color: "mint",
        createdAt: new Date().toISOString()
    },
    {
        id: "goal-focus-career",
        title: "Focus on the main goal",
        why: "Turn daily discipline into visible career progress.",
        targetDate: "",
        status: "active",
        skill: "Execution",
        color: "blue",
        createdAt: new Date().toISOString()
    }
];

const DEFAULT_HABITS = [
    { id: "habit-no-porn", title: "No porn", category: "recovery", goalId: "goal-clean-mind", targetPerWeek: 7, active: true, createdAt: new Date().toISOString() },
    { id: "habit-trigger-plan", title: "Run trigger shield", category: "recovery", goalId: "goal-clean-mind", targetPerWeek: 5, active: true, createdAt: new Date().toISOString() },
    { id: "habit-deep-work", title: "Deep work block", category: "focus", goalId: "goal-focus-career", targetPerWeek: 6, active: true, createdAt: new Date().toISOString() },
    { id: "habit-contest-practice", title: "Contest practice", category: "learning", goalId: "goal-focus-career", targetPerWeek: 4, active: true, createdAt: new Date().toISOString() },
    { id: "habit-move-body", title: "Workout or walk", category: "health", goalId: "", targetPerWeek: 5, active: true, createdAt: new Date().toISOString() },
    { id: "habit-journal", title: "Journal truth", category: "focus", goalId: "", targetPerWeek: 5, active: true, createdAt: new Date().toISOString() }
];

const AWARDS = [
    { id: "first_clean", code: "01", title: "First Clean Day", desc: "Logged one clean recovery day.", rule: (s) => s.cleanDays >= 1 },
    { id: "three_chain", code: "03", title: "Three Day Chain", desc: "Protected a clean streak for three days.", rule: (s) => s.bestStreak >= 3 },
    { id: "seven_chain", code: "07", title: "Seven Day Chain", desc: "Built one full week of clean proof.", rule: (s) => s.bestStreak >= 7 },
    { id: "task_slayer", code: "25", title: "Quest Slayer", desc: "Completed 25 tasks.", rule: (s) => s.doneTasks >= 25 },
    { id: "boss_win", code: "B", title: "Boss Quest Win", desc: "Completed a high-priority task.", rule: (s) => s.bossTasksDone >= 1 },
    { id: "heat", code: "H", title: "Habit Heat", desc: "Checked 50 habit boxes.", rule: (s) => s.habitChecks >= 50 },
    { id: "calm_under_fire", code: "C", title: "Calm Under Fire", desc: "Logged an urge of 7+ without relapse.", rule: (s) => s.urgeWins >= 1 },
    { id: "level_five", code: "L5", title: "Level Five", desc: "Earned enough XP to reach level 5.", rule: (s) => s.level >= 5 }
];

function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
    const [year, month, day] = String(dateKey).split("-").map(Number);
    return new Date(year, month - 1, day);
}

function addDays(date, amount) {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
}

function uid() {
    if (window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeJson(value, fallback) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function clamp(value, min, max, fallback) {
    const number = Number.parseInt(value, 10);
    if (Number.isNaN(number)) {
        return fallback;
    }
    return Math.max(min, Math.min(max, number));
}

function formatHumanDate(dateKey) {
    const date = parseDateKey(dateKey);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function updatedAtMs(value) {
    const time = Date.parse(value || "");
    return Number.isNaN(time) ? 0 : time;
}

function uniqueLines(value, limit = 10) {
    return String(value || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, limit);
}

class DayForgeApp {
    constructor() {
        this.config = CONFIG;
        this.apiBase = this.resolveApiBase();
        this.todayKey = toDateKey(new Date());
        this.selectedDate = this.todayKey;
        this.currentYear = new Date().getFullYear();
        this.currentUser = { uid: "local-player", displayName: "Local player", email: "" };
        this.firebaseApp = null;
        this.firebaseAuth = null;
        this.firebaseReady = false;
        this.dayTimers = new Map();
        this.workspaceTimer = null;
        this.days = this.loadDays(this.currentUser.uid);
        this.workspace = this.loadWorkspace(this.currentUser.uid);
        this.lastLevel = 1;
        this.els = this.collectElements();
        this.init();
    }

    collectElements() {
        const ids = [
            "userAvatar", "userName", "syncState", "syncNowBtn", "authButton", "levelNumber", "xpLabel", "xpFill",
            "cleanStreak", "bestStreak", "todayLabel", "headlineText", "quoteText", "quoteAuthor", "currentDateTitle",
            "prevYear", "nextYear", "currentYearDisplay", "selectedDateInput", "statOverall", "statOverallSub",
            "statToday", "statTodaySub", "statUrge", "statUrgeSub", "statReminders", "statRemindersSub",
            "focusLineInput", "moodRange", "energyRange", "urgeRange", "relapseCheck", "gratitudeInput",
            "reflectionInput", "newTaskInput", "newTaskPriority", "newTaskGoal", "newTaskEstimate", "addTaskBtn",
            "taskList", "progressRing", "progressNumber", "progressLabel", "progressXp", "progressHint",
            "claimWinBtn", "markMissedBtn", "panicStartBtn", "heatmapGrid", "habitTitle", "habitCategory",
            "habitGoal", "habitTarget", "addHabitBtn", "habitMatrix", "goalTitle", "goalWhy", "goalDate",
            "addGoalBtn", "goalList", "recoveryAddiction", "recoveryWhy", "recoveryTriggers", "recoveryPlan",
            "saveRecoveryBtn", "panicPlanList", "reminderTitle", "reminderDate", "reminderTime", "reminderCategory",
            "reminderNotify", "reminderNotes", "addReminderBtn", "reminderList", "notifyEmail", "notifyEnabled",
            "morningDigest", "morningTime", "eveningReview", "eveningTime", "relapseShield", "relapseShieldTime",
            "saveNotificationsBtn", "testNotificationBtn", "awardsGrid", "linkedinText", "copyLinkedInBtn",
            "toastStack"
        ];
        return Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
    }

    async init() {
        this.bindEvents();
        this.setInitialFormDates();
        await this.initAuth();
        await this.syncFromCloud({ quiet: true });
        this.renderAll();
    }

    resolveApiBase() {
        const configured = String(this.config.apiBaseUrl || "").trim().replace(/\/$/, "");
        if (configured) {
            return configured;
        }

        const host = window.location.hostname;
        const port = window.location.port;
        const isRender = host.includes("onrender.com");
        const isBackendLocal = host === "127.0.0.1" || host === "localhost";
        if (isRender || (isBackendLocal && ["5000", "8000", "10000"].includes(port))) {
            return window.location.origin;
        }
        return "";
    }

    bindEvents() {
        this.els.prevYear.addEventListener("click", () => {
            this.currentYear -= 1;
            this.renderAll();
            this.syncFromCloud({ quiet: true });
        });

        this.els.nextYear.addEventListener("click", () => {
            this.currentYear += 1;
            this.renderAll();
            this.syncFromCloud({ quiet: true });
        });

        this.els.selectedDateInput.addEventListener("change", () => {
            if (this.els.selectedDateInput.value) {
                this.selectDate(this.els.selectedDateInput.value);
            }
        });

        document.querySelectorAll("[data-scroll-target]").forEach((button) => {
            button.addEventListener("click", () => {
                document.querySelectorAll(".nav-btn").forEach((item) => item.classList.remove("active"));
                button.classList.add("active");
                document.getElementById(button.dataset.scrollTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });

        this.els.syncNowBtn.addEventListener("click", () => this.syncFromCloud({ quiet: false }));
        this.els.authButton.addEventListener("click", () => this.handleAuthClick());
        this.els.addTaskBtn.addEventListener("click", () => this.addTask());
        this.els.newTaskInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                this.addTask();
            }
        });

        ["focusLineInput", "moodRange", "energyRange", "urgeRange", "relapseCheck", "gratitudeInput", "reflectionInput"].forEach((id) => {
            const eventName = id.endsWith("Input") || id === "reflectionInput" || id === "gratitudeInput" ? "blur" : "change";
            this.els[id].addEventListener(eventName, () => this.saveDailyCheckIn());
        });

        this.els.taskList.addEventListener("change", (event) => {
            const checkbox = event.target.closest("[data-task-check]");
            if (checkbox) {
                this.toggleTask(checkbox.dataset.taskCheck, checkbox.checked);
            }
        });

        this.els.taskList.addEventListener("click", (event) => {
            const button = event.target.closest("[data-task-delete]");
            if (button) {
                this.deleteTask(button.dataset.taskDelete);
            }
        });

        this.els.claimWinBtn.addEventListener("click", () => this.setDayStatus("won"));
        this.els.markMissedBtn.addEventListener("click", () => this.setDayStatus("missed"));
        this.els.panicStartBtn.addEventListener("click", () => this.startRescuePlan());
        this.els.addGoalBtn.addEventListener("click", () => this.addGoal());
        this.els.addHabitBtn.addEventListener("click", () => this.addHabit());

        this.els.goalList.addEventListener("click", (event) => {
            const button = event.target.closest("[data-goal-action]");
            if (button) {
                this.updateGoal(button.dataset.goalAction, button.dataset.goalId);
            }
        });

        this.els.habitMatrix.addEventListener("change", (event) => {
            const checkbox = event.target.closest("[data-habit-check]");
            if (checkbox) {
                this.toggleHabit(checkbox.dataset.habitCheck, checkbox.dataset.dateKey, checkbox.checked);
            }
        });

        this.els.addReminderBtn.addEventListener("click", () => this.addReminder());
        this.els.reminderList.addEventListener("change", (event) => {
            const checkbox = event.target.closest("[data-reminder-check]");
            if (checkbox) {
                this.toggleReminder(checkbox.dataset.reminderCheck, checkbox.checked);
            }
        });
        this.els.reminderList.addEventListener("click", (event) => {
            const button = event.target.closest("[data-reminder-delete]");
            if (button) {
                this.deleteReminder(button.dataset.reminderDelete);
            }
        });

        this.els.saveRecoveryBtn.addEventListener("click", () => this.saveRecoveryPlan());
        this.els.saveNotificationsBtn.addEventListener("click", () => this.saveNotificationSettings());
        this.els.testNotificationBtn.addEventListener("click", () => this.sendTestNotification());
        this.els.copyLinkedInBtn.addEventListener("click", () => this.copyLinkedInText());
    }

    setInitialFormDates() {
        const nextHour = new Date();
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        this.els.selectedDateInput.value = this.selectedDate;
        this.els.reminderDate.value = this.todayKey;
        this.els.reminderTime.value = `${String(nextHour.getHours()).padStart(2, "0")}:00`;
        this.els.goalDate.value = toDateKey(addDays(new Date(), 90));
    }

    async initAuth() {
        if (!this.hasFirebaseConfig()) {
            this.updateAuthUi();
            this.setSyncState(this.apiBase ? "Cloud API ready" : "Saved on this device");
            return;
        }

        try {
            this.firebaseApp = initializeApp(this.config.firebase);
            this.firebaseAuth = getAuth(this.firebaseApp);
            this.firebaseReady = true;
        } catch {
            this.setSyncState("Firebase config needs attention");
            this.updateAuthUi();
            return;
        }

        await new Promise((resolve) => {
            let firstRun = true;
            onAuthStateChanged(this.firebaseAuth, async (user) => {
                await this.applyAuthUser(user);
                this.renderAll();
                if (firstRun) {
                    firstRun = false;
                    resolve();
                }
            });
        });
    }

    hasFirebaseConfig() {
        const firebaseConfig = this.config.firebase || {};
        return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
    }

    hasCloudApi() {
        return Boolean(this.apiBase);
    }

    async applyAuthUser(user) {
        const previousDays = this.days;
        const previousWorkspace = this.workspace;
        const wasGuest = this.currentUser.uid === "local-player";

        if (!user) {
            this.currentUser = { uid: "local-player", displayName: "Local player", email: "" };
            this.days = this.loadDays(this.currentUser.uid);
            this.workspace = this.loadWorkspace(this.currentUser.uid);
            this.updateAuthUi();
            return;
        }

        this.currentUser = {
            uid: user.uid,
            displayName: user.displayName || user.email || "DayForge player",
            email: user.email || ""
        };

        this.days = wasGuest ? this.mergeDayMaps(this.loadDays(user.uid), previousDays) : this.loadDays(user.uid);
        this.workspace = wasGuest ? this.mergeWorkspace(this.loadWorkspace(user.uid), previousWorkspace) : this.loadWorkspace(user.uid);
        if (!this.workspace.profile.displayName) {
            this.workspace.profile.displayName = this.currentUser.displayName;
        }
        if (!this.workspace.notificationSettings.email && this.currentUser.email) {
            this.workspace.notificationSettings.email = this.currentUser.email;
        }
        this.saveLocal();
        this.updateAuthUi();
        await this.syncFromCloud({ quiet: true });
    }

    storageKey(kind, uidValue = this.currentUser.uid) {
        return `dayforge_v2_${kind}_${uidValue}`;
    }

    loadDays(uidValue) {
        const raw = localStorage.getItem(this.storageKey("days", uidValue));
        const parsed = safeJson(raw, null);
        if (parsed) {
            return this.normalizeDayMap(parsed);
        }
        const legacy = safeJson(localStorage.getItem(`dayforge_v1_${uidValue}`), {});
        return this.normalizeDayMap(legacy || {});
    }

    loadWorkspace(uidValue) {
        const raw = localStorage.getItem(this.storageKey("workspace", uidValue));
        return this.normalizeWorkspace(safeJson(raw, null));
    }

    saveLocal() {
        localStorage.setItem(this.storageKey("days"), JSON.stringify(this.days));
        localStorage.setItem(this.storageKey("workspace"), JSON.stringify(this.workspace));
    }

    defaultWorkspace() {
        return {
            profile: {
                displayName: this.currentUser.displayName === "Local player" ? "" : this.currentUser.displayName,
                mission: "Remove addiction. Focus on the goal. Build proof daily.",
                identity: "I am the kind of person who keeps promises to myself."
            },
            recovery: {
                addictionName: "porn",
                why: "",
                triggers: ["Late-night phone use", "Stress after failure", "Being alone without a plan"],
                rescuePlan: ["Stand up and leave the room", "Drink water and breathe for 60 seconds", "Open DayForge and finish one small quest"]
            },
            goals: DEFAULT_GOALS.map((goal) => ({ ...goal })),
            habits: DEFAULT_HABITS.map((habit) => ({ ...habit })),
            reminders: [],
            notificationSettings: {
                enabled: false,
                email: this.currentUser.email || "",
                timezone: this.config.appTimezone || "Asia/Kolkata",
                morningDigest: true,
                morningTime: "07:30",
                eveningReview: true,
                eveningTime: "21:30",
                relapseShield: true,
                relapseShieldTime: "22:45",
                lastMorningDigestKey: "",
                lastEveningReviewKey: "",
                lastRelapseShieldKey: ""
            },
            updatedAt: new Date().toISOString()
        };
    }

    normalizeWorkspace(workspace) {
        const base = this.defaultWorkspace();
        const source = workspace && typeof workspace === "object" ? workspace : {};
        const hasGoals = Array.isArray(source.goals);
        const hasHabits = Array.isArray(source.habits);
        const hasReminders = Array.isArray(source.reminders);
        const settings = source.notificationSettings || {};

        return {
            profile: {
                ...base.profile,
                ...(source.profile || {})
            },
            recovery: {
                ...base.recovery,
                ...(source.recovery || {}),
                triggers: Array.isArray(source.recovery?.triggers) ? source.recovery.triggers.slice(0, 10) : base.recovery.triggers,
                rescuePlan: Array.isArray(source.recovery?.rescuePlan) ? source.recovery.rescuePlan.slice(0, 10) : base.recovery.rescuePlan
            },
            goals: (hasGoals ? source.goals : base.goals).map((goal) => this.normalizeGoal(goal)).filter(Boolean).slice(0, 24),
            habits: (hasHabits ? source.habits : base.habits).map((habit) => this.normalizeHabit(habit)).filter(Boolean).slice(0, 40),
            reminders: (hasReminders ? source.reminders : base.reminders).map((reminder) => this.normalizeReminder(reminder)).filter(Boolean).slice(0, 180),
            notificationSettings: {
                ...base.notificationSettings,
                ...settings,
                enabled: Boolean(settings.enabled),
                morningDigest: settings.morningDigest !== false,
                eveningReview: settings.eveningReview !== false,
                relapseShield: settings.relapseShield !== false
            },
            updatedAt: source.updatedAt || new Date().toISOString()
        };
    }

    normalizeGoal(goal = {}) {
        const title = String(goal.title || "").trim().slice(0, 90);
        if (!title) return null;
        return {
            id: goal.id || uid(),
            title,
            why: String(goal.why || "").trim().slice(0, 220),
            targetDate: /^\d{4}-\d{2}-\d{2}$/.test(goal.targetDate || "") ? goal.targetDate : "",
            status: ["active", "paused", "completed"].includes(goal.status) ? goal.status : "active",
            skill: String(goal.skill || "").trim().slice(0, 80),
            color: String(goal.color || "mint").trim().slice(0, 24),
            createdAt: goal.createdAt || new Date().toISOString()
        };
    }

    normalizeHabit(habit = {}) {
        const title = String(habit.title || "").trim().slice(0, 90);
        if (!title) return null;
        return {
            id: habit.id || uid(),
            title,
            category: String(habit.category || "focus").trim().slice(0, 40),
            goalId: String(habit.goalId || "").trim().slice(0, 80),
            targetPerWeek: clamp(habit.targetPerWeek, 1, 7, 5),
            active: habit.active !== false,
            createdAt: habit.createdAt || new Date().toISOString()
        };
    }

    normalizeReminder(reminder = {}) {
        const title = String(reminder.title || "").trim().slice(0, 120);
        if (!title) return null;
        return {
            id: reminder.id || uid(),
            title,
            notes: String(reminder.notes || "").trim().slice(0, 400),
            date: /^\d{4}-\d{2}-\d{2}$/.test(reminder.date || "") ? reminder.date : this.todayKey,
            time: /^\d{2}:\d{2}$/.test(reminder.time || "") ? reminder.time : "09:00",
            category: String(reminder.category || "focus").trim().slice(0, 40),
            goalId: String(reminder.goalId || "").trim().slice(0, 80),
            notify: reminder.notify !== false,
            done: Boolean(reminder.done),
            lastNotifiedKey: String(reminder.lastNotifiedKey || "").trim().slice(0, 40),
            createdAt: reminder.createdAt || new Date().toISOString(),
            updatedAt: reminder.updatedAt || new Date().toISOString()
        };
    }

    normalizeDayMap(map) {
        const normalized = {};
        Object.entries(map || {}).forEach(([dateKey, day]) => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
                normalized[dateKey] = this.normalizeDay(dateKey, day);
            }
        });
        return normalized;
    }

    normalizeDay(dateKey, day = {}) {
        const tasks = Array.isArray(day.tasks) ? day.tasks : [];
        const habitChecks = day.habitChecks && typeof day.habitChecks === "object" ? day.habitChecks : {};
        const focusLine = String(day.focusLine || day.motivation || "").trim().slice(0, 180);
        return {
            dateKey,
            status: ["neutral", "won", "missed"].includes(day.status) ? day.status : "neutral",
            focusLine,
            motivation: focusLine,
            mood: clamp(day.mood, 1, 5, 3),
            energy: clamp(day.energy, 1, 5, 3),
            urge: clamp(day.urge, 0, 10, 0),
            relapse: Boolean(day.relapse),
            gratitude: String(day.gratitude || "").trim().slice(0, 220),
            reflection: String(day.reflection || "").trim().slice(0, 700),
            habitChecks: Object.fromEntries(Object.entries(habitChecks).map(([key, value]) => [key, Boolean(value)])),
            tasks: tasks.map((task) => {
                const title = String(task.title || task.text || "").trim().slice(0, 110);
                if (!title) return null;
                return {
                    id: task.id || uid(),
                    title,
                    text: title,
                    done: Boolean(task.done),
                    priority: ["low", "medium", "high"].includes(task.priority) ? task.priority : "medium",
                    goalId: String(task.goalId || "").trim().slice(0, 80),
                    habitId: String(task.habitId || "").trim().slice(0, 80),
                    estimateMins: clamp(task.estimateMins, 5, 480, 25),
                    createdAt: task.createdAt || new Date().toISOString(),
                    completedAt: task.completedAt || null
                };
            }).filter(Boolean).slice(0, 100),
            updatedAt: day.updatedAt || new Date().toISOString()
        };
    }

    mergeDayMaps(baseMap, incomingMap) {
        const merged = { ...this.normalizeDayMap(baseMap) };
        const incoming = this.normalizeDayMap(incomingMap);
        Object.entries(incoming).forEach(([dateKey, day]) => {
            const existing = merged[dateKey];
            if (!existing || updatedAtMs(day.updatedAt) >= updatedAtMs(existing.updatedAt)) {
                merged[dateKey] = day;
            }
        });
        return merged;
    }

    mergeWorkspace(localWorkspace, incomingWorkspace) {
        const local = this.normalizeWorkspace(localWorkspace);
        const incoming = this.normalizeWorkspace(incomingWorkspace);
        if (this.isBlankWorkspace(incoming) && !this.isBlankWorkspace(local)) {
            return local;
        }
        return updatedAtMs(incoming.updatedAt) >= updatedAtMs(local.updatedAt) ? incoming : local;
    }

    isBlankWorkspace(workspace) {
        return !workspace.goals.length
            && !workspace.habits.length
            && !workspace.reminders.length
            && !workspace.profile?.mission
            && !workspace.profile?.displayName
            && !workspace.recovery?.why;
    }

    getDay(dateKey, create = true) {
        if (!this.days[dateKey] && create) {
            this.days[dateKey] = this.normalizeDay(dateKey, { dateKey });
        }
        return this.days[dateKey] || null;
    }

    touchDay(dateKey) {
        const day = this.getDay(dateKey, true);
        day.updatedAt = new Date().toISOString();
        return day;
    }

    touchWorkspace() {
        this.workspace.updatedAt = new Date().toISOString();
    }

    selectDate(dateKey) {
        this.selectedDate = dateKey;
        this.currentYear = Number(dateKey.slice(0, 4));
        this.renderAll();
    }

    saveDailyCheckIn() {
        const day = this.touchDay(this.selectedDate);
        day.focusLine = this.els.focusLineInput.value.trim();
        day.motivation = day.focusLine;
        day.mood = clamp(this.els.moodRange.value, 1, 5, 3);
        day.energy = clamp(this.els.energyRange.value, 1, 5, 3);
        day.urge = clamp(this.els.urgeRange.value, 0, 10, 0);
        day.relapse = this.els.relapseCheck.checked;
        day.gratitude = this.els.gratitudeInput.value.trim();
        day.reflection = this.els.reflectionInput.value.trim();
        this.autoStatus(day);
        this.persistDay(this.selectedDate);
        this.renderAll();
    }

    addTask() {
        const title = this.els.newTaskInput.value.trim();
        if (!title) {
            this.toast("Name the task first.", "warn");
            return;
        }

        const day = this.touchDay(this.selectedDate);
        day.tasks.push({
            id: uid(),
            title,
            text: title,
            done: false,
            priority: this.els.newTaskPriority.value,
            goalId: this.els.newTaskGoal.value,
            habitId: "",
            estimateMins: clamp(this.els.newTaskEstimate.value, 5, 480, 25),
            createdAt: new Date().toISOString(),
            completedAt: null
        });
        this.els.newTaskInput.value = "";
        this.autoStatus(day);
        this.persistDay(this.selectedDate);
        this.renderAll();
        this.els.newTaskInput.focus();
        this.toast("Task saved.", "success");
    }

    toggleTask(taskId, done) {
        const day = this.touchDay(this.selectedDate);
        const task = day.tasks.find((item) => item.id === taskId);
        if (!task) return;
        task.done = done;
        task.completedAt = done ? new Date().toISOString() : null;
        this.autoStatus(day);
        this.persistDay(this.selectedDate);
        this.renderAll();
        if (done) {
            this.toast(`+${XP_BY_PRIORITY[task.priority] || XP_BY_PRIORITY.medium} XP. Proof recorded.`, "success");
        }
    }

    deleteTask(taskId) {
        const day = this.touchDay(this.selectedDate);
        day.tasks = day.tasks.filter((task) => task.id !== taskId);
        this.autoStatus(day);
        this.persistDay(this.selectedDate);
        this.renderAll();
    }

    setDayStatus(status) {
        const day = this.touchDay(this.selectedDate);
        const progress = this.dayProgress(day);
        if (status === "won" && progress.total > 0 && progress.done < progress.total) {
            this.toast("Finish every visible item before claiming the win.", "warn");
            return;
        }
        day.status = day.status === status ? "neutral" : status;
        this.persistDay(this.selectedDate);
        this.renderAll();
    }

    autoStatus(day) {
        const progress = this.dayProgress(day);
        if (day.relapse) {
            day.status = "missed";
            return;
        }
        if (progress.total > 0 && progress.done === progress.total) {
            day.status = "won";
        } else if (day.status === "won") {
            day.status = "neutral";
        }
    }

    startRescuePlan() {
        const plan = this.workspace.recovery.rescuePlan.length
            ? this.workspace.recovery.rescuePlan
            : this.defaultWorkspace().recovery.rescuePlan;
        const day = this.touchDay(this.todayKey);
        const title = `Rescue: ${plan[0] || "leave the room for two minutes"}`;
        day.urge = Math.max(day.urge || 0, 7);
        day.tasks.unshift({
            id: uid(),
            title,
            text: title,
            done: false,
            priority: "high",
            goalId: "goal-clean-mind",
            habitId: "",
            estimateMins: 5,
            createdAt: new Date().toISOString(),
            completedAt: null
        });
        this.selectedDate = this.todayKey;
        this.autoStatus(day);
        this.persistDay(this.todayKey);
        this.renderAll();
        this.toast("Rescue task started. Move your body now.", "warn");
    }

    addGoal() {
        const title = this.els.goalTitle.value.trim();
        if (!title) {
            this.toast("Give the goal a name.", "warn");
            return;
        }
        this.workspace.goals.unshift({
            id: uid(),
            title,
            why: this.els.goalWhy.value.trim(),
            targetDate: this.els.goalDate.value,
            status: "active",
            skill: "",
            color: "mint",
            createdAt: new Date().toISOString()
        });
        this.els.goalTitle.value = "";
        this.els.goalWhy.value = "";
        this.touchWorkspace();
        this.persistWorkspace();
        this.renderAll();
        this.toast("Goal saved.", "success");
    }

    updateGoal(action, goalId) {
        if (action === "delete") {
            this.workspace.goals = this.workspace.goals.filter((goal) => goal.id !== goalId);
        } else {
            this.workspace.goals = this.workspace.goals.map((goal) => {
                if (goal.id !== goalId) return goal;
                return { ...goal, status: goal.status === "completed" ? "active" : "completed" };
            });
        }
        this.touchWorkspace();
        this.persistWorkspace();
        this.renderAll();
    }

    addHabit() {
        const title = this.els.habitTitle.value.trim();
        if (!title) {
            this.toast("Name the habit first.", "warn");
            return;
        }
        this.workspace.habits.push({
            id: uid(),
            title,
            category: this.els.habitCategory.value,
            goalId: this.els.habitGoal.value,
            targetPerWeek: clamp(this.els.habitTarget.value, 1, 7, 5),
            active: true,
            createdAt: new Date().toISOString()
        });
        this.els.habitTitle.value = "";
        this.touchWorkspace();
        this.persistWorkspace();
        this.renderAll();
        this.toast("Habit added.", "success");
    }

    toggleHabit(habitId, dateKey, checked) {
        const day = this.touchDay(dateKey);
        day.habitChecks[habitId] = checked;
        this.autoStatus(day);
        this.persistDay(dateKey);
        this.renderAll();
    }

    saveRecoveryPlan() {
        this.workspace.recovery = {
            addictionName: this.els.recoveryAddiction.value.trim() || "porn",
            why: this.els.recoveryWhy.value.trim(),
            triggers: uniqueLines(this.els.recoveryTriggers.value, 10),
            rescuePlan: uniqueLines(this.els.recoveryPlan.value, 10)
        };
        this.touchWorkspace();
        this.persistWorkspace();
        this.renderAll();
        this.toast("Recovery plan saved.", "success");
    }

    addReminder() {
        const title = this.els.reminderTitle.value.trim();
        if (!title) {
            this.toast("Reminder needs a title.", "warn");
            return;
        }
        this.workspace.reminders.push({
            id: uid(),
            title,
            notes: this.els.reminderNotes.value.trim(),
            date: this.els.reminderDate.value || this.todayKey,
            time: this.els.reminderTime.value || "09:00",
            category: this.els.reminderCategory.value,
            goalId: "",
            notify: this.els.reminderNotify.checked,
            done: false,
            lastNotifiedKey: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        this.els.reminderTitle.value = "";
        this.els.reminderNotes.value = "";
        this.touchWorkspace();
        this.persistWorkspace();
        this.renderAll();
        this.toast("Reminder saved.", "success");
    }

    toggleReminder(reminderId, done) {
        this.workspace.reminders = this.workspace.reminders.map((reminder) => {
            if (reminder.id !== reminderId) return reminder;
            return { ...reminder, done, updatedAt: new Date().toISOString() };
        });
        this.touchWorkspace();
        this.persistWorkspace();
        this.renderAll();
    }

    deleteReminder(reminderId) {
        this.workspace.reminders = this.workspace.reminders.filter((reminder) => reminder.id !== reminderId);
        this.touchWorkspace();
        this.persistWorkspace();
        this.renderAll();
    }

    saveNotificationSettings() {
        const current = this.workspace.notificationSettings;
        this.workspace.notificationSettings = {
            ...current,
            enabled: this.els.notifyEnabled.checked,
            email: this.els.notifyEmail.value.trim(),
            timezone: this.config.appTimezone || current.timezone || "Asia/Kolkata",
            morningDigest: this.els.morningDigest.checked,
            morningTime: this.els.morningTime.value || "07:30",
            eveningReview: this.els.eveningReview.checked,
            eveningTime: this.els.eveningTime.value || "21:30",
            relapseShield: this.els.relapseShield.checked,
            relapseShieldTime: this.els.relapseShieldTime.value || "22:45"
        };
        this.touchWorkspace();
        this.persistWorkspace();
        this.renderAll();
        this.toast("Notification settings saved.", "success");
    }

    async sendTestNotification() {
        this.saveNotificationSettings();
        if (!this.hasCloudApi()) {
            this.toast("Add apiBaseUrl in config.js before sending email.", "warn");
            return;
        }
        const email = this.workspace.notificationSettings.email;
        if (!email) {
            this.toast("Add an email address first.", "warn");
            return;
        }
        this.setSyncState("Sending test...");
        try {
            const response = await this.apiFetch("/api/notifications/test", {
                method: "POST",
                body: JSON.stringify({ email })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || "Notification test failed");
            }
            this.setSyncState("Notification test sent");
            this.toast("Test email sent.", "success");
        } catch (error) {
            this.setSyncState("Notification test failed");
            this.toast(error.message || "Notification test failed.", "error");
        }
    }

    persistDay(dateKey) {
        this.saveLocal();
        if (!this.hasCloudApi()) {
            this.setSyncState("Saved on this device");
            return;
        }
        clearTimeout(this.dayTimers.get(dateKey));
        this.dayTimers.set(dateKey, setTimeout(() => this.pushDay(dateKey), 350));
        this.setSyncState("Saved locally, syncing...");
    }

    persistWorkspace() {
        this.saveLocal();
        if (!this.hasCloudApi()) {
            this.setSyncState("Saved on this device");
            return;
        }
        clearTimeout(this.workspaceTimer);
        this.workspaceTimer = setTimeout(() => this.pushWorkspace(), 450);
        this.setSyncState("Saved locally, syncing...");
    }

    async pushDay(dateKey) {
        const day = this.getDay(dateKey, false);
        if (!day || !this.hasCloudApi()) return;
        try {
            const response = await this.apiFetch(`/api/days/${dateKey}`, {
                method: "PUT",
                body: JSON.stringify({ day })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || `Sync failed (${response.status})`);
            }
            if (payload.day) {
                this.days[dateKey] = this.normalizeDay(dateKey, payload.day);
                this.saveLocal();
            }
            this.setSyncState(`Synced to ${payload.store || "cloud"}`);
        } catch (error) {
            this.setSyncState("Cloud sync paused");
            this.toast("Saved locally. Cloud sync will retry when API settings are fixed.", "error");
        }
    }

    async pushWorkspace() {
        if (!this.hasCloudApi()) return;
        try {
            const response = await this.apiFetch("/api/workspace", {
                method: "PUT",
                body: JSON.stringify({ workspace: this.workspace })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || `Sync failed (${response.status})`);
            }
            if (payload.workspace) {
                this.workspace = this.normalizeWorkspace(payload.workspace);
                this.saveLocal();
            }
            this.setSyncState(`Synced to ${payload.store || "cloud"}`);
        } catch (error) {
            this.setSyncState("Cloud sync paused");
            this.toast("Workspace saved locally. Cloud sync needs API settings.", "error");
        }
    }

    async syncFromCloud({ quiet = false } = {}) {
        if (!this.hasCloudApi()) {
            this.setSyncState("Saved on this device");
            return;
        }
        if (!quiet) {
            this.setSyncState("Syncing...");
        }
        try {
            const response = await this.apiFetch(`/api/snapshot?year=${this.currentYear}`, { method: "GET" });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || `Sync failed (${response.status})`);
            }
            this.days = this.mergeDayMaps(this.days, payload.days || {});
            const incomingWorkspace = this.normalizeWorkspace(payload.workspace || {});
            if (this.isBlankWorkspace(incomingWorkspace) && !this.isBlankWorkspace(this.workspace)) {
                await this.pushWorkspace();
            } else {
                this.workspace = this.mergeWorkspace(this.workspace, incomingWorkspace);
            }
            if (payload.user?.email && !this.workspace.notificationSettings.email) {
                this.workspace.notificationSettings.email = payload.user.email;
            }
            this.saveLocal();
            this.setSyncState(`Synced to ${payload.primaryStore || "cloud"}`);
            if (!quiet) {
                this.toast("Sync complete.", "success");
            }
            this.renderAll();
        } catch (error) {
            this.setSyncState("Cloud sync unavailable");
            if (!quiet) {
                this.toast(error.message || "Cloud sync unavailable.", "error");
            }
        }
    }

    async apiFetch(path, options = {}) {
        const headers = {
            "Content-Type": "application/json",
            "X-Demo-User": this.currentUser.uid,
            ...(options.headers || {})
        };

        if (this.firebaseReady && this.firebaseAuth?.currentUser) {
            try {
                headers.Authorization = `Bearer ${await this.firebaseAuth.currentUser.getIdToken()}`;
            } catch {
                // Dev auth still uses X-Demo-User when Firebase Admin is not configured.
            }
        }

        return fetch(`${this.apiBase}${path}`, { ...options, headers });
    }

    async handleAuthClick() {
        if (this.firebaseReady && this.firebaseAuth?.currentUser) {
            await signOut(this.firebaseAuth);
            this.toast("Signed out.");
            return;
        }
        if (!this.firebaseReady || !this.firebaseAuth) {
            this.toast("Add Firebase browser config to enable sign in.", "warn");
            return;
        }
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(this.firebaseAuth, provider);
            this.toast("Signed in.", "success");
        } catch {
            this.toast("Sign in was not completed.", "error");
        }
    }

    updateAuthUi() {
        const name = this.currentUser.displayName || "Local player";
        this.els.userName.textContent = name;
        this.els.userAvatar.textContent = this.initials(name);
        const signedIn = this.firebaseReady && this.firebaseAuth?.currentUser;
        this.els.authButton.textContent = signedIn ? "Sign out" : "Sign in";
    }

    initials(name) {
        return String(name || "DayForge")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0].toUpperCase())
            .join("") || "DF";
    }

    setSyncState(message) {
        this.els.syncState.textContent = message;
    }

    dayProgress(day) {
        if (!day) return { done: 0, total: 0, pct: 0 };
        const taskDone = day.tasks.filter((task) => task.done).length;
        const activeHabitIds = this.workspace.habits.filter((habit) => habit.active).map((habit) => habit.id);
        const habitDone = activeHabitIds.filter((id) => day.habitChecks[id]).length;
        const total = day.tasks.length + activeHabitIds.length;
        const done = taskDone + habitDone;
        return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
    }

    dayXp(day) {
        if (!day) return 0;
        const taskXp = day.tasks.reduce((total, task) => total + (task.done ? XP_BY_PRIORITY[task.priority] || XP_BY_PRIORITY.medium : 0), 0);
        const habitXp = Object.values(day.habitChecks || {}).filter(Boolean).length * 18;
        const cleanBonus = this.isCleanLoggedDay(day) ? 25 : 0;
        const winBonus = day.status === "won" ? 45 : 0;
        return taskXp + habitXp + cleanBonus + winBonus;
    }

    isCleanLoggedDay(day) {
        if (!day || day.relapse) return false;
        const progress = this.dayProgress(day);
        return progress.done > 0 || Boolean(day.focusLine || day.gratitude || day.reflection);
    }

    calculateStats() {
        const allDays = Object.values(this.days);
        const yearStart = `${this.currentYear}-01-01`;
        const yearEnd = `${this.currentYear}-12-31`;
        const yearDays = Object.entries(this.days)
            .filter(([dateKey]) => dateKey >= yearStart && dateKey <= yearEnd)
            .map(([, day]) => day);
        const today = this.getDay(this.todayKey, false);
        const todayProgress = this.dayProgress(today);
        const dueToday = this.workspace.reminders.filter((reminder) => reminder.date === this.todayKey && !reminder.done);
        const doneTasks = allDays.reduce((total, day) => total + day.tasks.filter((task) => task.done).length, 0);
        const bossTasksDone = allDays.reduce((total, day) => total + day.tasks.filter((task) => task.done && task.priority === "high").length, 0);
        const habitChecks = allDays.reduce((total, day) => total + Object.values(day.habitChecks || {}).filter(Boolean).length, 0);
        const totalXp = allDays.reduce((total, day) => total + this.dayXp(day), 0);
        const level = Math.floor(totalXp / LEVEL_SIZE) + 1;
        const xpIntoLevel = totalXp % LEVEL_SIZE;
        const cleanDays = allDays.filter((day) => this.isCleanLoggedDay(day)).length;
        const wonDays = yearDays.filter((day) => day.status === "won").length;
        const relapseDays = yearDays.filter((day) => day.relapse).length;
        const urgeWins = allDays.filter((day) => day.urge >= 7 && !day.relapse && this.isCleanLoggedDay(day)).length;
        const averageProgress = yearDays.length
            ? Math.round(yearDays.reduce((total, day) => total + this.dayProgress(day).pct, 0) / yearDays.length)
            : 0;
        const streaks = this.calculateStreaks();

        return {
            totalXp,
            level,
            xpIntoLevel,
            cleanDays,
            wonDays,
            relapseDays,
            doneTasks,
            bossTasksDone,
            habitChecks,
            urgeWins,
            averageProgress,
            currentStreak: streaks.current,
            bestStreak: streaks.best,
            todayProgress,
            todayXp: this.dayXp(today),
            todayUrge: today?.urge || 0,
            dueToday: dueToday.length
        };
    }

    calculateStreaks() {
        const dateKeys = Object.keys(this.days).sort();
        let best = 0;
        let run = 0;
        let previous = null;

        dateKeys.forEach((dateKey) => {
            const clean = this.isCleanLoggedDay(this.days[dateKey]);
            if (!clean) {
                run = 0;
                previous = dateKey;
                return;
            }
            if (!previous || toDateKey(addDays(parseDateKey(previous), 1)) === dateKey) {
                run += 1;
            } else {
                run = 1;
            }
            best = Math.max(best, run);
            previous = dateKey;
        });

        let current = 0;
        let cursor = parseDateKey(this.todayKey);
        if (!this.isCleanLoggedDay(this.days[this.todayKey])) {
            cursor = addDays(cursor, -1);
        }
        while (true) {
            const key = toDateKey(cursor);
            if (!this.isCleanLoggedDay(this.days[key])) break;
            current += 1;
            cursor = addDays(cursor, -1);
        }

        return { current, best };
    }

    renderAll() {
        this.todayKey = toDateKey(new Date());
        this.updateAuthUi();
        this.renderHeader();
        this.renderStats();
        this.renderDayPanel();
        this.renderHeatmap();
        this.renderHabitMatrix();
        this.renderGoals();
        this.renderRecovery();
        this.renderReminders();
        this.renderNotifications();
        this.renderAwards();
    }

    renderHeader() {
        const quote = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length];
        this.els.todayLabel.textContent = this.selectedDate === this.todayKey ? "Today" : formatHumanDate(this.selectedDate);
        this.els.headlineText.textContent = this.workspace.profile.mission || "Build proof that you can trust yourself.";
        this.els.quoteText.textContent = quote[0];
        this.els.quoteAuthor.textContent = quote[1];
        this.els.currentDateTitle.textContent = formatHumanDate(this.selectedDate);
        this.els.currentYearDisplay.textContent = String(this.currentYear);
        this.els.selectedDateInput.value = this.selectedDate;
    }

    renderStats() {
        const stats = this.calculateStats();
        this.els.levelNumber.textContent = stats.level;
        this.els.xpLabel.textContent = `${stats.xpIntoLevel} / ${LEVEL_SIZE} XP`;
        this.els.xpFill.style.width = `${Math.round((stats.xpIntoLevel / LEVEL_SIZE) * 100)}%`;
        this.els.cleanStreak.textContent = stats.currentStreak;
        this.els.bestStreak.textContent = stats.bestStreak;
        this.els.statOverall.textContent = `${stats.averageProgress}%`;
        this.els.statOverallSub.textContent = `${stats.wonDays} wins, ${stats.cleanDays} clean logs`;
        this.els.statToday.textContent = `${stats.todayXp} XP`;
        this.els.statTodaySub.textContent = `${stats.todayProgress.done}/${stats.todayProgress.total} items done`;
        this.els.statUrge.textContent = `${stats.todayUrge} / 10`;
        this.els.statUrgeSub.textContent = stats.todayUrge >= 7 ? "Run the rescue plan" : "Calm window";
        this.els.statReminders.textContent = stats.dueToday;
        this.els.statRemindersSub.textContent = stats.dueToday ? "Open loops today" : "No reminders due";

        if (stats.level > this.lastLevel) {
            this.toast(`Level ${stats.level} unlocked. Keep stacking proof.`, "success");
        }
        this.lastLevel = stats.level;
    }

    renderDayPanel() {
        const day = this.getDay(this.selectedDate, true);
        const progress = this.dayProgress(day);
        const xp = this.dayXp(day);

        this.els.focusLineInput.value = day.focusLine;
        this.els.moodRange.value = day.mood;
        this.els.energyRange.value = day.energy;
        this.els.urgeRange.value = day.urge;
        this.els.relapseCheck.checked = day.relapse;
        this.els.gratitudeInput.value = day.gratitude;
        this.els.reflectionInput.value = day.reflection;
        this.els.progressRing.style.setProperty("--progress", progress.pct);
        this.els.progressNumber.textContent = `${progress.pct}%`;
        this.els.progressLabel.textContent = progress.total ? `${progress.done} of ${progress.total} complete` : "No quests yet";
        this.els.progressXp.textContent = `${xp} XP`;
        this.els.progressHint.textContent = day.relapse ? "Logged honestly. Restart with one rescue action." : this.progressHint(progress.pct);
        this.renderGoalOptions();
        this.renderTaskList(day);
    }

    progressHint(pct) {
        if (pct === 100) return "Clean win. Lock in the lesson.";
        if (pct >= 70) return "Close enough to finish strong.";
        if (pct >= 30) return "Momentum exists. Add the next rep.";
        return "A small start beats a perfect plan.";
    }

    renderGoalOptions() {
        const options = ['<option value="">No goal</option>']
            .concat(this.workspace.goals.map((goal) => `<option value="${escapeHtml(goal.id)}">${escapeHtml(goal.title)}</option>`))
            .join("");
        const currentTaskGoal = this.els.newTaskGoal.value;
        const currentHabitGoal = this.els.habitGoal.value;
        this.els.newTaskGoal.innerHTML = options;
        this.els.habitGoal.innerHTML = options;
        this.els.newTaskGoal.value = currentTaskGoal;
        this.els.habitGoal.value = currentHabitGoal;
    }

    renderTaskList(day) {
        if (!day.tasks.length) {
            this.els.taskList.innerHTML = '<div class="task-empty">Add one task that proves today is not wasted.</div>';
            return;
        }

        this.els.taskList.innerHTML = day.tasks.map((task) => {
            const goal = this.workspace.goals.find((item) => item.id === task.goalId);
            return `
                <div class="task-row ${task.done ? "done" : ""}">
                    <input type="checkbox" data-task-check="${escapeHtml(task.id)}" ${task.done ? "checked" : ""} aria-label="Toggle task">
                    <div>
                        <span class="task-title">${escapeHtml(task.title)}</span>
                        <div class="task-meta">
                            <span class="pill ${escapeHtml(task.priority)}">${PRIORITY_LABELS[task.priority] || "Core"}</span>
                            <span class="pill">${task.estimateMins} min</span>
                            ${goal ? `<span class="pill">${escapeHtml(goal.title)}</span>` : ""}
                        </div>
                    </div>
                    <button class="tiny-button" type="button" data-task-delete="${escapeHtml(task.id)}">Delete</button>
                </div>
            `;
        }).join("");
    }

    renderHeatmap() {
        const start = new Date(this.currentYear, 0, 1);
        const end = new Date(this.currentYear, 11, 31);
        const buttons = [];
        for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
            const dateKey = toDateKey(date);
            const day = this.getDay(dateKey, false);
            const progress = this.dayProgress(day);
            const classes = ["heat-day"];
            if (dateKey === this.selectedDate) classes.push("selected");
            if (dateKey === this.todayKey) classes.push("today");
            if (day?.relapse) classes.push("relapse");
            else if (day?.status === "won") classes.push("won");
            else if (day?.status === "missed") classes.push("missed");
            else if (progress.pct >= 50) classes.push("partial");
            else if (day && (day.tasks.length || Object.keys(day.habitChecks || {}).length || day.focusLine)) classes.push("planned");
            buttons.push(`<button class="${classes.join(" ")}" type="button" data-date-key="${dateKey}" title="${formatHumanDate(dateKey)}: ${progress.pct}%"></button>`);
        }
        this.els.heatmapGrid.innerHTML = buttons.join("");
        this.els.heatmapGrid.querySelectorAll("[data-date-key]").forEach((button) => {
            button.addEventListener("click", () => this.selectDate(button.dataset.dateKey));
        });
    }

    renderHabitMatrix() {
        const habits = this.workspace.habits.filter((habit) => habit.active);
        if (!habits.length) {
            this.els.habitMatrix.innerHTML = '<div class="empty-state">Add habits to build your matrix.</div>';
            return;
        }

        const end = parseDateKey(this.selectedDate);
        const dates = Array.from({ length: 21 }, (_, index) => toDateKey(addDays(end, index - 20)));
        const header = `
            <div class="habit-row header">
                <span>Habit</span>
                ${dates.map((dateKey) => `<span class="habit-cell ${dateKey === this.todayKey ? "today" : ""}">${Number(dateKey.slice(-2))}</span>`).join("")}
                <span class="habit-score">Score</span>
            </div>
        `;

        const rows = habits.map((habit) => {
            const checkedCount = dates.filter((dateKey) => this.days[dateKey]?.habitChecks?.[habit.id]).length;
            return `
                <div class="habit-row">
                    <span class="habit-name">${escapeHtml(habit.title)}</span>
                    ${dates.map((dateKey) => {
                        const checked = this.days[dateKey]?.habitChecks?.[habit.id];
                        return `
                            <label class="habit-cell ${dateKey === this.todayKey ? "today" : ""}" title="${escapeHtml(habit.title)} on ${dateKey}">
                                <input type="checkbox" data-habit-check="${escapeHtml(habit.id)}" data-date-key="${dateKey}" ${checked ? "checked" : ""}>
                            </label>
                        `;
                    }).join("")}
                    <span class="habit-score">${checkedCount}/21</span>
                </div>
            `;
        }).join("");

        this.els.habitMatrix.innerHTML = `<div class="habit-table">${header}${rows}</div>`;
    }

    renderGoals() {
        if (!this.workspace.goals.length) {
            this.els.goalList.innerHTML = '<div class="empty-state">Add a goal so tasks have a destination.</div>';
            return;
        }

        this.els.goalList.innerHTML = this.workspace.goals.map((goal) => {
            const relatedTasks = Object.values(this.days).flatMap((day) => day.tasks).filter((task) => task.goalId === goal.id);
            const done = relatedTasks.filter((task) => task.done).length;
            const pct = relatedTasks.length ? Math.round((done / relatedTasks.length) * 100) : 0;
            return `
                <div class="goal-card">
                    <div class="goal-top">
                        <strong>${escapeHtml(goal.title)}</strong>
                        <div>
                            <button class="tiny-button" type="button" data-goal-action="complete" data-goal-id="${escapeHtml(goal.id)}">${goal.status === "completed" ? "Reopen" : "Done"}</button>
                            <button class="tiny-button" type="button" data-goal-action="delete" data-goal-id="${escapeHtml(goal.id)}">Delete</button>
                        </div>
                    </div>
                    <p>${escapeHtml(goal.why || "Give this goal a reason that can pull you through low-mood days.")}</p>
                    <div class="progress-bar"><span style="width:${pct}%"></span></div>
                    <div class="goal-meta">
                        <span class="pill">${pct}% task proof</span>
                        ${goal.targetDate ? `<span class="pill">Target ${escapeHtml(goal.targetDate)}</span>` : ""}
                        <span class="pill">${escapeHtml(goal.status)}</span>
                    </div>
                </div>
            `;
        }).join("");
    }

    renderRecovery() {
        const recovery = this.workspace.recovery;
        this.els.recoveryAddiction.value = recovery.addictionName || "porn";
        this.els.recoveryWhy.value = recovery.why || "";
        this.els.recoveryTriggers.value = (recovery.triggers || []).join("\n");
        this.els.recoveryPlan.value = (recovery.rescuePlan || []).join("\n");

        const plan = recovery.rescuePlan?.length ? recovery.rescuePlan : this.defaultWorkspace().recovery.rescuePlan;
        this.els.panicPlanList.innerHTML = plan.map((step, index) => `
            <div class="panic-step">
                <span>${index + 1}</span>
                <p>${escapeHtml(step)}</p>
            </div>
        `).join("");
    }

    renderReminders() {
        const sorted = [...this.workspace.reminders].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
        if (!sorted.length) {
            this.els.reminderList.innerHTML = '<div class="empty-state">Save contests, meetings, focus blocks, and recovery guardrails here.</div>';
            return;
        }
        this.els.reminderList.innerHTML = sorted.map((reminder) => `
            <div class="reminder-row ${reminder.done ? "done" : ""}">
                <input type="checkbox" data-reminder-check="${escapeHtml(reminder.id)}" ${reminder.done ? "checked" : ""} aria-label="Toggle reminder">
                <div>
                    <div class="reminder-top">
                        <strong>${escapeHtml(reminder.title)}</strong>
                    </div>
                    <p>${escapeHtml(reminder.notes || "")}</p>
                    <div class="reminder-meta">
                        <span class="pill">${escapeHtml(reminder.date)} ${escapeHtml(reminder.time)}</span>
                        <span class="pill">${escapeHtml(reminder.category)}</span>
                        <span class="pill">${reminder.notify ? "Notify" : "No email"}</span>
                    </div>
                </div>
                <button class="tiny-button" type="button" data-reminder-delete="${escapeHtml(reminder.id)}">Delete</button>
            </div>
        `).join("");
    }

    renderNotifications() {
        const settings = this.workspace.notificationSettings;
        this.els.notifyEmail.value = settings.email || this.currentUser.email || "";
        this.els.notifyEnabled.checked = Boolean(settings.enabled);
        this.els.morningDigest.checked = settings.morningDigest !== false;
        this.els.morningTime.value = settings.morningTime || "07:30";
        this.els.eveningReview.checked = settings.eveningReview !== false;
        this.els.eveningTime.value = settings.eveningTime || "21:30";
        this.els.relapseShield.checked = settings.relapseShield !== false;
        this.els.relapseShieldTime.value = settings.relapseShieldTime || "22:45";
    }

    renderAwards() {
        const stats = this.calculateStats();
        const unlocked = AWARDS.filter((award) => award.rule(stats));
        this.els.awardsGrid.innerHTML = AWARDS.map((award) => {
            const isUnlocked = award.rule(stats);
            return `
                <div class="award-card ${isUnlocked ? "unlocked" : ""}">
                    <div class="award-top">
                        <span class="award-medal">${escapeHtml(award.code)}</span>
                        <span class="pill">${isUnlocked ? "Unlocked" : "Locked"}</span>
                    </div>
                    <strong>${escapeHtml(award.title)}</strong>
                    <p>${escapeHtml(award.desc)}</p>
                    <div class="award-meta">
                        <span class="pill">${isUnlocked ? "Profile proof" : "Keep building"}</span>
                    </div>
                </div>
            `;
        }).join("");

        const bestAward = unlocked.at(-1);
        const text = [
            "DayForge progress update:",
            `Clean streak: ${stats.currentStreak} days. Best streak: ${stats.bestStreak} days.`,
            `Completed tasks: ${stats.doneTasks}. Habit checks: ${stats.habitChecks}. Level: ${stats.level}.`,
            bestAward ? `Latest badge: ${bestAward.title}.` : "Current badge target: First Clean Day.",
            "Building focus, recovery, and execution one honest day at a time."
        ].join("\n");
        this.els.linkedinText.value = text;
    }

    async copyLinkedInText() {
        const text = this.els.linkedinText.value;
        try {
            await navigator.clipboard.writeText(text);
            this.toast("LinkedIn text copied.", "success");
        } catch {
            this.els.linkedinText.focus();
            this.els.linkedinText.select();
            this.toast("Text selected for copying.", "warn");
        }
    }

    toast(message, tone = "info") {
        const node = document.createElement("div");
        node.className = `toast ${tone}`;
        node.textContent = message;
        this.els.toastStack.appendChild(node);
        setTimeout(() => node.remove(), 3600);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.dayForge = new DayForgeApp();
});
