"use client";

import { createContext, useContext } from "react";

// Funciones que dependen de la configuración del servidor (se decide en src/app/layout.tsx).
interface Features {
  /** Hay base de datos y AUTH_SECRET: se puede crear cuenta e iniciar sesión. */
  authEnabled: boolean;
  /** Además hay credenciales de Google: se muestra "Continuar con Google". */
  googleEnabled: boolean;
}

const FeaturesContext = createContext<Features>({ authEnabled: false, googleEnabled: false });

export function FeaturesProvider({ children, ...features }: Features & { children: React.ReactNode }) {
  return <FeaturesContext.Provider value={features}>{children}</FeaturesContext.Provider>;
}

export const useFeatures = () => useContext(FeaturesContext);
