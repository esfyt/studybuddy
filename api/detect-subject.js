// ========================================
// STUDY BUDDY — AI SUBJECT + CHAPTER DETECTION (Vercel serverless)
// POST /api/detect-subject
// Body: { question: "string" }
// Returns: { subject: "Physics", chapter: "Motion" }
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

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "openai/gpt-oss-20b",
                messages: [
                    {
                        role: "system",
                        content: `You are a helpful study assistant that classifies a school student's study question into exactly ONE subject and the most likely NCERT/CBSE chapter. The student follows the Indian NCERT/CBSE curriculum (Classes 6-12).

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

Chapter rules:
- Also identify the most likely NCERT/CBSE chapter the question belongs to for that subject (e.g. "Motion", "Acids, Bases and Salts", "The French Revolution", "Polynomials"). Use the exact NCERT chapter name when you are confident.
- If you cannot match an exact NCERT chapter, return the closest topic name a textbook would use for that question (e.g. a force-and-motion question → "Motion"). Prefer a useful best guess over an empty string.
- Only return an empty string for chapter when the subject is "General" or the question truly has no school topic.

Examples (question → subject, chapter):
- "What is Newton's second law of motion?" → "Physics", "Force and Laws of Motion"
- "Explain photosynthesis in plants" → "Biology", "Life Processes"
- "Solve x2 - 5x + 6 = 0" → "Mathematics", "Quadratic Equations"
- "Why did the French Revolution happen?" → "History", "The French Revolution"

Respond with ONLY valid JSON:
{ "subject": "...", "chapter": "..." }`
                    },
                    {
                        role: "user",
                        content: `Question: ${question}`
                    }
                ],
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: "subject_chapter_detection",
                        strict: true,
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
                },
                temperature: 0,
                max_tokens: 100
            })
        });

        if (!groqRes.ok) {
            const detail = await groqRes.text();
            throw new Error(`Groq API error ${groqRes.status}: ${detail.slice(0, 200)}`);
        }

        const data = await groqRes.json();
        const aiText = (data.choices?.[0]?.message?.content || "").trim();

        // Parse JSON, but keep the old substring-match subject validation as a safety net.
        // A chapter is only trusted when the subject matches a known subject.
        let subject = "General";
        let chapter = "";
        try {
            const parsed = JSON.parse(aiText);
            const rawSubject = String(parsed.subject || "").trim();
            const match = SUBJECTS.find(s => s.toLowerCase() === rawSubject.toLowerCase());
            if (match) {
                subject = match;
                chapter = String(parsed.chapter || "").trim();
            }
        } catch (e) {
            // Fall through to bare subject substring match on the raw text
            const match = SUBJECTS.find(s => aiText.toLowerCase().includes(s.toLowerCase()));
            if (match) subject = match;
        }

        return sendJson(res, { subject, chapter });
    } catch (error) {
        console.error("Detect subject API error:", error);
        return sendJson(res, { error: error.message || "Subject detection failed" }, 502);
    }
}
