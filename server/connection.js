/* eslint-disable @typescript-eslint/no-require-imports -- servidor Node en CommonJS */
// Eventos de cada conexión (una persona en la web o una extensión).
// Regla de seguridad: solo quien está dentro de una sala puede mandarle eventos.
const { isRoomId, cleanText, cleanTime, isHttpUrl, isPlatform } = require("./validation");
const { verifyRoomPass } = require("./room-pass");
const { cleanStreamingUrl } = require("./streaming");
const {
  MAX_PARTICIPANTS,
  rooms,
  canOpenRoom,
  getOrCreateRoom,
  currentPosition,
  stateForExtension,
  colorForIndex,
} = require("./rooms");

const RATE_LIMIT = { windowMs: 10_000, maxEvents: 150 };

/**
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 * @param {{ passSecret: string|null, freeLimit: number }} plans
 */
function handleConnection(io, socket, plans) {
  let currentRoomId = null;
  let currentUsername = null;
  let isExtension = false;

  // Límite de eventos por conexión: evita que un cliente sature la sala.
  let windowStart = Date.now();
  let eventCount = 0;
  socket.use((_packet, next) => {
    const now = Date.now();
    if (now - windowStart > RATE_LIMIT.windowMs) {
      windowStart = now;
      eventCount = 0;
    }
    if (++eventCount > RATE_LIMIT.maxEvents) return; // se descarta en silencio
    next();
  });

  const isInRoom = (roomId) => isRoomId(roomId) && socket.rooms.has(roomId);
  const isInSameRoom = (targetId) => {
    const target = typeof targetId === "string" && io.sockets.sockets.get(targetId);
    return !!target && !!currentRoomId && target.rooms.has(currentRoomId);
  };
  const newRoom = (roomId, options = {}) =>
    getOrCreateRoom(roomId, { ...options, maxParticipants: plans.freeLimit });

  // ── Extensión: entra a la sala sin aparecer como participante ───────────
  socket.on("ext-connect", (data) => {
    const roomId = data?.roomId;
    if (!isRoomId(roomId) || !canOpenRoom(roomId)) return;
    if (currentRoomId && currentRoomId !== roomId) socket.leave(currentRoomId);
    currentRoomId = roomId;
    currentUsername = cleanText(data.username, 24) || "Invitado";
    isExtension = true;
    socket.join(roomId);
    newRoom(roomId); // guarda el estado aunque nadie tenga la web abierta
    socket.emit("ext-connected", { roomId });
    socket.emit("ext-state", stateForExtension(roomId));
    const { nowWatching } = rooms.get(roomId);
    if (nowWatching) socket.emit("now-watching", nowWatching);
  });

  // La extensión avisa qué página de streaming tiene abierta quien está en la sala.
  // Así, quien entra con el enlace de invitación llega directo a la misma película.
  socket.on("ext-now-watching", (data) => {
    if (!isInRoom(data?.roomId)) return;
    const room = rooms.get(data.roomId);
    const clean = cleanStreamingUrl(data.url);
    if (!room || !clean || room.nowWatching?.url === clean.url) return;
    room.nowWatching = { ...clean, by: currentUsername || "Alguien" };
    io.to(data.roomId).emit("now-watching", room.nowWatching);
  });

  socket.on("ext-state-request", (data) => {
    if (isInRoom(data?.roomId)) socket.emit("ext-state", stateForExtension(data.roomId));
  });

  // ── Web: entrar a la sala ────────────────────────────────────────────────
  socket.on("join-room", (data) => {
    const roomId = data?.roomId;
    const username = cleanText(data?.username, 24);
    if (!isRoomId(roomId) || !username) return;
    if (!canOpenRoom(roomId)) {
      socket.emit("server-busy");
      return;
    }

    const room = newRoom(roomId, { isPublic: data.isPublic, name: data.roomName });
    const passLimit = verifyRoomPass(plans.passSecret, data.pass, roomId);
    if (passLimit) {
      const allowed = Math.min(Math.max(passLimit, plans.freeLimit), MAX_PARTICIPANTS);
      room.maxParticipants = Math.max(room.maxParticipants, allowed);
      room.premium = true;
    }
    if (room.participants.size === 0) {
      // La sala pudo nacer desde la extensión: la primera persona en la web define sus datos.
      room.isPublic = data.isPublic === true;
      room.name = cleanText(data.roomName, 40) || roomId;
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
      color: colorForIndex(room.participants.size),
      avatar: cleanText(data.avatar, 8) || "🍿",
    };
    room.participants.set(socket.id, participant);
    if (!room.host) room.host = socket.id;

    socket.emit("room-joined", {
      roomId,
      participants: Array.from(room.participants.values()),
      videoUrl: room.videoUrl,
      videoState: { ...room.videoState, currentTime: currentPosition(room.videoState) },
      isHost: room.host === socket.id,
      you: participant,
      maxParticipants: room.maxParticipants,
      premium: room.premium === true,
      nowWatching: room.nowWatching,
    });
    socket.to(roomId).emit("participant-joined", { participant });
  });

  socket.on("video-url-change", (data) => {
    if (!isInRoom(data?.roomId) || !isHttpUrl(data.url)) return;
    const room = rooms.get(data.roomId);
    if (!room) return;
    room.videoUrl = data.url;
    room.platform = isPlatform(data.platform) ? data.platform : "youtube";
    room.videoState = { playing: false, currentTime: 0, updatedAt: Date.now(), known: false };
    io.to(data.roomId).emit("video-url-changed", { url: data.url, by: currentUsername });
  });

  // ── Play / pausa / salto ────────────────────────────────────────────────
  // playing: true (play), false (pausa) o null (salto: no cambia si está reproduciendo)
  function onVideoEvent(eventName, playing) {
    socket.on(eventName, (data) => {
      if (!isInRoom(data?.roomId)) return;
      const room = newRoom(data.roomId);
      const time = cleanTime(data.currentTime);
      const previous = room.videoState;
      room.videoState = {
        playing: playing ?? previous.playing,
        currentTime: time ?? currentPosition(previous),
        updatedAt: Date.now(),
        known: previous.known || time !== null,
      };
      socket.to(data.roomId).emit(eventName, { currentTime: time, by: currentUsername });
    });
  }
  onVideoEvent("video-play", true);
  onVideoEvent("video-pause", false);
  onVideoEvent("video-seek", null);

  // ── Chat y reacciones ────────────────────────────────────────────────────
  socket.on("typing", (data) => {
    if (currentUsername && isInRoom(data?.roomId)) {
      socket.to(data.roomId).emit("typing", { username: currentUsername });
    }
  });

  socket.on("chat-message", (data) => {
    const text = cleanText(data?.text, 500);
    if (!text || !isInRoom(data.roomId)) return;
    const participant = rooms.get(data.roomId)?.participants.get(socket.id);
    if (!participant) return;
    io.to(data.roomId).emit("chat-message", {
      id: `${Date.now()}-${socket.id}`,
      senderId: socket.id,
      text,
      username: participant.name,
      color: participant.color,
      avatar: participant.avatar,
      timestamp: Date.now(),
    });
  });

  socket.on("reaction", (data) => {
    const emoji = cleanText(data?.emoji, 8);
    if (!emoji || !isInRoom(data.roomId)) return;
    const participant = rooms.get(data.roomId)?.participants.get(socket.id);
    if (!participant) return;
    io.to(data.roomId).emit("reaction", { emoji, username: participant.name, id: Date.now() });
  });

  // ── Señalización de la videollamada (WebRTC): solo entre personas de la misma sala ──
  socket.on("call-request", (data) => {
    if (isInRoom(data?.roomId)) socket.to(data.roomId).emit("call-request", { from: currentUsername, fromId: socket.id });
  });
  socket.on("call-accept", (data) => {
    if (isInSameRoom(data?.targetId)) io.to(data.targetId).emit("call-accepted", { fromId: socket.id });
  });
  socket.on("call-decline", (data) => {
    if (isInSameRoom(data?.targetId)) io.to(data.targetId).emit("call-declined");
  });
  socket.on("call-offer", (data) => {
    if (isInSameRoom(data?.targetId)) io.to(data.targetId).emit("call-offer", { offer: data.offer, fromId: socket.id });
  });
  socket.on("call-answer", (data) => {
    if (isInSameRoom(data?.targetId)) io.to(data.targetId).emit("call-answer", { answer: data.answer, fromId: socket.id });
  });
  socket.on("call-ice-candidate", (data) => {
    if (isInSameRoom(data?.targetId)) {
      io.to(data.targetId).emit("call-ice-candidate", { candidate: data.candidate, fromId: socket.id });
    }
  });
  socket.on("call-end", (data) => {
    if (isInRoom(data?.roomId)) socket.to(data.roomId).emit("call-ended");
  });

  // ── Salida ───────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    // La sala se borra solo cuando no queda nadie conectado (ni web ni extensión):
    // así, si alguien cierra la web, los demás siguen sincronizados en Netflix.
    const remaining = io.sockets.adapter.rooms.get(currentRoomId)?.size ?? 0;
    if (remaining === 0) {
      rooms.delete(currentRoomId);
      return;
    }
    if (isExtension) return; // la extensión no cuenta como participante

    const participant = room.participants.get(socket.id);
    room.participants.delete(socket.id);
    if (room.host === socket.id) room.host = room.participants.keys().next().value ?? null;
    socket.to(currentRoomId).emit("participant-left", { participantId: socket.id, name: participant?.name });
  });
}

module.exports = { handleConnection };
