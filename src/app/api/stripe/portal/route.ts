import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStripe, PAYMENTS_DISABLED } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST() {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json(PAYMENTS_DISABLED, { status: 503 });

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "Sin suscripción activa" }, { status: 400 });
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "https://togetherly-weld.vercel.app";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/pricing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
