"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/utils";

const flags: Record<string, string> = { en: "🇺🇸", es: "🇨🇴" };
const labels: Record<string, string> = { en: "EN", es: "ES" };

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
          bg-black/5 dark:bg-white/5
          hover:bg-black/10 dark:hover:bg-white/10
          border border-black/10 dark:border-white/10
          transition-colors cursor-pointer text-sm font-medium
          text-day-900/70 dark:text-white/80"
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{flags[language]}</span>
        <span>{labels[language]}</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 flex flex-col gap-1 p-1.5 rounded-xl shadow-2xl min-w-[120px]
              bg-white dark:bg-night-800
              border border-day-200 dark:border-night-600"
          >
            {(["es", "en"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => { setLanguage(lang); setOpen(false); }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors",
                  lang === language
                    ? "bg-neon-purple/10 text-neon-purple dark:bg-neon-purple/20"
                    : "text-day-900/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-day-900 dark:hover:text-white"
                )}
              >
                <span>{flags[lang]}</span>
                <span>{lang === "en" ? "English" : "Español"}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}
