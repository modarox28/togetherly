import { NextResponse } from "next/server";
import { STUN_SERVERS } from "@/lib/iceServers";
import { clientIp, isRateLimited } from "@/lib/rateLimit";

// GET /api/turn
// Devuelve los servidores ICE para la videollamada. Las claves de TURN nunca llegan al
// navegador: aquí se cambian por credenciales temporales. Opciones (variables en Vercel):
//   1) Cloudflare TURN: CLOUDFLARE_TURN_KEY_ID + CLOUDFLARE_TURN_API_TOKEN
//   2) Otro proveedor con usuario fijo: TURN_URLS (separadas por coma) + TURN_USERNAME + TURN_CREDENTIAL
//   3) Nada configurado: solo STUN (funciona en la mayoría de redes de casa).

const CREDENTIAL_TTL_SECONDS = 4 * 60 * 60;
// Se reutiliza la misma credencial un rato para no llamar a Cloudflare en cada visita.
const CACHE_MS = 60 * 60 * 1000;

let cached: { iceServers: RTCIceServer[]; expiresAt: number } | null = null;

export async function GET(req: Request) {
  if (isRateLimited(`turn:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  const iceServers = await getIceServers();
  return NextResponse.json({ iceServers }, { headers: { "Cache-Control": "no-store" } });
}

async function getIceServers(): Promise<RTCIceServer[]> {
  if (cached && cached.expiresAt > Date.now()) return cached.iceServers;

  const fromCloudflare = await cloudflareIceServers();
  const servers = fromCloudflare ?? staticTurnServers();
  if (!servers) return STUN_SERVERS;

  cached = { iceServers: servers, expiresAt: Date.now() + CACHE_MS };
  return servers;
}

async function cloudflareIceServers(): Promise<RTCIceServer[] | null> {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN;
  if (!keyId || !token || !/^[A-Za-z0-9]+$/.test(keyId)) return null;

  try {
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ttl: CREDENTIAL_TTL_SECONDS }),
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { iceServers?: RTCIceServer | RTCIceServer[] };
    const list = Array.isArray(data.iceServers) ? data.iceServers : data.iceServers ? [data.iceServers] : [];
    // Los navegadores bloquean el puerto 53: se quitan esas direcciones.
    const cleaned = list
      .map((server) => ({ ...server, urls: toArray(server.urls).filter((url) => !url.includes(":53")) }))
      .filter((server) => server.urls.length > 0);
    return cleaned.length > 0 ? cleaned : null;
  } catch {
    return null;
  }
}

function staticTurnServers(): RTCIceServer[] | null {
  const urls = (process.env.TURN_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter((url) => /^turns?:[^\s]+$/.test(url));
  const username = process.env.TURN_USERNAME;
  const credential = process.env.TURN_CREDENTIAL;
  if (urls.length === 0 || !username || !credential) return null;
  return [...STUN_SERVERS, { urls, username, credential }];
}

function toArray(urls: string | string[]): string[] {
  return Array.isArray(urls) ? urls : [urls];
}
