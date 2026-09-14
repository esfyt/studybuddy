// ========================================
// STUDY BUDDY — CORE SHARED MODULE (all pages)
// Helpers, toasts, modal, theme, sound, confetti,
// XP/levels, daily goal, streak, badges, card state, progress state, navigation.
// Loaded before every page-specific script.
// ========================================

// ---------- STORAGE KEYS ----------

const CARDS_KEY = "studyBuddyCards";
const THEME_KEY = "studyBuddyTheme";
const ANSWERED_KEY = "studyBuddyAnswered";
const TOTAL_KEY = "studyBuddyTotalScore";
const STREAK_KEY = "studyBuddyStreak";
const LAST_PRACTICE_KEY = "studyBuddyLastPractice";

const XP_KEY = "studyBuddyXP";
const DAILY_KEY = "studyBuddyDaily";
const BADGES_KEY = "studyBuddyBadges";
const RUN_KEY = "studyBuddyRun";
const QUIZ_BEST_KEY = "studyBuddyQuizBest";
const SOUND_KEY = "studyBuddyMuted";
const STREAK_BEST_KEY = "studyBuddyStreakBest";
const QUIZ_COUNT_KEY = "studyBuddyQuizCount";

// ---------- CONSTANTS ----------

const DAILY_GOAL = 10;

const SUBJECT_COLORS = {
    "mathematics": "#7C3AED",
    "physics": "#3FA9F5",
    "chemistry": "#FF6FB5",
    "biology": "#2FD29B",
    "science": "#FF9F45",
    "history": "#C084FC",
    "geography": "#38BDF8",
    "civics": "#F59E0B",
    "economics": "#34D399",
    "english": "#F472B6",
    "hindi": "#FB923C",
    "computer science": "#60A5FA"
};

const SUBJECTS_MAP = [
    { name: "Mathematics", raw: "📐 Mathematics" },
    { name: "Science", raw: "🔬 Science" },
    { name: "Physics", raw: "⚡ Physics" },
    { name: "Chemistry", raw: "🧪 Chemistry" },
    { name: "Biology", raw: "🧬 Biology" },
    { name: "History", raw: "🏛️ History" },
    { name: "Geography", raw: "🌍 Geography" },
    { name: "Civics", raw: "🤝 Civics" },
    { name: "Economics", raw: "💰 Economics" },
    { name: "English", raw: "📖 English" },
    { name: "Hindi", raw: "🪔 Hindi" },
    { name: "Computer Science", raw: "💻 Computer Science" }
];

const ENCOURAGE = {
    high: ["Awesome! 🚀", "Brilliant! 🌟", "You're on top of the world! 👑", "What a champion! 🏆", "Mind-blowing! 💥"],
    mid: ["Great job! 👍", "Nice, you're improving! 💪", "Getting stronger! 💪", "Good one, keep going! 🎯"],
    low: ["No worries, you'll do better next time! 🌱", "Practice makes perfect! 📚", "Keep learning, you're getting there! 🌱", "Try once more, you'll get it! 💪"],
    perfect: ["100%!! PERFECT! 💯🎉", "Perfect! Zero mistakes! 🏆", "Out-of-this-world answer! 🤯"]
};

const MASCOT_GREETINGS = [
    "Hello, Champion! 🌟 Ready to study?",
    "Practice makes perfect! 📚",
    "One card at a time, one step forward! 🚶",
    "Remember: small steps, big dreams! 💭",
    "Complete today's goal! 🎯",
    "Give it your all, then save your card! 💪"
];

const BADGES = [
    { id: "first_card", emoji: "🎴", name: "First Card", desc: "Create your first card", check: () => cards.length >= 1 },
    { id: "first_answer", emoji: "💬", name: "First Step", desc: "Submit your first answer", check: () => getAnswered() >= 1 },
    { id: "perfect_100", emoji: "💯", name: "Perfect Score", desc: "Score 100 on an answer", check: () => hasPerfect() },
    { id: "run5", emoji: "🎯", name: "On a Roll", desc: "5 answers of 70%+ in a row", check: () => Number(localStorage.getItem(RUN_KEY)) >= 5 },
    { id: "daily_goal", emoji: "🎉", name: "Goal Crusher", desc: "Hit the daily goal", check: () => todayLog().answered >= DAILY_GOAL },
    { id: "streak3", emoji: "🔥", name: "3-Day Spark", desc: "3-day streak", check: () => getStreak() >= 3 },
    { id: "streak7", emoji: "🌟", name: "7-Day Star", desc: "7-day streak", check: () => getStreak() >= 7 },
    { id: "ten_cards", emoji: "📚", name: "Bookworm", desc: "Create 10 cards", check: () => cards.length >= 10 },
    { id: "fifty_answers", emoji: "⭐", name: "Fifty-up", desc: "Answer 50 questions", check: () => getAnswered() >= 50 },
    { id: "night_owl", emoji: "🦉", name: "Night Owl", desc: "Study after 9 PM", check: () => new Date().getHours() >= 21 },
    { id: "quiz_first", emoji: "🏁", name: "Quiz Rookie", desc: "Finish your first quiz", check: () => quizCompletedCount() >= 1 },
    { id: "quiz_perfect", emoji: "🎖️", name: "Quiz Star", desc: "Score 5/5 in a quiz", check: () => (localStorage.getItem(QUIZ_BEST_KEY) ? Number(localStorage.getItem(QUIZ_BEST_KEY)) >= 5 : false) },
    { id: "xp_1000", emoji: "💎", name: "Diamond Mind", desc: "Earn 1000 XP", check: () => getXp() >= 1000 }
];

