"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MIN_AGE, acceptTerms, hasAcceptedTerms } from "@/lib/terms";

// Antes de crear o entrar a una sala: confirmar la edad mínima y aceptar los términos.
// En las salas hay chat (y en las privadas, videollamada) con otras personas.
export function AgeGate({ children }: { children: React.ReactNode }) {
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Se lee después de montar: localStorage no existe en el servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAccepted(hasAcceptedTerms());
  }, []);

  if (accepted === null) return null;
  if (accepted) return <>{children}</>;

  return (
    <div className="grain flex min-h-dvh items-center justify-center bg-day-50 px-4 dark:bg-night-950">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-sm sm:p-8 dark:bg-night-900">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-day-900 dark:text-white">Antes de entrar</h1>
        <p className="mt-3 leading-relaxed text-day-900/75 dark:text-white/75">
          Togetherly es para personas de <b>{MIN_AGE} años o más</b>. En las salas hay chat con otras personas, y en las
          salas públicas pueden ser desconocidos.
        </p>
        <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-day-900/80 dark:text-white/80">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-5 w-5 accent-[var(--accent)]"
          />
          <span>
            Tengo {MIN_AGE} años o más y acepto los{" "}
            <Link href="/terminos" target="_blank" className="font-bold underline underline-offset-4">
              Términos de uso
            </Link>{" "}
            y la{" "}
            <Link href="/privacidad" target="_blank" className="font-bold underline underline-offset-4">
              Política de privacidad
            </Link>
            .
          </span>
        </label>
        <button
          type="button"
          disabled={!checked}
          onClick={() => {
            acceptTerms();
            setAccepted(true);
          }}
          className="mt-6 w-full rounded-full bg-accent py-3.5 font-bold text-on-accent disabled:opacity-40"
        >
          Continuar
        </button>
        <Link href="/" className="mt-3 block text-center text-sm text-day-900/60 underline dark:text-white/60">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
