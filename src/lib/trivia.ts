// Trivia al final de la película: el servidor manda el estado (ver server/trivia.js).
// Aquí se valida campo por campo antes de mostrarlo (todo se pinta como texto, nunca como HTML).

export interface TriviaState {
  id: number;
  mode: "ai" | "friends";
  phase: "loading" | "collect" | "question" | "reveal" | "end";
  title: string;
  index: number;
  total: number;
  endsAt: number | null;
  players: number;
  submitted: number;
  answered: number;
  question: string;
  options: string[];
  author: string | null;
  correct: number | null;
  scores: { name: string; avatar: string; points: number }[];
  you: { answered: boolean; choice: number | null; isAuthor: boolean; submitted: boolean; canStop: boolean };
}

const PHASES = ["loading", "collect", "question", "reveal", "end"] as const;
const text = (value: unknown, max: number, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
const int = (value: unknown, max: number) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max ? value : 0;

export function cleanTrivia(raw: unknown): TriviaState | null {
  const d = (raw ?? {}) as Record<string, unknown>;
  if (typeof d.id !== "number" || !Number.isInteger(d.id) || !PHASES.includes(d.phase as TriviaState["phase"])) return null;
  const options = Array.isArray(d.options) ? d.options.slice(0, 4).map((o) => text(o, 60, "?")) : [];
  const you = (d.you ?? {}) as Record<string, unknown>;
  const correct = typeof d.correct === "number" && Number.isInteger(d.correct) && d.correct >= 0 && d.correct < options.length ? d.correct : null;
  return {
    id: d.id,
    mode: d.mode === "friends" ? "friends" : "ai",
    phase: d.phase as TriviaState["phase"],
    title: text(d.title, 120, ""),
    index: int(d.index, 50),
    total: int(d.total, 50),
    endsAt: typeof d.endsAt === "number" ? d.endsAt : null,
    players: int(d.players, 50),
    submitted: int(d.submitted, 50),
    answered: int(d.answered, 50),
    question: text(d.question, 160, ""),
    options,
    author: typeof d.author === "string" ? d.author.slice(0, 24) : null,
    correct,
    scores: (Array.isArray(d.scores) ? d.scores.slice(0, 20) : []).map((x) => {
      const s = (x ?? {}) as Record<string, unknown>;
      return { name: text(s.name, 24, "Invitado"), avatar: text(s.avatar, 8, "🍿"), points: int(s.points, 100000) };
    }),
    you: {
      answered: you.answered === true,
      choice: typeof you.choice === "number" && Number.isInteger(you.choice) ? you.choice : null,
      isAuthor: you.isAuthor === true,
      submitted: you.submitted === true,
      canStop: you.canStop === true,
    },
  };
}
