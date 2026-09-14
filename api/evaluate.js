// ========================================
// STUDY BUDDY — AI ANSWER EVALUATION (Vercel serverless)
// POST /api/evaluate
// Body: { question, expected, answer, subject, board, standard, class }
// Returns: { score, status, feedback, correct_points, missed_points, memory_trick }
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
        "\nMatch your evaluation to this student's class level. For Class 6-8 focus on basic understanding. For Class 9-10 check key terms and definitions. For Class 11-12 expect precise scientific language.";
}

export function buildLengthRule(standard) {
    const s = String(standard || "").trim().toLowerCase();
    if (s === "low")
        return "LOW standard: the answer was expected to be 1-2 short lines — a definition or one key point. A short, correct answer should score just as high as a longer one.";
    if (s === "high")
        return "HIGH standard: the answer was expected to be 8-10 detailed lines/points with key terms, definitions and examples. Expect depth, but only gently penalize brevity if the key concepts are all present.";
    // default Medium
    return "MEDIUM standard: the answer was expected to be 4-5 clear key points/bullets.";
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
        const expected = String(body.expected || "").trim();
        const answer = String(body.answer || "").trim();

        if (!question || !expected || !answer) {
            return sendJson(res, { error: "question, expected and answer are required" }, 400);
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return sendJson(res, { error: "GROQ_API_KEY is not set on the server" }, 500);
        }

        const expectedLength = buildLengthRule(body.standard);
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
                        content: `You are Buddy, a friendly AI study owl that evaluates a school student's answer against the expected answer. You follow Indian NCERT textbook conventions.

Be fair, educational, warm and encouraging.

EVALUATION RULES:
1. Judge the student's UNDERSTANDING, not exact wording. Different wording is fine if the meaning matches.
2. Use the expected answer as the main reference for correctness.
3. Check for correct key terminology — e.g. "photosynthesis" not "making food", "mitochondria" not "energy organ". If the student used the right concept but wrong term, give partial credit and gently note the correct term.
4. For science questions: if a formula or definition is expected and the student got it right, highlight that as a strength.
5. For history/geography: check for correct key facts (dates, names, events, places).
6. Identify which important concepts the student correctly included (correct_points).
7. Identify which important concepts the student missed (missed_points).
8. Do not penalize for small grammar or spelling mistakes if the meaning is clear.
9. Give partial credit for partially correct answers.
10. Keep feedback appropriate for Indian school students — warm, specific, actionable.
11. Score from 0 to 100:
    - 90-100: "Amazing! 🎉 Excellent!" — near-perfect or perfect
    - 70-89: "Great Job! 👍" — solid understanding, minor gaps
    - 40-69: "Good Start! 💪" — partial understanding, key concepts missed
    - 0-39: "No worries, keep practising! 🌱" — needs more work
12. Give one simple memory trick relevant to this topic — a single sentence with at most one emoji. Use mnemonics if possible (e.g. "Never Eat Shredded Wheat" for compass directions).

EXPECTED LENGTH — judge the answer against this standard:
${expectedLength}
${contextNote}

Return ONLY valid JSON in this exact structure:
{
    "score": 0,
    "status": "Excellent!",
    "feedback": "string",
    "correct_points": ["string"],
    "missed_points": ["string"],
    "memory_trick": "string"}`
                    },
                    {
                        role: "user",
                        content: `Question:\n${question}\n\nExpected Answer:\n${expected}\n\nStudent Answer:\n${answer}`
                    }
                ],
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: "answer_evaluation",
                        strict: true,
                        schema: {
                            type: "object",
                            properties: {
                                score: { type: "integer", minimum: 0, maximum: 100 },
                                status: { type: "string" },
                                feedback: { type: "string" },
                                correct_points: { type: "array", items: { type: "string" } },
                                missed_points: { type: "array", items: { type: "string" } },
                                memory_trick: { type: "string" }
                            },
                            required: ["score", "status", "feedback", "correct_points", "missed_points", "memory_trick"],
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
            throw new Error("AI returned an empty response.");
        }

        let evaluation;
        try {
            evaluation = JSON.parse(aiText);
        } catch (e) {
            throw new Error("AI returned invalid JSON.");
        }

        if (typeof evaluation.score !== "number") {
            throw new Error("AI returned an invalid score.");
        }
        evaluation.score = Math.max(0, Math.min(100, Math.round(evaluation.score)));

        return sendJson(res, evaluation);
    } catch (error) {
        console.error("Evaluation API error:", error);
        return sendJson(res, { error: error.message || "Evaluation failed" }, 502);
    }
}
