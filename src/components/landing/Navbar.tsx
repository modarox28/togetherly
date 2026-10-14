"use client";

import { useState } from "react";
import Link from "next/link";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { Logo } from "@/components/ui/Logo";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const { t } = useLanguage();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  const links = [
    { label: t.nav.howItWorks, href: "/#how-it-works" },
    { label: t.nav.platforms, href: "/#platforms" },
    { label: t.nav.extension, href: "/extension" },
    { label: t.nav.discover, href: "/discover" },
    { label: t.nav.pricing, href: "/pricing" },
  ];
  const solid = scrolled || menuOpen;

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3">
      <nav
        className={`mx-auto max-w-6xl rounded-[26px] px-4 py-2 transition-colors duration-300 ${
          solid ? "glass bg-day-50/95 shadow-[0_10px_30px_-18px_rgba(30,23,48,0.6)] dark:bg-night-900/95" : "bg-transparent"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <ul className="hidden items-center gap-6 lg:flex">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-semibold text-day-900/70 transition-colors hover:text-day-900 dark:text-white/70 dark:hover:text-white"
                >
                  {link.label}
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
            <button
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 text-day-900 lg:hidden dark:border-white/10 dark:text-white"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Menú para celular y tableta */}
        {menuOpen && (
          <ul id="mobile-menu" className="flex flex-col gap-1 pb-3 pt-3 lg:hidden">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-xl px-3 py-3 text-base font-semibold text-day-900 hover:bg-day-900/5 dark:text-white dark:hover:bg-white/5"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-2 sm:hidden">
              <Link
                href="/room"
                onClick={() => setMenuOpen(false)}
                className="block rounded-full bg-accent px-4 py-3 text-center text-base font-bold text-on-accent"
              >
                {t.nav.startWatching}
              </Link>
            </li>
          </ul>
        )}
      </nav>
    </header>
  );
}
