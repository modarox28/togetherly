"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { PLATFORM_LABELS, getPlayerType, type Platform } from "@/lib/platforms";

// Las listas salen de src/lib/platforms.ts: si agregas una plataforma allá, aparece aquí sola.
const ALL_PLATFORMS = Object.keys(PLATFORM_LABELS) as Platform[];
const EMBEDDED = ALL_PLATFORMS.filter((p) => getPlayerType(p) === "embeddable");
const WITH_EXTENSION = ALL_PLATFORMS.filter((p) => getPlayerType(p) === "companion");

const EXTENSION_URL = "https://github.com/modarox28/togetherly/tree/main/togetherly-extension";

function PlatformChips({ platforms, highlighted = false }: { platforms: Platform[]; highlighted?: boolean }) {
  return (
    <ul className="mt-5 flex flex-wrap gap-2">
      {platforms.map((platform) => (
        <li
          key={platform}
          className={`rounded-full px-4 py-1.5 font-display text-base font-bold ${
            highlighted ? "bg-accent text-on-accent" : "bg-day-200 text-day-900 dark:bg-night-700 dark:text-white"
          }`}
        >
          {PLATFORM_LABELS[platform]}
        </li>
      ))}
    </ul>
  );
}

export function Platforms() {
  const { t } = useLanguage();

  return (
    <section id="platforms" className="grain bg-day-50 px-4 py-24 dark:bg-night-950">
      <div className="mx-auto max-w-6xl">
        <SectionHeading>{t.platforms.title}</SectionHeading>

        <div className="mt-12 grid gap-12 md:grid-cols-[1fr_1.4fr] md:gap-16">
          <div>
            <h3 className="font-display text-2xl font-bold text-day-900 dark:text-white">{t.platforms.insideTitle}</h3>
            <p className="mt-2 max-w-[38ch] leading-relaxed text-day-900/70 dark:text-white/70">{t.platforms.insideText}</p>
            <PlatformChips platforms={EMBEDDED} />
          </div>

          <div className="rounded-[2rem] border-2 border-dashed border-accent/50 p-6 sm:p-8">
            <h3 className="font-display text-2xl font-bold text-day-900 dark:text-white">{t.platforms.extensionTitle}</h3>
            <p className="mt-2 max-w-[52ch] leading-relaxed text-day-900/70 dark:text-white/70">{t.platforms.extensionText}</p>
            <PlatformChips platforms={WITH_EXTENSION} highlighted />
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a
                href={EXTENSION_URL}
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
