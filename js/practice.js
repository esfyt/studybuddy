// ========================================
// STUDY BUDDY — PRACTICE PAGE (practice.html)
// Active recall: answer a card, get AI evaluation.
// ========================================

// ---------- FLOW ----------

function startPractice() {
    const pool = getPracticePool();
    if (pool.length === 0) {
        showToast("No cards yet! Create your first one. 🎴", "info", "🦉");
        window.location.href = "cards.html";
        return;
    }
    loadCardIntoPractice(shuffle(pool)[0]);
}

function startCard(id) {
    const card = findCard(id);
    if (card) {
        loadCardIntoPractice(card);
    }
}

function nextQuestion() {
    const pool = getPracticePool();
    if (pool.length === 0) {
        showToast("Create some cards first! 🎴", "info", "🦉");
        return;
    }

    let next;
    if (pool.length === 1) {
        next = pool[0];
    } else {
        do {
            next = pool[Math.floor(Math.random() * pool.length)];
        } while (currentCardId !== null && next.id === currentCardId);
    }

    loadCardIntoPractice(next);
}

function loadCardIntoPractice(card) {
    if (!card) return;

    currentCardId = card.id;

    $("question").textContent = card.question;
    $("practiceChips").innerHTML = `
        ${subjectChip(card.subject)}
        ${card.class ? `<span class="chip">Class ${escapeHTML(card.class)}</span>` : ""}
        <span class="chip">${escapeHTML(card.board)}</span>
        <span class="chip">${escapeHTML(card.standard)}</span>
    `;

    $("answerInput").value = "";
    $("answerInput").placeholder = "Type your answer here...";
    $("result").classList.add("hidden");
    $("newBadges").innerHTML = "";

    // Stop any active voice recording for the practice area
    if (typeof stopVoiceRecognition === "function") stopVoiceRecognition();
}

// ---------- CHECK ANSWER (AI via /api/evaluate) ----------

async function checkAnswer() {
    const studentAnswer = $("answerInput").value.trim();
    if (studentAnswer === "") {
        showToast("Type or speak your answer first! 🎙️", "error", "💬");
        return;
    }

    const card = findCard(currentCardId);
    if (!card) {
        showToast("Select a study card first. 🎴", "error", "🦉");
        return;
    }

    const button = document.querySelector(".check-btn");
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "🤖 Buddy is checking...";
    $("result").classList.add("hidden");

    let evaluation;
    try {
        evaluation = await fetchEvaluation(card, studentAnswer);
    } catch (error) {
        console.error("AI evaluation error, using local judge:", error);
        evaluation = evaluateLocally(card, studentAnswer);
    }

    renderEvaluation(evaluation);

    // --- Gamification ---
    const safeScore = Number(evaluation.score) || 0;
    const xp = xpForScore(safeScore);
    addXp(xp, "XP earned");
    updateProgress(safeScore);
    updateRun(safeScore);
    bumpDaily(safeScore);
    updateStreak();

    if (safeScore >= 80) {
        confettiBurst(safeScore === 100 ? 180 : 110);
        if (soundOn) playChime("good");
    }

    if (safeScore === 100) {
        const svg = $("mascotSvg");
        if (svg) {
            svg.classList.add("eyes-happy");
            setTimeout(() => svg.classList.remove("eyes-happy"), 1500);
        }
    }

    checkBadges();

    $("xpGained").textContent = `⭐ +${xp} XP`;
    $("result").classList.remove("hidden");

    button.disabled = false;
    button.textContent = originalText;
}

async function fetchEvaluation(card, studentAnswer) {
    const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            question: card.question,
            expected: card.expectedAnswer,
            answer: studentAnswer,
            subject: card.subject,
            chapter: card.chapter || "",
            board: card.board,
            standard: card.standard,
            class: card.class
        })
    });

    if (!response.ok) {
        throw new Error("AI evaluation failed.");
    }
    const data = await response.json();
    if (typeof data.score !== "number") {
        throw new Error("AI returned an invalid score.");
    }
    data.score = Math.max(0, Math.min(100, Math.round(data.score)));
    return data;
}

// ---------- OFFLINE LOCAL JUDGE (dev fallback) ----------

const STOP_WORDS = new Set([
    "the", "and", "that", "have", "for", "not", "with", "you", "this", "but",
    "his", "they", "her", "she", "will", "one", "all", "would", "there",
    "their", "what", "about", "which", "when", "your", "some", "can", "out",
    "are", "was", "were", "from", "has", "had", "them", "than", "into",
    "its", "over", "very", "just", "also", "these", "those", "because",
    "would", "should", "could", "after", "before", "between", "during"
]);

function tokenize(text) {
    return (text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 3 && !STOP_WORDS.has(w));
}