const LEVELS = [
    { name: "Rising Star" },
    { name: "Fast Learner" },
    { name: "Wise Owl" },
    { name: "Study Pro" },
    { name: "Star Student" },
    { name: "Sharp Mind" },
    { name: "Brilliant Brain" },
    { name: "Rocket Star" },
    { name: "Class Champion" }
];

const LEVEL_EMOJI = ["🐣", "🐰", "🦉", "🧠", "📚", "⚡", "🦁", "🚀", "👑"];
const LEVEL_TOP = "🌟";

let cards = [];
let currentCardId = null;

// ========================================
// HELPERS
// ========================================

function $(id) {
    return document.getElementById(id);
}

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML.replace(/"/g, "&quot;");
}

function buildContextNote(context) {
    if (!context || typeof context !== "object") return "";
    const parts = [];
    if (context.board) parts.push(`Board: ${String(context.board).trim().slice(0, 40)}`);
    if (context.class) parts.push(`Class: ${String(context.class).trim().slice(0, 20)}`);
    if (context.standard) parts.push(`Difficulty standard: ${String(context.standard).trim().slice(0, 20)}`);
    if (context.subject) parts.push(`Subject: ${String(context.subject).trim().slice(0, 60)}`);
    if (context.chapter) parts.push(`Chapter: ${String(context.chapter).trim().slice(0, 60)}`);
    if (parts.length === 0) return "";
    return "\n\nStudent context:\n" + parts.map(p => `- ${p}`).join("\n") +
        "\nMatch the depth and difficulty of your answer to this context.";
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function formatDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function subjectEmoji(subjectRaw) {
    return (subjectRaw || "").split(" ")[0];
}

function subjectColor(subject) {
    // Strip emoji prefix + variation selector and compare against known subjects
    const plain = (subject || "").toLowerCase().replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\s]/gu, "");
    for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
        if (plain === key || plain.includes(key)) {
            return color;
        }
    }
    return "#7C3AED";
}

function subjectChip(subject) {
    const color = subjectColor(subject);
    return `<span class="chip chip-subject" style="--subj:${color}">${escapeHTML(subject)}</span>`;
}

// ========================================
// TOASTS
// ========================================

function showToast(message, type, emoji) {
    const container = $("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast " + (type || "");
    toast.innerHTML = `${emoji ? `<span class="toast-emoji">${emoji}</span>` : ""}<span>${escapeHTML(message)}</span>`;
    toast.onclick = () => dismissToast(toast);
    container.appendChild(toast);

    setTimeout(() => dismissToast(toast), 3200);

    // Cap visible toasts
    if (container.children.length > 4) {
        container.removeChild(container.firstChild);
    }
}

function dismissToast(toast) {
    if (!toast) return;
    toast.classList.add("leaving");
    setTimeout(() => toast.remove(), 300);
}

function streakEmojiFor(s) {
    if (s >= 7) return "💥";
    if (s >= 3) return "🔥";
    return "🌱";
}

// ========================================
// MODAL (custom confirm)
// ========================================

let modalCallback = null;

function openConfirm(message, title, onYes, yesLabel) {
    $("modalText").textContent = message;
    $("modalTitle").textContent = title || "Are you sure?";
    $("modalConfirmBtn").textContent = yesLabel || "Yes, Go";
    modalCallback = onYes;
    $("modalOverlay").classList.remove("hidden");
}

function closeModal() {
    $("modalOverlay").classList.add("hidden");
    modalCallback = null;
}

function confirmModalAction() {
    const cb = modalCallback;
    closeModal();
    if (typeof cb === "function") cb();
}

// ========================================
// THEME
// ========================================

function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    $("themeToggle").textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    if (typeof updateChartColors === "function") updateChartColors();
}

