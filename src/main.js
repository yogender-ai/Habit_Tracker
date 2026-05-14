const STORAGE_KEY = "lumina_habit_tracker_v1";

const navItems = [
    ["dashboard", "Dashboard", "⌂"],
    ["today", "Today", "□"],
    ["habits", "My Habits", "◇"],
    ["goals", "Goals", "△"],
    ["calendar", "Calendar", "▦"],
    ["analytics", "Analytics", "⌁"],
    ["coach", "AI Coach", "♙"],
    ["journal", "Journal", "▤"],
    ["rewards", "Rewards", "♢"],
    ["settings", "Settings", "⚙"]
];

const habitSeed = [
    { id: "meditate", icon: "leaf", title: "Morning Meditation", description: "Calm attention before the day starts.", category: "Mind", frequency: "Daily", reminder: "06:30 AM", target: 30, streak: 16 },
    { id: "water", icon: "drop", title: "Drink 2L Water", description: "Hydrate for energy and skin health.", category: "Wellness", frequency: "Daily", reminder: "Every 2 hours", target: 30, streak: 8 },
    { id: "deep-work", icon: "bolt", title: "Deep Work Session", description: "Protect focused output from distractions.", category: "Productivity", frequency: "Mon-Fri", reminder: "10:00 AM", target: 22, streak: 12 },
    { id: "read", icon: "book", title: "Read 20 Pages", description: "Build knowledge with a quiet reading block.", category: "Growth", frequency: "Daily", reminder: "09:00 PM", target: 25, streak: 7 },
    { id: "workout", icon: "spark", title: "Strength Training", description: "Move your body and build confidence.", category: "Wellness", frequency: "4x weekly", reminder: "06:00 PM", target: 18, streak: 5 },
    { id: "sleep", icon: "moon", title: "Sleep 7+ Hours", description: "Recover deeply and protect tomorrow.", category: "Wellness", frequency: "Daily", reminder: "10:30 PM", target: 30, streak: 21 },
    { id: "study", icon: "book", title: "Study 2 Hours", description: "Invest in your future self.", category: "Growth", frequency: "Daily", reminder: "08:00 AM", target: 29, streak: 12 }
];

const goalSeed = [
    { id: "health", title: "Become healthier", category: "Wellness", deadline: "2026-08-30", progress: 68, habits: ["meditate", "water", "workout", "sleep"], milestones: ["Consistent hydration", "Four workouts weekly", "Sleep before 11 PM"] },
    { id: "focus", title: "Improve focus", category: "Productivity", deadline: "2026-07-20", progress: 74, habits: ["deep-work", "meditate"], milestones: ["Morning planning", "90 minute focus block", "No phone desk rule"] },
    { id: "programmer", title: "Become better programmer", category: "Growth", deadline: "2026-10-10", progress: 52, habits: ["study", "deep-work", "read"], milestones: ["Solve 100 problems", "Build one project", "Ship portfolio update"] },
    { id: "sleep-goal", title: "Sleep better", category: "Wellness", deadline: "2026-06-30", progress: 81, habits: ["sleep", "read"], milestones: ["Screen off by 10 PM", "Evening wind-down", "Track energy daily"] }
];

const rewardsSeed = [
    ["first-week", "First Week Glow", "Complete 7 habit days.", true],
    ["focus-hero", "Focus Hero", "Finish 20 deep work sessions.", true],
    ["hydration-star", "Hydration Star", "Drink water for 14 days.", true],
    ["moon-master", "Moon Master", "Sleep well for 21 days.", false],
    ["growth-gem", "Growth Gem", "Study for 50 hours.", false],
    ["discipline-elite", "Discipline Elite", "Reach 90 discipline score.", false]
].map(([id, title, desc, unlocked]) => ({ id, title, desc, unlocked }));

const aiInsights = [
    "Your morning routine is driving most of your consistency. Keep it protected.",
    "Deep work performs best before noon. Schedule hard tasks before messages.",
    "Sleep quality dips when evening routines are skipped. Add a softer shutdown cue.",
    "You are more consistent on weekdays. Weekend planning is the growth opportunity."
];

function todayKey() {
    const d = new Date();
    return toDateKey(d);
}

function toDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date, amount) {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return {
                ...defaultState(),
                ...parsed,
                habits: Array.isArray(parsed.habits) ? parsed.habits : habitSeed,
                goals: Array.isArray(parsed.goals) ? parsed.goals : goalSeed,
                rewards: Array.isArray(parsed.rewards) ? parsed.rewards : rewardsSeed,
                completions: parsed.completions || {},
                journal: parsed.journal || {}
            };
        } catch {
            return defaultState();
        }
    }
    return defaultState();
}

function defaultState() {
    const completions = {};
    const today = new Date();
    for (let i = 0; i < 30; i += 1) {
        const key = toDateKey(addDays(today, -i));
        completions[key] = {};
        habitSeed.forEach((habit, index) => {
            const wave = (i + index) % 7;
            completions[key][habit.id] = wave < 5 || (i < 2 && index < 4);
        });
    }
    return {
        page: "dashboard",
        theme: "light",
        selectedDate: todayKey(),
        habits: habitSeed,
        goals: goalSeed,
        rewards: rewardsSeed,
        completions,
        journal: {},
        settings: {
            reminders: true,
            weeklyReview: true,
            softAnimations: true,
            compactCalendar: false
        },
        categories: ["Wellness", "Mind", "Growth", "Productivity"]
    };
}

let state = readState();

const els = {
    shell: document.getElementById("appShell"),
    loading: document.getElementById("loadingScreen"),
    nav: document.getElementById("navList"),
    content: document.getElementById("pageContent"),
    title: document.getElementById("pageTitle"),
    subtitle: document.getElementById("pageSubtitle"),
    themeToggle: document.getElementById("themeToggle"),
    modal: document.getElementById("modalRoot"),
    toast: document.getElementById("toastStack"),
    confetti: document.getElementById("confettiLayer")
};

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function completedFor(dateKey = todayKey()) {
    return state.completions[dateKey] || {};
}

