// ========================================
// STUDY BUDDY — PROGRESS PAGE (progress.html)
// Level card, daily goal ring, stats, weekly chart, badges.
// ========================================

function animateNumber(el, to, suffix) {
    if (!el) return;
    const from = 0;
    const duration = 600;
    const start = performance.now();

    function frame(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(from + (to - from) * eased) + (suffix || "");
        if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

function loadProgress() {
    maybeResetStreak();
    renderProgress();
}

function renderProgress() {
    const answered = getAnswered();
    const total = Number(localStorage.getItem(TOTAL_KEY)) || 0;
    const streak = getStreak();
    const xp = getXp();
    const level = levelFor(xp);
    const average = answered > 0 ? Math.round(total / answered) : 0;

    // Stats
    $("questionsAnswered").textContent = answered;
    $("averageScore").textContent = average + "%";

    // Streak emoji scaling
    const streakEmoji = streak === 0 ? "🌱" : streak < 3 ? "🔥" : streak < 7 ? "🔥🔥" : "💥";
    $("streak").textContent = streak === 0 ? "0 🌱" : streak + " " + streakEmoji;

    // Level card
    if (level >= 10) {
        $("levelEmoji").textContent = LEVEL_TOP;
        $("levelName").textContent = "Legend";
    } else {
        $("levelEmoji").textContent = LEVEL_EMOJI[level - 1];
        $("levelName").textContent = LEVELS[level - 1].name;
    }
    $("levelNum").textContent = level;

    const bounds = levelBounds(level);
    const inLevel = xp - bounds.from;
    const pct = Math.round((inLevel / (bounds.to - bounds.from)) * 100);
    $("levelXpBar").style.width = pct + "%";
    $("levelXpFrom").textContent = bounds.from;
    $("levelXpTo").textContent = bounds.to + " XP";

    // Daily goal
    const log = todayLog();
    const goalCount = Math.min(log.answered, DAILY_GOAL);
    $("goalNum").textContent = goalCount;

    const circ = 2 * Math.PI * 40;
    const offset = circ - (goalCount / DAILY_GOAL) * circ;
    $("goalRing").style.strokeDashoffset = offset;

    const gh = $("goalText");
    if (log.answered >= DAILY_GOAL) {
        gh.innerHTML = `<span class="goal-done">Goal completed! 🎉 Amazing work today!</span>`;
    } else {
        gh.innerHTML = `Practice <strong>${Math.max(0, DAILY_GOAL - log.answered)} more questions</strong> today. ${Math.max(0, DAILY_GOAL - log.answered) > 4
            ? "One step at a time, everything is possible! 💪"
            : "So close! You can do it! 🎯"}`;
    }

    // The hero strip on index.html (guarded — absent on this page)
    if ($("heroGoalCount")) $("heroGoalCount").textContent = log.answered + "/" + DAILY_GOAL;
    if ($("heroStreakCount")) $("heroStreakCount").textContent = streak;

    // Weekly chart
    renderWeeklyChart();

    // Badges
    renderBadgesGrid();

    // Nav pill
    updateNavPill();
}

function renderWeeklyChart() {
    const chart = $("weeklyChart");
    if (!chart) return;
    const week = weeklyData();
    const max = Math.max(...week.map(d => d.answered), 1);

    chart.innerHTML = week.map(d => {
        const h = Math.round((d.answered / max) * 100);
        return `
            <div class="bar-col">
                <span class="bar val">${d.answered || ""}</span>
                <span class="bar ${d.answered > 0 ? "fill" : ""}" style="height:${Math.max(h, 4)}%"></span>
                <span class="bar-label">${d.label}</span>
            </div>
        `;
    }).join("");
}

function renderBadgesGrid() {
    const grid = $("badgesGrid");
    if (!grid) return;
    const owned = new Set(getBadges());

    grid.innerHTML = BADGES.map(badge => {
        const earned = owned.has(badge.id);
        return `
            <div class="badge ${earned ? "earned" : "locked"}" title="${escapeHTML(badge.desc)}">
                <span class="badge-emoji">${badge.emoji}</span>
                <span class="badge-name">${escapeHTML(badge.name)}</span>
            </div>
        `;
    }).join("");
}

function updateChartColors() {
    renderWeeklyChart();
}

// ---------- INIT ----------

function initProgress() {
    loadTheme();
    loadCards();
    initSoundButton();
    updateNavPill();
    updateActiveNav("progress");
    initScrollReveal();

    loadProgress();

    // Streak reminder
    const streak = getStreak();
    if (streak >= 3) {
        setTimeout(() => showToast(`${streak}-day streak! ${streakEmojiFor(streak)} Amazing!`, "success", "🔥"), 1500);
    }
}

window.init = initProgress;