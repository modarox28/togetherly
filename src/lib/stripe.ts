import "server-only";
import Stripe from "stripe";

// Solo servidor: usa la clave secreta. Los planes visibles están en lib/plans.ts.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

export const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID!;
