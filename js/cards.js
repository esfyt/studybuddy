// ========================================
// STUDY BUDDY — CARDS PAGE (cards.html)
// Create cards, library grid (portrait), filters,
// AI answer generation, AI subject auto-detection.
// ========================================

// ---------- FORM METADATA ----------

function getFormMeta() {
    const rawSubject = $("cardSubject").value.trim();
    // Keep emoji prefix if present, else clean subject name
    const cleaned = SUBJECTS_MAP.find(s => s.raw && s.raw.toLowerCase() === rawSubject.toLowerCase());
    const subject = cleaned ? cleaned.name : rawSubject;

    return {
        board: $("cardBoard").value,
        class: $("cardClass").value,
        standard: $("cardStandard").value,
        subject: subject || "General"
    };
}

// ---------- FILTERS ----------

function renderFilterOptions() {
    const select = $("filterSubject");
    if (!select) return;
    const previous = select.value;
    const subjects = [...new Set(cards.map(c => c.subject))].sort();

    select.innerHTML =
        '<option value="">All Subjects</option>' +
        subjects
            .map(s => `<option value="${escapeHTML(s)}">${subjectEmoji(s)} ${escapeHTML(s.replace(/^[\u{1F000}-\u{1FAFF}\s]+/u, ""))}</option>`)
            .join("");

    if (subjects.includes(previous)) {
        select.value = previous;
    }
}

function clearFilters() {
    $("filterSubject").value = "";
    $("filterBoard").value = "";
    $("filterClass").value = "";
    renderCards();
}

// ---------- RENDER CARDS (portrait grid) ----------

function renderCards() {
    const list = $("cardsList");
    if (!list) return;
    const count = $("cardCount");
    const filtered = getFilteredCards();

    if (filtered.length === cards.length) {
        count.textContent = cards.length + (cards.length === 1 ? " card" : " cards");
    } else {
        count.textContent = filtered.length + " of " + cards.length + " cards";
    }

    list.innerHTML = "";

    if (cards.length === 0) {
        list.innerHTML =
            `<div class="empty-state">
                <span class="big-emoji">🦉</span>
                <span class="empty-title">No cards yet!</span>
                <span>Create your first study card above. 🌱</span>
            </div>`;
        return;
    }

    if (filtered.length === 0) {
        list.innerHTML =
            `<div class="empty-state">
                <span class="big-emoji">🤔</span>
                <span class="empty-title">Nothing found for this filter!</span>
                <span>Try a different combination above.</span>
                <br>
                <button class="primary-btn empty-btn" onclick="clearFilters()">🧹 Clear Filters</button>
            </div>`;
        return;
    }

    filtered.forEach(card => {
        const el = document.createElement("div");
        el.className = "saved-card";
        const color = subjectColor(card.subject);
        el.style.setProperty("--subj", color);
        el.innerHTML = `
            <div class="saved-card-content">
                <div class="chip-row">
                    ${subjectChip(card.subject)}
                    <span class="chip">${escapeHTML(card.board)}</span>
                </div>
                <h4>${escapeHTML(card.question)}</h4>
                ${card.class ? `<p class="saved-card-class">Class ${escapeHTML(card.class)} · ${escapeHTML(card.standard)}</p>` : `<p class="saved-card-class">${escapeHTML(card.standard)}</p>`}
                <p class="saved-card-answer">${escapeHTML(card.expectedAnswer)}</p>
            </div>
            <div class="saved-card-actions">
                <button class="primary-btn" onclick="startCard(${card.id})">▶ Practice</button>
                <button class="delete-btn" onclick="deleteCard(${card.id})" aria-label="Delete card">🗑️</button>
            </div>
        `;
        list.appendChild(el);
    });
}

// ---------- SAVE / DELETE ----------

function saveCard() {
    const question = $("cardQuestion").value.trim();
    const expectedAnswer = $("cardAnswer").value.trim();
    const meta = getFormMeta();

    if (question === "") {
        showToast("Write a question first! 🙏", "error", "❓");
        $("cardQuestion").focus();
        return;
    }

    if (expectedAnswer === "") {
        showToast("Write the expected answer, or generate it with AI! ✨", "error", "💡");
        $("cardAnswer").focus();
        return;
    }

    const newCard = {
        id: Date.now(),
        ...meta,
        question: question,
        expectedAnswer: expectedAnswer
    };
    cards.push(newCard);

    saveCardsToStorage();
    renderFilterOptions();
    renderCards();

    $("cardQuestion").value = "";
    $("cardAnswer").value = "";

    showToast("Card saved! Great job! 🎴", "success", "🎴");
    playChime("good");
    checkBadges();

    // Jump to Practice with the new card loaded right away
    setTimeout(() => {
        window.location.href = "practice.html?card=" + encodeURIComponent(newCard.id);
    }, 900);
}

function deleteCard(id) {
    const card = findCard(id);
    if (!card) return;

    openConfirm(
        `"${card.question}" will be deleted. Are you sure? 🗑️`,
        "Delete this card?",
        () => {
            const index = cards.findIndex(c => c.id === id);
            if (index === -1) return;

            cards.splice(index, 1);
            saveCardsToStorage();
            renderFilterOptions();
            renderCards();

            if (currentCardId === id) {
                currentCardId = null;
            }
            showToast("Card deleted. Create a new one! ✨", "info", "🗑️");
        }
    );
}

// ---------- AI ANSWER GENERATION (/api/generate) ----------