function loadTheme() {
    if (localStorage.getItem(THEME_KEY) === "dark") {
        document.body.classList.add("dark-mode");
        $("themeToggle").textContent = "☀️";
    } else {
        $("themeToggle").textContent = "🌙";
    }
}

// ========================================
// SOUND (small WebAudio chimes)
// ========================================

let audioCtx = null;
let soundOn = localStorage.getItem(SOUND_KEY) !== "off";

function toggleSound() {
    soundOn = !soundOn;
    localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
    $("soundToggle").textContent = soundOn ? "🔊" : "🔇";
    if (soundOn) {
        playChime("good");
        showToast("Sound on! 🔔", "success", "🔊");
    }
}

function initSoundButton() {
    $("soundToggle").textContent = soundOn ? "🔊" : "🔇";
}

function playChime(kind) {
    if (!soundOn) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;

        if (kind === "good" || kind === "perfect") {
            note(523.25, now); // C5
            note(659.25, now + 0.12); // E5
            note(783.99, now + 0.24); // G5
        } else if (kind === "levelup") {
            note(523.25, now);
            note(659.25, now + 0.1);
            note(783.99, now + 0.2);
            note(1046.5, now + 0.32);
        } else {
            note(392.0, now, "triangle", 0.3); // low G4, soft
        }

        function note(freq, t, type, dur) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type || "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.001, t);
            gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.35));
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(t);
            osc.stop(t + (dur || 0.35));
        }
    } catch (e) {
        // Audio unsupported — ignore
    }
}

// ========================================
// CONFETTI
// ========================================

const confettiColors = ["#7C3AED", "#FF6FB5", "#FF9F45", "#FFC93C", "#2FD29B", "#3FA9F5"];
let confettiParticles = [];
let confettiAnim = null;

function confettiBurst(count) {
    const canvas = $("confetti");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const total = count || 120;
    for (let i = 0; i < total; i++) {
        confettiParticles.push({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * canvas.height * 0.4,
            w: 6 + Math.random() * 5,
            h: 8 + Math.random() * 6,
            color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
            vx: (Math.random() - 0.5) * 3,
            vy: 2 + Math.random() * 3.5,
            rot: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.2,
            sway: Math.random() * Math.PI * 2
        });
    }

    if (!confettiAnim) {
        confettiAnim = requestAnimationFrame(drawConfetti);
    }
}

