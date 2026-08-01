import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

export const PLANS = {
  free: {
    name: "Free",
    priceMonthly: "$0",
    maxParticipants: 2,
    features: [
      "2 people per room",
      "YouTube, Twitch, Vimeo, Spotify sync",
      "Live chat + reactions",
      "Video calls",
      "Public room discovery",
    ],
  },
  premium: {
    name: "Premium",
    priceMonthly: "$3.99",
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID!,
    maxParticipants: 6,
    features: [
      "Up to 6 people per room",
      "Everything in Free",
      "Netflix & Disney+ companion mode",
      "Room history",
      "Custom room backgrounds",
      "Premium badge",
      "No ads (forever)",
      "Priority support",
    ],
  },
} as const;
