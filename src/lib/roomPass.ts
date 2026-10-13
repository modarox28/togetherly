import "server-only";
import { createHmac } from "node:crypto";
import { isValidRoomId } from "@/lib/room";

// Pase firmado que le dice al servidor de sockets cuántas personas admite una sala.
// Lo firma la web (Vercel) y lo verifica el servidor de sockets (server/room-pass.js)
// con el mismo secreto ROOM_PASS_SECRET. Sin el secreto nadie puede fabricar un pase.
// Formato: base64url(JSON {r: roomId, m: maxParticipants, e: venceEn}) + "." + firma.

const PASS_LIFETIME_MS = 12 * 60 * 60 * 1000; // 12 horas

export function createRoomPass(roomId: string, maxParticipants: number): string | null {
  const secret = process.env.ROOM_PASS_SECRET;
  if (!secret || secret.length < 32 || !isValidRoomId(roomId)) return null;
  const payload = Buffer.from(
    JSON.stringify({ r: roomId, m: maxParticipants, e: Date.now() + PASS_LIFETIME_MS })
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
