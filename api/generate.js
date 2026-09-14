// ========================================
// STUDY BUDDY — AI ANSWER GENERATION (Vercel serverless)
// POST /api/generate
// Body: { question, subject, board, standard, class }
// Returns: { answer: "string" }
// ========================================

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
        "\nMatch the depth and difficulty of your answer to this student's class level. For Class 6-8 keep it simple; for Class 9-10 include key terms and definitions; for Class 11-12 use precise scientific/academic language.";
}

export function buildLengthRule(standard) {
    const s = String(standard || "").trim().toLowerCase();
    if (s === "low")
        return "LOW standard: keep the answer to 1-2 short lines — a clear definition or one key point. No bullet list.";
    if (s === "high")
        return "HIGH standard: give 8-10 detailed key points, each a full concept with key terms, examples or steps, each on its own line starting with '-'.";
    // default Medium
    return "MEDIUM standard: give 4-5 clear key points, each on its own line starting with '-'.";
}

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

        if (!question) {
            return sendJson(res, { error: "question is required" }, 400);
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return sendJson(res, { error: "GROQ_API_KEY is not set on the server" }, 500);
        }

        const lengthRule = buildLengthRule(body.standard);
        const contextNote = buildContextNote({
            board: body.board,
            class: body.class,
            standard: body.standard,
            subject: body.subject,
            chapter: body.chapter
        });

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
                        content: `You are Buddy, a friendly AI study owl helping Indian school students (Classes 6-12, CBSE/NCERT curriculum). Generate a correct, concise answer for the given study question.

ANSWER STYLE — follow NCERT textbook conventions:
- Start with a clear definition or key statement (like NCERT textbooks do).
- Use the correct subject terminology — e.g. "Newton's Second Law" not just "second law", "photosynthesis" not "making food".
- For science subjects: state the formula or law first, then explain in simple words.
- For history/geography: use key terms (dates, names, places) that appear in NCERT textbooks.
- For maths: show the formula, then the steps.
- For English/languages: use proper literary terms where relevant.

LENGTH RULES — follow the standard below for how long the answer must be:
${lengthRule}

FORMAT:
- Structure as the number of key points required by the LENGTH RULES above, each on its own line starting with "-" (Low standard has no bullet list — just 1-2 short lines).
- Each point should be one complete concept — not a half-sentence. For High standard, add key terms, definitions, examples, or steps per point.
- The whole answer should be memorisable in under 30 seconds for Low/Medium.
- If the question is subjective (essay/long answer type), list the key points a good textbook answer should cover.
- Use language appropriate for Indian school students.
${contextNote}

IMPORTANT: Do not add advanced university-level content. Do not use Western textbook conventions — follow Indian NCERT style: definitions first, key terms bold, simple explanations. Accuracy is critical — if unsure, say the most likely correct answer and add a small note.

Return ONLY valid JSON in this exact structure:
{ "answer": "string" }`
                    },
                    {
                        role: "user",
                        content: `Question:\n${question}`
                    }
                ],
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: "generated_answer",
                        strict: true,
                        schema: {
                            type: "object",
                            properties: { answer: { type: "string" } },
                            required: ["answer"],
                            additionalProperties: false
                        }
                    }
                }
            })
        });

        if (!groqRes.ok) {
            const detail = await groqRes.text();
            throw new Error(`Groq API error ${groqRes.status}: ${detail.slice(0, 200)}`);
        }

        const data = await groqRes.json();
        const aiText = data.choices?.[0]?.message?.content;
        if (!aiText) {
            throw new Error("The AI returned an empty answer.");
        }

        let generated;
        try {
            generated = JSON.parse(aiText);
        } catch (e) {
            throw new Error("The AI returned invalid JSON.");
        }

        if (!generated.answer || typeof generated.answer !== "string") {
            throw new Error("The AI returned an invalid answer.");
        }

        return sendJson(res, { answer: generated.answer.trim() });
    } catch (error) {
        console.error("Generate API error:", error);
        return sendJson(res, { error: error.message || "Generation failed" }, 502);
    }
}
