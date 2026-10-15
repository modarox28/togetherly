/* eslint-disable @typescript-eslint/no-require-imports -- servidor Node en CommonJS */
// Direcciones de streaming que se pueden compartir con la sala ("qué estamos viendo").
// Solo se aceptan las plataformas que soporta la extensión, siempre por https.
// Igual que src/lib/streaming.ts (web): si agregas una plataforma, cámbiala en los dos.

const STREAMING_HOSTS = [
  { platform: "netflix", test: (host) => host === "www.netflix.com" || host === "netflix.com" },
  { platform: "prime", test: (host) => /^(www\.)?primevideo\.com$/.test(host) || /^(www\.)?amazon\.[a-z.]{2,8}$/.test(host) },
  { platform: "disney", test: (host) => /^(www\.)?disneyplus\.com$/.test(host) },
  { platform: "hbo", test: (host) => /^(play\.|www\.)?(hbomax|max)\.com$/.test(host) },
  { platform: "appletv", test: (host) => host === "tv.apple.com" },
  { platform: "paramount", test: (host) => /^(www\.)?paramountplus\.com$/.test(host) },
  { platform: "crunchyroll", test: (host) => /^(www\.)?crunchyroll\.com$/.test(host) },
];

const MAX_URL_LENGTH = 600;

/**
 * Devuelve { url, platform } con la dirección limpia (sin #fragmento), o null si no es
 * una página de una plataforma soportada.
 */
function cleanStreamingUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const match = STREAMING_HOSTS.find((entry) => entry.test(url.hostname.toLowerCase()));
  if (!match) return null;
  url.hash = "";
  const clean = url.toString();
  return clean.length <= MAX_URL_LENGTH ? { url: clean, platform: match.platform } : null;
}

module.exports = { cleanStreamingUrl };
