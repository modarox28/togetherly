import type { Metadata } from "next";
import { LogoMark } from "@/components/ui/Logo";
import Link from "next/link";


export const metadata: Metadata = {
  title: "Sign in — Togetherly",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-day-50 dark:bg-night-950">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full animate-blob-drift"
          style={{ background: "radial-gradient(circle, rgba(255,201,101,0.12) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full animate-blob-drift-reverse"
          style={{ background: "radial-gradient(circle, rgba(242,167,176,0.10) 0%, transparent 70%)" }} />
      </div>

      <header className="relative z-10 flex items-center px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark className="text-neon-purple" />
          <span className="font-display text-xl font-extrabold tracking-tight text-day-900 dark:text-white">Togetherly</span>
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}
