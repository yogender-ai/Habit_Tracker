import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsIsSupported } from "firebase/analytics";
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

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const XP_BY_PRIORITY = { low: 20, medium: 35, high: 55 };
const PRIORITY_LABELS = { low: "Small", medium: "Core", high: "Boss" };

const WIN_QUOTES = [
    { text: "Trust the process.", author: "DayForge" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
    { text: "We are what we repeatedly do. Excellence is not an act, but a habit.", author: "Aristotle" },
    { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
    { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
    { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "You don't have to be extreme, just consistent.", author: "DayForge" },
    { text: "A year from now you'll wish you started today.", author: "Karen Lamb" },
    { text: "Winners are not people who never fail but people who never quit.", author: "Edwin Louis Cole" },
    { text: "Progress, not perfection.", author: "DayForge" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "Motivation gets you going. Habit keeps you growing.", author: "John C. Maxwell" },
    { text: "Be stronger than your excuses.", author: "DayForge" },
    { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
    { text: "Your future self will thank you.", author: "DayForge" },
    { text: "One day or day one. You decide.", author: "Paulo Coelho" },
    { text: "The hard days are what make you stronger.", author: "Aly Raisman" },
    { text: "Consistency beats intensity.", author: "DayForge" },
];

const QUOTE_ICONS = ['💎', '🔥', '⚡', '🏆', '🎯', '💪', '🌟', '🚀', '✨', '👑'];

function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function addDays(date, amount) {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
}

function uid() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeJson(value, fallback) {
    try {
        return JSON.parse(value);
    } catch (error) {
        return fallback;
    }
}

class DayForgeApp {
    constructor() {
        this.config = CONFIG;
        this.todayKey = toDateKey(new Date());
        this.currentYear = new Date().getFullYear();
        this.selectedDate = this.todayKey;
        this.currentUser = { uid: "local-player", displayName: "Local player", email: "" };
        this.firebaseApp = null;
        this.firebaseAnalytics = null;
        this.firebaseAuth = null;
        this.firebaseReady = false;
        this.data = this.loadLocalData(this.currentUser.uid);
        this.syncTimer = null;
        this.combo = 0;
        this.comboTimer = null;
        this.lastLevel = 1;

        this.els = {
            trackerGrid: document.getElementById("trackerGrid"),
            currentYearDisplay: document.getElementById("currentYearDisplay"),
            prevYear: document.getElementById("prevYear"),
            nextYear: document.getElementById("nextYear"),
            todayLabel: document.getElementById("todayLabel"),
            headlineText: document.getElementById("headlineText"),
            userAvatar: document.getElementById("userAvatar"),
            userName: document.getElementById("userName"),
            syncState: document.getElementById("syncState"),
            authButton: document.getElementById("authButton"),
            syncNowBtn: document.getElementById("syncNowBtn"),
            levelNumber: document.getElementById("levelNumber"),
            xpLabel: document.getElementById("xpLabel"),
            xpFill: document.getElementById("xpFill"),
            streakCount: document.getElementById("streakCount"),
            bestStreakCount: document.getElementById("bestStreakCount"),
            completionMetric: document.getElementById("completionMetric"),
            completionSubtext: document.getElementById("completionSubtext"),
            todayXpMetric: document.getElementById("todayXpMetric"),
            todayXpSubtext: document.getElementById("todayXpSubtext"),
            perfectDaysMetric: document.getElementById("perfectDaysMetric"),
            perfectDaysSubtext: document.getElementById("perfectDaysSubtext"),
            lockRuleMetric: document.getElementById("lockRuleMetric"),
            panelKicker: document.getElementById("panelKicker"),
            panelDateTitle: document.getElementById("panelDateTitle"),
            dayStateBadge: document.getElementById("dayStateBadge"),
            progressRing: document.getElementById("progressRing"),
            progressNumber: document.getElementById("progressNumber"),
            panelXp: document.getElementById("panelXp"),
            panelProgressText: document.getElementById("panelProgressText"),
            motivationInput: document.getElementById("motivationInput"),
            newTaskInput: document.getElementById("newTaskInput"),
            newTaskPriority: document.getElementById("newTaskPriority"),
            addTaskBtn: document.getElementById("addTaskBtn"),
            panelTaskList: document.getElementById("panelTaskList"),
            btnWon: document.getElementById("btnWon"),
            btnMissed: document.getElementById("btnMissed"),
            lockNote: document.getElementById("lockNote"),
            weekStrip: document.getElementById("weekStrip"),
            badgeGrid: document.getElementById("badgeGrid"),
            toastStack: document.getElementById("toastStack"),
            quoteText: document.getElementById("quoteText"),
            quoteAuthor: document.getElementById("quoteAuthor"),
            quoteBanner: document.getElementById("quoteBanner"),
            weeklyBarChart: document.getElementById("weeklyBarChart"),
            questRanking: document.getElementById("questRanking")
        };

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.initAuth();
        await this.syncFromCloud({ quiet: true });
        this.renderAll();
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

        document.querySelectorAll("[data-jump-today]").forEach((button) => {
            button.addEventListener("click", () => {
                this.currentYear = new Date().getFullYear();
                this.selectDate(this.todayKey);
            });
        });

        document.querySelectorAll("[data-open-auth]").forEach((button) => {
            button.addEventListener("click", () => this.handleAuthClick());
        });

        this.els.authButton.addEventListener("click", () => this.handleAuthClick());
        this.els.syncNowBtn.addEventListener("click", () => this.syncFromCloud({ quiet: false }));

        this.els.addTaskBtn.addEventListener("click", () => this.addTask());
        this.els.newTaskInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                this.addTask();
            }
        });

        this.els.motivationInput.addEventListener("blur", () => this.saveMotivation());
        this.els.motivationInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                this.els.motivationInput.blur();
            }
        });

        this.els.btnWon.addEventListener("click", () => this.setStatus("won"));
        this.els.btnMissed.addEventListener("click", () => this.setStatus("missed"));
    }

    async initAuth() {
        if (!this.hasFirebaseConfig()) {
            this.setSyncState("Local save ready");
            return;
        }

        try {
            this.firebaseApp = initializeApp(this.config.firebase);
            this.firebaseAuth = getAuth(this.firebaseApp);
            this.firebaseReady = true;

            if (this.config.firebase.measurementId && await analyticsIsSupported()) {
                this.firebaseAnalytics = getAnalytics(this.firebaseApp);
            }
        } catch (error) {
            this.setSyncState("Firebase config needs attention");
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

    async applyAuthUser(user) {
        if (!user) {
            this.currentUser = { uid: "local-player", displayName: "Local player", email: "" };
            this.data = this.loadLocalData(this.currentUser.uid);
            this.updateAuthUi();
            return;
        }

        const previousData = this.data;
        const shouldMergeGuestData = this.currentUser.uid === "local-player";
        this.currentUser = {
            uid: user.uid,
            displayName: user.displayName || user.email || "DayForge player",
            email: user.email || ""
        };
        this.data = shouldMergeGuestData
            ? this.mergeDayMaps(this.loadLocalData(user.uid), previousData)
            : this.loadLocalData(user.uid);
        this.saveLocalData();
        this.updateAuthUi();
        await this.syncFromCloud({ quiet: true });
    }

    hasFirebaseConfig() {
        const firebaseConfig = this.config.firebase || {};
        return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
    }

    hasCloudApi() {
        return Boolean((this.config.apiBaseUrl || "").trim());
    }

    storageKey(uidValue = this.currentUser.uid) {
        return `dayforge_v1_${uidValue}`;
    }

    loadLocalData(uidValue) {
        const raw = localStorage.getItem(this.storageKey(uidValue));
        const parsed = safeJson(raw, {});
        return this.normalizeDayMap(parsed || {});
    }

    saveLocalData() {
        localStorage.setItem(this.storageKey(), JSON.stringify(this.data));
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
        const status = ["neutral", "won", "missed"].includes(day.status) ? day.status : "neutral";
        return {
            dateKey,
            status,
            motivation: String(day.motivation || "").slice(0, 120),
            updatedAt: day.updatedAt || new Date().toISOString(),
            tasks: tasks.map((task) => ({
                id: task.id || uid(),
                text: String(task.text || "Untitled quest").slice(0, 90),
                done: Boolean(task.done),
                priority: ["low", "medium", "high"].includes(task.priority) ? task.priority : "medium",
                createdAt: task.createdAt || new Date().toISOString(),
                completedAt: task.completedAt || null
            }))
        };
    }

    getDay(dateKey, create = true) {
        if (!this.data[dateKey] && create) {
            this.data[dateKey] = this.normalizeDay(dateKey, { dateKey, status: "neutral", motivation: "", tasks: [] });
        }
        return this.data[dateKey] || null;
    }

    touchDay(dateKey) {
        const day = this.getDay(dateKey);
        day.updatedAt = new Date().toISOString();
        return day;
    }

    mergeDayMaps(localMap, incomingMap) {
        const merged = { ...this.normalizeDayMap(localMap) };
        const incoming = this.normalizeDayMap(incomingMap);
        Object.entries(incoming).forEach(([dateKey, day]) => {
            const existing = merged[dateKey];
            if (!existing || new Date(day.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
                merged[dateKey] = day;
            }
        });
        return merged;
    }

    selectDate(dateKey) {
        this.selectedDate = dateKey;
        this.currentYear = Number(dateKey.slice(0, 4));
        this.renderAll();
    }

    canEditDate(dateKey) {
        return dateKey >= this.todayKey;
    }

    canProgressDate(dateKey) {
        return dateKey === this.todayKey;
    }

    isPastDate(dateKey) {
        return dateKey < this.todayKey;
    }

    isFutureDate(dateKey) {
        return dateKey > this.todayKey;
    }

    taskXp(task) {
        return XP_BY_PRIORITY[task.priority] || XP_BY_PRIORITY.medium;
    }

    dayProgress(day) {
        if (!day || !day.tasks.length) {
            return { total: 0, done: 0, pct: 0 };
        }
        const done = day.tasks.filter((task) => task.done).length;
        return {
            total: day.tasks.length,
            done,
            pct: Math.round((done / day.tasks.length) * 100)
        };
    }

    isValidWin(day) {
        const progress = this.dayProgress(day);
        return Boolean(day && day.status === "won" && progress.total > 0 && progress.done === progress.total);
    }

    dayXp(day) {
        if (!day) {
            return 0;
        }
        const taskScore = day.tasks.reduce((total, task) => total + (task.done ? this.taskXp(task) : 0), 0);
        const perfectBonus = this.isValidWin(day) ? 40 : 0;
        return taskScore + perfectBonus;
    }

    calculateStats() {
        const allDates = Object.keys(this.data).sort();
        const firstOfYear = `${this.currentYear}-01-01`;
        const lastOfYear = `${this.currentYear}-12-31`;
        const todayInYear = this.currentYear === new Date().getFullYear()
            ? this.todayKey
            : lastOfYear;
        const yearDates = allDates.filter((dateKey) => dateKey >= firstOfYear && dateKey <= lastOfYear);
        const playableEnd = todayInYear < firstOfYear ? firstOfYear : todayInYear;
        const elapsedDays = this.daysBetween(firstOfYear, playableEnd) + 1;

        let wins = 0;
        let perfectDays = 0;
        let doneTasks = 0;
        let plannedTasks = 0;
        let totalXp = 0;

        allDates.forEach((dateKey) => {
            const day = this.data[dateKey];
            totalXp += this.dayXp(day);
            doneTasks += day.tasks.filter((task) => task.done).length;
            plannedTasks += day.tasks.length;
        });

        yearDates.forEach((dateKey) => {
            const day = this.data[dateKey];
            if (dateKey <= this.todayKey && this.isValidWin(day)) {
                wins += 1;
                perfectDays += 1;
            }
        });

        const streak = this.calculateCurrentStreak();
        const bestStreak = this.calculateBestStreak();
        const level = Math.floor(totalXp / 500) + 1;
        const xpIntoLevel = totalXp % 500;
        const completion = elapsedDays > 0 ? Math.round((wins / elapsedDays) * 100) : 0;

        return {
            wins,
            perfectDays,
            doneTasks,
            plannedTasks,
            totalXp,
            level,
            xpIntoLevel,
            completion,
            streak,
            bestStreak,
            todayXp: this.dayXp(this.getDay(this.todayKey, false))
        };
    }

    daysBetween(startKey, endKey) {
        const start = parseDateKey(startKey);
        const end = parseDateKey(endKey);
        return Math.max(0, Math.round((end - start) / 86400000));
    }

    calculateCurrentStreak() {
        let streak = 0;
        let cursor = parseDateKey(this.todayKey);

        for (let index = 0; index < 730; index += 1) {
            const dateKey = toDateKey(cursor);
            const day = this.data[dateKey];
            const isToday = dateKey === this.todayKey;

            if (this.isValidWin(day)) {
                streak += 1;
            } else if (!isToday) {
                break;
            }

            cursor = addDays(cursor, -1);
        }

        return streak;
    }

    calculateBestStreak() {
        const dateKeys = Object.keys(this.data).filter((dateKey) => dateKey <= this.todayKey).sort();
        if (!dateKeys.length) {
            return 0;
        }

        let best = 0;
        let current = 0;
        let cursor = parseDateKey(dateKeys[0]);
        const end = parseDateKey(this.todayKey);

        while (cursor <= end) {
            const dateKey = toDateKey(cursor);
            if (this.isValidWin(this.data[dateKey])) {
                current += 1;
                best = Math.max(best, current);
            } else {
                current = 0;
            }
            cursor = addDays(cursor, 1);
        }

        return best;
    }

    renderAll() {
        this.todayKey = toDateKey(new Date());
        this.renderHeader();
        this.renderGrid();
        this.renderPanel();
        this.renderStats();
        this.renderWeek();
        this.renderBadges();
        this.renderQuote();
        this.renderBarChart();
        this.renderQuestRanking();
        this.updateAuthUi();
    }

    renderHeader() {
        const today = new Date();
        this.els.todayLabel.textContent = today.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric"
        });
        const todayDay = this.getDay(this.todayKey, false);
        const progress = this.dayProgress(todayDay);
        const stats = this.calculateStats();
        const hour = today.getHours();
        if (!todayDay || progress.total === 0) {
            const lines = hour < 12
                ? ["Good morning, champion. Set your quests.", "Rise and grind. What will you conquer?", "New day, new power. Add your quests."]
                : hour < 17
                    ? ["Afternoon forge. Build something great.", "Half the day left. Make it count."]
                    : ["Evening session. Still time to win.", "Night ops active. Forge ahead."];
            this.els.headlineText.textContent = lines[Math.floor(Math.random() * lines.length)];
        } else if (this.isValidWin(todayDay)) {
            const winLines = ["🏆 Today is sealed. You crushed it.", "⚡ Perfect day. Absolute legend.", "🔥 All quests done. Unstoppable."];
            this.els.headlineText.textContent = winLines[Math.floor(Math.random() * winLines.length)];
        } else {
            const pct = progress.pct;
            if (pct >= 75) this.els.headlineText.textContent = `Almost there! ${progress.done}/${progress.total} — finish strong 💪`;
            else if (pct >= 50) this.els.headlineText.textContent = `${progress.done} of ${progress.total} done. Keep the momentum.`;
            else this.els.headlineText.textContent = `${progress.done} of ${progress.total} quests. Let's go! 🎯`;
        }
        if (stats.streak >= 3) {
            this.els.todayLabel.textContent += ` • 🔥 ${stats.streak} day streak!`;
        }
    }

    renderGrid() {
        this.els.currentYearDisplay.textContent = String(this.currentYear);
        this.els.trackerGrid.innerHTML = "";

        MONTHS.forEach((month, monthIndex) => {
            const row = document.createElement("div");
            row.className = "month-row";

            const label = document.createElement("div");
            label.className = "month-label";
            label.textContent = month;
            row.appendChild(label);

            const daysInMonth = new Date(this.currentYear, monthIndex + 1, 0).getDate();

            for (let dayNumber = 1; dayNumber <= 31; dayNumber += 1) {
                if (dayNumber > daysInMonth) {
                    const emptyCell = document.createElement("div");
                    emptyCell.className = "day-cell empty";
                    row.appendChild(emptyCell);
                    continue;
                }

                const dateKey = `${this.currentYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
                const day = this.getDay(dateKey, false);
                const progress = this.dayProgress(day);
                const cell = document.createElement("button");
                cell.type = "button";
                cell.className = "day-cell";
                cell.style.setProperty("--fill", `${progress.pct}%`);
                cell.title = `${dateKey} - ${progress.done}/${progress.total} quests`;

                if (dateKey === this.todayKey) cell.classList.add("today");
                if (dateKey === this.selectedDate) cell.classList.add("selected");
                if (this.isPastDate(dateKey)) cell.classList.add("locked");
                if (day) {
                    if (this.isValidWin(day)) {
                        cell.classList.add("won");
                    } else if (day.status === "missed") {
                        cell.classList.add("missed");
                    } else if (day.tasks.length > 0 || day.motivation) {
                        cell.classList.add("planned");
                    }
                }

                const number = document.createElement("span");
                number.className = "date-number";
                number.textContent = String(dayNumber);
                cell.appendChild(number);
                cell.addEventListener("click", () => this.selectDate(dateKey));
                row.appendChild(cell);
            }

            this.els.trackerGrid.appendChild(row);
        });
    }

    renderPanel() {
        const day = this.getDay(this.selectedDate);
        const progress = this.dayProgress(day);
        const canEdit = this.canEditDate(this.selectedDate);
        const canProgress = this.canProgressDate(this.selectedDate);
        const allDone = progress.total > 0 && progress.done === progress.total;
        const date = parseDateKey(this.selectedDate);

        this.els.panelKicker.textContent = this.isPastDate(this.selectedDate)
            ? "Archived day"
            : this.isFutureDate(this.selectedDate)
                ? "Plan ahead"
                : "Today";
        this.els.panelDateTitle.textContent = date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        });

        this.els.dayStateBadge.className = "day-badge";
        if (this.isPastDate(this.selectedDate)) {
            this.els.dayStateBadge.textContent = this.isValidWin(day) ? "Locked win" : "Locked";
            this.els.dayStateBadge.classList.add("locked");
        } else if (this.isValidWin(day)) {
            this.els.dayStateBadge.textContent = "Won";
            this.els.dayStateBadge.classList.add("win");
        } else if (day.status === "missed") {
            this.els.dayStateBadge.textContent = "Missed";
            this.els.dayStateBadge.classList.add("miss");
        } else if (this.isFutureDate(this.selectedDate)) {
            this.els.dayStateBadge.textContent = "Planned";
        } else {
            this.els.dayStateBadge.textContent = "Ready";
        }

        this.els.progressRing.style.setProperty("--progress", progress.pct);
        this.els.progressNumber.textContent = `${progress.pct}%`;
        this.els.panelXp.textContent = `${this.dayXp(day)} XP`;
        this.els.panelProgressText.textContent = progress.total
            ? `${progress.done} of ${progress.total} quests done`
            : "No quests yet";

        this.els.motivationInput.value = day.motivation || "";
        this.els.motivationInput.disabled = !canEdit;
        this.els.newTaskInput.disabled = !canEdit;
        this.els.newTaskPriority.disabled = !canEdit;
        this.els.addTaskBtn.disabled = !canEdit;
        this.els.btnWon.disabled = !canProgress || !allDone;
        this.els.btnMissed.disabled = !canProgress;
        this.els.btnWon.classList.toggle("active", day.status === "won");
        this.els.btnMissed.classList.toggle("active", day.status === "missed");
        this.els.lockNote.hidden = !this.isPastDate(this.selectedDate);

        this.renderTasks(day, canEdit, canProgress);
    }

    renderTasks(day, canEdit, canProgress) {
        this.els.panelTaskList.innerHTML = "";

        if (!day.tasks.length) {
            const empty = document.createElement("div");
            empty.className = "task-empty";
            empty.textContent = canEdit ? "Add the first quest for this day." : "No quests were recorded.";
            this.els.panelTaskList.appendChild(empty);
            return;
        }

        day.tasks.forEach((task) => {
            const item = document.createElement("div");
            item.className = `task-item${task.done ? " done" : ""}`;

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "task-check";
            checkbox.checked = task.done;
            checkbox.disabled = !canProgress;
            checkbox.addEventListener("change", () => this.toggleTask(task.id, checkbox.checked));

            const body = document.createElement("div");
            const title = document.createElement("div");
            title.className = "task-title";
            title.textContent = task.text;

            const meta = document.createElement("div");
            meta.className = "task-meta";

            const priority = document.createElement("span");
            priority.className = "task-pill";
            priority.textContent = PRIORITY_LABELS[task.priority] || "Core";

            const xp = document.createElement("span");
            xp.className = "task-pill";
            xp.textContent = `${this.taskXp(task)} XP`;

            meta.append(priority, xp);
            body.append(title, meta);

            const remove = document.createElement("button");
            remove.className = "delete-task";
            remove.type = "button";
            remove.disabled = !canEdit;
            remove.setAttribute("aria-label", `Delete ${task.text}`);
            remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path><path d="M6 7l1 14h10l1-14"></path><path d="M9 7V4h6v3"></path></svg>';
            remove.addEventListener("click", () => this.deleteTask(task.id));

            item.append(checkbox, body, remove);
            this.els.panelTaskList.appendChild(item);
        });
    }

    renderStats() {
        const stats = this.calculateStats();
        this.els.completionMetric.textContent = `${stats.completion}%`;
        this.els.completionSubtext.textContent = `${stats.wins} wins this year`;
        this.els.todayXpMetric.textContent = String(stats.todayXp);
        this.els.todayXpSubtext.textContent = stats.todayXp > 0 ? "Scored today" : "Finish quests to score";
        this.els.perfectDaysMetric.textContent = String(stats.perfectDays);
        this.els.perfectDaysSubtext.textContent = `${stats.doneTasks} quests completed`;
        this.els.lockRuleMetric.textContent = "On";
        this.els.levelNumber.textContent = String(stats.level);
        this.els.xpLabel.textContent = `${stats.xpIntoLevel} / 500 XP`;
        this.els.xpFill.style.width = `${Math.round((stats.xpIntoLevel / 500) * 100)}%`;
        this.els.streakCount.textContent = String(stats.streak);
        this.els.bestStreakCount.textContent = String(stats.bestStreak);
    }

    renderWeek() {
        this.els.weekStrip.innerHTML = "";
        const today = parseDateKey(this.todayKey);

        for (let offset = 6; offset >= 0; offset -= 1) {
            const date = addDays(today, -offset);
            const dateKey = toDateKey(date);
            const day = this.getDay(dateKey, false);
            const progress = this.dayProgress(day);
            const card = document.createElement("div");
            card.className = "week-day";

            const label = document.createElement("strong");
            label.textContent = date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });

            const bar = document.createElement("div");
            bar.className = "mini-bar";
            const fill = document.createElement("span");
            fill.style.width = `${progress.pct}%`;
            bar.appendChild(fill);

            const text = document.createElement("p");
            text.textContent = this.isValidWin(day)
                ? "Won"
                : day && day.status === "missed"
                    ? "Missed"
                    : `${progress.done}/${progress.total} done`;

            card.append(label, bar, text);
            card.addEventListener("click", () => this.selectDate(dateKey));
            this.els.weekStrip.appendChild(card);
        }
    }

    renderBadges() {
        const stats = this.calculateStats();
        const badges = [
            { title: "First Strike", desc: "Complete 1 quest", unlocked: stats.doneTasks >= 1 },
            { title: "Clean Win", desc: "Seal 1 perfect day", unlocked: stats.perfectDays >= 1 },
            { title: "Chain Seven", desc: "Reach a 7 day streak", unlocked: stats.bestStreak >= 7 },
            { title: "Tasksmith", desc: "Complete 30 quests", unlocked: stats.doneTasks >= 30 },
            { title: "Deep Work", desc: "Complete a Boss quest", unlocked: this.hasCompletedBossQuest() },
            { title: "Seasoned", desc: "Seal 10 perfect days", unlocked: stats.perfectDays >= 10 }
        ];

        this.els.badgeGrid.innerHTML = "";
        badges.forEach((badge) => {
            const node = document.createElement("div");
            node.className = `badge${badge.unlocked ? " unlocked" : ""}`;

            const title = document.createElement("strong");
            title.textContent = badge.title;
            const desc = document.createElement("p");
            desc.textContent = badge.desc;

            node.append(title, desc);
            this.els.badgeGrid.appendChild(node);
        });
    }

    renderQuote() {
        if (!this.els.quoteText) return;
        const idx = Math.floor((Date.now() / 86400000)) % WIN_QUOTES.length;
        const q = WIN_QUOTES[idx];
        const iconIdx = idx % QUOTE_ICONS.length;
        this.els.quoteText.textContent = q.text;
        this.els.quoteAuthor.textContent = `— ${q.author}`;
        const iconEl = this.els.quoteBanner?.querySelector('.quote-icon');
        if (iconEl) iconEl.textContent = QUOTE_ICONS[iconIdx];
    }

    renderBarChart() {
        if (!this.els.weeklyBarChart) return;
        this.els.weeklyBarChart.innerHTML = '';
        const today = parseDateKey(this.todayKey);
        for (let i = 6; i >= 0; i--) {
            const date = addDays(today, -i);
            const dateKey = toDateKey(date);
            const day = this.getDay(dateKey, false);
            const progress = this.dayProgress(day);
            const col = document.createElement('div');
            col.className = 'bar-col';
            const bar = document.createElement('div');
            bar.className = 'bar-fill';
            bar.style.height = `${progress.pct}%`;
            if (progress.pct >= 100) bar.classList.add('bar-perfect');
            else if (progress.pct >= 50) bar.classList.add('bar-good');
            const pct = document.createElement('span');
            pct.className = 'bar-pct';
            pct.textContent = `${progress.pct}%`;
            const label = document.createElement('span');
            label.className = 'bar-label';
            label.textContent = date.toLocaleDateString('en-US', { weekday: 'short' });
            const count = document.createElement('span');
            count.className = 'bar-count';
            count.textContent = `${progress.done}/${progress.total}`;
            col.append(pct, bar, label, count);
            col.addEventListener('click', () => this.selectDate(dateKey));
            this.els.weeklyBarChart.appendChild(col);
        }
    }

    renderQuestRanking() {
        if (!this.els.questRanking) return;
        const questMap = {};
        Object.values(this.data).forEach(day => {
            day.tasks.forEach(task => {
                const key = task.text.toLowerCase().trim();
                if (!questMap[key]) questMap[key] = { text: task.text, done: 0, total: 0, priority: task.priority };
                questMap[key].total++;
                if (task.done) questMap[key].done++;
            });
        });
        const sorted = Object.values(questMap)
            .filter(q => q.total >= 1)
            .sort((a, b) => (b.done / b.total) - (a.done / a.total))
            .slice(0, 6);
        if (!sorted.length) {
            this.els.questRanking.innerHTML = '<p class="rank-empty">Complete quests to see your ranking</p>';
            return;
        }
        this.els.questRanking.innerHTML = '';
        sorted.forEach((q, i) => {
            const pct = Math.round((q.done / q.total) * 100);
            const row = document.createElement('div');
            row.className = 'rank-row';
            row.innerHTML = `
                <span class="rank-num">${i + 1}</span>
                <div class="rank-info">
                    <strong>${q.text}</strong>
                    <div class="rank-bar-track"><div class="rank-bar-fill" style="width:${pct}%"></div></div>
                </div>
                <span class="rank-pct">${pct}%</span>
            `;
            this.els.questRanking.appendChild(row);
        });
    }

    hasCompletedBossQuest() {
        return Object.values(this.data).some((day) => (
            day.tasks.some((task) => task.priority === "high" && task.done)
        ));
    }

    addTask() {
        if (!this.canEditDate(this.selectedDate)) {
            this.toast("Past days are locked.", "warn");
            return;
        }

        const text = this.els.newTaskInput.value.trim();
        if (!text) {
            this.toast("Name the quest first.", "warn");
            return;
        }

        const day = this.touchDay(this.selectedDate);
        day.tasks.push({
            id: uid(),
            text,
            priority: this.els.newTaskPriority.value,
            done: false,
            createdAt: new Date().toISOString(),
            completedAt: null
        });
        if (this.isFutureDate(this.selectedDate)) {
            day.status = "neutral";
        }
        this.els.newTaskInput.value = "";
        this.persistDate(this.selectedDate);
        this.renderAll();
        this.els.newTaskInput.focus();
        const p = this.els.newTaskPriority.value;
        const addMsgs = {
            high: "⚔️ Boss quest accepted! Big XP incoming.",
            medium: "🎯 Core quest locked in.",
            low: "✅ Small quest added. Every bit counts!"
        };
        this.toast(addMsgs[p] || "Quest added!");
    }

    toggleTask(taskId, done) {
        if (!this.canProgressDate(this.selectedDate)) {
            this.toast("Only today can score progress.", "warn");
            this.renderPanel();
            return;
        }

        const day = this.touchDay(this.selectedDate);
        const task = day.tasks.find((item) => item.id === taskId);
        if (!task) {
            return;
        }

        task.done = done;
        task.completedAt = done ? new Date().toISOString() : null;

        if (done) {
            this.combo += 1;
            clearTimeout(this.comboTimer);
            this.comboTimer = setTimeout(() => { this.combo = 0; }, 6000);
            const xp = this.taskXp(task);
            this.spawnXpFloat(xp);
            this.spawnBurst();
            if (this.combo >= 3) {
                this.toast(`🔥 COMBO x${this.combo}! Keep going!`, "combo");
            }
        }

        const progress = this.dayProgress(day);
        if (progress.total > 0 && progress.done === progress.total) {
            day.status = "won";
            this.flashScreen("win");
            this.spawnConfetti();
            this.toast("🏆 PERFECT DAY! All quests complete!", "win");
        } else if (day.status === "won") {
            day.status = "neutral";
        }

        this.persistDate(this.selectedDate);
        this.renderAll();
        this.checkLevelUp();
    }

    deleteTask(taskId) {
        if (!this.canEditDate(this.selectedDate)) {
            this.toast("Past days are locked.", "warn");
            return;
        }

        const day = this.touchDay(this.selectedDate);
        day.tasks = day.tasks.filter((task) => task.id !== taskId);
        const progress = this.dayProgress(day);
        if (progress.total === 0 || progress.done < progress.total) {
            day.status = day.status === "won" ? "neutral" : day.status;
        }
        this.persistDate(this.selectedDate);
        this.renderAll();
    }

    saveMotivation() {
        if (!this.canEditDate(this.selectedDate)) {
            this.renderPanel();
            return;
        }

        const day = this.touchDay(this.selectedDate);
        day.motivation = this.els.motivationInput.value.trim();
        this.persistDate(this.selectedDate);
        this.renderGrid();
    }

    setStatus(status) {
        if (!this.canProgressDate(this.selectedDate)) {
            this.toast(this.isFutureDate(this.selectedDate) ? "Future days can be planned, not scored." : "Past days are locked.", "warn");
            return;
        }

        const day = this.touchDay(this.selectedDate);
        const progress = this.dayProgress(day);

        if (status === "won" && (progress.total === 0 || progress.done !== progress.total)) {
            this.toast("Complete every quest before claiming the win.", "warn");
            return;
        }

        day.status = day.status === status ? "neutral" : status;
        this.persistDate(this.selectedDate);
        this.renderAll();
    }

    persistDate(dateKey) {
        this.saveLocalData();

        if (!this.hasCloudApi()) {
            this.setSyncState("Saved on this device");
            return;
        }

        clearTimeout(this.syncTimer);
        this.syncTimer = setTimeout(() => {
            this.pushDate(dateKey);
        }, 250);
    }

    async pushDate(dateKey) {
        const day = this.getDay(dateKey, false);
        if (!day || !this.hasCloudApi()) {
            return;
        }

        this.setSyncState("Syncing...");

        try {
            const response = await this.apiFetch(`/api/days/${dateKey}`, {
                method: "PUT",
                body: JSON.stringify({ day })
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                if (response.status === 423 || response.status === 409) {
                    this.toast(payload.error || "That day cannot be changed.", "warn");
                    await this.syncFromCloud({ quiet: true });
                    this.renderAll();
                    return;
                }
                throw new Error(payload.error || `Sync failed (${response.status})`);
            }

            const payload = await response.json();
            if (payload.day) {
                this.data[dateKey] = this.normalizeDay(dateKey, payload.day);
                this.saveLocalData();
            }
            this.setSyncState(`Synced to ${payload.store || "cloud"}`);
        } catch (error) {
            this.setSyncState("Cloud sync paused");
            this.toast("Saved locally. Cloud sync will retry when the API is ready.", "error");
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
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || `Sync failed (${response.status})`);
            }
            const payload = await response.json();
            this.data = this.mergeDayMaps(this.data, payload.days || {});
            this.saveLocalData();
            this.setSyncState(`Synced to ${payload.primaryStore || "cloud"}`);
            if (!quiet) {
                this.toast("Sync complete.");
            }
            this.renderAll();
        } catch (error) {
            this.setSyncState("Cloud sync unavailable");
            if (!quiet) {
                this.toast("Cloud sync unavailable. Check Render API settings.", "error");
            }
        }
    }

    async apiFetch(path, options = {}) {
        const base = this.config.apiBaseUrl.replace(/\/$/, "");
        const headers = {
            "Content-Type": "application/json",
            "X-Client-Date": this.todayKey,
            "X-Client-Timezone": this.config.appTimezone || "UTC",
            ...(options.headers || {})
        };

        if (this.firebaseReady && this.firebaseAuth && this.firebaseAuth.currentUser) {
            const token = await this.firebaseAuth.currentUser.getIdToken();
            headers.Authorization = `Bearer ${token}`;
        } else {
            headers["X-Demo-User"] = this.currentUser.uid;
        }

        return fetch(`${base}${path}`, { ...options, headers });
    }

    async handleAuthClick() {
        if (this.firebaseReady && this.firebaseAuth && this.firebaseAuth.currentUser) {
            await signOut(this.firebaseAuth);
            this.toast("Signed out.");
            return;
        }

        if (!this.firebaseReady || !this.firebaseAuth) {
            this.toast("Add Firebase config to enable sign in.", "warn");
            return;
        }

        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(this.firebaseAuth, provider);
            this.toast("Signed in.");
        } catch (error) {
            this.toast("Sign in was not completed.", "error");
        }
    }

    updateAuthUi() {
        const name = this.currentUser.displayName || "Local player";
        this.els.userName.textContent = name;
        this.els.userAvatar.textContent = this.initials(name);
        const signedIn = this.firebaseReady && this.firebaseAuth && this.firebaseAuth.currentUser;
        this.els.authButton.textContent = signedIn ? "Sign out" : "Sign in";
    }

    setSyncState(message) {
        this.els.syncState.textContent = message;
    }

    initials(name) {
        return name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0].toUpperCase())
            .join("") || "DF";
    }

    toast(message, tone = "info") {
        const node = document.createElement("div");
        node.className = `toast ${tone}`;
        node.textContent = message;
        node.style.animation = 'toastIn 0.4s cubic-bezier(0.22,1,0.36,1) both';
        this.els.toastStack.appendChild(node);
        setTimeout(() => {
            node.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => node.remove(), 300);
        }, 3600);
    }

    spawnBurst() {
        const colors = ['#00e5a0', '#8b5cf6', '#6366f1', '#f59e0b', '#22c55e'];
        for (let i = 0; i < 8; i++) {
            const dot = document.createElement('div');
            dot.className = 'game-particle';
            const angle = (i / 8) * 360;
            const dist = 30 + Math.random() * 40;
            dot.style.cssText = `
                position:fixed; top:50%; left:50%; width:5px; height:5px;
                border-radius:50%; pointer-events:none; z-index:9999;
                background:${colors[i % colors.length]};
                box-shadow: 0 0 6px ${colors[i % colors.length]};
                animation: particleFly 0.7s cubic-bezier(0.22,1,0.36,1) forwards;
                --angle:${angle}deg; --dist:${dist}px;
            `;
            document.body.appendChild(dot);
            setTimeout(() => dot.remove(), 700);
        }
    }

    spawnXpFloat(xp) {
        const el = document.createElement('div');
        el.className = 'xp-float';
        el.textContent = `+${xp} XP`;
        el.style.cssText = `
            position:fixed; top:45%; left:50%; transform:translateX(-50%);
            font-family:Inter,sans-serif; font-size:24px; font-weight:900;
            color:#00e5a0; text-shadow:0 0 16px rgba(0,229,160,0.5);
            pointer-events:none; z-index:9999;
            animation: xpFloat 1.2s cubic-bezier(0.22,1,0.36,1) forwards;
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1200);
    }

    flashScreen(type) {
        const overlay = document.createElement('div');
        const color = type === 'win' ? 'rgba(0,229,160,0.08)' : 'rgba(239,68,68,0.06)';
        overlay.style.cssText = `
            position:fixed; inset:0; z-index:9998; pointer-events:none;
            background:${color}; animation: screenFlash 0.6s ease forwards;
        `;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 600);
    }

    spawnConfetti() {
        const colors = ['#00e5a0','#8b5cf6','#f59e0b','#6366f1','#22c55e','#ef4444','#06b6d4'];
        for (let i = 0; i < 30; i++) {
            const piece = document.createElement('div');
            const x = 30 + Math.random() * 40;
            const delay = Math.random() * 0.4;
            piece.style.cssText = `
                position:fixed; top:-10px; left:${x}%; z-index:9999;
                width:${4 + Math.random()*6}px; height:${4 + Math.random()*6}px;
                background:${colors[i % colors.length]};
                border-radius:${Math.random()>0.5?'50%':'2px'};
                pointer-events:none; opacity:0.9;
                animation: confettiFall ${1.5+Math.random()}s ease ${delay}s forwards;
            `;
            document.body.appendChild(piece);
            setTimeout(() => piece.remove(), 2500);
        }
    }

    checkLevelUp() {
        const stats = this.calculateStats();
        if (stats.level > this.lastLevel) {
            this.lastLevel = stats.level;
            this.showLevelUp(stats.level);
        }
    }

    showLevelUp(level) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position:fixed; inset:0; z-index:10000;
            display:grid; place-items:center;
            background:rgba(5,8,17,0.85); backdrop-filter:blur(20px);
            animation: fadeIn 0.3s ease;
        `;
        overlay.innerHTML = `
            <div style="text-align:center; animation:levelPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both;">
                <div style="font-size:64px; margin-bottom:12px; filter:drop-shadow(0 0 20px rgba(0,229,160,0.5));">⚡</div>
                <h2 style="font-family:Inter,sans-serif; font-size:28px; font-weight:900;
                    letter-spacing:0.1em; margin:0 0 8px;
                    background:linear-gradient(135deg,#fff,#00e5a0,#8b5cf6);
                    -webkit-background-clip:text; -webkit-text-fill-color:transparent;">LEVEL UP!</h2>
                <p style="color:#7a8599; font-size:18px; font-weight:700; margin:0 0 24px;">Level ${level}</p>
                <button onclick="this.closest('div').parentElement.remove()" style="
                    padding:12px 32px; border:1px solid rgba(0,229,160,0.3); border-radius:10px;
                    background:linear-gradient(135deg,rgba(0,229,160,0.1),rgba(139,92,246,0.1));
                    color:#fff; font-weight:800; font-size:13px; cursor:pointer;
                ">CONTINUE</button>
            </div>
        `;
        document.body.appendChild(overlay);
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 8000);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.dayForge = new DayForgeApp();
});