function evaluateLocally(card, studentAnswer) {
    const expWords = [...new Set(tokenize(card.expectedAnswer))];
    const stuWords = new Set(tokenize(studentAnswer));
    const qWords = tokenize(card.question);

    if (expWords.length === 0) {
        // Nothing to compare against — give a neutral encouraging score
        return {
            score: 50,
            status: "Good Start! 💪",
            feedback: "Write the key points in your own words and keep comparing them with the expected answer.",
            correct_points: [],
            missed_points: [],
            memory_trick: "Repetition makes recall feel easy—practice it once more tomorrow."
        };
    }

    let score = 0;
    const correctPoints = [];
    const missedPoints = [];

    expWords.forEach(w => {
        if (stuWords.has(w)) {
            score += 1;
            correctPoints.push(w);
        } else {
            missedPoints.push(w + (qWords.includes(w) ? " (from the question)" : ""));
        }
    });

    score = Math.round((score / expWords.length) * 100);
    // Cap absurd scores from a single-word match
    score = Math.max(0, Math.min(100, score));

    // Small bonus if the student's answer is notably longer (fuller attempt)
    if (studentAnswer.split(/\s+/).length > 25 && correctPoints.length > 0) {
        score = Math.min(100, score + 5);
    }

    let status, feedback;
    if (score >= 80) {
        status = pick(ENCOURAGE.high);
        feedback = "Great recall! Keep the winning points and add the missing ones next time.";
    } else if (score >= 50) {
        status = pick(ENCOURAGE.mid);
        feedback = "Good foundation! You remembered some key ideas — now fill in the rest.";
    } else {
        status = pick(ENCOURAGE.low);
        feedback = "You covered part of the answer. Review the expected answer and try again!";
    }

    return {
        score: score,
        status: status,
        feedback: feedback,
        correct_points: correctPoints.slice(0, 6),
        missed_points: missedPoints.slice(0, 6),
        memory_trick: "Link the missed key points to a story or picture in your mind."
    };
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function updateRun(score) {
    const run = score >= 70 ? (Number(localStorage.getItem(RUN_KEY)) || 0) + 1 : 0;
    localStorage.setItem(RUN_KEY, run);
}

// ---------- RENDER EVALUATION ----------

function renderEvaluation(evaluation) {
    const score = Number(evaluation.score) || 0;

    // Score ring + color by tier
    const ring = $("scoreRing");
    const fill = $("ringFill");
    ring.style.setProperty("--ring-value", score);
    const ringColor = score >= 80 ? "var(--mint)" : score >= 60 ? "var(--gold)" : "var(--orange)";
    ring.style.setProperty("--ring-color", ringColor);
    fill.style.stroke = ringColor;
    $("score").textContent = score;

    // Status + encouragement
    let status = evaluation.status || "Result";
    $("resultStatus").textContent = status;

    let pools;
    if (score === 100) pools = ENCOURAGE.perfect;
    else if (score >= 70) pools = ENCOURAGE.high;
    else if (score >= 50) pools = ENCOURAGE.mid;
    else pools = ENCOURAGE.low;
    const rand = pools[Math.floor(Math.random() * pools.length)];
    $("feedback").textContent = evaluation.feedback || rand;
    if (score < 50) {
        $("feedback").textContent = rand + " " + (evaluation.feedback || "");
    }

    fillList("correctPoints", evaluation.correct_points, "No major points detected.");
    fillList("missedPoints", evaluation.missed_points, "Nothing important missed! 🎉");

    $("memoryTrick").textContent = evaluation.memory_trick;
}

function fillList(id, points, emptyText) {
    const list = $(id);
    list.innerHTML = "";

    if (Array.isArray(points) && points.length > 0) {
        points.forEach(point => {
            const item = document.createElement("li");
            item.textContent = point;
            list.appendChild(item);
        });
    } else {
        const item = document.createElement("li");
        item.textContent = emptyText;
        list.appendChild(item);
    }
}

// ---------- PAGE HELPERS ----------

function scrollToPractice() {
    $("question").scrollIntoView({ behavior: "smooth", block: "center" });
}

// ---------- INIT ----------

function initPractice() {
    loadTheme();
    loadCards();
    initSoundButton();
    updateNavPill();
    updateActiveNav("practice");
    initScrollReveal();

    maybeResetStreak();

    // Allow deep-linking from a freshly saved card: practice.html?card=<id>
    const params = new URLSearchParams(window.location.search);
    const cardId = Number(params.get("card"));
    if (cardId && findCard(cardId)) {
        loadCardIntoPractice(findCard(cardId));
    } else if (cards.length > 0) {
        startPractice();
    }
}

window.init = initPractice;
window.startPractice = startPractice;
window.startCard = startCard;
window.nextQuestion = nextQuestion;
window.checkAnswer = checkAnswer;
window.scrollToPractice = scrollToPractice;