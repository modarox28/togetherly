// GET /api/config
// Configuración pública que necesitan la extensión y otros clientes: hoy, la dirección
// del servidor de salas. Así, si el servidor se muda (p. ej. de Railway a Render),
// basta con cambiar NEXT_PUBLIC_SOCKET_URL en Vercel; nadie reinstala la extensión.
// Solo contiene datos públicos, por eso se permite leerla desde cualquier origen.

export const dynamic = "force-static";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
  "Cache-Control": "public, max-age=300",
};

export function GET() {
  return Response.json({ socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL ?? null }, { headers: CORS_HEADERS });
}