function completionStats(dateKey = todayKey()) {
    const map = completedFor(dateKey);
    const total = state.habits.length || 1;
    const done = state.habits.filter((habit) => map[habit.id]).length;
    return { done, total, pct: Math.round((done / total) * 100) };
}

function monthlyStats() {
    const today = new Date();
    const keys = Array.from({ length: 30 }, (_, index) => toDateKey(addDays(today, -29 + index)));
    return keys.map((key, index) => ({ name: String(index + 1), value: completionStats(key).pct, key }));
}

function streak() {
    let run = 0;
    for (let i = 0; i < 365; i += 1) {
        const key = toDateKey(addDays(new Date(), -i));
        if (completionStats(key).pct >= 70) run += 1;
        else break;
    }
    return run;
}

function disciplineScore() {
    const data = monthlyStats();
    return Math.round(data.reduce((sum, item) => sum + item.value, 0) / data.length + Math.min(streak(), 20) * 0.55);
}

function categoryCount(category) {
    return state.habits.filter((habit) => category === "All" || habit.category === category).length;
}

function iconClass(name) {
    return `habit-icon ${name || "spark"}`;
}

function pageMeta() {
    const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const map = {
        dashboard: ["Good morning, June ✨", "Small actions. Remarkable life."],
        today: ["Today", `${date}. Your day, your flow.`],
        habits: ["My Habits", "Build the life you envision, one habit at a time."],
        goals: ["Goals", "Connect daily behavior to the person you are becoming."],
        calendar: ["Calendar", "Track your daily progress and build lasting rhythm."],
        analytics: ["Analytics", "Deep insights into your habits, growth, and potential."],
        coach: ["AI Coach ✨", "Your personal guide to becoming your best self."],
        journal: ["Journal", "Reflect, learn, and make tomorrow easier."],
        rewards: ["Rewards", "Celebrate proof, streaks, badges, and progress."],
        settings: ["Settings", "Customize Lumina around your routine."]
    };
    return map[state.page] || map.dashboard;
}

function render() {
    document.body.dataset.theme = state.theme;
    renderNav();
    const [title, subtitle] = pageMeta();
    els.title.textContent = title;
    els.subtitle.textContent = subtitle;
    els.themeToggle.textContent = state.theme === "dark" ? "☀" : "☾";
    const pages = {
        dashboard: renderDashboard,
        today: renderToday,
        habits: renderHabits,
        goals: renderGoals,
        calendar: renderCalendar,
        analytics: renderAnalytics,
        coach: renderCoach,
        journal: renderJournal,
        rewards: renderRewards,
        settings: renderSettings
    };
    els.content.innerHTML = `<div class="page-motion">${(pages[state.page] || renderDashboard)()}</div>`;
    bindPageEvents();
}

function renderNav() {
    els.nav.innerHTML = navItems.map(([id, label, icon]) => `
        <button class="nav-item ${state.page === id ? "active" : ""}" data-page="${id}" type="button">
            <span>${icon}</span>
            ${label}
        </button>
    `).join("");
}

function progressRing(pct, size = "large", label = "Completed") {
    return `
        <div class="progress-ring ${size}" style="--value:${pct}">
            <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle class="ring-bg" cx="60" cy="60" r="50"></circle>
                <circle class="ring-fg" cx="60" cy="60" r="50"></circle>
            </svg>
            <div class="ring-center">
                <strong>${pct}%</strong>
                <span>${label}</span>
            </div>
        </div>
    `;
}

function miniBars(data, tone = "violet") {
    const max = Math.max(...data.map((item) => item.value), 100);
    return `
        <div class="mini-bars ${tone}">
            ${data.map((item) => `<span style="height:${Math.max(10, (item.value / max) * 100)}%" title="${item.name}: ${item.value}%"></span>`).join("")}
        </div>
    `;
}

function lineChart(data, tone = "violet") {
    const points = data.map((item, index) => {
        const x = (index / Math.max(1, data.length - 1)) * 100;
        const y = 88 - item.value * 0.72;
        return `${x},${y}`;
    }).join(" ");
    return `
        <svg class="line-chart ${tone}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
                <linearGradient id="lineFill-${tone}" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="currentColor" stop-opacity="0.26"/>
                    <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
                </linearGradient>
            </defs>
            <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"></polyline>
            <polygon points="0,100 ${points} 100,100" fill="url(#lineFill-${tone})"></polygon>
        </svg>
    `;
}

function heatmap(days = 35) {
    const today = new Date();
    return `
        <div class="heatmap">
            ${Array.from({ length: days }, (_, index) => {
                const key = toDateKey(addDays(today, index - days + 1));
                const pct = completionStats(key).pct;
                const level = pct >= 85 ? 4 : pct >= 60 ? 3 : pct >= 30 ? 2 : pct > 0 ? 1 : 0;
                return `<button class="heat-cell l${level}" data-date="${key}" title="${key}: ${pct}%" type="button"></button>`;
            }).join("")}
        </div>
    `;
}

function todayHabitRows(limit = state.habits.length) {
    const map = completedFor(todayKey());
    return state.habits.slice(0, limit).map((habit) => `
        <label class="habit-row" data-habit-row="${habit.id}">
            <span class="${iconClass(habit.icon)}"></span>
            <span>
                <strong>${escapeHtml(habit.title)}</strong>
                <em>${escapeHtml(habit.category)}</em>
            </span>
            <small>${escapeHtml(habit.reminder)}</small>
            <input type="checkbox" data-complete="${habit.id}" ${map[habit.id] ? "checked" : ""}>
        </label>
    `).join("");
}

