import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";

export const metadata: Metadata = {
  title: "Tu cuenta — Togetherly",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain flex min-h-dvh flex-col bg-day-50 dark:bg-night-950">
      <header className="px-5 py-4">
        <Link href="/" className="inline-flex items-center gap-2 text-accent">
          <LogoMark />
          <span className="font-display text-xl font-extrabold tracking-tight text-day-900 dark:text-white">Togetherly</span>
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-12 pt-4 sm:items-center sm:pt-0">{children}</main>
    </div>
  );
}
