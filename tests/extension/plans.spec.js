/* eslint-disable @typescript-eslint/no-require-imports */
// Límite de personas por sala según el plan (servidor de sockets con ROOM_PASS_SECRET).
const { test, expect } = require("@playwright/test");
const { spawn } = require("node:child_process");
const { createHmac } = require("node:crypto");
const path = require("node:path");
const { io } = require("socket.io-client");

const PORT = 3997;
const SERVER_URL = `http://localhost:${PORT}`;
const SECRET = "prueba-".repeat(8); // 56 caracteres
let server;

// Igual que src/lib/roomPass.ts
function makePass(roomId, max, secret = SECRET, expiresInMs = 60000) {
  const payload = Buffer.from(JSON.stringify({ r: roomId, m: max, e: Date.now() + expiresInMs })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}

// Conecta y entra a la sala; resuelve "joined" o "full".
function join(roomId, username, pass) {
  return new Promise((resolve) => {
    const socket = io(SERVER_URL, { transports: ["websocket"], forceNew: true });
    socket.on("connect", () => socket.emit("join-room", { roomId, username, pass }));
    socket.once("room-joined", () => resolve({ socket, result: "joined" }));
    socket.once("room-full", ({ max }) => resolve({ socket, result: "full", max }));
  });
}

test.beforeAll(async () => {
  server = spawn(process.execPath, [path.resolve(__dirname, "../../socket-server.js")], {
    env: { ...process.env, SOCKET_PORT: String(PORT), ROOM_PASS_SECRET: SECRET },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${SERVER_URL}/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("El servidor no arrancó");
});
test.afterAll(() => server?.kill());

test("plan gratis: la tercera persona ve la sala llena", async () => {
  const roomId = `GRATIS${Date.now() % 100000}`;
  const a = await join(roomId, "Ana");
  const b = await join(roomId, "Beto");
  const c = await join(roomId, "Caro");
  expect([a.result, b.result, c.result]).toEqual(["joined", "joined", "full"]);
  expect(c.max).toBe(2);
  [a, b, c].forEach((x) => x.socket.close());
});

test("Premium: con pase válido entran hasta 8", async () => {
  const roomId = `PREMIUM${Date.now() % 100000}`;
  const host = await join(roomId, "Ana", makePass(roomId, 8));
  const guests = [];
  for (let i = 0; i < 7; i++) guests.push(await join(roomId, `Invitado${i}`));
  const ninth = await join(roomId, "Noveno");
  expect(host.result).toBe("joined");
  expect(guests.every((x) => x.result === "joined")).toBe(true);
  expect(ninth.result).toBe("full");
  expect(ninth.max).toBe(8);
  [host, ...guests, ninth].forEach((x) => x.socket.close());
});

test("pases falsos, vencidos o de otra sala no sirven", async () => {
  const roomId = `FALSO${Date.now() % 100000}`;
  const forged = [
    makePass(roomId, 8, "otro-secreto-".repeat(4)), // firmado con otra clave
    makePass(roomId, 8, SECRET, -1000), // vencido
    makePass("OTRASALA", 8), // de otra sala
    "basura.sin-firma",
  ];
  const attempts = [];
  for (const p of forged) attempts.push(await join(roomId, "Alguien", p));
  // Los dos primeros entran (límite gratis de 2); el resto ya encuentra la sala llena.
  expect(attempts.map((x) => x.result)).toEqual(["joined", "joined", "full", "full"]);
  attempts.forEach((x) => x.socket.close());
});
