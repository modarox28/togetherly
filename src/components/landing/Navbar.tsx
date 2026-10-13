"use client";

import { useState } from "react";
import Link from "next/link";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { Logo } from "@/components/ui/Logo";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const { t } = useLanguage();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  const enlaces = [
    { label: t.nav.howItWorks, href: "#how-it-works" },
    { label: t.nav.platforms, href: "#platforms" },
    { label: t.nav.discover, href: "/discover" },
    { label: t.nav.pricing, href: "/pricing" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3">
      <nav
        className={`mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full px-4 py-2 transition-colors duration-300 ${
          scrolled
            ? "glass bg-day-50/90 shadow-[0_10px_30px_-18px_rgba(30,23,48,0.6)] dark:bg-night-900/90"
            : "bg-transparent"
        }`}
      >
        <Logo />
        <ul className="hidden items-center gap-6 md:flex">
          {enlaces.map((e) => (
            <li key={e.href}>
              <Link
                href={e.href}
                className="text-sm font-semibold text-day-900/70 transition-colors hover:text-day-900 dark:text-white/70 dark:hover:text-white"
              >
                {e.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <Link
            href="/room"
            className="hidden rounded-full bg-accent px-4 py-2 text-sm font-bold text-on-accent sm:inline-block"
          >
            {t.nav.startWatching}
          </Link>
        </div>
      </nav>
    </header>
  );
}
