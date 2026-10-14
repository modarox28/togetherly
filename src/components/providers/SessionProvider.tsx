"use client";

import { SessionProvider as NextAuthSessionProvider, SessionContext } from "next-auth/react";

// Sesión "vacía" para cuando no hay cuentas configuradas: useSession() responde
// "sin sesión" sin preguntarle nada al servidor (así no aparecen errores 500 de /api/auth).
const NO_SESSION = { data: null, status: "unauthenticated" as const, update: async () => null };

export function SessionProvider({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  if (!enabled) return <SessionContext.Provider value={NO_SESSION}>{children}</SessionContext.Provider>;
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
