import { storage } from "@/lib/storage";

// Igual que la web (src/lib/terms.ts) y la extensión (popup.js).
export const TERMS_VERSION = "2026-10-17";
const KEY = "togetherly-terms";

export const hasAcceptedTerms = async () => (await storage.get(KEY).catch(() => null)) === TERMS_VERSION;
export const acceptTerms = () => storage.set(KEY, TERMS_VERSION).catch(() => {});
