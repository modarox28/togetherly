import type { Metadata } from "next";
import { InvitePage } from "@/components/room/InvitePage";

interface PageProps {
  params: Promise<{ code: string }>;
}

export const metadata: Metadata = {
  title: "Te invitaron a ver juntos — Togetherly",
  description: "Abre el enlace y llega directo a la misma película, sincronizada.",
};

// /j/CODIGO: el enlace que se comparte. Lleva a la película de la sala (con la extensión)
// o explica cómo instalarla. Ver src/components/room/InvitePage.tsx.
export default async function JoinPage({ params }: PageProps) {
  const { code } = await params;
  let decoded = "";
  try {
    decoded = decodeURIComponent(code);
  } catch {
    // Dirección mal formada: InvitePage muestra "Esta sala no está abierta".
  }
  return <InvitePage code={decoded.toUpperCase()} />;
}
