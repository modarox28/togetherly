"use client";

import { CHARACTERS } from "@/lib/characters";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface Props {
  value: string;
  onChange: (characterId: string) => void;
}

// Cuadrícula de personajes para elegir avatar (usada al crear y al unirse a una sala).
export function CharacterPicker({ value, onChange }: Props) {
  const { t } = useLanguage();
  const selected = CHARACTERS.find((c) => c.id === value) ?? CHARACTERS[0];

  return (
    <fieldset>
      <legend className="text-sm font-bold text-day-900 dark:text-white">{t.roomUi.pickAvatar}</legend>
      <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8 md:grid-cols-4">
        {CHARACTERS.map((character) => {
          const active = character.id === selected.id;
          return (
            <button
              key={character.id}
              type="button"
              onClick={() => onChange(character.id)}
              aria-pressed={active}
              aria-label={character.name}
              title={character.name}
              className={`flex aspect-square items-center justify-center rounded-2xl text-2xl transition-transform ${
                active ? "scale-105 bg-accent/15 ring-2 ring-accent" : "bg-day-100 hover:bg-day-200 dark:bg-night-800 dark:hover:bg-night-700"
              }`}
            >
              {character.emoji}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-day-900/60 dark:text-white/55" aria-live="polite">
        <strong className="text-day-900 dark:text-white">{selected.name}</strong>: {selected.tagline}
      </p>
    </fieldset>
  );
}