function renderDashboard() {
    const stats = completionStats();
    const weekly = Array.from({ length: 7 }, (_, i) => {
        const key = toDateKey(addDays(new Date(), i - 6));
        return { name: ["M", "T", "W", "T", "F", "S", "S"][i], value: completionStats(key).pct };
    });
    return `
        <section class="dashboard-grid">
            <article class="glass-card mission-card">
                <div class="card-title">
                    <span class="gold">✦</span>
                    <h2>Today's Mission</h2>
                    <button class="ghost-dots" type="button">...</button>
                </div>
                <div class="mission-body">
                    ${progressRing(stats.pct)}
                    <div class="mission-stats">
                        <div><strong>${streak()}</strong><span>Day Streak</span><small>Keep it glowing</small></div>
                        <div><strong>${disciplineScore()}</strong><span>Discipline Score</span><small>+12 pts from yesterday</small></div>
                        <div><strong>${stats.done} / ${stats.total}</strong><span>Habits Completed</span><small>Today</small></div>
                    </div>
                </div>
            </article>

            <article class="glass-card flow-card">
                <div class="card-title">
                    <h2>Your Day, Your Flow</h2>
                    <button class="pill-btn" type="button">Edit Routine</button>
                </div>
                <div class="timeline">
                    <div><b>Morning</b><span>6 habits</span></div>
                    <div><b>Afternoon</b><span>4 habits</span></div>
                    <div><b>Evening</b><span>3 habits</span></div>
                </div>
                <div class="routine-grid">
                    ${routineItem("Meditate", "15 min", "leaf")}
                    ${routineItem("Deep Work", "50 min", "bolt")}
                    ${routineItem("Read", "20 min", "book")}
                    ${routineItem("Drink Water", "2.0 L", "drop")}
                    ${routineItem("Walk Outside", "20 min", "spark")}
                    ${routineItem("Reflect", "10 min", "moon")}
                </div>
            </article>

            <article class="glass-card coach-card compact">
                <div class="card-title"><h2>AI Coach</h2><button class="ghost-dots">...</button></div>
                <div class="coach-orb">⌣</div>
                <strong>You're building incredible momentum.</strong>
                <p>Focus on consistency over perfection today.</p>
                <button class="btn soft" data-page-jump="coach" type="button">See Suggestions</button>
            </article>

            <article class="glass-card habits-card">
                <div class="card-title">
                    <h2>Today's Habits</h2>
                    <span class="soft-pill">${stats.done} / ${stats.total} completed</span>
                </div>
                <div class="habit-list">${todayHabitRows(6)}</div>
            </article>

            <article class="glass-card focus-card">
                <div class="card-title"><h2>Focus Timer</h2><span class="soft-pill">Pomodoro</span></div>
                ${progressRing(72, "medium", "Focus Time")}
                <div class="timer-text">25:00</div>
                <button class="round-play" type="button">▶</button>
            </article>

            <article class="glass-card hydration-card">
                <div class="card-title"><h2>Hydration</h2><span>2.0 / 2.5 L</span></div>
                ${progressRing(80, "small", "Great job")}
            </article>

            <article class="glass-card chart-card">
                <div class="card-title"><h2>Weekly Progress</h2><span class="soft-pill">Live</span></div>
                ${miniBars(weekly)}
            </article>

            <article class="glass-card heat-card">
                <div class="card-title"><h2>Habit Calendar</h2><span class="soft-pill">Mini heatmap</span></div>
                ${heatmap(42)}
            </article>

            <article class="glass-card quote-card">
                <blockquote>You don't have to be great to start, but you have to start to be great.</blockquote>
                <span>Zig Ziglar</span>
                <div class="quote-gem">◇</div>
            </article>

            <article class="glass-card ai-banner">
                <div>
                    <h2>AI Suggestion</h2>
                    <p>You've been crushing your goals. Add a 10-minute evening stretch to improve recovery and sleep quality.</p>
                </div>
                <button class="btn soft" type="button">Add to Today</button>
            </article>
        </section>
    `;
}

function routineItem(title, time, icon) {
    return `<div class="routine-item"><span class="${iconClass(icon)}"></span><strong>${title}</strong><em>${time}</em></div>`;
}

function renderToday() {
    const stats = completionStats();
    return `
        <section class="two-col">
            <article class="glass-card hero-today">
                <div>
                    <span class="kicker">Today's Mission</span>
                    <h2>Move through the day with calm precision.</h2>
                    <p>Plan the important things first, then let the checklist carry you.</p>
                </div>
                ${progressRing(stats.pct)}
            </article>

            <article class="glass-card">
                <div class="card-title"><h2>Motivational Quote</h2><span class="gold">✦</span></div>
                <blockquote class="big-quote">Small habits, remarkable life.</blockquote>
                <p class="muted">Consistency today, transformation tomorrow.</p>
            </article>
        </section>

        <section class="content-grid">
            <article class="glass-card wide">
                <div class="card-title"><h2>Routine Flow Timeline</h2><button class="pill-btn">Edit Routine</button></div>
                <div class="flow-line">
                    <div><span></span><strong>Morning</strong><small>Meditate, water, plan</small></div>
                    <div><span></span><strong>Afternoon</strong><small>Deep work, walk</small></div>
                    <div><span></span><strong>Evening</strong><small>Read, reflect, sleep</small></div>
                </div>
            </article>
            <article class="glass-card wide">
                <div class="card-title"><h2>Habit Checklist</h2><span class="soft-pill">${stats.done} of ${stats.total}</span></div>
                <div class="habit-list">${todayHabitRows()}</div>
            </article>
            <article class="glass-card">${pomodoroUi()}</article>
            <article class="glass-card">
                <div class="card-title"><h2>Hydration Tracker</h2><span>80%</span></div>
                ${progressRing(80, "small", "2.0 L")}
                <div class="stepper-row"><button>-</button><strong>2.0 / 2.5 L</strong><button>+</button></div>
            </article>
            <article class="glass-card">
                <div class="card-title"><h2>Mood Check-in</h2><span>How are you?</span></div>
                <div class="mood-row">${["Low", "Meh", "Calm", "Happy", "Tired"].map((m, i) => `<button class="${i === 3 ? "active" : ""}">${m}</button>`).join("")}</div>
                <input class="soft-input" value="Grateful, motivated, optimistic">
            </article>
            <article class="glass-card ai-banner wide">
                <div><h2>AI Suggestion</h2><p>Protect your first focus block. It is your highest leverage window today.</p></div>
                <button class="btn soft">Add focus block</button>
            </article>
        </section>
    `;
}

