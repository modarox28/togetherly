"use client";

import { Video, MessageCircle, Smile, DoorOpen } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { SectionHeading } from "@/components/landing/SectionHeading";

// Un ícono por cada elemento de translations.ts → features.items (mismo orden).
const ICONS = [Video, MessageCircle, Smile, DoorOpen];

export function Features() {
  const { t } = useLanguage();

  return (
    <section id="room-features" className="bg-day-100 px-4 py-16 sm:py-24 dark:bg-night-900">
      <div className="mx-auto max-w-6xl">
        <SectionHeading>{t.features.title}</SectionHeading>
        <dl className="mt-12 grid gap-x-16 sm:grid-cols-2">
          {t.features.items.map((item, index) => {
            const Icon = ICONS[index] ?? Smile;
            return (
              <div key={item.title} className="flex gap-4 border-t-2 border-day-900/10 py-7 dark:border-white/10">
                <Icon aria-hidden="true" className="mt-1 h-6 w-6 flex-shrink-0 text-accent" strokeWidth={2.2} />
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
