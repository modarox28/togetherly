"use client";

import { useEffect, useState } from "react";
import { Target, Check } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { TriviaState } from "@/lib/trivia";

// Trivia al final de la película (ver server/trivia.js). Va encima del chat.
// Todo el texto se pinta como texto de React: nunca como HTML.

interface TriviaPanelProps {
  trivia: TriviaState | null;
  offer: string | null;
  error: string | null;
  onStart: (title?: string) => void;
  onDismissOffer: () => void;
  onAnswer: (id: number, index: number, choice: number) => void;
  onSubmit: (id: number, question: string, options: string[], answer: number) => void;
  onControl: (action: "begin" | "stop") => void;
}

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

const pill = "rounded-full px-4 py-2 text-sm font-bold transition-colors";
const primary = `${pill} bg-accent text-day-900 hover:brightness-105`;
const soft = `${pill} bg-day-900/5 text-day-900 hover:bg-day-900/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15`;
const field =
  "w-full rounded-xl border border-day-900/10 bg-white px-3 py-2 text-sm text-day-900 outline-none focus:border-accent dark:border-white/10 dark:bg-night-900 dark:text-white";

export function TriviaPanel({ trivia, offer, error, onStart, onDismissOffer, onAnswer, onSubmit, onControl }: TriviaPanelProps) {
  const { t } = useLanguage();
  const tr = t.trivia;
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [closedId, setClosedId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [draft, setDraft] = useState({ forId: -1, question: "", options: ["", "", "", ""], answer: null as number | null });
  const [note, setNote] = useState("");

  // Cada trivia nueva empieza con el formulario vacío.
  if (trivia && draft.forId !== trivia.id) {
    setDraft({ forId: trivia.id, question: "", options: ["", "", "", ""], answer: null });
    setNote("");
  }

  const ticking = !!trivia && (trivia.phase === "question" || trivia.phase === "collect");
  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ticking]);

  const showGame = !!trivia && !(trivia.phase === "end" && closedId === trivia.id);
  const showOffer = offer !== null && (!trivia || trivia.phase === "end");
  const showStart = open && !showGame && !showOffer;
  const left = trivia?.endsAt ? Math.max(0, Math.min(99, Math.floor((trivia.endsAt - now) / 1000))) : null;

  const start = (title?: string) => {
    setOpen(false);
    setClosedId(null);
    onStart(title);
  };

  if (!showGame && !showOffer && !showStart) {
    return (
      <div className="flex-shrink-0 px-4 pt-3">
        <button onClick={() => setOpen(true)} className={`${soft} flex w-full items-center justify-center gap-2`}>
          <Target className="h-4 w-4 text-accent" aria-hidden="true" />
          {tr.open}
        </button>
      </div>
    );
  }

  let header = `🎯 ${tr.title}`;
  let body: React.ReactNode = null;

  if (showStart || (showOffer && !showGame)) {
    body = (
      <>
        <p className="font-bold">{showOffer && offer ? fill(tr.offer, { title: offer }) : tr.offerNoTitle}</p>
        {!offer ? (
          <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={120} placeholder={tr.topic} aria-label={tr.topic} className={field} />
        ) : null}
        <div className="flex gap-2">
          <button className={primary} onClick={() => start(offer ? undefined : topic)}>
            {tr.play}
          </button>
          <button
            className={soft}
            onClick={() => {
              setOpen(false);
              onDismissOffer();
            }}
          >
            {tr.notNow}
          </button>
        </div>
      </>
    );
  } else if (trivia!.phase === "loading") {
    body = <p className="font-bold">{fill(tr.loading, { title: trivia!.title })}</p>;
  } else if (trivia!.phase === "collect") {
    const g = trivia!;
    header = `🎯 ${tr.friends}`;
    body = (
      <>
        {g.you.submitted ? (
          <p className="font-bold">{tr.waiting}</p>
        ) : (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const filled = draft.options.map((o, i) => ({ o: o.trim(), i })).filter((x) => x.o);
              const answer = filled.findIndex((x) => x.i === draft.answer);
              if (draft.question.trim().length < 3 || filled.length < 2 || answer === -1) return setNote(tr.missing);
              setNote("");
              onSubmit(g.id, draft.question, filled.map((x) => x.o), answer);
            }}
          >
            <p className="text-xs text-day-900/60 dark:text-white/60">{tr.writeHint}</p>
            <input
              value={draft.question}
              onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
              maxLength={160}
              placeholder={tr.question}
              aria-label={tr.question}
              className={field}
            />
            {draft.options.map((value, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={value}
                  onChange={(e) => setDraft((d) => ({ ...d, options: d.options.map((o, j) => (j === i ? e.target.value : o)) }))}
                  maxLength={60}
                  placeholder={`${fill(tr.option, { n: i + 1 })}${i > 1 ? ` ${tr.optional}` : ""}`}
                  aria-label={fill(tr.option, { n: i + 1 })}
                  className={field}
                />
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, answer: i }))}
                  aria-label={fill(tr.markRight, { n: i + 1 })}
                  aria-pressed={draft.answer === i}
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${draft.answer === i ? "bg-emerald-400 text-day-900" : "bg-day-900/5 dark:bg-white/10"}`}
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <button type="submit" className={primary}>
              {tr.send}
            </button>
          </form>
        )}
        <p className="text-xs text-day-900/60 dark:text-white/60">{fill(tr.wrote, { n: g.submitted, total: g.players })}</p>
        {g.you.canStop && g.submitted > 0 ? (
          <button className={`${soft} self-start`} onClick={() => onControl("begin")}>
            {tr.beginNow}
          </button>
        ) : null}
      </>
    );
  } else if (trivia!.phase === "question" || trivia!.phase === "reveal") {
    const g = trivia!;
    header = `🎯 ${fill(tr.questionOf, { n: g.index + 1, total: g.total })}`;
    const hit = g.you.choice !== null && g.you.choice === g.correct;
    body = (
      <>
        {g.author ? <p className="text-xs text-day-900/60 dark:text-white/60">{g.you.isAuthor ? tr.byYou : fill(tr.by, { name: g.author })}</p> : null}
        <p className="text-base font-bold">{g.question}</p>
        <div className="flex flex-col gap-2">
          {g.options.map((option, i) => {
            const right = g.phase === "reveal" && g.correct === i;
            const wrong = g.phase === "reveal" && g.you.choice === i && !right;
            return (
              <button
                key={i}
                disabled={g.phase === "reveal" || g.you.answered || g.you.isAuthor}
                onClick={() => onAnswer(g.id, g.index, i)}
                className={`rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                  right
                    ? "bg-emerald-400 text-day-900"
                    : wrong
                      ? "bg-rose-300 text-day-900"
                      : g.you.choice === i
                        ? "bg-day-900/5 ring-2 ring-accent dark:bg-white/10"
                        : "bg-day-900/5 enabled:hover:ring-2 enabled:hover:ring-accent dark:bg-white/10"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-day-900/60 dark:text-white/60">
          {g.phase === "reveal"
            ? g.you.isAuthor
              ? tr.yourResult
              : hit
                ? tr.right
                : g.you.answered
                  ? tr.wrong
                  : tr.timeUp
            : g.you.isAuthor
              ? tr.yours
              : fill(tr.answered, { n: g.answered, total: g.players })}
        </p>
      </>
    );
  } else {
    const g = trivia!;
    header = `🏆 ${tr.results}`;
    body = (
      <>
        {g.total === 0 ? <p className="text-xs text-day-900/60 dark:text-white/60">{tr.nobody}</p> : null}
        <ol className="flex flex-col gap-1">
          {g.scores.slice(0, 8).map((s, i) => (
            <li key={`${s.name}-${i}`} className="flex items-center gap-2 text-sm">
              <span className="w-6">{["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`}</span>
              <span className="flex-1 truncate">
                {s.avatar} {s.name}
              </span>
              <b className="text-accent">{s.points}</b>
            </li>
          ))}
        </ol>
        <button className={`${soft} self-start`} onClick={() => setClosedId(g.id)}>
          {tr.close}
        </button>
      </>
    );
  }

  return (
    <section aria-live="polite" className="mx-4 mt-3 flex max-h-[60vh] flex-shrink-0 flex-col gap-2 overflow-y-auto rounded-2xl bg-day-900/[.04] p-3 text-day-900 ring-1 ring-accent/40 dark:bg-white/5 dark:text-white">
      <div className="flex items-center gap-2 text-xs">
        <b className="flex-1 text-sm text-accent">{header}</b>
        {left !== null && trivia && (trivia.phase === "question" || trivia.phase === "collect") ? <span>{left} s</span> : null}
        {showGame && trivia!.you.canStop && trivia!.phase !== "end" ? (
          <button className="rounded-full bg-day-900/5 px-3 py-1 font-bold dark:bg-white/10" onClick={() => onControl("stop")}>
            {tr.stop}
          </button>
        ) : null}
      </div>
      {body}
      {note || error ? <p className="text-xs font-semibold text-rose-500">{note || error}</p> : null}
    </section>
  );
}
