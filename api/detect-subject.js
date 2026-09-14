// ========================================
// STUDY BUDDY — AI SUBJECT + CHAPTER DETECTION (Vercel serverless)
// POST /api/detect-subject
// Body: { question: "string" }
// Returns: { subject: "Physics", chapter: "Force and Laws of Motion" }
//          (falls back to { subject: "General", chapter: "" })
// ========================================

const SUBJECTS = [
    "Mathematics", "Science", "Physics", "Chemistry", "Biology",
    "History", "Geography", "Civics", "Economics", "English",
    "Hindi", "Computer Science"
];

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = "";
        req.on("data", chunk => (data += chunk));
        req.on("end", () => {
            try { resolve(JSON.parse(data || "{}")); }
            catch (e) { reject(e); }
        });
        req.on("error", reject);
    });
}

function sendJson(res, data, status = 200) {
    const body = JSON.stringify(data);
    res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end(body);
}

function buildSystemPrompt(subjectList) {
    return `You are a helpful study assistant that classifies a school student's study question into exactly ONE subject and the most likely NCERT/CBSE chapter. The student follows the Indian NCERT/CBSE curriculum (Classes 6-12).

Choose the subject only from this list:
${subjectList}

Subject rules:
- If the question clearly fits one subject, return that subject's exact name.
- Classify science questions into the specific subject whenever possible: Physics, Chemistry, or Biology.
- Use "Science" only for general questions that do not clearly belong to Physics, Chemistry, or Biology.
- Mathematics is separate from Science (even if the question involves numbers).
- Computer Science questions (programming, algorithms, binary, hardware) → "Computer Science".
- History questions about Indian freedom movement, Mughal empire, ancient civilizations → "History".
- Geography questions about Indian geography, climate, monsoon → "Geography".
- Civics questions about Indian constitution, parliament, fundamental rights → "Civics".
- Economics questions about Indian economy, GDP, fiscal policy → "Economics".
- If you are not confident, return "General".

Topic → subject quick reference (stronger than the wording of the question):
- motion, force, energy, electricity, light, machines, gravity, momentum → "Physics"
- atoms, reactions, acids, bases, bonds, elements, chemicals, compounds → "Chemistry"
- plants, cells, body, blood, heart, organs, animals, ecosystems, reproduction → "Biology"
- equations, algebra, geometry, angles, area, theorems, fractions, percentages → "Mathematics"
- grammar, nouns, verbs, tenses, essay, poem, novel, story, writing, comprehension → "English"
- wars, empires, dynasties, revolutions, freedom movement, ancient history → "History"
- rivers, mountains, climate, monsoon, maps, countries, capitals, landforms → "Geography"
- constitution, parliament, democracy, rights, government, elections, judiciary → "Civics"
- inflation, GDP, money, banking, trade, markets, taxes, budget, economy → "Economics"
- programming, code, algorithms, hackers, binary, computers, operating systems → "Computer Science"

Chapter rules:
- Also identify the most likely NCERT/CBSE chapter the question belongs to for that subject (e.g. "Motion", "Acids, Bases and Salts", "The French Revolution", "Polynomials"). Use the exact NCERT chapter name when you are confident.
- If you cannot match an exact NCERT chapter, return the closest topic name a textbook would use for that question (e.g. a force-and-motion question → "Motion"). Prefer a useful best guess over an empty string.
- Only return an empty string for chapter when the subject is "General" or the question truly has no school topic.

Example outputs (always produce this exact JSON shape):
{"subject": "Physics", "chapter": "Force and Laws of Motion"}
{"subject": "Biology", "chapter": "Life Processes"}
{"subject": "Mathematics", "chapter": "Quadratic Equations"}
{"subject": "History", "chapter": "The French Revolution"}

Respond with ONLY valid JSON:
{"subject": "...", "chapter": "..."}`;
}

function buildPayload(question, subjectList, schemaEnabled) {
    const payload = {
        model: "openai/gpt-oss-20b",
        messages: [
            { role: "system", content: buildSystemPrompt(subjectList) },
            { role: "user", content: `Question: ${question}` }
        ],
        temperature: 0,
        max_tokens: 100
    };
    if (schemaEnabled) {
        payload.response_format = {
            type: "json_schema",
            json_schema: {
                name: "subject_chapter_detection",
                strict: false,
                schema: {
                    type: "object",
                    properties: {
                        subject: { type: "string" },
                        chapter: { type: "string" }
                    },
                    required: ["subject", "chapter"],
                    additionalProperties: false
                }
            }
        };
    }
    return payload;
}

async function callGroq(apiKey, requestBody) {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });
    if (!groqRes.ok) {
        const err = new Error("Groq API error " + groqRes.status);
        err.status = groqRes.status;
        err.detail = await groqRes.text();
        throw err;
    }
    return groqRes.json();
}

function extractJson(text) {
    let cleaned = String(text || "").trim()
        .replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    // Cheap repair for the most common model quirk: a trailing comma before } or ]
    cleaned = cleaned
        .replace(/,\s*}/g, "}")
        .replace(/,\s*\]/g, "]");
    try { return JSON.parse(cleaned); } catch (e) { /* fall through */ }
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
        try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (e) { /* fall through */ }
    }
    return null;
}

function parseDetection(aiText) {
    const parsed = extractJson(aiText);
    if (parsed && typeof parsed === "object") {
        const rawSubject = String(parsed.subject || "").trim();
        const match = SUBJECTS.find(s => s.toLowerCase() === rawSubject.toLowerCase());
        if (match) {
            return { subject: match, chapter: String(parsed.chapter || "").trim() };
        }
    }
    // Safety net: bare substring match against the raw text
    const match = SUBJECTS.find(s => String(aiText).toLowerCase().includes(s.toLowerCase()));
    return match ? { subject: match, chapter: "" } : { subject: "General", chapter: "" };
}

export default async function handler(req, res) {
    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        });
        return res.end();
    }

    if (req.method !== "POST") {
        return sendJson(res, { error: "Method not allowed" }, 405);
    }

    try {
        const body = await readBody(req);
        const question = String(body.question || "").trim();

        if (question.length < 5) {
            return sendJson(res, { error: "question is too short to classify" }, 400);
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return sendJson(res, { error: "GROQ_API_KEY is not set on the server" }, 500);
        }

        const subjectList = SUBJECTS.map(s => `- ${s}`).join("\n");

        let data;
        try {
            data = await callGroq(apiKey, buildPayload(question, subjectList, true));
        } catch (e) {
            // Strict/guided JSON generation can hard-fail validation on this model.
            // Re-try once with a plain JSON instruction (no schema constraint).
            if (e.status === 400 && /json_validate_failed|Failed to (generate|validate) JSON/.test(String(e.detail))) {
                try {
                    data = await callGroq(apiKey, buildPayload(question, subjectList, false));
                } catch (e2) {
                    throw new Error(`Groq API error ${e2.status}: ${String(e2.detail).slice(0, 200)}`);
                }
            } else {
                throw new Error(`Groq API error ${e.status}: ${String(e.detail).slice(0, 200)}`);
            }
        }

        const aiText = data.choices?.[0]?.message?.content || "";
        return sendJson(res, parseDetection(aiText));
    } catch (error) {
        console.error("Detect subject API error:", error);
        return sendJson(res, { error: error.message || "Subject detection failed" }, 502);
    }
}