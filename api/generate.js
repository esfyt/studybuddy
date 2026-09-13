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

        if (!question) {
            return json({ error: "question is required" }, 400);
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
                        content: `You are Buddy, a friendly AI study owl for school students. Generate a correct, concise, school-level expected answer for the given question.

IMPORTANT:
- Focus on the core concepts needed to answer the question.
- Do not add advanced information beyond the student's level.
- Use simple and clear language.
- Structure it as 3 to 5 short, clear key points (like bullet points), each on its own line starting with "-".
- The whole answer should be memorisable in under 30 seconds.
- If the question is subjective, explain the key points that a good answer should contain.
${contextNote}

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

        return json({ answer: generated.answer.trim() });
    } catch (error) {
        console.error("Generate API error:", error);
        return json({ error: error.message || "Generation failed" }, 502);
    }
}
