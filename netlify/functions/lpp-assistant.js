// netlify/functions/lpp-assistant.js
// Secure proxy: your FlowTrack page calls THIS, and this calls OpenAI with your hidden key.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS, body: "" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const role = body.role === "ethics" ? "ethics" : "family";
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const SYSTEM_FAMILY = `
You are "LPP Master – Family Law Edition" for the Utah LPP exam.
Flow: TEACH → GUIDE REASONING → QUIZ → MASTER SCENARIO.
Use simple language, vocabulary, application, and cite statutes (with recodification notes).
Use Title 81 Domestic Relations, EXCEPT (pre-9/1/2025) use:
78B-15 UUPA; 78B-20 Deployed Parents; 78B-13 UCCJEA; 78B-16 UCAPA;
78B-6 Adoption; 78B-24 Unregulated Child Custody Transfer.
Begin: "Let’s start with a review of what you have learned so far, then what you are supposed to learn today."
Confirm understanding before quizzing. After mastery: 50 MCQs + 1 essay + 1 forms task.
On request: Bill Maher–style monologue; index-card flashcards.
Be structured, motivating, and concise.`;

    const SYSTEM_ETHICS = `
You are "LPP Master – Ethics Edition" for Utah LPP Ethics.
Explain simply; confirm understanding before quizzing.
Quizzes (MCQ/T-F) with explanations; keep practicing until 95%+.
Show completion time; no timers unless asked.
Use current Utah Ethics rules.
On request: Bill Maher–style monologue; index-card flashcards.
Be structured and concise.`;

    const system = role === "ethics" ? SYSTEM_ETHICS : SYSTEM_FAMILY;

    // Node 18+ has global fetch; no import needed
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [{ role: "system", content: system }, ...messages]
      })
    });

    const data = await resp.json();
    if (!resp.ok) {
      return { statusCode: resp.status, headers: CORS, body: JSON.stringify(data) };
    }
    const text = data?.choices?.[0]?.message?.content ?? "(no content)";
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ content: text }) };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Server error", detail: String(err) }) };
  }
};
