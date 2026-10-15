import { io, type Socket } from "socket.io-client";

export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

let socket: Socket | null = null;

/**
 * Despierta el servidor de salas si está dormido (plan gratis de Render).
 * Se llama al abrir la web para que, cuando la persona entre a una sala, ya esté listo.
 */
export function wakeSocketServer() {
  fetch(`${SOCKET_URL}/health`, { mode: "no-cors", cache: "no-store" }).catch(() => {});
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      // El servidor gratis (Render) tarda hasta ~1 min en despertar: se reintenta
      // con esperas crecientes (1 s → 5 s) durante unos 2 minutos antes de rendirse.
      reconnectionAttempts: 30,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
