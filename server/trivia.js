// Trivia al final de la película.
//
// Dos modos:
//  - "ai": la IA (trivia-ai.js) hace 5 preguntas sobre lo que vieron.
//  - "friends": si la IA no conoce la película (o no hay cupo), cada quien escribe una
//    pregunta durante 90 s y los demás la responden. Quien la escribió no la responde.
//
// Todo el estado vive en el servidor: los clientes solo muestran el evento "trivia"
// (cada dispositivo recibe además "you": si ya respondió, qué eligió y si la pregunta es suya).
// La respuesta correcta nunca viaja antes de que termine el tiempo de la pregunta.

const QUESTION_MS = 20_000;
const REVEAL_MS = 5_000;
const COLLECT_MS = 90_000;
const LOADING_MS = 25_000;
const START_COOLDOWN_MS = 30_000;
const MAX_FRIEND_QUESTIONS = 10;
const AI_PER_ROOM_PER_DAY = 5;

const clean = (value, max) =>
  typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Pregunta escrita por alguien de la sala: 2 a 4 opciones, una correcta. */
function cleanFriendQuestion(data) {
  const question = clean(data?.question, 160);
  const options = Array.isArray(data?.options) ? data.options.slice(0, 4).map((o) => clean(o, 60)) : [];
  const answer = data?.answer;
  if (question.length < 3 || options.length < 2 || options.some((o) => !o)) return null;
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return null;
  if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;
  return { question, options, answer };
}

/**
 * @param {import("socket.io").Server} io
 * @param {{ rooms: Map<string, any>, membersWithKeys: (roomId: string) => any[], ai: { enabled: boolean, generate: (title: string) => Promise<any[]|null> } }} deps
 */