function pomodoroUi() {
    return `
        <div class="card-title"><h2>Pomodoro Focus</h2><span class="soft-pill">25 min</span></div>
        ${progressRing(64, "medium", "Focus")}
        <div class="timer-text">25:00</div>
        <button class="round-play">▶</button>
    `;
}

function renderHabits() {
    const categories = ["All", ...state.categories];
    const selected = sessionStorage.getItem("lumina_category") || "All";
    const habits = state.habits.filter((habit) => selected === "All" || habit.category === selected);
    const selectedHabit = habits[0] || state.habits[0];
    return `
        <section class="habits-layout">
            <div class="left-stack">
                <div class="category-row">
                    ${categories.map((cat) => `<button class="category-card ${cat === selected ? "active" : ""}" data-category="${cat}"><span>${cat}</span><strong>${categoryCount(cat)} habits</strong></button>`).join("")}
                    <button class="btn primary" data-open-habit-modal>New Habit</button>
                </div>
                <article class="glass-card">
                    <div class="habit-table">
                        ${habits.map((habit) => habitTableRow(habit)).join("")}
                    </div>
                </article>
                <article class="glass-card mountain-card">
                    <strong>Small habits, remarkable life.</strong>
                    <span>Consistency today, transformation tomorrow.</span>
                </article>
            </div>
            <aside class="right-stack">
                ${habitDetail(selectedHabit)}
                <article class="glass-card">
                    <div class="card-title"><h2>Current Streaks</h2><span class="gold">✦</span></div>
                    ${state.habits.slice(0, 4).map((habit) => `<div class="streak-row"><span class="${iconClass(habit.icon)}"></span><strong>${habit.title}</strong><em>${habit.streak} days</em></div>`).join("")}
                </article>
                <article class="glass-card">
                    <div class="card-title"><h2>Weekly Heatmap</h2></div>
                    ${heatmap(49)}
                </article>
            </aside>
        </section>
    `;
}

function habitTableRow(habit) {
    const pct = habitProgress(habit.id);
    return `
        <div class="habit-table-row">
            <span class="${iconClass(habit.icon)}"></span>
            <div><strong>${escapeHtml(habit.title)}</strong><small>${escapeHtml(habit.description)}</small></div>
            <div class="streak-fire"><b>${habit.streak}</b><small>day streak</small></div>
            <span class="soft-pill">${escapeHtml(habit.frequency)}</span>
            ${progressRing(pct, "tiny", "")}
            <div class="row-actions">
                <button data-edit-habit="${habit.id}" title="Edit">✎</button>
                <button data-delete-habit="${habit.id}" title="Delete">×</button>
            </div>
        </div>
    `;
}

function habitProgress(habitId) {
    const keys = Object.keys(state.completions).slice(-30);
    if (!keys.length) return 0;
    const done = keys.filter((key) => state.completions[key]?.[habitId]).length;
    return Math.round((done / keys.length) * 100);
}

function habitDetail(habit) {
    if (!habit) return "";
    const pct = habitProgress(habit.id);
    return `
        <article class="glass-card detail-panel">
            <div class="card-title">
                <h2><span class="${iconClass(habit.icon)}"></span>${escapeHtml(habit.title)}</h2>
                <label class="switch"><input type="checkbox" checked><span></span></label>
            </div>
            <div class="detail-score">
                ${progressRing(pct, "medium", "Completed")}
                <div><strong>${habit.streak}</strong><span>Day streak</span><small>Best: ${habit.streak + 6} days</small></div>
            </div>
            <p>${escapeHtml(habit.description)}</p>
            <div class="weekday-row">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => `<span class="${i < 5 ? "on" : ""}">${d}</span>`).join("")}</div>
            <label class="field-label">Reminder<input class="soft-input" value="${escapeHtml(habit.reminder)}"></label>
            <button class="btn primary" data-complete="${habit.id}">Mark as Done</button>
        </article>
    `;
}

