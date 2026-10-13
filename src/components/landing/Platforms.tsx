"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

const DENTRO = ["YouTube", "Twitch", "Vimeo", "Spotify"];
const CON_EXTENSION = ["Netflix", "Prime Video", "HBO Max", "Disney+", "Apple TV+", "Paramount+", "Crunchyroll"];
const URL_EXTENSION = "https://github.com/modarox28/togetherly/tree/main/togetherly-extension";

function Fichas({ nombres, destacadas = false }: { nombres: string[]; destacadas?: boolean }) {
  return (
    <ul className="mt-5 flex flex-wrap gap-2">
      {nombres.map((n) => (
        <li
          key={n}
          className={`rounded-full px-4 py-1.5 font-display text-base font-bold ${
            destacadas
              ? "bg-neon-purple text-on-accent"
              : "bg-day-200 text-day-900 dark:bg-night-700 dark:text-white"
          }`}
        >
          {n}
        </li>
      ))}
    </ul>
  );
}

export function Platforms() {
  const { t } = useLanguage();

  return (
    <section id="plataformas" className="grano bg-day-50 px-4 py-24 dark:bg-night-950">
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-xl font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-day-900 dark:text-white">
          {t.platforms.title}
        </h2>

        <div className="mt-12 grid gap-12 md:grid-cols-[1fr_1.4fr] md:gap-16">
          <div>
            <h3 className="font-display text-2xl font-bold text-day-900 dark:text-white">{t.platforms.insideTitle}</h3>
            <p className="mt-2 max-w-[38ch] leading-relaxed text-day-900/70 dark:text-white/70">{t.platforms.insideText}</p>
            <Fichas nombres={DENTRO} />
          </div>

          <div className="rounded-[2rem] border-2 border-dashed border-neon-purple/50 p-6 sm:p-8">
            <h3 className="font-display text-2xl font-bold text-day-900 dark:text-white">{t.platforms.extensionTitle}</h3>
            <p className="mt-2 max-w-[52ch] leading-relaxed text-day-900/70 dark:text-white/70">{t.platforms.extensionText}</p>
            <Fichas nombres={CON_EXTENSION} destacadas />
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a
                href={URL_EXTENSION}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border-2 border-day-900/20 px-5 py-2.5 font-bold text-day-900 transition-colors hover:border-day-900/50 dark:border-white/25 dark:text-white dark:hover:border-white/60"
              >
                {t.platforms.extensionButton}
              </a>
              <p className="max-w-[36ch] text-sm text-day-900/60 dark:text-white/60">{t.platforms.extensionNote}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
