// ========================================
// STUDY BUDDY — AI SUBJECT DETECTION (Vercel serverless)
// POST /api/detect-subject
// Body: { question: "string" }
// Returns: { subject: "Physics" }  (or { subject: "General" } as fallback)
// ========================================

const SUBJECTS = [
    "Mathematics", "Science", "Physics", "Chemistry", "Biology",
    "History", "Geography", "Civics", "Economics", "English",
    "Hindi", "Computer Science"
];

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

        if (question.length < 5) {
            return json({ error: "question is too short to classify" }, 400);
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return json({ error: "GROQ_API_KEY is not set on the server" }, 500);
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
                        content: `You are a helpful study assistant that classifies a school student's study question into exactly ONE subject.

Choose only from this list:
${subjectList}

Rules:
- If the question clearly fits one subject, return that subject's exact name.
- For general science questions that do not clearly belong to Physics, Chemistry or Biology, use "Science".
- If you are not confident, return "General".
- Respond with ONLY a single subject name, no punctuation, no extra words.`
                    },
                    {
                        role: "user",
                        content: `Question: ${question}`
                    }
                ],
                temperature: 0,
                max_tokens: 16
            })
        });

        if (!groqRes.ok) {
            const detail = await groqRes.text();
            throw new Error(`Groq API error ${groqRes.status}: ${detail.slice(0, 200)}`);
        }

        const data = await groqRes.json();
        const aiText = (data.choices?.[0]?.message?.content || "").trim();

        let subject = "General";
        if (aiText) {
            const match = SUBJECTS.find(s => aiText.toLowerCase().includes(s.toLowerCase()));
            if (match) subject = match;
        }

        return json({ subject });
    } catch (error) {
        console.error("Detect subject API error:", error);
        return json({ error: error.message || "Subject detection failed" }, 502);
    }
}
