// Versión de los términos: si cambian de forma importante, se sube y todos vuelven a aceptarlos.
// Igual en la app (mobile/lib/terms.ts) y en la extensión (popup.js).
export const TERMS_VERSION = "2026-10-17";
export const MIN_AGE = 18;
const STORAGE_KEY = "togetherly-terms";

export function hasAcceptedTerms(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === TERMS_VERSION;
  } catch {
    return false;
  }
}

export function acceptTerms() {
  try {
    window.localStorage.setItem(STORAGE_KEY, TERMS_VERSION);
  } catch {}
}
