// Preguntas de trivia con IA, usando Workers AI de Cloudflare (plan gratis: 10.000 "neuronas" al día).
//
// Se configura con variables de entorno en Render (nunca en el código):
//   CF_ACCOUNT_ID   → el ID de la cuenta de Cloudflare
//   CF_AI_TOKEN     → un token con permiso "Workers AI" (Read y Edit)
//   CF_AI_MODEL     → opcional; por defecto un modelo disponible en el plan gratis
//   TRIVIA_DAILY_LIMIT → opcional; máximo de trivias con IA al día en todo el servidor (100)
// Sin CF_ACCOUNT_ID o CF_AI_TOKEN, la trivia funciona igual en modo "entre amigos".

const DEFAULT_MODEL = "@cf/google/gemma-4-26b-a4b-it";
const QUESTIONS = 5;
const TIMEOUT_MS = 20_000;

const SCHEMA = {
  type: "object",
  properties: {
    known: { type: "boolean" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "integer" },
        },
        required: ["question", "options", "answer"],
      },
    },
  },
  required: ["known", "questions"],
};

const clean = (value, max) =>
  typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Mezcla las opciones (la IA tiende a poner la correcta siempre de primera). */
function shuffle(question) {
  const order = question.options.map((_, i) => i).sort(() => Math.random() - 0.5);
  return {
    question: question.question,
    options: order.map((i) => question.options[i]),
    answer: order.indexOf(question.answer),
  };
}

/** Valida lo que devolvió la IA: solo pasan preguntas completas y bien formadas. */
function parseQuestions(raw) {
  let data = raw;
  if (typeof data === "string") {
    const match = data.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      data = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
  if (!data || data.known === false || !Array.isArray(data.questions)) return null;
  const questions = [];
  for (const q of data.questions) {
    const question = clean(q?.question, 160);
    const options = Array.isArray(q?.options) ? q.options.map((o) => clean(o, 60)).filter(Boolean) : [];
    const answer = q?.answer;
    if (question.length < 5 || options.length !== 4 || new Set(options).size !== 4) continue;
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) continue;
    questions.push(shuffle({ question, options, answer }));
    if (questions.length === QUESTIONS) break;
  }
  return questions.length >= 3 ? questions : null;
}

/** El texto (u objeto) de la respuesta, venga en el formato de Workers AI o en el de OpenAI. */
function responseOf(body) {
  const result = body?.result ?? body;
  return result?.response ?? result?.choices?.[0]?.message?.content ?? result?.output_text ?? null;
}

function createTriviaAI(env = process.env, fetchImpl = globalThis.fetch) {
  const accountId = env.CF_ACCOUNT_ID;
  const token = env.CF_AI_TOKEN;
  const model = env.CF_AI_MODEL || DEFAULT_MODEL;
  const baseUrl = (env.CF_AI_BASE_URL || "https://api.cloudflare.com/client/v4").replace(/\/$/, "");
  const dailyLimit = Number(env.TRIVIA_DAILY_LIMIT) > 0 ? Number(env.TRIVIA_DAILY_LIMIT) : 100;
  const enabled = !!(accountId && token && /^[a-f0-9]{32}$/i.test(accountId));

  // Las mismas preguntas sirven para todas las salas que vean la misma película (ahorra cupo).
  const cache = new Map(); // título normalizado → { questions, at }
  let day = "";
  let usedToday = 0;

  async function generate(title) {
    const name = clean(title, 120);
    if (!enabled || name.length < 2) return null;
    const key = name.toLowerCase();
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < 24 * 3600_000) return cached.questions.map(shuffle);

    const today = new Date().toISOString().slice(0, 10);
    if (today !== day) {
      day = today;
      usedToday = 0;
    }
    if (usedToday >= dailyLimit) return null;
    usedToday++;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetchImpl(`${baseUrl}/accounts/${accountId}/ai/run/${model}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          max_tokens: 1200,
          temperature: 0.4,
          response_format: { type: "json_schema", json_schema: SCHEMA },
          messages: [
            {
              role: "system",
              content:
                "Eres el anfitrión de una trivia de cine para amigos que acaban de ver algo juntos. " +
                "Respondes solo con JSON. Nunca inventas datos: si no conoces con certeza la película o serie, " +
                'respondes {"known": false, "questions": []}.',
            },
            {
              role: "user",
              content:
                `Acabamos de ver «${name}». Crea ${QUESTIONS} preguntas de opción múltiple en español sobre ` +
                "su trama, sus personajes y datos conocidos de la producción. Cada pregunta tiene 4 opciones " +
                'distintas y "answer" es el índice (0 a 3) de la correcta. Preguntas cortas y divertidas.',
            },
          ],
        }),
      });
      if (!response.ok) {
        console.warn(`[trivia] la IA respondió ${response.status}`);
        return null;
      }
      const questions = parseQuestions(responseOf(await response.json()));
      if (questions) cache.set(key, { questions, at: Date.now() });
      if (cache.size > 500) cache.delete(cache.keys().next().value);
      return questions;
    } catch (error) {
      console.warn(`[trivia] la IA no respondió: ${error?.name ?? "error"}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return { enabled, generate };
}

module.exports = { createTriviaAI, parseQuestions };