function renderGoals() {
    const filter = sessionStorage.getItem("lumina_goal_filter") || "All";
    const categories = ["All", "Wellness", "Productivity", "Growth"];
    const goals = state.goals.filter((goal) => filter === "All" || goal.category === filter);
    return `
        <section class="goal-page">
            <div class="category-row">
                ${categories.map((cat) => `<button class="category-card ${filter === cat ? "active" : ""}" data-goal-filter="${cat}"><span>${cat}</span><strong>${cat === "All" ? state.goals.length : state.goals.filter((g) => g.category === cat).length} goals</strong></button>`).join("")}
                <button class="btn primary" data-open-goal-modal>Add Goal</button>
            </div>
            <div class="goal-grid">
                ${goals.map((goal) => `
                    <article class="glass-card goal-card">
                        <div class="card-title"><h2>${escapeHtml(goal.title)}</h2><span class="soft-pill">${escapeHtml(goal.category)}</span></div>
                        <div class="progress-bar"><span style="width:${goal.progress}%"></span></div>
                        <div class="goal-meta"><strong>${goal.progress}%</strong><span>Deadline ${escapeHtml(goal.deadline)}</span></div>
                        <h3>Linked habits</h3>
                        <div class="linked-habits">${goal.habits.map((id) => {
                            const habit = state.habits.find((item) => item.id === id);
                            return habit ? `<span>${escapeHtml(habit.title)}</span>` : "";
                        }).join("")}</div>
                        <h3>Milestones</h3>
                        <ul>${goal.milestones.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                    </article>
                `).join("")}
            </div>
        </section>
    `;
}

function renderCalendar() {
    const selected = state.selectedDate || todayKey();
    const monthDate = new Date(selected);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const start = addDays(first, -((first.getDay() + 6) % 7));
    const cells = Array.from({ length: 42 }, (_, index) => addDays(start, index));
    const selectedStats = completionStats(selected);
    return `
        <section class="calendar-layout">
            <div class="calendar-main">
                <div class="glass-card calendar-strip">
                    ${Array.from({ length: 7 }, (_, i) => {
                        const d = addDays(new Date(), i - 3);
                        const key = toDateKey(d);
                        return `<button class="${key === selected ? "active" : ""}" data-select-date="${key}"><span>${d.toLocaleDateString("en-US", { weekday: "short" })}</span><strong>${d.getDate()}</strong><em>${completionStats(key).done}/${state.habits.length}</em></button>`;
                    }).join("")}
                </div>
                <article class="glass-card">
                    <div class="card-title"><h2>${monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2><span class="soft-pill">All Habits</span></div>
                    <div class="month-grid">
                        ${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<b>${d}</b>`).join("")}
                        ${cells.map((date) => {
                            const key = toDateKey(date);
                            const stats = completionStats(key);
                            return `
                                <button class="day-cell ${date.getMonth() !== month ? "muted" : ""} ${key === selected ? "selected" : ""}" data-select-date="${key}">
                                    <span>${date.getDate()}</span>
                                    <div>${state.habits.slice(0, 6).map((habit) => `<i class="${completedFor(key)[habit.id] ? "done" : ""}"></i>`).join("")}</div>
                                    <em>${stats.pct}%</em>
                                </button>
                            `;
                        }).join("")}
                    </div>
                </article>
                <div class="two-col tight">
                    <article class="glass-card"><div class="card-title"><h2>Upcoming Reminders</h2><span>View All</span></div>${state.habits.slice(0, 3).map((h) => `<div class="streak-row"><span class="${iconClass(h.icon)}"></span><strong>${h.title}</strong><em>${h.reminder}</em></div>`).join("")}</article>
                    <article class="glass-card"><div class="card-title"><h2>Consistency is your superpower</h2></div>${miniBars(monthlyStats().slice(-16), "rose")}</article>
                </div>
            </div>
            <aside class="right-stack">
                <article class="glass-card day-detail">
                    <div class="card-title"><h2>${new Date(selected).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h2><button class="pill-btn">Edit Day</button></div>
                    ${progressRing(selectedStats.pct)}
                    <div class="habit-list">${state.habits.map((habit) => {
                        const done = completedFor(selected)[habit.id];
                        return `<label class="habit-row"><span class="${iconClass(habit.icon)}"></span><span><strong>${habit.title}</strong><em>${habit.category}</em></span><input type="checkbox" data-date-complete="${selected}" data-complete="${habit.id}" ${done ? "checked" : ""}></label>`;
                    }).join("")}</div>
                </article>
                <article class="glass-card"><div class="card-title"><h2>This Month</h2></div>${statLine("Completion Rate", "82%")}${statLine("Days Completed", "19 / 30")}${statLine("Longest Streak", `${streak() + 5} days`)}${statLine("Total XP Earned", "2,450")}</article>
                <article class="glass-card trophy-card"><div class="trophy">◇</div><strong>${streak()}</strong><span>Day Streak</span><p>You're on fire.</p></article>
            </aside>
        </section>
    `;
}

function statLine(label, value) {
    return `<div class="stat-line"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderAnalytics() {
    const month = monthlyStats();
    const week = month.slice(-7).map((item, i) => ({ name: `Week ${i + 1}`, value: item.value }));
    return `
        <section class="analytics-grid">
            <article class="glass-card">${progressRing(completionStats().pct, "medium")}<h2>Overall Completion</h2></article>
            ${scoreCard("Discipline Score", disciplineScore(), "Strong")}
            ${scoreCard("Focus Score", 82, "Focused")}
            ${scoreCard("Consistency Score", 73, "Steady")}
            <article class="glass-card chart-wide"><div class="card-title"><h2>Weekly Progress</h2><span>This Month</span></div>${miniBars(week)}</article>
            <article class="glass-card chart-wide"><div class="card-title"><h2>Monthly Progress</h2><span>This Year</span></div>${miniBars(month.slice(0, 12), "gold")}</article>
            <article class="glass-card chart-wide"><div class="card-title"><h2>Streak Trends</h2></div>${lineChart(month, "violet")}</article>
            <article class="glass-card analytics-heat"><div class="card-title"><h2>Habit Completion Heatmap</h2></div>${heatmap(70)}</article>
            <article class="glass-card">${topHabits("Top Performing Habits", true)}</article>
            <article class="glass-card">${topHabits("Needs More Attention", false)}</article>
            <article class="glass-card chart-wide"><div class="card-title"><h2>Mood vs Productivity</h2></div>${lineChart(month.slice(-18), "rose")}</article>
            <article class="glass-card">${donut("Focus Time Distribution", 68)}</article>
            <article class="glass-card radar-card"><div class="card-title"><h2>Discipline Breakdown</h2></div><div class="radar"></div><p>Your strongest area is consistency and planning.</p></article>
            <article class="glass-card"><div class="card-title"><h2>Key Takeaways</h2><span class="gold">✦</span></div><ul class="takeaways"><li>Your morning routine drives 90% of success.</li><li>You are more consistent on days you sleep 7+ hours.</li><li>Weekend planning will unlock the next level.</li></ul></article>
        </section>
    `;
}

function scoreCard(title, score, note) {
    return `<article class="glass-card score-card"><span class="mini-orb"></span><h2>${title}</h2><strong>${score}<small>/100</small></strong><p>${note}</p>${lineChart(monthlyStats().slice(-10), "violet")}</article>`;
}

function topHabits(title, best) {
    const habits = [...state.habits].sort((a, b) => best ? habitProgress(b.id) - habitProgress(a.id) : habitProgress(a.id) - habitProgress(b.id)).slice(0, 5);
    return `<div class="card-title"><h2>${title}</h2></div>${habits.map((habit, index) => `<div class="rank-row"><span>${index + 1}</span><strong>${habit.title}</strong><div class="rank-bar"><i style="width:${habitProgress(habit.id)}%"></i></div><em>${habitProgress(habit.id)}%</em></div>`).join("")}`;
}

function donut(title, pct) {
    return `<div class="card-title"><h2>${title}</h2></div>${progressRing(pct, "medium", "Avg Focus")}<div class="legend-list"><span>Deep Work 45%</span><span>Study 27%</span><span>Planning 15%</span><span>Other 13%</span></div>`;
}

function renderCoach() {
    return `
        <section class="coach-layout">
            <article class="glass-card coach-hero">
                <div>
                    <span class="soft-pill">AI Coach Beta</span>
                    <h2>Hi June, I'm Lumi, your AI Coach</h2>
                    <p>I analyze your habit patterns and progress to help you build a better system every day.</p>
                    <button class="btn primary">Ask Lumi Anything</button>
                </div>
                <div class="coach-orb giant">⌣</div>
            </article>
            <article class="glass-card">
                <div class="card-title"><h2>Smart Recommendations</h2><span>See all</span></div>
                ${aiInsights.map((item, index) => `<div class="recommendation"><span class="${iconClass(["spark", "moon", "bolt", "drop"][index])}"></span><div><strong>${item.split(".")[0]}</strong><p>${item}</p></div><em>${index < 2 ? "High Impact" : "Medium Impact"}</em></div>`).join("")}
            </article>
            <article class="glass-card chat-card">
                <div class="card-title"><h2>Chat with Lumi</h2><button class="ghost-dots">...</button></div>
                <div class="chat-window" id="chatWindow">
                    <div class="chat-bubble coach">Great progress this week. Your habits show strong morning consistency.</div>
                    <div class="chat-bubble user">I want to improve my focus and stop procrastinating.</div>
                    <div class="chat-bubble coach">Let's build a focused plan. Start with one protected block before noon.</div>
                </div>
                <form class="chat-form" id="chatForm"><input placeholder="Ask Lumi anything..."><button class="btn primary">Send</button></form>
            </article>
            <article class="glass-card">${scoreTiles()}</article>
            <article class="glass-card"><div class="card-title"><h2>Habit Weakness Analysis</h2></div>${progressRing(32, "small", "Weak Area")}<p>Consistency often dips after lunch. Move one easy habit into that window.</p></article>
            <article class="glass-card"><div class="card-title"><h2>Best Habit Timing</h2></div><div class="timing-grid">${Array.from({ length: 35 }, (_, i) => `<span class="t${i % 5}"></span>`).join("")}</div></article>
            <article class="glass-card"><div class="card-title"><h2>Weekly Reflection</h2></div>${progressRing(86, "small", "Great Week")}</article>
            <article class="glass-card wide action-plan"><div class="card-title"><h2>Personalized Action Plan</h2></div><ol><li>Build a consistent morning routine</li><li>Focus 90-min deep work sessions</li><li>Improve sleep schedule</li><li>Drink 2L of water daily</li></ol></article>
            <article class="glass-card chart-wide"><div class="card-title"><h2>Mood & Energy Analysis</h2></div>${lineChart(monthlyStats().slice(-7), "rose")}</article>
            <article class="glass-card"><div class="card-title"><h2>Quick Boost</h2></div>${["5-min Meditation", "Breathing Exercise", "Gratitude Journal"].map((item) => `<div class="streak-row"><span class="${iconClass("spark")}"></span><strong>${item}</strong><em>Start</em></div>`).join("")}</article>
        </section>
    `;
}

function scoreTiles() {
    return `<div class="coach-score-grid">${[["Focus", 72], ["Wellness", 68], ["Study", 85], ["Sleep", 64]].map(([label, value]) => `<div><strong>${value}%</strong><span>${label}</span>${lineChart(monthlyStats().slice(-8), "violet")}</div>`).join("")}</div>`;
}

function renderJournal() {
    const entry = state.journal[todayKey()] || {};
    const past = Object.entries(state.journal).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
    return `
        <section class="journal-layout">
            <article class="glass-card journal-editor">
                <div class="card-title"><h2>Daily Reflection</h2><span>${todayKey()}</span></div>
                <label>Mood<select id="journalMood"><option ${entry.mood === "Calm" ? "selected" : ""}>Calm</option><option ${entry.mood === "Happy" ? "selected" : ""}>Happy</option><option ${entry.mood === "Tired" ? "selected" : ""}>Tired</option><option ${entry.mood === "Stressed" ? "selected" : ""}>Stressed</option></select></label>
                <label>Energy<select id="journalEnergy"><option ${entry.energy === "High" ? "selected" : ""}>High</option><option ${entry.energy === "Medium" ? "selected" : ""}>Medium</option><option ${entry.energy === "Low" ? "selected" : ""}>Low</option></select></label>
                <label>Gratitude notes<textarea id="journalGratitude">${escapeHtml(entry.gratitude || "")}</textarea></label>
                <label>What went well?<textarea id="journalWell">${escapeHtml(entry.well || "")}</textarea></label>
                <label>What can improve?<textarea id="journalImprove">${escapeHtml(entry.improve || "")}</textarea></label>
                <button class="btn primary" id="saveJournal">Save Reflection</button>
            </article>
            <aside class="right-stack">
                <article class="glass-card"><div class="card-title"><h2>Weekly Reflection Summary</h2></div>${progressRing(84, "small", "Reflection")}<p>You are most focused when you write your plan before starting work.</p></article>
                <article class="glass-card"><div class="card-title"><h2>Past Entries</h2></div>${past.length ? past.map(([date, item]) => `<div class="journal-entry"><strong>${date}</strong><p>${escapeHtml(item.gratitude || item.well || "Saved reflection")}</p></div>`).join("") : "<p class='muted'>No saved entries yet.</p>"}</article>
            </aside>
        </section>
    `;
}

function renderRewards() {
    const xp = state.habits.reduce((sum, habit) => sum + habitProgress(habit.id) * 7, 0);
    const level = Math.floor(xp / 1000) + 1;
    return `
        <section class="reward-page">
            <article class="glass-card level-card">
                <div><span class="kicker">Level ${level}</span><h2>Lumina Prodigy</h2><p>${xp} XP earned through completed habits.</p></div>
                <div class="xp-bar"><span style="width:${xp % 1000 / 10}%"></span></div>
            </article>
            <div class="reward-grid">
                ${state.rewards.map((reward) => `
                    <article class="glass-card reward-card ${reward.unlocked ? "unlocked" : "locked"}">
                        <div class="reward-medal">◇</div>
                        <strong>${escapeHtml(reward.title)}</strong>
                        <p>${escapeHtml(reward.desc)}</p>
                        <span class="soft-pill">${reward.unlocked ? "Unlocked" : "Locked"}</span>
                    </article>
                `).join("")}
            </div>
            <article class="glass-card"><div class="card-title"><h2>Monthly Trophies</h2><span class="gold">✦</span></div><div class="trophy-row">${["January", "March", "June"].map((m) => `<div><span>◇</span><strong>${m}</strong><em>Consistency Trophy</em></div>`).join("")}</div></article>
        </section>
    `;
}

function renderSettings() {
    return `
        <section class="settings-grid">
            <article class="glass-card"><div class="card-title"><h2>Profile Settings</h2></div><label>Name<input class="soft-input" value="June"></label><label>Email<input class="soft-input" value="june@example.com"></label><button class="btn primary">Save Profile</button></article>
            <article class="glass-card"><div class="card-title"><h2>Theme Selection</h2></div><button class="btn soft" data-theme="light">Light Luxury</button><button class="btn soft" data-theme="dark">Dark Luxury</button></article>
            <article class="glass-card"><div class="card-title"><h2>Reminder Preferences</h2></div>${toggleRow("Daily reminders", "reminders")}${toggleRow("Weekly review", "weeklyReview")}${toggleRow("Soft animations", "softAnimations")}</article>
            <article class="glass-card"><div class="card-title"><h2>Dashboard Layout</h2></div>${toggleRow("Compact calendar", "compactCalendar")}</article>
            <article class="glass-card"><div class="card-title"><h2>Habit Categories</h2></div><div class="linked-habits">${state.categories.map((cat) => `<span>${escapeHtml(cat)}</span>`).join("")}</div><input class="soft-input" id="newCategory" placeholder="Add category"><button class="btn primary" id="addCategory">Add Category</button></article>
            <article class="glass-card"><div class="card-title"><h2>Data</h2></div><button class="btn soft" id="exportData">Export data</button><button class="btn danger" id="resetData">Reset localStorage</button></article>
        </section>
    `;
}

function toggleRow(label, key) {
    return `<label class="toggle-row"><span>${label}</span><label class="switch"><input data-setting="${key}" type="checkbox" ${state.settings[key] ? "checked" : ""}><span></span></label></label>`;
}

function bindPageEvents() {
    document.querySelectorAll("[data-page]").forEach((button) => {
        button.addEventListener("click", () => {
            state.page = button.dataset.page;
            saveState();
            render();
        });
    });
    document.querySelectorAll("[data-page-jump]").forEach((button) => {
        button.addEventListener("click", () => {
            state.page = button.dataset.pageJump;
            saveState();
            render();
        });
    });
    document.querySelectorAll("[data-complete]").forEach((input) => {
        input.addEventListener("change", () => {
            const date = input.dataset.dateComplete || todayKey();
            state.completions[date] = state.completions[date] || {};
            state.completions[date][input.dataset.complete] = input.checked !== false;
            saveState();
            sparkle();
            render();
        });
    });
    document.querySelectorAll("[data-select-date]").forEach((button) => {
        button.addEventListener("click", () => {
            state.selectedDate = button.dataset.selectDate;
            saveState();
            render();
        });
    });
    document.querySelectorAll("[data-category]").forEach((button) => {
        button.addEventListener("click", () => {
            sessionStorage.setItem("lumina_category", button.dataset.category);
            render();
        });
    });
    document.querySelectorAll("[data-goal-filter]").forEach((button) => {
        button.addEventListener("click", () => {
            sessionStorage.setItem("lumina_goal_filter", button.dataset.goalFilter);
            render();
        });
    });
    document.querySelectorAll("[data-open-habit-modal]").forEach((button) => button.addEventListener("click", () => openHabitModal()));
    document.querySelectorAll("[data-edit-habit]").forEach((button) => button.addEventListener("click", () => openHabitModal(button.dataset.editHabit)));
    document.querySelectorAll("[data-delete-habit]").forEach((button) => button.addEventListener("click", () => deleteHabit(button.dataset.deleteHabit)));
    document.querySelectorAll("[data-open-goal-modal]").forEach((button) => button.addEventListener("click", () => openGoalModal()));
    document.querySelectorAll("[data-theme]").forEach((button) => button.addEventListener("click", () => setTheme(button.dataset.theme)));
    document.querySelectorAll("[data-setting]").forEach((input) => input.addEventListener("change", () => {
        state.settings[input.dataset.setting] = input.checked;
        saveState();
    }));

    const journalButton = document.getElementById("saveJournal");
    if (journalButton) journalButton.addEventListener("click", saveJournal);
    const addCategory = document.getElementById("addCategory");
    if (addCategory) addCategory.addEventListener("click", addCategoryHandler);
    const exportData = document.getElementById("exportData");
    if (exportData) exportData.addEventListener("click", exportDataHandler);
    const resetData = document.getElementById("resetData");
    if (resetData) resetData.addEventListener("click", resetDataHandler);
    const chatForm = document.getElementById("chatForm");
    if (chatForm) chatForm.addEventListener("submit", chatSubmit);
}

function openHabitModal(id = "") {
    const habit = state.habits.find((item) => item.id === id) || {};
    openModal(`
        <form class="modal-card" id="habitForm">
            <div class="card-title"><h2>${id ? "Edit Habit" : "Add New Habit"}</h2><button type="button" data-close-modal>×</button></div>
            <label>Title<input name="title" value="${escapeHtml(habit.title || "")}" required></label>
            <label>Description<input name="description" value="${escapeHtml(habit.description || "")}"></label>
            <label>Category<select name="category">${state.categories.map((cat) => `<option ${habit.category === cat ? "selected" : ""}>${escapeHtml(cat)}</option>`).join("")}</select></label>
            <label>Reminder<input name="reminder" value="${escapeHtml(habit.reminder || "08:00 AM")}"></label>
            <label>Frequency<input name="frequency" value="${escapeHtml(habit.frequency || "Daily")}"></label>
            <button class="btn primary">Save Habit</button>
        </form>
    `);
    document.getElementById("habitForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const payload = {
            id: id || uid(),
            icon: habit.icon || "spark",
            title: form.get("title").trim(),
            description: form.get("description").trim(),
            category: form.get("category"),
            reminder: form.get("reminder").trim(),
            frequency: form.get("frequency").trim(),
            target: habit.target || 30,
            streak: habit.streak || 0
        };
        if (id) state.habits = state.habits.map((item) => item.id === id ? payload : item);
        else state.habits.unshift(payload);
        saveState();
        closeModal();
        toast("Habit saved.");
        render();
    });
}

