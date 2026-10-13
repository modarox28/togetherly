/* eslint-disable @typescript-eslint/no-require-imports -- servidor Node en CommonJS */
const { createServer } = require("http");
const { Server } = require("socket.io");
const { createHmac, timingSafeEqual } = require("node:crypto");

const PORT = process.env.SOCKET_PORT || 3001;

// ── Validación ───────────────────────────────────────────────────────────
const SALA_VALIDA = /^[A-Za-z0-9_-]{3,32}$/;
const PLATAFORMAS = new Set([
  "youtube", "twitch", "vimeo", "spotify", "netflix", "disney", "hbo",
  "prime", "appletv", "paramount", "crunchyroll",
]);
const MAX_PARTICIPANTES = 20; // tope técnico absoluto

// Planes: sin pase, una sala admite 2 personas; con pase Premium, hasta lo que diga el pase.
// El límite solo se aplica si ROOM_PASS_SECRET está configurado (el mismo valor en Vercel y Railway);
// sin él, el servidor funciona como antes, con el tope técnico.
const SECRETO_PASE = process.env.ROOM_PASS_SECRET && process.env.ROOM_PASS_SECRET.length >= 32
  ? process.env.ROOM_PASS_SECRET
  : null;
const LIMITE_GRATIS = SECRETO_PASE ? 2 : MAX_PARTICIPANTES;

// Devuelve el máximo de personas que autoriza un pase válido para esa sala, o null.
function verificarPase(pase, roomId) {
  if (!SECRETO_PASE || typeof pase !== "string" || pase.length > 600) return null;
  const [datos, firma] = pase.split(".");
  if (!datos || !firma) return null;
  const esperada = createHmac("sha256", SECRETO_PASE).update(datos).digest();
  let recibida;
  try {
    recibida = Buffer.from(firma, "base64url");
  } catch {
    return null;
  }
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null;
  try {
    const { r, m, e } = JSON.parse(Buffer.from(datos, "base64url").toString("utf8"));
    if (r !== roomId || typeof e !== "number" || e < Date.now()) return null;
    return Number.isInteger(m) ? Math.min(Math.max(m, LIMITE_GRATIS), MAX_PARTICIPANTES) : null;
  } catch {
    return null;
  }
}

const esSala = (id) => typeof id === "string" && SALA_VALIDA.test(id);
const texto = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
// Un tiempo válido de video, o null si no viene (p. ej. el botón "Di Play" de la web).
const tiempo = (t) => (typeof t === "number" && Number.isFinite(t) && t >= 0 && t < 86400 ? t : null);
const esUrl = (u) => typeof u === "string" && u.length <= 2048 && /^https?:\/\/[^\s]+$/i.test(u);

const httpServer = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (req.method === "GET" && req.url === "/api/rooms") {
    const publicRooms = [];
    for (const [roomId, room] of rooms.entries()) {
      if (room.isPublic && room.participants.size > 0) {
        publicRooms.push({
          id: roomId,
          name: room.name || roomId,
          participants: room.participants.size,
          host: room.host ? room.participants.get(room.host)?.name : null,
          videoUrl: room.videoUrl,
          platform: room.platform || "youtube",
          createdAt: room.createdAt,
        });
      }
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(publicRooms.slice(0, 100)));
    return;
  }

  res.writeHead(404);
  res.end();
});

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : ["http://localhost:3000", "http://127.0.0.1:3000"];

const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ["GET", "POST"] },
  maxHttpBufferSize: 1e5, // 100 KB: suficiente para la señalización de WebRTC
});

// roomId -> { host, participants: Map<socketId, participante>, videoUrl, videoState, ... }
const rooms = new Map();

const AVATAR_COLORS = ["#E07A5F", "#81B29A", "#F2CC8F", "#A6A1D6", "#E9A6A6", "#7FB7BE", "#D4A373"];

function getRoom(roomId, isPublic = false, name = null) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      host: null,
      participants: new Map(),
      videoUrl: null,
      // known: ya alguien dio play/pausa/salto con un tiempo real
      videoState: { playing: false, currentTime: 0, updatedAt: Date.now(), known: false },
      isPublic: isPublic === true,
      name: texto(name, 40) || roomId,
      platform: "youtube",
      createdAt: Date.now(),
      maxParticipants: LIMITE_GRATIS,
    });
  }
  return rooms.get(roomId);
}

