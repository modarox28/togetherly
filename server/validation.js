/* eslint-disable @typescript-eslint/no-require-imports -- servidor Node en CommonJS */
// Validación de todo lo que llega de los clientes. Nunca se confía en los datos recibidos.

// Igual que en src/lib/room.ts y en la extensión (background.js / popup.js)
const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

const PLATFORMS = new Set([
  "youtube", "twitch", "vimeo", "spotify", "netflix", "disney", "hbo",
  "prime", "appletv", "paramount", "crunchyroll",
]);

const isRoomId = (value) => typeof value === "string" && ROOM_ID_PATTERN.test(value);

/** Texto recortado a un largo máximo; "" si no es texto. */
const cleanText = (value, maxLength) => (typeof value === "string" ? value.trim().slice(0, maxLength) : "");

/** Segundos de video válidos, o null si no vienen (p. ej. el botón "Di Play" de la web). */
const cleanTime = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 86400 ? value : null;

const isHttpUrl = (value) => typeof value === "string" && value.length <= 2048 && /^https?:\/\/[^\s]+$/i.test(value);

const isPlatform = (value) => PLATFORMS.has(value);

/**
 * Clave privada de cada dispositivo (la genera la web, la extensión o la app y nunca se
 * reparte a los demás). Identifica a quién lidera la sala sin depender del nombre.
 */
const cleanClientKey = (value) => (typeof value === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(value) ? value : null);

module.exports = { isRoomId, cleanText, cleanTime, isHttpUrl, isPlatform, cleanClientKey };