function openGoalModal() {
    openModal(`
        <form class="modal-card" id="goalForm">
            <div class="card-title"><h2>Add Goal</h2><button type="button" data-close-modal>×</button></div>
            <label>Title<input name="title" required></label>
            <label>Category<select name="category"><option>Wellness</option><option>Productivity</option><option>Growth</option></select></label>
            <label>Deadline<input name="deadline" type="date"></label>
            <label>Milestones<textarea name="milestones" placeholder="One milestone per line"></textarea></label>
            <button class="btn primary">Save Goal</button>
        </form>
    `);
    document.getElementById("goalForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        state.goals.unshift({
            id: uid(),
            title: form.get("title").trim(),
            category: form.get("category"),
            deadline: form.get("deadline") || todayKey(),
            progress: 0,
            habits: [],
            milestones: String(form.get("milestones") || "").split(/\r?\n/).filter(Boolean)
        });
        saveState();
        closeModal();
        render();
    });
}

function openModal(html) {
    els.modal.innerHTML = `<div class="modal-backdrop">${html}</div>`;
    els.modal.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
}

function closeModal() {
    els.modal.innerHTML = "";
}

function deleteHabit(id) {
    state.habits = state.habits.filter((habit) => habit.id !== id);
    Object.values(state.completions).forEach((map) => delete map[id]);
    saveState();
    render();
}

