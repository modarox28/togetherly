"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { translations, type Language, type Translations } from "@/lib/translations";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const STORAGE_KEY = "togetherly-lang";
const DEFAULT_LANGUAGE: Language = "es";

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: translations[DEFAULT_LANGUAGE],
});

// El idioma vive en localStorage; useSyncExternalStore lo lee sin desajustes con el servidor.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && saved in translations ? (saved as Language) : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function saveLanguage(lang: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Modo privado o almacenamiento bloqueado: el cambio dura solo esta visita.
  }
  listeners.forEach((listener) => listener());
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore(subscribe, readLanguage, () => DEFAULT_LANGUAGE);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: saveLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
