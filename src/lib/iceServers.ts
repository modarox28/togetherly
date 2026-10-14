// Servidores ICE para la videollamada.
//  - STUN (gratis, siempre): ayuda a que los dos navegadores se encuentren.
//  - TURN (opcional): reenvía el video cuando una red no deja la conexión directa
//    (datos móviles, redes de universidad o empresa). Se configura en el servidor;
//    ver src/app/api/turn/route.ts y la sección "Videollamada" del README.

export const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.l.google.com:19302" },
];

/** Pide los servidores ICE a la web; si falla, se queda solo con STUN. */
export async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const response = await fetch("/api/turn", { cache: "no-store" });
    if (!response.ok) return STUN_SERVERS;
    const { iceServers } = (await response.json()) as { iceServers?: RTCIceServer[] };
    return Array.isArray(iceServers) && iceServers.length > 0 ? iceServers : STUN_SERVERS;
  } catch {
    return STUN_SERVERS;
  }
}
