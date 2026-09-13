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
    if (parts.length === 0) return "";
    return "\n\nStudent context:\n" + parts.map(p => `- ${p}`).join("\n") +
        "\nMatch the depth and difficulty of your answer to this context.";
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
}

export default async function handler(request) {
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        });
    }

    if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
    }

    try {
        const body = await request.json();
        const question = String(body.question || "").trim();
        const expected = String(body.expected || "").trim();
        const answer = String(body.answer || "").trim();

        if (!question || !expected || !answer) {
            return json({ error: "question, expected and answer are required" }, 400);
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return json({ error: "GROQ_API_KEY is not set on the server" }, 500);
        }

        const contextNote = buildContextNote({
            board: body.board,
            class: body.class || body["class"],
            standard: body.standard,
            subject: body.subject
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
                        content: `You are Buddy, a friendly AI study owl that evaluates a school student's answer against the expected answer.

Be fair, educational, warm and encouraging.

IMPORTANT RULES:
1. Judge the student's UNDERSTANDING, not exact wording.
2. Different wording is completely acceptable if the meaning is correct.
3. Use the expected answer as the main reference for correctness.
4. Identify which important concepts the student correctly included.
5. Identify which important concepts the student missed.
6. Do not penalize for small grammar or spelling mistakes if the meaning is clear.
7. Give partial credit for partially correct answers.
8. Keep feedback appropriate for a school student.
9. Give a score from 0 to 100.
10. Status should be one of:
   "Amazing! 🎉 Excellent!"
   "Great Job! 👍"
   "Good Start! 💪"
   "No worries, keep practising! 🌱"
11. Give one simple memory trick — a single sentence with at most one emoji.
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

        return json(evaluation);
    } catch (error) {
        console.error("Evaluation API error:", error);
        return json({ error: error.message || "Evaluation failed" }, 502);
    }
}
