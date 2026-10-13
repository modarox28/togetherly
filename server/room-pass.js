/* eslint-disable @typescript-eslint/no-require-imports -- servidor Node en CommonJS */
// Verificación de pases de sala firmados por la web (src/lib/roomPass.ts).
// Formato: base64url(JSON {r: roomId, m: maxParticipants, e: venceEn}) + "." + firma HMAC-SHA256.
const { createHmac, timingSafeEqual } = require("node:crypto");

/**
 * @param {string} secret  ROOM_PASS_SECRET (el mismo valor en Vercel y Railway)
 * @param {unknown} pass   pase recibido del cliente
 * @param {string} roomId  sala a la que intenta entrar
 * @returns {number|null}  máximo de personas que autoriza el pase, o null si no es válido
 */
function verifyRoomPass(secret, pass, roomId) {
  if (!secret || typeof pass !== "string" || pass.length > 600) return null;
  const [payload, signature] = pass.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", secret).update(payload).digest();
  const received = Buffer.from(signature, "base64url");
  // Comparación en tiempo constante: no deja adivinar la firma midiendo tiempos.
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const { r, m, e } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (r !== roomId || typeof e !== "number" || e < Date.now() || !Number.isInteger(m)) return null;
    return m;
  } catch {
    return null;
  }
}

module.exports = { verifyRoomPass };
