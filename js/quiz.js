// ========================================
// STUDY BUDDY — QUIZ PAGE (quiz.html)
// Rapid-fire offline quiz (self-graded by the student).
// ========================================

const QUIZ_LEN = 5;
let quizState = null;

function startQuiz() {
    const pool = getPracticePool();
    if (pool.length === 0) {
        showToast("You need some cards first for the quiz! 🎴", "info", "🦉");
        window.location.href = "cards.html";
        return;
    }

    const selected = shuffle(pool.length >= QUIZ_LEN ? pool : [...pool, ...pool, ...pool, ...pool, ...pool]).slice(0, QUIZ_LEN);

    quizState = {
        cards: selected,
        index: 0,
        score: 0,
        t0: Date.now()
    };

    $("quizStart").classList.add("hidden");
    $("quizResult").classList.add("hidden");
    $("quizActive").classList.remove("hidden");

    renderQuizQuestion();
    $("quizActive").scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderQuizQuestion() {
    if (!quizState) return;
    const card = quizState.cards[quizState.index];

    // Dots
    let dots = "";
    for (let i = 0; i < QUIZ_LEN; i++) {
        const cls = i < quizState.index ? "done" : i === quizState.index ? "current" : "";
        dots += `<span class="qdot ${cls}"></span>`;
    }
    $("quizDots").innerHTML = dots;

    $("quizQNum").textContent = `Question ${quizState.index + 1} / ${QUIZ_LEN}`;
    $("quizQuestion").textContent = card.question;
    $("quizChips").innerHTML = `
        ${subjectChip(card.subject)}
        ${card.class ? `<span class="chip">Class ${escapeHTML(card.class)}</span>` : ""}
        <span class="chip">${escapeHTML(card.board)}</span>
    `;
    $("quizAnswer").value = "";
    $("quizRevealArea").classList.remove("show");
    $("quizExpected").textContent = card.expectedAnswer;

    if (typeof stopVoiceRecognition === "function") stopVoiceRecognition();
    /* Reset the quiz voice button label */
    const vb = $("quizVoiceBtn");
    if (vb) vb.textContent = "🎙️ Speak";

    $("quizRevealArea").classList.remove("show");
}

function quizReveal() {
    $("quizRevealArea").classList.add("show");
    $("quizRevealArea").scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (soundOn) playChime("good");
}

function quizGrade(gotIt) {
    if (!quizState) return;

    if (gotIt) quizState.score++;
    else playChime("low");

    quizState.index++;

    if (quizState.index >= quizState.cards.length) {
        endQuiz();
        return;
    }

    renderQuizQuestion();
}

function endQuiz() {
    if (!quizState) return;
    const correct = quizState.score;
    const total = quizState.cards.length;
    const timeSec = Math.round((Date.now() - quizState.t0) / 1000);

    const pct = Math.round((correct / total) * 100);

    // XP
    const quizXp = correct * 10 + (correct === total ? 20 : 0);
    addXp(quizXp, "Quiz XP");

    // Best score
    const prevBest = Number(localStorage.getItem(QUIZ_BEST_KEY)) || 0;
    if (correct > prevBest) {
        localStorage.setItem(QUIZ_BEST_KEY, correct);
        showToast("New best quiz score! 🏆", "xp", "🏆");
    }

    // Ring
    const ring = $("quizScoreRing");
    ring.style.setProperty("--ring-value", pct);
    const ringColor = pct >= 80 ? "var(--mint)" : pct >= 60 ? "var(--gold)" : "var(--orange)";
    ring.style.setProperty("--ring-color", ringColor);
    $("quizRingFill").style.stroke = ringColor;
    $("quizScore").textContent = correct;
    $("quizTime").textContent = timeSec + "s";
    $("quizXp").textContent = quizXp;
    $("quizBest").textContent = (Number(localStorage.getItem(QUIZ_BEST_KEY)) || 0) + "/5";

    // Verdict + celebration
    if (correct === total) {
        $("quizVerdict").textContent = "PERFECT QUIZ! 🤯🎉";
        $("quizNote").textContent = "Every answer right! You're on the fast track to the top today! 🚀";
        confettiBurst(160);
        playChime("levelup");
    } else if (correct >= 4) {
        $("quizVerdict").textContent = "Amazing! 🎉";
        $("quizNote").textContent = `${correct} / 5 — so close! A little more practice and you'll be perfect! 💯`;
        confettiBurst(100);
    } else if (correct >= 3) {
        $("quizVerdict").textContent = "Great start! 👍";
        $("quizNote").textContent = "You're in good shape. A little more practice and you'll nail it! 💪";
    } else {
        $("quizVerdict").textContent = "No worries! 🌱";
        $("quizNote").textContent = "Every champion started small. Try again! 💪";
    }

    $("quizNewBadges").innerHTML = "";
    quizCompletedMark();
    checkBadges();
    renderQuizBadges();

    $("quizActive").classList.add("hidden");
    $("quizResult").classList.remove("hidden");
    $("quizResult").scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderQuizBadges() {
    const newly = getBadges().filter(id => id === "quiz_first" || id === "quiz_perfect");
    const el = $("quizNewBadges");
    el.innerHTML = newly.map(id => {
        const b = BADGES.find(x => x.id === id);
        return b ? `<span class="badge-chip">${b.emoji} ${b.name}</span>` : "";
    }).join("");
}

function quizCompletedMark() {
    localStorage.setItem(QUIZ_COUNT_KEY, quizCompletedCount() + 1);
}

function scrollToQuiz() {
    const pool = getPracticePool();
    if (pool.length === 0) {
        showToast("Create some cards first to start the quiz! 🎴", "info", "🦉");
        window.location.href = "cards.html";
        return;
    }
    startQuiz();
}

// ---------- INIT ----------

function initQuiz() {
    loadTheme();
    loadCards();
    initSoundButton();
    updateNavPill();
    updateActiveNav("quiz");
    maybeResetStreak();
    initScrollReveal();
}

window.init = initQuiz;
window.startQuiz = startQuiz;
window.quizReveal = quizReveal;
window.quizGrade = quizGrade;
window.scrollToQuiz = scrollToQuiz;
// "Practice More" on this page navigates to the practice page.
window.scrollToPractice = () => { window.location.href = "practice.html"; };