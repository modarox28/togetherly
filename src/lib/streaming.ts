// Direcciones de streaming que la sala puede compartir ("qué estamos viendo").
// Igual que server/streaming.js (servidor de salas): si agregas una plataforma, cámbiala en los dos.
import type { Platform } from "@/lib/platforms";

const STREAMING_HOSTS: { platform: Platform; test: (host: string) => boolean }[] = [
  { platform: "netflix", test: (host) => host === "www.netflix.com" || host === "netflix.com" },
  { platform: "prime", test: (host) => /^(www\.)?primevideo\.com$/.test(host) || /^(www\.)?amazon\.[a-z.]{2,8}$/.test(host) },
  { platform: "disney", test: (host) => /^(www\.)?disneyplus\.com$/.test(host) },
  { platform: "hbo", test: (host) => /^(play\.|www\.)?(hbomax|max)\.com$/.test(host) },
  { platform: "appletv", test: (host) => host === "tv.apple.com" },
  { platform: "paramount", test: (host) => /^(www\.)?paramountplus\.com$/.test(host) },
  { platform: "crunchyroll", test: (host) => /^(www\.)?crunchyroll\.com$/.test(host) },
];

export interface NowWatching {
  url: string;
  platform: Platform;
  /** Nombre de quien lo abrió */
  by: string;
}

/** La dirección solo se usa si es https y de una plataforma soportada (evita redirecciones a sitios raros). */
export function isSafeStreamingUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 600) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && STREAMING_HOSTS.some((entry) => entry.test(url.hostname.toLowerCase()));
  } catch {
    return false;
  }
}

/** Valida lo que manda el servidor de salas; null si no sirve. */
export function parseNowWatching(value: unknown): NowWatching | null {
  if (!value || typeof value !== "object") return null;
  const { url, platform, by } = value as Record<string, unknown>;
  if (!isSafeStreamingUrl(url)) return null;
  const match = STREAMING_HOSTS.find((entry) => entry.test(new URL(url).hostname.toLowerCase()));
  if (!match || (typeof platform === "string" && platform !== match.platform)) return null;
  return { url, platform: match.platform, by: typeof by === "string" ? by.slice(0, 24) : "" };
}
