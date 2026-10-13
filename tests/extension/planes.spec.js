/* eslint-disable @typescript-eslint/no-require-imports */
// Límite de personas por sala según el plan (servidor de sockets con ROOM_PASS_SECRET).
const { test, expect } = require("@playwright/test");
const { spawn } = require("node:child_process");
const { createHmac } = require("node:crypto");
const path = require("node:path");
const { io } = require("socket.io-client");

const PUERTO = 3997;
const SERVIDOR = `http://localhost:${PUERTO}`;
const SECRETO = "prueba-".repeat(8); // 56 caracteres
let servidor;

// Igual que src/lib/roomPass.ts
function pase(roomId, max, secreto = SECRETO, venceEn = 60000) {
  const datos = Buffer.from(JSON.stringify({ r: roomId, m: max, e: Date.now() + venceEn })).toString("base64url");
  return `${datos}.${createHmac("sha256", secreto).update(datos).digest("base64url")}`;
}

// Conecta y entra a la sala; resuelve "dentro" o "llena".
function entrar(sala, nombre, pass) {
  return new Promise((resolver) => {
    const s = io(SERVIDOR, { transports: ["websocket"], forceNew: true });
    s.on("connect", () => s.emit("join-room", { roomId: sala, username: nombre, pass }));
    s.once("room-joined", () => resolver({ s, resultado: "dentro" }));
    s.once("room-full", ({ max }) => resolver({ s, resultado: "llena", max }));
  });
}

test.beforeAll(async () => {
  servidor = spawn(process.execPath, [path.resolve(__dirname, "../../socket-server.js")], {
    env: { ...process.env, SOCKET_PORT: String(PUERTO), ROOM_PASS_SECRET: SECRETO },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${SERVIDOR}/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("El servidor no arrancó");
});
test.afterAll(() => servidor?.kill());

test("plan gratis: la tercera persona ve la sala llena", async () => {
  const sala = `GRATIS${Date.now() % 100000}`;
  const a = await entrar(sala, "Ana");
  const b = await entrar(sala, "Beto");
  const c = await entrar(sala, "Caro");
  expect([a.resultado, b.resultado, c.resultado]).toEqual(["dentro", "dentro", "llena"]);
  expect(c.max).toBe(2);
  [a, b, c].forEach((x) => x.s.close());
});

test("Premium: con pase válido entran hasta 8", async () => {
  const sala = `PREMIUM${Date.now() % 100000}`;
  const anfitriona = await entrar(sala, "Ana", pase(sala, 8));
  const invitados = [];
  for (let i = 0; i < 7; i++) invitados.push(await entrar(sala, `Invitado${i}`));
  const noveno = await entrar(sala, "Noveno");
  expect(anfitriona.resultado).toBe("dentro");
  expect(invitados.every((x) => x.resultado === "dentro")).toBe(true);
  expect(noveno.resultado).toBe("llena");
  expect(noveno.max).toBe(8);
  [anfitriona, ...invitados, noveno].forEach((x) => x.s.close());
});

test("pases falsos, vencidos o de otra sala no sirven", async () => {
  const sala = `FALSO${Date.now() % 100000}`;
  const falsos = [
    pase(sala, 8, "otro-secreto-".repeat(4)), // firmado con otra clave
    pase(sala, 8, SECRETO, -1000), // vencido
    pase("OTRASALA", 8), // de otra sala
    "basura.sin-firma",
  ];
  const conexiones = [];
  for (const p of falsos) conexiones.push(await entrar(sala, "Alguien", p));
  // Los dos primeros entran (límite gratis de 2); el resto ya encuentra la sala llena.
  expect(conexiones.map((x) => x.resultado)).toEqual(["dentro", "dentro", "llena", "llena"]);
  conexiones.forEach((x) => x.s.close());
});
