import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe, PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Inicia sesión para continuar" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, stripeCustomerId: true, email: true, name: true },
  });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: user.name ?? undefined,
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "https://togetherly-weld.vercel.app";

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: PLANS.premium.priceId, quantity: 1 }],
    success_url: `${appUrl}/pricing?success=true`,
    cancel_url: `${appUrl}/pricing?canceled=true`,
    metadata: { userId: user.id },
    subscription_data: {
      metadata: { userId: user.id },
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    locale: "es",
  });

  return NextResponse.json({ url: checkoutSession.url });
}
