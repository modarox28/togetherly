import { prisma } from "@/lib/db";

export async function getUserSubscription(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      isPremium: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripePriceId: true,
      stripeCurrentPeriodEnd: true,
    },
  });
}

export async function isPremiumActive(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true, stripeCurrentPeriodEnd: true },
  });
  if (!user?.isPremium || !user.stripeCurrentPeriodEnd) return false;
  return user.stripeCurrentPeriodEnd > new Date();
}
