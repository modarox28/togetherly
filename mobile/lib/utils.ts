// Mismo formato de código que la extensión (popup.js): sin letras que se confunden (I, O, 0, 1).
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomId(): string {
  let id = "";
  for (let i = 0; i < 6; i++) id += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  return id;
}

/** Código válido para el servidor (server/validation.js): letras, números, _ y -, de 3 a 32. */
export const isRoomCode = (value: string) => /^[A-Za-z0-9_-]{3,32}$/.test(value);

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
