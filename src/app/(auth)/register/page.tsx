"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthCard, GoogleButton, PasswordField, authInputClass } from "@/components/auth/AuthForm";
import { registerSchema } from "@/lib/validations";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    // Misma validación que el servidor, para avisar antes de enviar.
    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setLoading(false);
      setError(data.error ?? "No se pudo crear la cuenta. Intenta de nuevo.");
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    router.push(result?.error ? "/login" : "/room");
  };

  return (
    <AuthCard title="Crea tu cuenta" subtitle="Para guardar tu nombre y, más adelante, Premium.">
      <GoogleButton onClick={() => signIn("google", { callbackUrl: "/room" })} />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-bold text-day-900 dark:text-white">Nombre</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50}
            autoComplete="name" placeholder="¿Cómo te dicen?" required className={authInputClass} />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-bold text-day-900 dark:text-white">Correo</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" inputMode="email" placeholder="tu@correo.com" required className={authInputClass} />
        </div>
        <PasswordField id="password" label="Contraseña" value={password} onChange={setPassword}
          autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
        {error && <p role="alert" className="text-sm text-red-500 dark:text-blanket">{error}</p>}
        <button type="submit" disabled={loading}
          className="mt-2 rounded-full bg-accent py-3.5 font-bold text-on-accent disabled:opacity-50">
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-day-900/60 dark:text-white/55">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-bold text-accent underline underline-offset-4">Inicia sesión</Link>
      </p>
    </AuthCard>
  );
}
