/* eslint-disable @typescript-eslint/no-require-imports -- servidor Node en CommonJS */
// Servidor de salas de Togetherly (se despliega gratis en Render: `node socket-server.js`, ver render.yaml).
// La lógica está en la carpeta server/:
//   validation.js  → validar datos de los clientes
//   rooms.js       → estado de las salas en memoria
//   room-pass.js   → verificar pases Premium firmados por la web
//   connection.js  → eventos de cada conexión (sala, video, chat, videollamada)
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const { handleConnection } = require("./server/connection");
const { MAX_PARTICIPANTS, listPublicRooms, roomPreview } = require("./server/rooms");
const { isRoomId } = require("./server/validation");

// ── Configuración (variables de entorno) ─────────────────────────────────
// Render (y la mayoría de servicios) indica el puerto en PORT; SOCKET_PORT sirve para pruebas locales.
const PORT = process.env.SOCKET_PORT || process.env.PORT || 3001;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000", "http://127.0.0.1:3000"];

// Planes: sin pase, una sala admite 2 personas; con pase Premium, lo que diga el pase.
// El límite solo se activa si ROOM_PASS_SECRET (32+ caracteres) está configurado con el
// mismo valor en Vercel y en el servidor de salas. Sin él, el servidor funciona sin límite por plan.
const passSecret = (process.env.ROOM_PASS_SECRET?.length ?? 0) >= 32 ? process.env.ROOM_PASS_SECRET : null;
const plans = { passSecret, freeLimit: passSecret ? 2 : MAX_PARTICIPANTS };

// ── HTTP: salud y salas públicas ─────────────────────────────────────────
const httpServer = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
  } else if (req.method === "GET" && req.url.split("?")[0] === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  } else if (req.method === "GET" && req.url === "/api/rooms") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(listPublicRooms()));
  } else if (req.method === "GET" && req.url.startsWith("/api/rooms/")) {
    // Vista previa para la invitación: GET /api/rooms/ABC234
    let roomId = null;
    try {
      roomId = decodeURIComponent(req.url.slice("/api/rooms/".length).split("?")[0]);
    } catch {
      // %E0 y similares: dirección mal formada
    }
    if (!isRoomId(roomId)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Código inválido" }));
      return;
    }
    const online = io.sockets.adapter.rooms.get(roomId)?.size ?? 0;
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(roomPreview(roomId, online)));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// ── Socket.io ────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ["GET", "POST"] },
  maxHttpBufferSize: 1e5, // 100 KB: suficiente para la señalización de WebRTC
});

// Máximo de conexiones a la vez desde una misma IP (una familia entera cabe de sobra).
const MAX_CONNECTIONS_PER_IP = 20;
const connectionsByIp = new Map();
const clientIp = (socket) =>
  String(socket.handshake.headers["x-forwarded-for"] ?? socket.handshake.address).split(",")[0].trim();

io.use((socket, next) => {
  const ip = clientIp(socket);
  const count = connectionsByIp.get(ip) ?? 0;
  if (count >= MAX_CONNECTIONS_PER_IP) return next(new Error("Demasiadas conexiones"));
  connectionsByIp.set(ip, count + 1);
  socket.on("disconnect", () => {
    const left = (connectionsByIp.get(ip) ?? 1) - 1;
    if (left <= 0) connectionsByIp.delete(ip);
    else connectionsByIp.set(ip, left);
  });
  next();
});

io.on("connection", (socket) => handleConnection(io, socket, plans));

httpServer.listen(PORT, () => {
  console.log(`\n  Socket.io server running on port ${PORT}${passSecret ? " (límite por plan activo)" : ""}\n`);
});
