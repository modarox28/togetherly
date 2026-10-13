import "server-only";
import { createHmac } from "node:crypto";

// Pase firmado que le dice al servidor de sockets cuántas personas admite una sala.
// Lo firma la web (Vercel) y lo verifica el servidor de sockets (Railway) con el mismo
// secreto ROOM_PASS_SECRET. Sin el secreto, nadie puede fabricar un pase válido.

const SALA_VALIDA = /^[A-Za-z0-9_-]{3,32}$/;
const DURACION_MS = 12 * 60 * 60 * 1000; // 12 horas

export function createRoomPass(roomId: string, maxParticipants: number): string | null {
  const secreto = process.env.ROOM_PASS_SECRET;
  if (!secreto || secreto.length < 32 || !SALA_VALIDA.test(roomId)) return null;
  const datos = Buffer.from(
    JSON.stringify({ r: roomId, m: maxParticipants, e: Date.now() + DURACION_MS })
  ).toString("base64url");
  const firma = createHmac("sha256", secreto).update(datos).digest("base64url");
  return `${datos}.${firma}`;
}
