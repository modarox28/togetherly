import { AgeGate } from "@/components/AgeGate";

// Crear o entrar a una sala pide confirmar la edad mínima y aceptar los términos.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AgeGate>{children}</AgeGate>;
}
