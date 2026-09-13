// ========================================
// STUDY BUDDY — HOME PAGE (index.html)
// Mascot greeting + hero stats.
// ========================================

function renderHomeStats() {
    const goalCount = $("heroGoalCount");
    const streakCount = $("heroStreakCount");
    if (!goalCount || !streakCount) return;

    const log = todayLog();
    goalCount.textContent = log.answered + "/" + DAILY_GOAL;
    streakCount.textContent = getStreak();
}

function updateMascotGreeting() {
    const bubble = $("mascotBubble");
    if (!bubble) return;

    const hour = new Date().getHours();
    let greeting;
    if (hour < 5) greeting = "Still up studying? True night owl! 🦉";
    else if (hour < 12) greeting = "Good morning, Champion! ☀️ Ready to start?";
    else if (hour < 17) greeting = "Good afternoon! 🎒 Let's learn something?";
    else if (hour < 20) greeting = "Good evening! ⭐ A little practice?";
    else {
        greeting = "Night study sticks better! 🌙 One quick quiz?";
    }

    bubble.textContent = greeting;

    // Rotate among fun messages
    const idx = Math.floor(Math.random() * MASCOT_GREETINGS.length);
    setTimeout(() => {
        if (bubble) bubble.textContent = MASCOT_GREETINGS[idx];
    }, 8000);

    // Rotate again after 12s
    setTimeout(() => {
        if (bubble) bubble.textContent = MASCOT_GREETINGS[(idx + 1) % MASCOT_GREETINGS.length];
    }, 16000);
}

function initHome() {
    loadTheme();
    loadCards();
    initSoundButton();
    updateNavPill();
    updateActiveNav("home");
    updateMascotGreeting();
    renderHomeStats();
    initScrollReveal();

    // Show streak daily reminder on first visit
    maybeResetStreak();
    const streak = getStreak();
    if (streak >= 3) {
        setTimeout(() => showToast(`${streak}-day streak! ${streakEmojiFor(streak)} Amazing!`, "success", "🔥"), 1500);
    }
}

window.init = initHome;