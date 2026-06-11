"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-black/5 dark:border-white/5 py-10 px-4 bg-day-50 dark:bg-night-950">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
            <Heart className="w-3.5 h-3.5 text-white fill-white" />
          </div>
          <span className="font-bold gradient-text">Togetherly</span>
        </div>
        <p className="text-sm text-day-900/40 dark:text-white/30 text-center">{t.footer.tagline}</p>
        <p className="text-sm text-day-900/30 dark:text-white/20">© {year} Togetherly. {t.footer.rights}</p>
      </div>
    </footer>
  );
}
