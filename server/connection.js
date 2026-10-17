/* eslint-disable @typescript-eslint/no-require-imports -- servidor Node en CommonJS */
// Eventos de cada conexión (una persona en la web o una extensión).
// Regla de seguridad: solo quien está dentro de una sala puede mandarle eventos.
const { isRoomId, cleanText, cleanTime, isHttpUrl, isPlatform, cleanClientKey } = require("./validation");
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
  membersOf,
  membersWithKeys,
  settingsOf,
  ensureLeader,
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
  let currentKey = null; // clave privada de este dispositivo (ver cleanClientKey)
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

  /** Avisa a todos quiénes están y quién lidera (después de que alguien entra o sale). */
  const announceMembers = (roomId) => {
    ensureLeader(roomId);
    io.to(roomId).emit("members", { members: membersOf(roomId) });
    announceSettings(roomId);
  };
  /** Cada uno recibe los ajustes con "youLead" propio (sin revelar la clave de nadie). */
  const announceSettings = (roomId) => {
    const room = rooms.get(roomId);
    for (const id of io.sockets.adapter.rooms.get(roomId) ?? []) {
      io.to(id).emit("room-settings", settingsOf(roomId, room?.memberKeys.get(id) ?? `s:${id}`));
    }
  };
  /** Guarda la clave del dispositivo; si no mandó una válida (versión vieja), usa una de esta conexión. */
  const rememberKey = (room, data) => {
    currentKey = cleanClientKey(data?.clientKey) ?? `s:${socket.id}`;
    room.memberKeys.set(socket.id, currentKey);
  };
  /** ¿Quien lidera expulsó a este dispositivo de la sala? */
  const isBanned = (room, data) => {
    const key = cleanClientKey(data?.clientKey);
    return !!key && room.banned.has(key);
  };

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
    if (currentRoomId && currentRoomId !== roomId) {
      socket.leave(currentRoomId);
      rooms.get(currentRoomId)?.memberKeys.delete(socket.id);
      if (rooms.get(currentRoomId)?.extMembers.delete(socket.id)) announceMembers(currentRoomId);
    }
    currentRoomId = roomId;
    currentUsername = cleanText(data.username, 24) || "Invitado";
    isExtension = true;
    socket.join(roomId);
    const room = newRoom(roomId); // guarda el estado aunque nadie tenga la web abierta
    if (isBanned(room, data)) {
      socket.emit("kicked", { roomId });
      return;
    }
    // Quien crea la sala desde la app puede hacerla pública (aparece en "Salas públicas").
    if (room.participants.size === 0 && room.extMembers.size === 0 && data.isPublic === true) {
      room.isPublic = true;
      room.name = cleanText(data.roomName, 40) || roomId;
    }
    rememberKey(room, data);
    room.extMembers.set(socket.id, {
      id: socket.id,
      name: currentUsername,
      avatar: cleanText(data.avatar, 8) || "🍿",
      color: colorForIndex(room.participants.size + room.extMembers.size),
    });
    announceMembers(roomId);
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
    // Con "Solo el líder", solo quien lidera cambia la película de la sala.
    if (room.controlMode === "leader" && currentKey !== room.leader) return;
    // Cambio de película: el minuto y el play/pausa de la anterior ya no sirven.
    if (room.nowWatching) room.videoState = { playing: false, currentTime: 0, updatedAt: Date.now(), known: false };
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
    if (isBanned(room, data)) {
      socket.emit("kicked", { roomId });
      return;
    }
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
    rememberKey(room, data);
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
      isPublic: room.isPublic === true,
    });
    socket.to(roomId).emit("participant-joined", { participant });
    announceMembers(roomId);
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
  /** ¿Puede esta persona mover la reproducción? (todos, o solo quien lidera) */
  const canControl = (room) =>
    room.controlMode !== "leader" || (!!currentKey && currentKey === room.leader);

  function onVideoEvent(eventName, playing) {
    socket.on(eventName, (data) => {
      if (!isInRoom(data?.roomId)) return;
      const room = newRoom(data.roomId);
      if (!canControl(room)) {
        // Solo controla quien lidera: se le avisa y se le devuelve a donde va la sala.
        socket.emit("control-denied", { leader: settingsOf(data.roomId)?.leader ?? null });
        if (isExtension) socket.emit("ext-state", stateForExtension(data.roomId));
        else if (room.videoState.known) {
          const position = currentPosition(room.videoState);
          socket.emit(room.videoState.playing ? "video-play" : "video-pause", { currentTime: position, by: null });
        }
        return;
      }
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

  // ── Quién controla la reproducción (solo lo cambia quien lidera) ────────
  socket.on("set-control", (data) => {
    if (!isInRoom(data?.roomId) || !["all", "leader"].includes(data.mode)) return;
    const room = rooms.get(data.roomId);
    if (!room || !currentKey || currentKey !== room.leader) return;
    room.controlMode = data.mode;
    announceSettings(data.roomId);
  });

  // ── Chat y reacciones ────────────────────────────────────────────────────
  socket.on("typing", (data) => {
    if (currentUsername && isInRoom(data?.roomId)) {
      socket.to(data.roomId).emit("typing", { username: currentUsername });
    }
  });

  /** Quién habla: la persona en la web o, si solo tiene la extensión, su ficha de extensión. */
  const speaker = (roomId) => {
    const room = rooms.get(roomId);
    return room?.participants.get(socket.id) ?? room?.extMembers.get(socket.id) ?? null;
  };

  // El chat y las reacciones llegan de la web ("chat-message") o del panel dentro de
  // Netflix, Prime… ("ext-chat"); todos en la sala reciben lo mismo.
  const onChat = (data) => {
    const text = cleanText(data?.text, 500);
    if (!text || !isInRoom(data.roomId)) return;
    const person = speaker(data.roomId);
    if (!person) return;
    io.to(data.roomId).emit("chat-message", {
      id: `${Date.now()}-${socket.id}`,
      senderId: socket.id,
      text,
      username: person.name,
      color: person.color,
      avatar: person.avatar,
      timestamp: Date.now(),
    });
  };
  socket.on("chat-message", onChat);
  socket.on("ext-chat", onChat);

  const onReaction = (data) => {
    const emoji = cleanText(data?.emoji, 8);
    if (!emoji || !isInRoom(data.roomId)) return;
    const person = speaker(data.roomId);
    if (!person) return;
    io.to(data.roomId).emit("reaction", { emoji, username: person.name, id: Date.now() });
  };
  socket.on("reaction", onReaction);
  socket.on("ext-reaction", onReaction);

  // ── Expulsar (solo quien lidera) y reportar ──────────────────────────────
  socket.on("kick-member", (data) => {
    if (!isInRoom(data?.roomId) || typeof data.memberId !== "string") return;
    const room = rooms.get(data.roomId);
    if (!room || !currentKey || currentKey !== room.leader) return;
    const target = membersWithKeys(data.roomId).find((m) => m.id === data.memberId);
    if (!target || target.key === currentKey) return;
    room.banned.add(target.key);
    for (const [socketId, key] of room.memberKeys) {
      if (key !== target.key) continue;
      const other = io.sockets.sockets.get(socketId);
      other?.emit("kicked", { roomId: data.roomId });
      other?.disconnect(true); // al desconectarse sale de la sala y se avisa a los demás
    }
  });

  // Los reportes quedan en el registro del servidor (Render → Logs) para revisarlos a mano.
  socket.on("report-member", (data) => {
    if (!isInRoom(data?.roomId) || typeof data.memberId !== "string") return;
    const target = membersOf(data.roomId).find((m) => m.id === data.memberId);
    if (!target) return;
    const reason = cleanText(data.reason, 200) || "sin motivo";
    console.warn(
      `[reporte] sala=${data.roomId} reportado="${target.name}" (${target.id}) por="${currentUsername ?? "?"}" motivo="${reason}" ${new Date().toISOString()}`
    );
    socket.emit("report-received");
  });

  // ── Señalización de la videollamada (WebRTC): solo entre personas de la misma sala ──
  socket.on("call-request", (data) => {
    // En salas públicas (con desconocidos) no hay videollamada.
    if (isInRoom(data?.roomId) && !rooms.get(data.roomId)?.isPublic) {
      socket.to(data.roomId).emit("call-request", { from: currentUsername, fromId: socket.id });
    }
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
    room.memberKeys.delete(socket.id);
    if (isExtension) {
      // La extensión no sale como "participante" en el chat, pero sí en la lista de quiénes están.
      room.extMembers.delete(socket.id);
      announceMembers(currentRoomId);
      return;
    }

    const participant = room.participants.get(socket.id);
    room.participants.delete(socket.id);
    if (room.host === socket.id) room.host = room.participants.keys().next().value ?? null;
    socket.to(currentRoomId).emit("participant-left", { participantId: socket.id, name: participant?.name });
    announceMembers(currentRoomId);
  });
}

module.exports = { handleConnection };
