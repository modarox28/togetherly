"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthCard, GoogleButton, PasswordField, authInputClass } from "@/components/auth/AuthForm";

/** Solo se aceptan rutas internas para volver después de iniciar sesión (evita redirecciones abiertas). */
function safeCallback(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/room";
}

function LoginForm() {
  const router = useRouter();
  const callbackUrl = safeCallback(useSearchParams().get("callbackUrl"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("El correo o la contraseña no coinciden.");
      return;
    }
    router.push(callbackUrl);
  };

  return (
    <AuthCard title="Hola de nuevo" subtitle="Entra a tu cuenta de Togetherly.">
      <GoogleButton onClick={() => signIn("google", { callbackUrl })} />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-bold text-day-900 dark:text-white">Correo</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" inputMode="email" placeholder="tu@correo.com" required className={authInputClass} />
        </div>
        <PasswordField id="password" label="Contraseña" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && <p role="alert" className="text-sm text-red-500 dark:text-blanket">{error}</p>}
        <button type="submit" disabled={loading || !email || !password}
          className="mt-2 rounded-full bg-accent py-3.5 font-bold text-on-accent disabled:opacity-50">
          {loading ? "Entrando…" : "Iniciar sesión"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-day-900/60 dark:text-white/55">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="font-bold text-accent underline underline-offset-4">Crea una</Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
