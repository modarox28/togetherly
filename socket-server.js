/* eslint-disable @typescript-eslint/no-require-imports -- servidor Node en CommonJS */
// Servidor de salas de Togetherly (se despliega en Railway: `node socket-server.js`).
// La lógica está en la carpeta server/:
//   validation.js  → validar datos de los clientes
//   rooms.js       → estado de las salas en memoria
//   room-pass.js   → verificar pases Premium firmados por la web
//   connection.js  → eventos de cada conexión (sala, video, chat, videollamada)
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const { handleConnection } = require("./server/connection");
const { MAX_PARTICIPANTS, listPublicRooms } = require("./server/rooms");

// ── Configuración (variables de entorno) ─────────────────────────────────
const PORT = process.env.SOCKET_PORT || 3001;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000", "http://127.0.0.1:3000"];

// Planes: sin pase, una sala admite 2 personas; con pase Premium, lo que diga el pase.
// El límite solo se activa si ROOM_PASS_SECRET (32+ caracteres) está configurado con el
// mismo valor en Vercel y Railway. Sin él, el servidor funciona sin límite por plan.
const passSecret = (process.env.ROOM_PASS_SECRET?.length ?? 0) >= 32 ? process.env.ROOM_PASS_SECRET : null;
const plans = { passSecret, freeLimit: passSecret ? 2 : MAX_PARTICIPANTS };

// ── HTTP: salud y salas públicas ─────────────────────────────────────────
const httpServer = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
  } else if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  } else if (req.method === "GET" && req.url === "/api/rooms") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(listPublicRooms()));
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

io.on("connection", (socket) => handleConnection(io, socket, plans));

httpServer.listen(PORT, () => {
  console.log(`\n  Socket.io server running on port ${PORT}${passSecret ? " (límite por plan activo)" : ""}\n`);
});
