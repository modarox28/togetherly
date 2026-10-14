"use client";

import { useState, useEffect, Suspense } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Crown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
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

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setToast({ type: "success", msg: "¡Bienvenido a Premium! Tu cuenta ya está activa." });
    } else if (searchParams.get("canceled") === "true") {
      setToast({ type: "error", msg: "El pago fue cancelado. Puedes intentarlo de nuevo cuando quieras." });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

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

  return (
    <div className="min-h-screen bg-night-950 text-white overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-accent/10 blur-[120px] animate-[blob-drift_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent-2/10 blur-[100px] animate-[blob-drift-reverse_10s_ease-in-out_infinite]" />
      </div>

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium
            ${toast.type === "success"
              ? "bg-green-500/20 border border-green-500/40 text-green-300"
              : "bg-red-500/20 border border-red-500/40 text-red-300"
            }`}
        >
          {toast.msg}
        </motion.div>
      )}

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-20">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors mb-12">
          <LogoMark className="w-6 h-6 text-accent" />
          Togetherly
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Planes simples y transparentes
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Gratis para dos. Premium para el grupo.
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Ver una película en pareja siempre será gratis. Si quieren armar la noche de cine con amigos, Premium abre la sala hasta para 8 personas.
          </p>
        </motion.div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-2xl border border-white/10 bg-night-900/60 backdrop-blur p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white/70" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Gratis</h2>
                <p className="text-white/50 text-sm">Para siempre</p>
              </div>
            </div>

            <div className="mb-8">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-white/50 text-sm ml-2">/mes</span>
            </div>

            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-white/70">
                  <Check className="w-4 h-4 text-white/40 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button variant="secondary" className="w-full" onClick={() => router.push("/room")}>
              Empezar gratis
            </Button>
          </motion.div>

          {/* Premium */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative rounded-2xl border border-accent/40 bg-day-100 dark:bg-night-800 p-8 shadow-[0_24px_50px_-28px_rgba(42,33,64,0.6)]"
          >
            {/* Popular badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-accent text-xs font-semibold text-on-accent shadow-lg">
              Para grupos
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Premium</h2>
                <p className="text-accent/80 text-sm">Para ver en grupo</p>
              </div>
            </div>

            <div className="mb-8">
              <span className="text-4xl font-bold">$3.99</span>
              <span className="text-white/50 text-sm ml-2">/mes</span>
              <p className="text-white/40 text-xs mt-1">Cancela cuando quieras</p>
            </div>

            <ul className="space-y-3 mb-8">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-white/80">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {isPremium ? (
              <div className="space-y-3">
                <div className="w-full py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center font-medium">
                  ✓ Ya eres Premium
                </div>
                <Button
                  variant="ghost"
                  className="w-full text-white/60"
                  loading={portalLoading}
                  onClick={handlePortal}
                >
                  Gestionar suscripción
                </Button>
              </div>
            ) : PAYMENTS_ENABLED ? (
              <Button className="w-full" loading={loading} onClick={handleCheckout}>
                {status !== "authenticated" ? "Inicia sesión para suscribirte" : "Hazte Premium"}
              </Button>
            ) : (
              // Pagos en pausa: se muestra el plan, pero todavía no se puede comprar.
              <div className="w-full rounded-xl border-2 border-dashed border-accent/40 px-4 py-3 text-center">
                <p className="font-bold text-accent">Próximamente</p>
                <p className="mt-1 text-xs text-white/60">Mientras tanto, todo lo del plan Gratis es tuyo sin pagar nada.</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-20 max-w-2xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-center mb-10 text-white/90">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {[
              {
                q: "¿Puedo cancelar en cualquier momento?",
                a: "Sí. Sin permanencia ni penalizaciones. Cancelas desde tu portal de facturación y mantienes el acceso hasta el fin del período ya pagado.",
              },
              {
                q: "¿Qué métodos de pago aceptan?",
                a: "Visa, Mastercard, American Express y débito. El pago es procesado de forma segura por Stripe.",
              },
              {
                q: "¿Los pagos son en dólares?",
                a: "Sí, el precio está en USD. Tu banco convertirá automáticamente al tipo de cambio vigente.",
              },
              {
                q: "¿Mis invitados también tienen que pagar?",
                a: "El plan Gratis seguirá siendo gratis. Solo las salas de más de 2 personas requieren que quien crea la sala tenga Premium; los invitados no pagan.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-white/8 bg-night-900/40 p-5">
                <p className="font-medium text-white/90 mb-2">{q}</p>
                <p className="text-sm text-white/55">{a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer note */}
        <p className="text-center text-white/30 text-xs mt-16">
          Pagos procesados por{" "}
          <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/50">
            Stripe
          </a>
          {" "}— seguro y encriptado
        </p>
      </div>
    </div>
  );
}
