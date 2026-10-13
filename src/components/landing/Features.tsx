"use client";

import { Video, MessageCircle, Smile, DoorOpen } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

const ICONOS = [Video, MessageCircle, Smile, DoorOpen];

export function Features() {
  const { t } = useLanguage();

  return (
    <section id="sala" className="bg-day-100 px-4 py-24 dark:bg-night-900">
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-xl font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-day-900 dark:text-white">
          {t.features.title}
        </h2>
        <dl className="mt-12 grid gap-x-16 sm:grid-cols-2">
          {t.features.items.map((item, i) => {
            const Icono = ICONOS[i] ?? Smile;
            return (
              <div key={item.title} className="flex gap-4 border-t-2 border-day-900/10 py-7 dark:border-white/10">
                <Icono aria-hidden="true" className="mt-1 h-6 w-6 flex-shrink-0 text-neon-purple" strokeWidth={2.2} />
                <div>
                  <dt className="font-display text-xl font-bold text-day-900 dark:text-white">{item.title}</dt>
                  <dd className="mt-1.5 max-w-[42ch] leading-relaxed text-day-900/70 dark:text-white/70">{item.description}</dd>
                </div>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
