"use client";

import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Heart } from "lucide-react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const { t } = useLanguage();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 20));

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4"
    >
      <div className={`
        w-full max-w-5xl flex items-center justify-between
        px-5 py-3 rounded-2xl transition-all duration-300
        ${scrolled
          ? "glass border shadow-2xl bg-white/85 dark:bg-night-900/90 border-black/5 dark:border-white/10"
          : "bg-transparent"
        }
      `}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center shadow-lg">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-bold text-base gradient-text">Togetherly</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6">
          {[
            { label: t.nav.features, href: "#features" },
            { label: t.nav.howItWorks, href: "#how-it-works" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-day-900/60 dark:text-white/60 hover:text-day-900 dark:hover:text-white transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <Button size="sm" onClick={() => window.location.href = "/room"}>
            {t.nav.startWatching}
          </Button>
        </div>
      </div>
    </motion.nav>
  );
}
