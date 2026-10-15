"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Puzzle } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { PLATFORM_LABELS } from "@/lib/platforms";
import type { NowWatching } from "@/lib/streaming";

interface Props {
  extensionActive: boolean;
  /** Película que alguien de la sala ya abrió con la extensión */
  nowWatching?: NowWatching | null;
  onLoadUrl: (url: string) => void;
}

/** Acepta un enlace http(s) o un ID de YouTube de 11 caracteres. Devuelve null si no sirve. */
export function normalizeVideoInput(value: string): string | null {
  const text = value.trim();
  if (/^[\w-]{11}$/.test(text)) return `https://www.youtube.com/watch?v=${text}`;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

// Lo que se ve en la "tele" antes de elegir qué ver: los dos caminos posibles.
export function EmptyScreen({ extensionActive, nowWatching, onLoadUrl }: Props) {
  const { t } = useLanguage();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const url = normalizeVideoInput(value);
    if (!url) {
      setError(true);
      return;
    }
    onLoadUrl(url);
    setValue("");
  };

  return (
    <div className="flex h-full flex-col justify-center gap-6 overflow-y-auto p-5 text-white sm:p-8 lg:p-12">
      {nowWatching ? (
        // Ya están viendo algo con la extensión: eso es lo principal.
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t.invite.roomNowWatching.replace("{name}", nowWatching.by || "Alguien").replace("{platform}", PLATFORM_LABELS[nowWatching.platform])}
          </h2>
          <a
            href={nowWatching.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-fit items-center gap-2 rounded-full bg-lamp px-5 py-3 font-bold text-plum"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> {t.invite.openAndSync}
          </a>
          <p className="hidden text-sm leading-relaxed text-white/60 pointer-coarse:block">{t.roomUi.extDesktopOnly}</p>
        </div>
      ) : (
        <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{t.roomUi.emptyTitle}</h2>
      )}

      <div className={`grid gap-6 md:grid-cols-2 md:gap-10 ${nowWatching ? "border-t border-white/10 pt-6" : ""}`}>
        {/* Camino 1: apps de streaming con la extensión */}
        <section className="flex flex-col gap-3">
          <h3 className="text-base font-bold text-lamp">{t.roomUi.streamingTitle}</h3>
          <p className="text-sm leading-relaxed text-white/70">{t.roomUi.streamingText}</p>
          {extensionActive ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-sage">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {t.roomUi.extConnected}
            </p>
          ) : (
            <Link
              href="/extension"
              className="flex w-fit items-center gap-2 rounded-full border-2 border-lamp/60 px-4 py-2 text-sm font-bold text-lamp hover:bg-lamp/10 pointer-coarse:hidden"
            >
              <Puzzle className="h-4 w-4" aria-hidden="true" />
              {t.roomUi.extInstall}
            </Link>
          )}
          <p className="hidden text-xs leading-relaxed text-white/50 pointer-coarse:block">{t.roomUi.extDesktopOnly}</p>
        </section>

        {/* Camino 2: un enlace que se reproduce aquí mismo */}
        <section className="flex flex-col gap-3 md:border-l md:border-white/10 md:pl-10">
          <h3 className="text-base font-bold text-blanket">{t.roomUi.linkTitle}</h3>
          <p className="text-sm leading-relaxed text-white/70">{t.roomUi.linkText}</p>
          <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="video-url" className="sr-only">{t.roomUi.linkTitle}</label>
            <input
              id="video-url"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(false);
              }}
              placeholder={t.roomUi.linkPlaceholder}
              inputMode="url"
              autoComplete="off"
              aria-invalid={error}
              aria-describedby={error ? "video-url-error" : undefined}
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-blanket"
            />
            <button type="submit" className="rounded-xl bg-blanket px-4 py-2.5 text-sm font-bold text-plum">
              {t.roomUi.watchHere}
            </button>
          </form>
          {error && (
            <p id="video-url-error" className="text-xs text-blanket" role="alert">
              {t.roomUi.invalidLink}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
