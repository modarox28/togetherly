"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TwoRoomsScene } from "@/components/landing/TwoRoomsScene";
import { wakeSocketServer } from "@/lib/socket";

export function Hero() {
  const { t } = useLanguage();
  const router = useRouter();

  // Despierta el servidor de salas mientras la persona lee la página.
  useEffect(() => wakeSocketServer(), []);

  return (
    <section className="grain relative overflow-hidden bg-day-50 dark:bg-night-950 px-4 pt-24 pb-12 sm:pt-28 sm:pb-16 lg:pt-32">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-12">
        <div>
          <h1 className="font-display text-[clamp(2.6rem,6.2vw,4.6rem)] font-extrabold leading-[0.95] tracking-[-0.035em] text-day-900 dark:text-white">
            {t.hero.title}
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-day-900/75 dark:text-white/75">{t.hero.subtitle}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/room")}
              className="rounded-full bg-accent px-6 py-3 font-bold text-on-accent shadow-[0_4px_0_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
            >
              {t.hero.createRoom}
            </button>
            <a
              href="#join"
              className="rounded-full border-2 border-day-900/15 px-6 py-3 font-bold text-day-900 transition-colors hover:border-day-900/40 dark:border-white/20 dark:text-white dark:hover:border-white/50"
            >
              {t.hero.joinRoom}
            </a>
          </div>
          <p className="mt-3 text-sm text-day-900/55 dark:text-white/55">{t.hero.noAccount}</p>
        </div>

        <figure>
          <TwoRoomsScene label={t.hero.sceneLabel} />
          <figcaption className="mt-2 grid grid-cols-2 gap-[8%] px-[2%] text-sm sm:text-base">
            <span>
              <strong className="font-display text-day-900 dark:text-white">{t.hero.leftCity}</strong>{" "}
              <span className="text-day-900/60 dark:text-white/60">{t.hero.leftTime}</span>
            </span>
            <span>
              <strong className="font-display text-day-900 dark:text-white">{t.hero.rightCity}</strong>{" "}
              <span className="text-day-900/60 dark:text-white/60">{t.hero.rightTime}</span>
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
