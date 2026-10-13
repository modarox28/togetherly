import "server-only";
import Stripe from "stripe";

// Cliente de Stripe (solo servidor: usa la clave secreta).
// Se crea la primera vez que se usa, no al importar el archivo. Así, si falta
// STRIPE_SECRET_KEY, la web igual compila y se publica; solo los pagos responden
// "no configurado". Los planes visibles están en lib/plans.ts.

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key, { typescript: true });
  return client;
}

export function getPremiumPriceId(): string | null {
  return process.env.STRIPE_PREMIUM_PRICE_ID || null;
}

/** Respuesta estándar cuando los pagos no están configurados en el servidor. */
export const PAYMENTS_DISABLED = { error: "Los pagos todavía no están disponibles." } as const;
