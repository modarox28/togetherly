"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { CHARACTERS } from "@/lib/characters";
import { CharacterPicker } from "@/components/room/CharacterPicker";

export interface JoinProfile {
  name: string;
  characterId: string;
}

interface Props {
  roomId: string;
  onJoin: (profile: JoinProfile) => void;
}

// Pantalla para quien llega con el enlace de una sala: nombre + personaje en un solo paso.
export function JoinRoomCard({ roomId, onJoin }: Props) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [characterId, setCharacterId] = useState(CHARACTERS[0].id);
  const [showError, setShowError] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) {
      setShowError(true);
      return;
    }
    onJoin({ name: clean, characterId });
  };

  return (
    <div className="grain flex min-h-dvh flex-col bg-day-50 dark:bg-night-950">
      <header className="px-5 py-4">
        <Link href="/" className="inline-flex items-center gap-2 text-accent">
          <LogoMark />
          <span className="font-display text-xl font-extrabold tracking-tight text-day-900 dark:text-white">Togetherly</span>
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-10 sm:items-center">
        <form onSubmit={submit} className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-xl shadow-plum/5 sm:p-8 dark:bg-night-900">
          <p className="text-sm font-semibold text-day-900/60 dark:text-white/55">{t.roomUi.joinTitle}</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-[0.12em] text-accent">{roomId}</h1>

          <label htmlFor="join-name" className="mt-6 block text-sm font-bold text-day-900 dark:text-white">
            {t.room.yourName}
          </label>
          <input
            id="join-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setShowError(false);
            }}
            placeholder={t.room.namePlaceholder}
            maxLength={20}
            autoComplete="nickname"
            aria-invalid={showError}
            aria-describedby={showError ? "join-name-error" : undefined}
            className="mt-2 w-full rounded-xl border border-day-200 bg-day-50 px-4 py-3 text-base text-day-900 outline-none placeholder:text-day-900/40 focus:border-accent dark:border-night-600 dark:bg-night-800 dark:text-white dark:placeholder:text-white/35"
          />
          {showError && (
            <p id="join-name-error" role="alert" className="mt-1.5 text-sm text-red-500 dark:text-blanket">
              {t.room.nameRequired}
            </p>
          )}

          <div className="mt-6">
            <CharacterPicker value={characterId} onChange={setCharacterId} />
          </div>

          <button type="submit" className="mt-6 w-full rounded-full bg-accent py-3.5 text-base font-bold text-on-accent">
            {t.roomUi.enter}
          </button>
        </form>
      </main>
    </div>
  );
}