function createTrivia(io, { rooms, membersWithKeys, ai }) {
  const games = new Map(); // roomId → partida
  const lastStart = new Map(); // roomId → ms
  const aiUses = new Map(); // roomId → { day, count }
  let nextId = 1;

  const keyOf = (roomId, socketId) => rooms.get(roomId)?.memberKeys.get(socketId) ?? `s:${socketId}`;
  const people = (roomId) => membersWithKeys(roomId);

  function scoresOf(game, roomId) {
    const online = new Map(people(roomId).map((m) => [m.key, m]));
    return [...game.scores.entries()]
      .map(([key, s]) => ({ id: online.get(key)?.id ?? s.id, name: online.get(key)?.name ?? s.name, avatar: online.get(key)?.avatar ?? s.avatar, points: s.points }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 20);
  }

  /** Lo que ve todo el mundo (sin la respuesta correcta mientras se puede responder). */
  function publicState(game, roomId) {
    const q = game.questions[game.index];
    const state = {
      id: game.id,
      mode: game.mode,
      phase: game.phase,
      title: game.title,
      index: game.index,
      total: game.questions.length,
      endsAt: game.endsAt,
      players: people(roomId).length,
      scores: scoresOf(game, roomId),
    };
    if (game.phase === "collect") state.submitted = game.questions.length;
    if ((game.phase === "question" || game.phase === "reveal") && q) {
      state.question = q.question;
      state.options = q.options;
      state.author = q.authorName ?? null;
      state.answered = game.answers.size;
      // Quien escribió la pregunta no la responde: no cuenta en "X de Y respondieron".
      if (q.authorKey) state.players = people(roomId).filter((m) => m.key !== q.authorKey).length;
      if (game.phase === "reveal") state.correct = q.answer;
    }
    return state;
  }

  /** Manda el estado a cada dispositivo de la sala, con su parte personal ("you"). */
  function broadcast(roomId) {
    const game = games.get(roomId);
    if (!game) return;
    const state = publicState(game, roomId);
    const q = game.questions[game.index];
    for (const socketId of io.sockets.adapter.rooms.get(roomId) ?? []) {
      const key = keyOf(roomId, socketId);
      const you = {
        answered: game.answers.has(key),
        choice: game.answers.get(key)?.choice ?? null,
        isAuthor: !!q && q.authorKey === key && game.phase !== "collect",
        submitted: game.phase === "collect" && game.questions.some((x) => x.authorKey === key),
        canStop: key === game.startedBy || key === rooms.get(roomId)?.leader,
      };
      io.to(socketId).emit("trivia", { ...state, you });
    }
  }

  function schedule(roomId, ms, next) {
    const game = games.get(roomId);
    if (!game) return;
    clearTimeout(game.timer);
    game.endsAt = Date.now() + ms;
    game.timer = setTimeout(next, ms);
  }

  function askQuestion(roomId) {
    const game = games.get(roomId);
    if (!game) return;
    if (game.index >= game.questions.length) return finish(roomId);
    game.phase = "question";
    game.answers = new Map();
    schedule(roomId, QUESTION_MS, () => reveal(roomId));
    broadcast(roomId);
  }

  function reveal(roomId) {
    const game = games.get(roomId);
    if (!game || game.phase !== "question") return;
    const q = game.questions[game.index];
    for (const [key, a] of game.answers) {
      if (a.choice !== q.answer) continue;
      const score = game.scores.get(key);
      // 100 por acertar y hasta 50 más por responder rápido.
      score.points += 100 + Math.round((50 * Math.max(0, game.endsAt - a.at)) / QUESTION_MS);
    }
    game.phase = "reveal";
    schedule(roomId, REVEAL_MS, () => {
      game.index++;
      askQuestion(roomId);
    });
    broadcast(roomId);
  }

  function finish(roomId) {
    const game = games.get(roomId);
    if (!game) return;
    clearTimeout(game.timer);
    game.phase = "end";
    game.endsAt = null;
    broadcast(roomId);
    games.delete(roomId);
  }

  function startFriends(roomId, game) {
    game.mode = "friends";
    game.phase = "collect";
    schedule(roomId, COLLECT_MS, () => beginFriendQuestions(roomId));
    broadcast(roomId);
  }

  function beginFriendQuestions(roomId) {
    const game = games.get(roomId);
    if (!game || game.phase !== "collect") return;
    if (game.questions.length === 0) return finish(roomId);
    game.questions.sort(() => Math.random() - 0.5);
    game.index = 0;
    askQuestion(roomId);
  }

  function canUseAI(roomId) {
    const today = new Date().toISOString().slice(0, 10);
    const use = aiUses.get(roomId);
    if (!use || use.day !== today) {
      aiUses.set(roomId, { day: today, count: 0 });
      return true;
    }
    return use.count < AI_PER_ROOM_PER_DAY;
  }

  return {
    /** Alguien de la sala abre la trivia. Devuelve un texto de error para quien la pidió, o null. */
    async start(roomId, socketId, { title: typedTitle, friends } = {}) {
      const room = rooms.get(roomId);
      if (!room) return "La sala no existe";
      if (games.has(roomId)) return null; // ya hay una: solo se le manda el estado
      if (Date.now() - (lastStart.get(roomId) ?? 0) < START_COOLDOWN_MS) return "Espera unos segundos para otra trivia";
      lastStart.set(roomId, Date.now());

      const key = keyOf(roomId, socketId);
      const title = clean(room.nowWatching?.title, 120) || clean(typedTitle, 120);
      const game = {
        id: nextId++,
        mode: "ai",
        phase: "loading",
        title,
        questions: [],
        index: 0,
        answers: new Map(),
        scores: new Map(),
        startedBy: key,
        endsAt: null,
        timer: null,
      };
      for (const m of people(roomId)) game.scores.set(m.key, { id: m.id, name: m.name, avatar: m.avatar, points: 0 });
      games.set(roomId, game);

      if (friends === true || !title || !ai.enabled || !canUseAI(roomId)) {
        startFriends(roomId, game);
        return null;
      }
      schedule(roomId, LOADING_MS, () => startFriends(roomId, game));
      broadcast(roomId);
      const questions = await ai.generate(title);
      if (games.get(roomId) !== game || game.phase !== "loading") return null; // la cancelaron
      if (!questions) {
        startFriends(roomId, game);
        return null;
      }
      aiUses.get(roomId).count++;
      game.questions = questions;
      game.index = 0;
      askQuestion(roomId);
      return null;
    },

    answer(roomId, socketId, data) {
      const game = games.get(roomId);
      if (!game || game.phase !== "question" || data?.id !== game.id || data?.index !== game.index) return;
      const q = game.questions[game.index];
      const key = keyOf(roomId, socketId);
      const choice = data?.choice;
      if (game.answers.has(key) || q.authorKey === key) return;
      if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) return;
      if (!game.scores.has(key)) {
        const m = people(roomId).find((p) => p.key === key);
        if (!m) return;
        game.scores.set(key, { id: m.id, name: m.name, avatar: m.avatar, points: 0 });
      }
      game.answers.set(key, { choice, at: Date.now() });
      // Si ya respondieron todos los que pueden responder, no se espera el reloj.
      const canAnswer = people(roomId).filter((m) => m.key !== q.authorKey).length;
      if (game.answers.size >= canAnswer) reveal(roomId);
      else broadcast(roomId);
    },

    /** Modo amigos: alguien manda su pregunta. Devuelve un texto de error, o null. */
    submit(roomId, socketId, data) {
      const game = games.get(roomId);
      if (!game || game.phase !== "collect" || data?.id !== game.id) return "La ronda de preguntas ya cerró";
      const key = keyOf(roomId, socketId);
      if (game.questions.some((q) => q.authorKey === key)) return "Ya enviaste tu pregunta";
      if (game.questions.length >= MAX_FRIEND_QUESTIONS) return "Ya hay suficientes preguntas";
      const q = cleanFriendQuestion(data);
      if (!q) return "Revisa la pregunta: necesita texto, 2 a 4 opciones distintas y la correcta marcada";
      const author = people(roomId).find((m) => m.key === key);
      game.questions.push({ ...q, authorKey: key, authorName: author?.name ?? "Alguien" });
      if (!game.scores.has(key) && author) game.scores.set(key, { id: author.id, name: author.name, avatar: author.avatar, points: 0 });
      // Si ya escribieron todos, se empieza sin esperar.
      if (game.questions.length >= people(roomId).length) beginFriendQuestions(roomId);
      else broadcast(roomId);
      return null;
    },

    /** Quien la abrió (o quien lidera) puede empezar ya las preguntas de amigos o terminarla. */
    control(roomId, socketId, action) {
      const game = games.get(roomId);
      if (!game) return;
      const key = keyOf(roomId, socketId);
      if (key !== game.startedBy && key !== rooms.get(roomId)?.leader) return;
      if (action === "begin" && game.phase === "collect") beginFriendQuestions(roomId);
      if (action === "stop") finish(roomId);
    },

    /** Estado actual para quien acaba de entrar o reabrió el panel. */
    sendState(roomId) {
      if (games.has(roomId)) broadcast(roomId);
    },

    hasGame: (roomId) => games.has(roomId),

    /** La sala se cerró: se limpian los relojes. */
    clear(roomId) {
      clearTimeout(games.get(roomId)?.timer);
      games.delete(roomId);
      lastStart.delete(roomId);
      aiUses.delete(roomId);
    },
  };
}

module.exports = { createTrivia, cleanFriendQuestion };
