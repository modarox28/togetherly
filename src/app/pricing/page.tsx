"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Crown } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { PLANS, PAYMENTS_ENABLED } from "@/lib/plans";

const FREE_FEATURES = PLANS.free.features;
const PREMIUM_FEATURES = PLANS.premium.features;

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [returnNoticeClosed, setReturnNoticeClosed] = useState(false);

  // Aviso al volver del pago (?success=true o ?canceled=true); se calcula, no se guarda.
  const returnNotice = searchParams.get("success") === "true"
    ? { type: "success" as const, msg: "¡Bienvenido a Premium! Tu cuenta ya está activa." }
    : searchParams.get("canceled") === "true"
      ? { type: "error" as const, msg: "El pago fue cancelado. Puedes intentarlo de nuevo cuando quieras." }
      : null;
  const visibleToast = toast ?? (returnNoticeClosed ? null : returnNotice);

  const visibleMessage = visibleToast?.msg;

  useEffect(() => {
    if (!visibleMessage) return;
    const timer = setTimeout(() => {
      setToast(null);
      setReturnNoticeClosed(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [visibleMessage]);

  async function handleCheckout() {
    if (status !== "authenticated") {
      router.push("/login?callbackUrl=/pricing");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setToast({ type: "error", msg: data.error ?? "Error al iniciar el pago." });
    } catch {
      setToast({ type: "error", msg: "Error de conexión. Intenta de nuevo." });
    } finally {
      setLoading(false);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setToast({ type: "error", msg: "Error al abrir el portal." });
    } finally {
      setPortalLoading(false);
    }
  }

  const isPremium = (session?.user as { isPremium?: boolean })?.isPremium;

  const faq = [
    {
      q: "¿Cuándo se puede comprar Premium?",
      a: "Estamos eligiendo una forma de pago que funcione bien en Colombia. Mientras tanto, todo lo del plan Gratis es tuyo sin pagar nada.",
      show: !PAYMENTS_ENABLED,
    },
    {
      q: "¿Mis invitados también tienen que pagar?",
      a: "No. Solo quien crea una sala de más de 2 personas necesita Premium; los invitados entran gratis.",
      show: true,
    },
    {
      q: "¿Puedo cancelar cuando quiera?",
      a: "Sí, sin permanencia. Mantienes Premium hasta el final del mes que ya pagaste.",
      show: PAYMENTS_ENABLED,
    },
    {
      q: "¿Ver en pareja seguirá siendo gratis?",
      a: "Sí. Las salas de 2 personas, la extensión, el chat y la videollamada son gratis y lo van a seguir siendo.",
      show: true,
    },
  ].filter((item) => item.show);

  return (
    <div className="flex min-h-dvh flex-col bg-day-50 text-day-900 dark:bg-night-950 dark:text-white">
      <Navbar />

      {visibleToast && (
        <div
          role="status"
          className={`fixed left-1/2 top-20 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-xl ${
            visibleToast.type === "success" ? "bg-sage text-plum" : "bg-blanket text-plum"
          }`}
        >
          {visibleToast.msg}
        </div>
      )}

      <main className="grain flex-1 px-4 pb-16 pt-28 sm:pb-24 sm:pt-32">
        <div className="mx-auto max-w-5xl">
          <h1 className="max-w-2xl font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Gratis para dos. Premium para el grupo.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-day-900/70 dark:text-white/70">
            Ver una película en pareja siempre será gratis. Si quieren armar la noche de cine con amigos,
            Premium abre la sala hasta para {PLANS.premium.maxParticipants} personas.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {/* Gratis */}
            <section className="flex flex-col rounded-[28px] bg-white p-6 sm:p-8 dark:bg-night-900">
              <h2 className="font-display text-2xl font-extrabold">{PLANS.free.name}</h2>
              <p className="mt-1 text-sm text-day-900/60 dark:text-white/55">Para siempre</p>
              <p className="mt-6 font-display text-5xl font-extrabold">
                {PLANS.free.priceMonthly}
                <span className="ml-1 font-sans text-base font-semibold text-day-900/50 dark:text-white/45">/mes</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm leading-relaxed text-day-900/80 dark:text-white/75">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-sage" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/room" className="mt-8 block rounded-full bg-accent py-3.5 text-center font-bold text-on-accent">
                Crear una sala gratis
              </Link>
            </section>

            {/* Premium */}
            <section className="flex flex-col rounded-[28px] bg-plum p-6 text-white sm:p-8">
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-lamp" aria-hidden="true" />
                <h2 className="font-display text-2xl font-extrabold">{PLANS.premium.name}</h2>
              </div>
              <p className="mt-1 text-sm text-white/60">Para ver en grupo</p>
              <p className="mt-6 font-display text-5xl font-extrabold text-lamp">
                {PLANS.premium.priceMonthly}
                <span className="ml-1 font-sans text-base font-semibold text-white/50">USD/mes</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {PREMIUM_FEATURES.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm leading-relaxed text-white/85">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-lamp" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {isPremium ? (
                  <div className="space-y-3">
                    <p className="rounded-full bg-sage/20 py-3 text-center text-sm font-bold text-sage">Ya eres Premium</p>
                    <button
                      onClick={handlePortal}
                      disabled={portalLoading}
                      className="w-full rounded-full py-3 text-sm font-semibold text-white/70 ring-1 ring-white/20 hover:bg-white/5 disabled:opacity-50"
                    >
                      Gestionar suscripción
                    </button>
                  </div>
                ) : PAYMENTS_ENABLED ? (
                  <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full rounded-full bg-lamp py-3.5 font-bold text-plum disabled:opacity-60"
                  >
                    {status !== "authenticated" ? "Inicia sesión para suscribirte" : "Hazte Premium"}
                  </button>
                ) : (
                  // Pagos en pausa: se muestra el plan, pero todavía no se puede comprar.
                  <div className="rounded-2xl border-2 border-dashed border-lamp/50 px-4 py-3">
                    <p className="font-bold text-lamp">Próximamente</p>
                    <p className="mt-1 text-sm text-white/70">Mientras tanto, todo lo del plan Gratis es tuyo sin pagar nada.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="mt-16 max-w-2xl">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Preguntas</h2>
            <dl className="mt-6">
              {faq.map(({ q, a }) => (
                <div key={q} className="border-t-2 border-day-900/10 py-5 dark:border-white/10">
                  <dt className="font-bold">{q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-day-900/70 dark:text-white/65">{a}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
