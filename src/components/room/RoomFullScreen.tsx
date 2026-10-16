"use client";

import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { useLanguage } from "@/components/providers/LanguageProvider";

// Se muestra cuando la sala ya tiene el cupo completo.
export function RoomFullScreen({ max }: { max: number }) {
  const { t } = useLanguage();
  return (
    <div className="grain flex min-h-dvh items-center justify-center bg-day-50 px-5 dark:bg-night-950">
      <div className="max-w-md">
        <LogoMark className="h-12 w-12 text-accent" />
        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-day-900 sm:text-4xl dark:text-white">
          {t.watchRoom.roomFull}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-day-900/70 dark:text-white/70">
          {t.watchRoom.roomFullHint.replace("{max}", String(max))}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/room"
            className="rounded-full bg-accent px-6 py-3 font-bold text-on-accent"
          >
            {t.watchRoom.createOwn}
          </Link>
        </div>
      </div>
    </div>
  );
}
