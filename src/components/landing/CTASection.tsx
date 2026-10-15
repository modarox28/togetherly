"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { ROOM_CODE_PATTERN, normalizeRoomCode } from "@/lib/room";

// Sección final: entrar con un código o crear una sala. Ancla: #join (la usa el hero).
export function CTASection() {
  const { t } = useLanguage();
  const router = useRouter();
  const [code, setCode] = useState("");
  const isValid = ROOM_CODE_PATTERN.test(code);

  const handleJoin = (event: React.FormEvent) => {
    event.preventDefault();
    // /j/ decide: película de la sala con la extensión, instalarla, o la sala web.
    if (isValid) router.push(`/j/${code}`);
  };

  return (
    <section id="join" className="grain bg-day-50 px-4 py-16 sm:py-24 dark:bg-night-950">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-end">
        <div>
          <h2 className="font-display text-[clamp(2.4rem,6vw,4.25rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-day-900 dark:text-white">
            {t.cta.title}
          </h2>
          <p className="mt-3 text-lg text-day-900/70 dark:text-white/70">{t.cta.subtitle}</p>
        </div>

        <div>
          <form onSubmit={handleJoin} className="flex flex-wrap gap-3">
            <label htmlFor="room-code" className="sr-only">
              {t.cta.codeLabel}
            </label>
            <input
              id="room-code"
              value={code}
              onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
              placeholder={t.cta.placeholder}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-2xl border-2 border-day-900/15 bg-white px-5 py-3.5 font-display text-2xl font-bold tracking-[0.3em] text-day-900 placeholder:text-day-900/25 focus:border-accent focus:outline-none dark:border-white/15 dark:bg-night-800 dark:text-white dark:placeholder:text-white/25"
            />
            <button
              type="submit"
              disabled={!isValid}
              className="rounded-2xl bg-accent px-7 py-3.5 font-bold text-on-accent transition-opacity disabled:opacity-40"
            >
              {t.cta.join}
            </button>
          </form>
          <button
            onClick={() => router.push("/room")}
            className="mt-5 font-bold text-day-900 underline decoration-accent decoration-2 underline-offset-4 dark:text-white"
          >
            {t.cta.createNew}
          </button>
        </div>
      </div>
    </section>
  );
}
