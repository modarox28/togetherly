// Reglas de los códigos de sala, en un solo lugar para toda la web.
// El servidor (server/validation.js) y la extensión (background.js, popup.js)
// usan el mismo patrón: si lo cambias aquí, cámbialo allá también.

/** Cualquier código que acepta el servidor (3 a 32 letras, números, - o _). */
export const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

/** Código que genera Togetherly: 6 caracteres en mayúscula, sin letras confusas (I, O, 0, 1). */
export const ROOM_CODE_PATTERN = /^[A-Z0-9]{6}$/;
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const isValidRoomId = (value: unknown): value is string =>
  typeof value === "string" && ROOM_ID_PATTERN.test(value);

/** Limpia lo que escribe la persona en el campo de código (mayúsculas, sin símbolos, 6 máx.). */
export const normalizeRoomCode = (value: string) =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

/** Código nuevo con azar criptográfico (no se puede adivinar a partir de otros). */
export function generateRoomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let id = "";
  for (const byte of bytes) id += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
  return id;
}
