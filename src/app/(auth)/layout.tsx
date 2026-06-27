import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign in — Togetherly",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-day-50 dark:bg-night-950">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full animate-blob-drift"
          style={{ background: "radial-gradient(circle, rgba(192,132,252,0.12) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full animate-blob-drift-reverse"
          style={{ background: "radial-gradient(circle, rgba(244,114,182,0.10) 0%, transparent 70%)" }} />
      </div>

      <header className="relative z-10 flex items-center px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-bold gradient-text">Togetherly</span>
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}
