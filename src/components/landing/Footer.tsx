"use client";

import Link from "next/link";
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
          © {year} Togetherly ·{" "}
          <a
            href="https://github.com/modarox28/togetherly"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-day-900 dark:hover:text-white"
          >
            {t.footer.openSource}
          </a>{" "}
          ·{" "}
          <Link href="/apoyar" className="underline underline-offset-4 hover:text-day-900 dark:hover:text-white">
            {t.footer.support}
          </Link>{" "}
          ·{" "}
          <Link href="/privacidad" className="underline underline-offset-4 hover:text-day-900 dark:hover:text-white">
            {t.footer.privacy}
          </Link>
        </p>
      </div>
    </footer>
  );
}
