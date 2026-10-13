"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

// Es una secuencia real (crear → mandar → dar play), por eso va numerada.
export function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section id="como-funciona" className="bg-day-100 px-4 py-24 dark:bg-night-900">
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-xl font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-day-900 dark:text-white">
          {t.howItWorks.title}
        </h2>
        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {t.howItWorks.steps.map((paso, i) => (
            <li key={paso.title} className="relative md:pr-6">
              <span
                aria-hidden="true"
                className="block font-display text-7xl font-extrabold leading-none text-neon-purple"
              >
                {i + 1}
              </span>
              <h3 className="mt-4 font-display text-2xl font-bold text-day-900 dark:text-white">{paso.title}</h3>
              <p className="mt-2 max-w-[34ch] leading-relaxed text-day-900/70 dark:text-white/70">{paso.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