function writeAnswerManually() {
    const input = $("cardAnswer");
    input.focus();
    input.placeholder = "Write the correct answer or important key points here...";
    input.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function generateAnswer() {
    const questionInput = $("cardQuestion");
    const question = questionInput.value.trim();
    if (question === "") {
        showToast("Write a question first! 🙏", "error", "❓");
        questionInput.focus();
        return;
    }

    const button = $("generateAnswerBtn");
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "✨ AI is thinking...";

    try {
        const meta = getFormMeta();
        const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: question,
                subject: meta.subject,
                board: meta.board,
                standard: meta.standard,
                class: meta.class
            })
        });

        if (!response.ok) {
            throw new Error("AI answer generation failed.");
        }

        const data = await response.json();
        if (!data.answer) {
            throw new Error("The AI returned an invalid answer.");
        }

        $("cardAnswer").value = data.answer;
        showToast("Answer ready! Check it and save your card. ✨", "success", "🤖");
        $("cardAnswer").focus();
    } catch (error) {
        console.error("Generate answer error:", error);
        showToast("AI couldn't generate an answer right now. Try again in a moment! 🙏", "error", "🦉");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

// ---------- AI SUBJECT AUTO-DETECTION ----------

const SUBJECT_KEYWORDS = {
    "Physics": ["force", "energy", "velocity", "acceleration", "gravity", "mass", "wave", "light", "circuit", "voltage", "current", "newton", "motion", "electric", "magnet", "friction", "speed", "momentum"],
    "Chemistry": ["atom", "molecule", "element", "reaction", "acid", "base", "ph", "compound", "bond", "periodic table", "valency", "chemical", "salt", "oxide", "solution", "gas"],
    "Biology": ["cell", "dna", "photosynthesis", "organism", "species", "ecosystem", "organ", "tissue", "evolution", "protein", "blood", "heart", "plant", "animal", "digestion", "respiration", "reproduction", "bacteria"],
    "Mathematics": ["equation", "formula", "algebra", "geometry", "triangle", "angle", "theorem", "proof", "calculate", "solve", "perimeter", "area", "fraction", "decimal", "percentage", "ratio", "pythagoras", "quadratic", "linear", "graph"],
    "History": ["war", "empire", "revolution", "independence", "civilization", "dynasty", "ancient", "medieval", "mughal", "british", "king", "queen", "freedom", "movement", "history", "archaeology", "gandhi", "maurya"],
    "Geography": ["continent", "river", "mountain", "climate", "ocean", "country", "capital", "latitude", "longitude", "monsoon", "earthquake", "volcano", "forest", "desert", "geography", "map", "plateau"],
    "Civics": ["democracy", "constitution", "parliament", "fundamental rights", "government", "panchayat", "judiciary", "citizen", "election", "civil", "law", "preamble", "directive principles"],
    "Economics": ["inflation", "gdp", "demand", "supply", "market", "fiscal", "monetary", "budget", "tax", "commerce", "economy", "money", "bank", "trade", "production", "consumption"],
    "English": ["essay", "paragraph", "grammar", "poetry", "novel", "literature", "composition", "comprehension", "adjective", "noun", "verb", "tense", "story", "letter", "synonym", "antonym"],
    "Computer Science": ["programming", "algorithm", "data structure", "software", "hardware", "binary", "cpu", "memory", "computer", "code", "python", "operating system", "network", "input", "output"]
};

function devanagariPresent(text) {
    return /[ऀ-ॿ]/.test(text);
}

function keywordDetect(question) {
    const lower = question.toLowerCase();
    if (devanagariPresent(question)) return "Hindi";

    for (const [subject, words] of Object.entries(SUBJECT_KEYWORDS)) {
        if (words.some(w => lower.includes(w))) {
            return subject;
        }
    }
    return "General";
}

let lastAutoSubject = null;

function setSubjectDropdown(subjectName) {
    const field = $("cardSubject");
    if (!field || !subjectName || subjectName === "General") return;

    // Don't clobber a subject the user typed by hand
    const current = field.value.trim();
    if (current !== "" && current !== lastAutoSubject) return;

    const entry = SUBJECTS_MAP.find(s => s.name === subjectName);
    field.value = entry ? entry.raw : subjectName;
    lastAutoSubject = field.value;
}

async function detectSubject(question) {
    if (question.length < 10) return;

    // 1) Server AI first (works on Vercel)
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const response = await fetch("/api/detect-subject", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question }),
            signal: controller.signal
        });
        clearTimeout(timer);
        if (response.ok) {
            const data = await response.json();
            if (data.subject) {
                setSubjectDropdown(data.subject);
                return;
            }
        }
    } catch (e) {
        // Server unreachable (local dev) — fall through to keyword detection
    }

    // 2) Keyword fallback
    setSubjectDropdown(keywordDetect(question));
}

function debounce(fn, wait) {
    let t = null;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

// ---------- INIT ----------

function initCards() {
    loadTheme();
    loadCards();
    initSoundButton();
    updateNavPill();
    updateActiveNav("cards");
    initScrollReveal();

    ["filterSubject", "filterBoard", "filterClass"].forEach(id => {
        const el = $(id);
        if (el) el.addEventListener("change", renderCards);
    });

    const q = $("cardQuestion");
    if (q) {
        q.addEventListener("input", debounce(() => {
            detectSubject(q.value.trim());
        }, 800));
    }
}

window.init = initCards;
window.saveCard = saveCard;
window.deleteCard = deleteCard;
window.clearFilters = clearFilters;
window.generateAnswer = generateAnswer;
window.writeAnswerManually = writeAnswerManually;
// On this page practice.js isn't loaded, so "Practice" on a card navigates there.
window.startCard = (id) => {
    window.location.href = "practice.html?card=" + encodeURIComponent(id);
};
window.scrollToCreate = () => {
    const el = $("cardQuestion");
    if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => el.focus(), 600);
    }
};