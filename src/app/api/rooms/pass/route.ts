import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isPremiumActive } from "@/lib/subscription";
import { createRoomPass } from "@/lib/roomPass";
import { isValidRoomId } from "@/lib/room";
import { PLANS } from "@/lib/plans";
import { clientIp, isRateLimited } from "@/lib/rateLimit";

// POST /api/rooms/pass  { roomId }
// Devuelve un pase firmado para la sala si quien lo pide tiene Premium activo.
// Sin sesión o sin Premium responde { pass: null } y la sala queda con el límite gratis.
export async function POST(req: Request) {
  if (isRateLimited(`pass:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  let roomId: unknown;
  try {
    ({ roomId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  if (!isValidRoomId(roomId)) {
    return NextResponse.json({ error: "Código de sala inválido" }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !(await isPremiumActive(userId))) return NextResponse.json({ pass: null });

  return NextResponse.json({ pass: createRoomPass(roomId, PLANS.premium.maxParticipants) });
}
