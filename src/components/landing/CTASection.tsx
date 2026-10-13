"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/LanguageProvider";

const CODIGO = /^[A-Z0-9]{6}$/;

export function CTASection() {
  const { t } = useLanguage();
  const router = useRouter();
  const [code, setCode] = useState("");

  const entrar = (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = code.trim().toUpperCase();
    if (CODIGO.test(limpio)) router.push(`/room/${limpio}`);
  };

  return (
    <section id="entrar" className="grano bg-day-50 px-4 py-24 dark:bg-night-950">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-end">
        <div>
          <h2 className="font-display text-[clamp(2.4rem,6vw,4.25rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-day-900 dark:text-white">
            {t.cta.title}
          </h2>
          <p className="mt-3 text-lg text-day-900/70 dark:text-white/70">{t.cta.subtitle}</p>
        </div>

        <div>
          <form onSubmit={entrar} className="flex flex-wrap gap-3">
            <label htmlFor="codigo-sala" className="sr-only">{t.cta.codeLabel}</label>
            <input
              id="codigo-sala"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder={t.cta.placeholder}
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
              className="min-w-0 flex-1 rounded-2xl border-2 border-day-900/15 bg-white px-5 py-3.5 font-display text-2xl font-bold tracking-[0.3em] text-day-900 placeholder:text-day-900/25 focus:border-neon-purple focus:outline-none dark:border-white/15 dark:bg-night-800 dark:text-white dark:placeholder:text-white/25"
            />
            <button
              type="submit"
              disabled={!CODIGO.test(code)}
              className="rounded-2xl bg-neon-purple px-7 py-3.5 font-bold text-on-accent transition-opacity disabled:opacity-40"
            >
              {t.cta.join}
            </button>
          </form>
          <button
            onClick={() => router.push("/room")}
            className="mt-5 font-bold text-day-900 underline decoration-neon-purple decoration-2 underline-offset-4 dark:text-white"
          >
            {t.cta.createNew}
          </button>
        </div>
      </div>
    </section>
  );
}
