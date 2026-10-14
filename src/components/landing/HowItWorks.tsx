"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { SectionHeading } from "@/components/landing/SectionHeading";

// Es una secuencia real (crear → mandar → dar play), por eso los pasos van numerados.
// Los textos están en src/lib/translations.ts → howItWorks.
export function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section id="how-it-works" className="bg-day-100 px-4 py-16 sm:py-24 dark:bg-night-900">
      <div className="mx-auto max-w-6xl">
        <SectionHeading>{t.howItWorks.title}</SectionHeading>
        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {t.howItWorks.steps.map((step, index) => (
            <li key={step.title} className="md:pr-6">
              <span aria-hidden="true" className="block font-display text-7xl font-extrabold leading-none text-accent">
                {index + 1}
              </span>
              <h3 className="mt-4 font-display text-2xl font-bold text-day-900 dark:text-white">{step.title}</h3>
              <p className="mt-2 max-w-[34ch] leading-relaxed text-day-900/70 dark:text-white/70">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
