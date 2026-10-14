"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useFeatures } from "@/components/providers/FeaturesProvider";

// Piezas compartidas por /login y /register.

export const authInputClass =
  "mt-2 w-full rounded-xl border border-day-200 bg-day-50 px-4 py-3 text-base text-day-900 outline-none placeholder:text-day-900/40 focus:border-accent dark:border-night-600 dark:bg-night-800 dark:text-white dark:placeholder:text-white/35";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { authEnabled } = useFeatures();
  return (
    <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-xl shadow-plum/5 sm:p-8 dark:bg-night-900">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-day-900 dark:text-white">{title}</h1>
      {authEnabled ? (
        <>
          <p className="mt-2 text-sm text-day-900/60 dark:text-white/55">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </>
      ) : (
        // El servidor todavía no tiene base de datos: no se puede crear cuenta.
        <>
          <p className="mt-3 leading-relaxed text-day-900/70 dark:text-white/70">
            Las cuentas llegan pronto. No las necesitas para ver juntos: crea una sala y comparte el código.
          </p>
          <Link href="/room" className="mt-6 block rounded-full bg-accent py-3.5 text-center font-bold text-on-accent">
            Crear una sala
          </Link>
        </>
      )}
      <p className="mt-6 text-center text-sm text-day-900/55 dark:text-white/50">
        <Link href="/room" className="font-semibold underline underline-offset-4">Seguir sin cuenta</Link>
      </p>
    </div>
  );
}

export function PasswordField({ id, label, value, onChange, autoComplete, placeholder }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-day-900 dark:text-white">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
          className={`${authInputClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute bottom-0 right-1 flex h-12 w-11 items-center justify-center text-day-900/45 hover:text-day-900 dark:text-white/45 dark:hover:text-white"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function GoogleButton({ onClick }: { onClick: () => void }) {
  const { googleEnabled } = useFeatures();
  if (!googleEnabled) return null;
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-full border-2 border-day-900/15 py-3 text-sm font-bold text-day-900 hover:bg-day-900/5 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
      >
        Continuar con Google
      </button>
      <p className="my-5 text-center text-xs text-day-900/45 dark:text-white/40">o con tu correo</p>
    </>
  );
}
