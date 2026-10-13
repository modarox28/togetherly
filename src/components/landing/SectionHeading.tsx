import { cn } from "@/lib/utils";

// Título de sección de la landing. Cambia aquí el tamaño o el estilo de todos a la vez.
export function SectionHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "max-w-xl font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-day-900 dark:text-white",
        className
      )}
    >
      {children}
    </h2>
  );
}
