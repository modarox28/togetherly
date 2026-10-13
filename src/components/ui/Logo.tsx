import Link from "next/link";
import { cn } from "@/lib/utils";

// Una tele con antenas y dos cabecitas mirando: la sala compartida.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("w-9 h-9", className)}>
      <path d="M15 4l5 6 5-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="10" width="34" height="26" rx="9" fill="currentColor" />
      <rect x="7.5" y="14.5" width="25" height="17" rx="5" className="fill-[var(--page)]" />
      <circle cx="16.5" cy="22.5" r="3.4" fill="currentColor" />
      <circle cx="23.5" cy="22.5" r="3.4" fill="currentColor" opacity="0.55" />
      <path d="M10.5 31.5c1.4-3.6 3.6-5 6-5s4.6 1.4 6 5" fill="currentColor" />
      <path d="M17.5 31.5c1.4-3.6 3.6-5 6-5s4.6 1.4 6 5" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 text-accent", className)}>
      <LogoMark />
      <span className="font-display text-xl font-extrabold tracking-tight text-day-900 dark:text-white">
        Togetherly
      </span>
    </Link>
  );
}