function saveJournal() {
    state.journal[todayKey()] = {
        mood: document.getElementById("journalMood").value,
        energy: document.getElementById("journalEnergy").value,
        gratitude: document.getElementById("journalGratitude").value,
        well: document.getElementById("journalWell").value,
        improve: document.getElementById("journalImprove").value,
        savedAt: new Date().toISOString()
    };
    saveState();
    toast("Journal saved.");
    render();
}

function addCategoryHandler() {
    const input = document.getElementById("newCategory");
    const value = input.value.trim();
    if (value && !state.categories.includes(value)) {
        state.categories.push(value);
        saveState();
        render();
    }
}

function exportDataHandler() {
    navigator.clipboard?.writeText(JSON.stringify(state, null, 2));
    toast("Data copied as JSON.");
}

function resetDataHandler() {
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    saveState();
    render();
}

function chatSubmit(event) {
    event.preventDefault();
    const input = event.currentTarget.querySelector("input");
    const text = input.value.trim();
    if (!text) return;
    const chat = document.getElementById("chatWindow");
    chat.insertAdjacentHTML("beforeend", `<div class="chat-bubble user">${escapeHtml(text)}</div><div class="chat-bubble coach typing">Lumi is typing...</div>`);
    input.value = "";
    setTimeout(() => {
        chat.querySelector(".typing")?.remove();
        chat.insertAdjacentHTML("beforeend", `<div class="chat-bubble coach">Try a 25 minute focus block, then mark one small habit complete. Momentum likes evidence.</div>`);
        chat.scrollTop = chat.scrollHeight;
    }, 900);
}

function setTheme(theme) {
    state.theme = theme;
    saveState();
    render();
}

function toast(message) {
    const item = document.createElement("div");
    item.className = "toast";
    item.textContent = message;
    els.toast.appendChild(item);
    setTimeout(() => item.remove(), 3000);
}

function sparkle() {
    els.confetti.innerHTML = Array.from({ length: 16 }, (_, i) => `<span style="--x:${Math.random() * 100}vw;--d:${Math.random() * 0.7}s;--r:${Math.random() * 360}deg"></span>`).join("");
    setTimeout(() => { els.confetti.innerHTML = ""; }, 1400);
}

els.themeToggle.addEventListener("click", () => setTheme(state.theme === "dark" ? "light" : "dark"));

setTimeout(() => {
    els.loading.classList.add("hidden");
    els.shell.classList.add("ready");
}, 900);

render();
