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

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };
}

export default async function handler(req, res) {
    if (req.method === "OPTIONS") {
        return res.status(200).set(corsHeaders()).json({});
    }

    if (req.method !== "POST") {
        return res.status(405).set(corsHeaders()).json({ error: "Method not allowed" });
    }

    try {
        const body = req.body || {};
        const question = String(body.question || "").trim();

        if (question.length < 5) {
            return res.status(400).set(corsHeaders()).json({ error: "question is too short to classify" });
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return res.status(500).set(corsHeaders()).json({ error: "GROQ_API_KEY is not set on the server" });
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

        return res.status(200).set(corsHeaders()).json({ subject });
    } catch (error) {
        console.error("Detect subject API error:", error);
        return res.status(502).set(corsHeaders()).json({
            error: error.message || "Subject detection failed"
        });
    }
}