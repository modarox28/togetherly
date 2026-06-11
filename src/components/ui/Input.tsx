"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-day-900/70 dark:text-white/70">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-day-900/30 dark:text-white/40 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full rounded-xl border px-4 py-3 text-sm transition-all duration-200 outline-none",
              "bg-white dark:bg-night-800/80",
              "border-day-200 dark:border-night-600",
              "text-day-900 dark:text-white",
              "placeholder:text-day-900/35 dark:placeholder:text-white/30",
              "focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/20",
              icon && "pl-10",
              error && "border-red-400 dark:border-red-500/60 focus:border-red-500 focus:ring-red-500/20",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
