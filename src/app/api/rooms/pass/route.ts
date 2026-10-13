import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isPremiumActive } from "@/lib/subscription";
import { createRoomPass } from "@/lib/roomPass";
import { PLANS } from "@/lib/plans";

const SALA_VALIDA = /^[A-Za-z0-9_-]{3,32}$/;

// Devuelve un pase firmado para la sala si quien lo pide tiene Premium activo.
// Sin sesión o sin Premium responde { pass: null } y la sala queda con el límite gratis.
export async function POST(req: Request) {
  let roomId: unknown;
  try {
    ({ roomId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  if (typeof roomId !== "string" || !SALA_VALIDA.test(roomId)) {
    return NextResponse.json({ error: "Código de sala inválido" }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ pass: null });

  if (!(await isPremiumActive(userId))) return NextResponse.json({ pass: null });

  return NextResponse.json({ pass: createRoomPass(roomId, PLANS.premium.maxParticipants) });
}