function drawConfetti() {
    const canvas = $("confetti");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    confettiParticles = confettiParticles.filter(p => p.y < canvas.height + 40);

    confettiParticles.forEach(p => {
        p.sway += 0.06;
        p.x += p.vx + Math.sin(p.sway) * 1.6;
        p.y += p.vy;
        p.rot += p.vr;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
    });

    if (confettiParticles.length > 0) {
        confettiAnim = requestAnimationFrame(drawConfetti);
    } else {
        cancelAnimationFrame(confettiAnim);
        confettiAnim = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// ========================================
// XP + LEVELS
// ========================================

function getXp() {
    return Number(localStorage.getItem(XP_KEY)) || 0;
}

function xpCost(level) {
    // cost to go from level N to N+1
    return 100 * Math.max(level - 1, 1);
}

function levelFor(xp) {
    let level = 1;
    let remaining = xp;
    while (remaining >= xpCost(level)) {
        remaining -= xpCost(level);
        level++;
    }
    return level;
}

function levelBounds(level) {
    let cumulative = 0;
    let lvl = 1;
    while (lvl < level) {
        cumulative += xpCost(lvl);
        lvl++;
    }
    const nextCost = xpCost(level);
    return { from: cumulative, to: cumulative + nextCost };
}

function xpForScore(score) {
    if (score >= 90) return 60;
    if (score >= 70) return 40;
    if (score >= 50) return 25;
    return 12;
}

function levelTitle(level) {
    if (level >= 10) return LEVEL_TOP + " Legend";
    const idx = Math.min(level - 1, LEVELS.length - 1);
    return LEVEL_EMOJI[level - 1] + " " + LEVELS[idx].name;
}

function addXp(amount, label) {
    const before = getXp();
    const newXp = before + amount;
    localStorage.setItem(XP_KEY, newXp);

    const beforeLevel = levelFor(before);
    const afterLevel = levelFor(newXp);

    if (typeof renderProgress === "function") renderProgress();
    updateNavPill();

    if (afterLevel > beforeLevel) {
        // LEVEL UP! 🎉
        showToast(`${label || "Level up"}! You are now ${levelTitle(afterLevel)}! 🎉`, "xp", levelTitle(afterLevel).split(" ")[0]);
        confettiBurst(160);
        playChime("levelup");
        if (soundOn) setTimeout(() => playChime("levelup"), 150);
        const emojiEl = $("levelEmoji");
        if (emojiEl) {
            emojiEl.classList.add("wiggle");
            setTimeout(() => emojiEl.classList.remove("wiggle"), 800);
        }
    }

    return { leveledUp: afterLevel > beforeLevel, level: afterLevel, xp: newXp };
}

function updateNavPill() {
    const el = $("navXp");
    if (!el) return;
    const xp = getXp();
    const level = levelFor(xp);
    el.innerHTML = `⭐ ${xp} XP <span class="lvl-tag">L${level}</span>`;
}

// ========================================
// DAILY LOG + GOAL
// ========================================

function getDaily() {
    try {
        return JSON.parse(localStorage.getItem(DAILY_KEY)) || {};
    } catch (e) {
        return {};
    }
}

function todayLog() {
    const d = formatDateKey(new Date());
    const all = getDaily();
    return all[d] || { answered: 0, xp: 0, best: 0, perfect: false };
}

function bumpDaily(score) {
    const key = formatDateKey(new Date());
    const all = getDaily();
    const entry = all[key] || { answered: 0, xp: 0, best: 0, perfect: false };

    entry.answered = (entry.answered || 0) + 1;
    entry.xp = (entry.xp || 0) + xpForScore(score);
    entry.best = Math.max(entry.best || 0, score);
    if (score === 100) entry.perfect = true;

    all[key] = entry;
    localStorage.setItem(DAILY_KEY, JSON.stringify(all));

    // Did we just hit the daily goal?
    if (entry.answered === DAILY_GOAL) {
        showToast(`Goal completed! ${DAILY_GOAL} questions — Amazing! 🎉`, "badge", "🎉");
        confettiBurst(120);
        checkBadges();
    }

    if (typeof renderProgress === "function") renderProgress();
}

function weeklyData() {
    const all = getDaily();
    const out = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = formatDateKey(d);
        const entry = all[key] || {};
        out.push({ key, label: d.toLocaleDateString("en-IN", { weekday: "short" })[0], answered: entry.answered || 0 });
    }
    return out;
}

// ========================================
// STREAK
// ========================================

function getStreak() {
    return Number(localStorage.getItem(STREAK_KEY)) || 0;
}

function maybeResetStreak() {
    // Reset the streak if the last practice was before yesterday
    const last = localStorage.getItem(LAST_PRACTICE_KEY);
    if (last) {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (last !== today && last !== yesterday) {
            localStorage.setItem(STREAK_KEY, 0);
        }
    }
}

function updateStreak() {
    const today = new Date().toDateString();
    const last = localStorage.getItem(LAST_PRACTICE_KEY);

    if (last === today) return;

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    let streak = Number(localStorage.getItem(STREAK_KEY)) || 0;

    streak = (last === yesterday) ? streak + 1 : 1;

    localStorage.setItem(LAST_PRACTICE_KEY, today);
    localStorage.setItem(STREAK_KEY, streak);

    // Track best streak
    const best = Number(localStorage.getItem(STREAK_BEST_KEY)) || 0;
    if (streak > best) {
        localStorage.setItem(STREAK_BEST_KEY, streak);
    }

    checkBadges();
}

// ========================================
// BADGES
// ========================================

function getBadges() {
    try {
        return JSON.parse(localStorage.getItem(BADGES_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function checkBadges() {
    const owned = new Set(getBadges());
    const newly = [];

    BADGES.forEach(badge => {
        if (!owned.has(badge.id) && badge.check()) {
            const list = getBadges();
            list.push(badge.id);
            localStorage.setItem(BADGES_KEY, JSON.stringify(list));
            newly.push(badge);
        }
    });

    newly.forEach(badge => {
        setTimeout(() => {
            showToast(`${badge.emoji} Badge unlocked: ${badge.name}!`, "badge", badge.emoji);
            confettiBurst(70);
            playChime("good");
        }, 200);
    });

    if (newly.length > 0 && typeof renderProgress === "function") renderProgress();
    return newly;
}

// ========================================
// CARDS: STATE + FILTERS
// ========================================

function loadCards() {
    try {
        const saved = localStorage.getItem(CARDS_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        cards = Array.isArray(parsed) ? parsed.map(normalizeCard) : [];
    } catch (error) {
        console.error("Could not load cards:", error);
        cards = [];
    }
    // Cards-page helpers may not be loaded on other pages
    if (typeof renderFilterOptions === "function") renderFilterOptions();
    if (typeof renderCards === "function") renderCards();
}

function normalizeCard(card) {
    return {
        id: Number(card.id) || Date.now(),
        board: card.board || "CBSE",
        class: card.class || "",
        standard: card.standard || "Medium",
        subject: card.subject || "General",
        chapter: card.chapter || "",
        question: card.question || "",
        expectedAnswer: card.expectedAnswer || ""
    };
}

function saveCardsToStorage() {
    localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
}

function findCard(id) {
    return cards.find(c => c.id === id);
}

function getFilterValues() {
    const subjectEl = $("filterSubject");
    const boardEl = $("filterBoard");
    const classEl = $("filterClass");
    const chapterEl = $("filterChapter");
    // Filters only exist on the cards page
    return {
        subject: subjectEl ? subjectEl.value : "",
        board: boardEl ? boardEl.value : "",
        class: classEl ? classEl.value : "",
        chapter: chapterEl ? chapterEl.value : ""
    };
}

function getFilteredCards() {
    const f = getFilterValues();
    return cards.filter(card =>
        (!f.subject || card.subject === f.subject) &&
        (!f.board || card.board === f.board) &&
        (!f.class || String(card.class) === f.class) &&
        (!f.chapter || card.chapter === f.chapter)
    );
}

function getPracticePool() {
    const filtered = getFilteredCards();
    return filtered.length > 0 ? filtered : cards;
}

// ========================================
// PROGRESS STATE
// ========================================

function getAnswered() {
    return Number(localStorage.getItem(ANSWERED_KEY)) || 0;
}

function hasPerfect() {
    const d = formatDateKey(new Date());
    const all = getDaily();
    let perfect = false;
    Object.values(all).forEach(entry => {
        if (entry && entry.perfect) perfect = true;
    });
    return perfect;
}

function updateProgress(newScore) {
    const answered = getAnswered() + 1;
    const total = (Number(localStorage.getItem(TOTAL_KEY)) || 0) + newScore;

    localStorage.setItem(ANSWERED_KEY, answered);
    localStorage.setItem(TOTAL_KEY, total);

    updateStreak();
    if (typeof renderProgress === "function") renderProgress();
}

function quizCompletedCount() {
    return Number(localStorage.getItem(QUIZ_COUNT_KEY)) || 0;
}

// ========================================
// NAVIGATION (multi-page active state)
// ========================================

function updateActiveNav(page) {
    document.querySelectorAll(".nav-link").forEach(a => {
        a.classList.toggle("active", a.dataset.page === page);
    });
}

// ========================================
// INIT FALLBACK + EXPOSE SHARED FUNCTIONS
// ========================================

// Safe default init: every page script overrides window.init with its own
// page-specific init (e.g. window.init = initHome). This guards against a
// page that forgets to define one. startVoice lives in voice.js.
function fallbackInit() {
    loadTheme();
    initSoundButton();
    updateNavPill();
}

// ========================================
// SCROLL REVEAL — adds .revealed to .reveal elements
// ========================================
function initScrollReveal() {
    const targets = Array.from(document.querySelectorAll(".reveal"));
    if (!targets.length) return;

    const reveal = (el) => {
        el.classList.add("revealed");
        revealedSet.delete(el);
    };
    const revealedSet = new Set(targets);

    // Elements already on screen should show up right away — no waiting for
    // the observer to fire. Wrap in rAF so layout settles before measuring.
    requestAnimationFrame(function revealInitial() {
        const vh = window.innerHeight || document.documentElement.clientHeight;
        targets.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < vh && rect.bottom > 0) reveal(el);
        });
    });

    const revealVisible = () => {
        for (const el of Array.from(revealedSet)) {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) reveal(el);
        }
    };

    // Observe anything still hidden for when it scrolls into view.
    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) reveal(e.target);
        });
    }, { threshold: 0, rootMargin: "0px 0px 80px 0px" });

    revealedSet.forEach(el => io.observe(el));

    // Scroll fallback (belt + suspenders) so content always becomes visible.
    let ticking = false;
    window.addEventListener("scroll", function onScrollReveal() {
        if (ticking || !revealedSet.size) return;
        ticking = true;
        requestAnimationFrame(() => {
            revealVisible();
            ticking = false;
        });
    }, { passive: true });

    // Safety net: never leave content permanently invisible.
    setTimeout(() => {
        if (revealedSet.size) revealVisible();
    }, 2500);
}

window.$ = $;
window.showToast = showToast;
window.toggleTheme = toggleTheme;
window.toggleSound = toggleSound;
window.openConfirm = openConfirm;
window.closeModal = closeModal;
window.confirmModalAction = confirmModalAction;
window.init = fallbackInit;