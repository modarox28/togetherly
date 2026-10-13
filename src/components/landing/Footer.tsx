"use client";

import { Logo } from "@/components/ui/Logo";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-day-100 px-4 py-10 dark:bg-night-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <p className="text-sm text-day-900/65 dark:text-white/65">{t.footer.tagline}</p>
        <p className="text-sm text-day-900/50 dark:text-white/50">
          © {year} Togetherly. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