// Posición actual estimada por el servidor (evita depender del reloj de cada usuario).
function posicionActual(state) {
  if (!state.playing) return state.currentTime;
  return state.currentTime + (Date.now() - state.updatedAt) / 1000;
}

function estadoParaExtension(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.videoState.known) return { known: false };
  return { known: true, playing: room.videoState.playing, position: posicionActual(room.videoState) };
}

io.on("connection", (socket) => {
  let currentRoomId = null;
  let currentUsername = null;
  let isExtension = false;

  // Límite de eventos por conexión: evita que un cliente sature la sala.
  let ventana = Date.now();
  let eventos = 0;
  socket.use((_packet, next) => {
    const ahora = Date.now();
    if (ahora - ventana > 10000) { ventana = ahora; eventos = 0; }
    if (++eventos > 150) return; // se descarta en silencio
    next();
  });

  const enSala = (roomId) => esSala(roomId) && socket.rooms.has(roomId);
  const mismoGrupo = (targetId) => {
    const destino = typeof targetId === "string" && io.sockets.sockets.get(targetId);
    return !!destino && !!currentRoomId && destino.rooms.has(currentRoomId);
  };

  // La extensión entra a la sala sin aparecer como participante.
  socket.on("ext-connect", (datos) => {
    const roomId = datos?.roomId;
    if (!esSala(roomId)) return;
    if (currentRoomId && currentRoomId !== roomId) socket.leave(currentRoomId);
    currentRoomId = roomId;
    currentUsername = texto(datos.username, 24) || "Invitado";
    isExtension = true;
    socket.join(roomId);
    getRoom(roomId); // guarda el estado aunque nadie tenga la web abierta
    socket.emit("ext-connected", { roomId });
    socket.emit("ext-state", estadoParaExtension(roomId));
  });

  socket.on("ext-state-request", (datos) => {
    if (!enSala(datos?.roomId)) return;
    socket.emit("ext-state", estadoParaExtension(datos.roomId));
  });

  socket.on("join-room", (datos) => {
    const roomId = datos?.roomId;
    const username = texto(datos?.username, 24);
    if (!esSala(roomId) || !username) return;

    const room = getRoom(roomId, datos.isPublic, datos.roomName);
    const autorizado = verificarPase(datos.pass, roomId);
    if (autorizado) room.maxParticipants = Math.max(room.maxParticipants, autorizado);
    if (room.participants.size === 0) {
      // La sala pudo nacer desde la extensión: la primera persona en la web define sus datos.
      room.isPublic = datos.isPublic === true;
      room.name = texto(datos.roomName, 40) || roomId;
    }
    if (room.participants.size >= room.maxParticipants && !room.participants.has(socket.id)) {
      socket.emit("room-full", { roomId, max: room.maxParticipants });
      return;
    }

    currentRoomId = roomId;
    currentUsername = username;
    socket.join(roomId);

    const participant = {
      id: socket.id,
      name: username,
      color: AVATAR_COLORS[room.participants.size % AVATAR_COLORS.length],
      avatar: texto(datos.avatar, 8) || "🍿",
    };
    room.participants.set(socket.id, participant);
    if (!room.host) room.host = socket.id;

    socket.emit("room-joined", {
      roomId,
      participants: Array.from(room.participants.values()),
      videoUrl: room.videoUrl,
      videoState: { ...room.videoState, currentTime: posicionActual(room.videoState) },
      isHost: room.host === socket.id,
      you: participant,
      maxParticipants: room.maxParticipants,
    });
    socket.to(roomId).emit("participant-joined", { participant });
  });

  socket.on("video-url-change", (datos) => {
    if (!enSala(datos?.roomId) || !esUrl(datos.url)) return;
    const room = rooms.get(datos.roomId);
    if (!room) return;
    room.videoUrl = datos.url;
    room.platform = PLATAFORMAS.has(datos.platform) ? datos.platform : "youtube";
    room.videoState = { playing: false, currentTime: 0, updatedAt: Date.now(), known: false };
    io.to(datos.roomId).emit("video-url-changed", { url: datos.url, by: currentUsername });
  });

  // play / pausa / salto: solo quien está en la sala puede mandarlos.
  function eventoVideo(nombre, playing) {
    socket.on(nombre, (datos) => {
      if (!enSala(datos?.roomId)) return;
      const room = getRoom(datos.roomId);
      const t = tiempo(datos.currentTime);
      if (room) {
        const previo = room.videoState;
        room.videoState = {
          playing: playing ?? previo.playing,
          currentTime: t ?? posicionActual(previo),
          updatedAt: Date.now(),
          known: previo.known || t !== null,
        };
      }
      socket.to(datos.roomId).emit(nombre, { currentTime: t, by: currentUsername });
    });
  }
  eventoVideo("video-play", true);
  eventoVideo("video-pause", false);
  eventoVideo("video-seek", null);

  socket.on("typing", (datos) => {
    if (!currentUsername || !enSala(datos?.roomId)) return;
    socket.to(datos.roomId).emit("typing", { username: currentUsername });
  });

  socket.on("chat-message", (datos) => {
    const text = texto(datos?.text, 500);
    if (!text || !enSala(datos.roomId)) return;
    const room = rooms.get(datos.roomId);
    const participant = room?.participants.get(socket.id);
    if (!participant) return;
    io.to(datos.roomId).emit("chat-message", {
      id: `${Date.now()}-${socket.id}`,
      text,
      username: participant.name,
      color: participant.color,
      avatar: participant.avatar,
      timestamp: Date.now(),
    });
  });

  socket.on("reaction", (datos) => {
    const emoji = texto(datos?.emoji, 8);
    if (!emoji || !enSala(datos.roomId)) return;
    const participant = rooms.get(datos.roomId)?.participants.get(socket.id);
    if (!participant) return;
    io.to(datos.roomId).emit("reaction", { emoji, username: participant.name, id: Date.now() });
  });

  // Señalización de WebRTC: solo entre personas de la misma sala.
  socket.on("call-request", (datos) => {
    if (!enSala(datos?.roomId)) return;
    socket.to(datos.roomId).emit("call-request", { from: currentUsername, fromId: socket.id });
  });
  socket.on("call-accept", (datos) => {
    if (mismoGrupo(datos?.targetId)) io.to(datos.targetId).emit("call-accepted", { fromId: socket.id });
  });
  socket.on("call-decline", (datos) => {
    if (mismoGrupo(datos?.targetId)) io.to(datos.targetId).emit("call-declined");
  });
  socket.on("call-offer", (datos) => {
    if (mismoGrupo(datos?.targetId)) io.to(datos.targetId).emit("call-offer", { offer: datos.offer, fromId: socket.id });
  });
  socket.on("call-answer", (datos) => {
    if (mismoGrupo(datos?.targetId)) io.to(datos.targetId).emit("call-answer", { answer: datos.answer, fromId: socket.id });
  });
  socket.on("call-ice-candidate", (datos) => {
    if (mismoGrupo(datos?.targetId)) {
      io.to(datos.targetId).emit("call-ice-candidate", { candidate: datos.candidate, fromId: socket.id });
    }
  });
  socket.on("call-end", (datos) => {
    if (enSala(datos?.roomId)) socket.to(datos.roomId).emit("call-ended");
  });

  socket.on("disconnect", () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    // La sala se borra solo cuando no queda nadie conectado (ni web ni extensión):
    // así, si alguien cierra la web, los demás siguen sincronizados en Netflix.
    const quedan = io.sockets.adapter.rooms.get(currentRoomId)?.size ?? 0;
    if (quedan === 0) {
      rooms.delete(currentRoomId);
      return;
    }
    if (isExtension) return; // la extensión no cuenta como participante

    const participant = room.participants.get(socket.id);
    room.participants.delete(socket.id);
    if (room.host === socket.id) room.host = room.participants.keys().next().value ?? null;
    socket.to(currentRoomId).emit("participant-left", {
      participantId: socket.id,
      name: participant?.name,
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`\n  Socket.io server running on port ${PORT}\n`);
});
