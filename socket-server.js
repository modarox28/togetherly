const { createServer } = require("http");
const { Server } = require("socket.io");

const PORT = process.env.SOCKET_PORT || 3001;

const httpServer = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

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
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify(publicRooms));
    return;
  }

  res.writeHead(404);
  res.end();
});

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : ["http://localhost:3000", "http://127.0.0.1:3000"];

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
  },
});

// roomId -> { host, participants: Map<socketId, { id, name, color }>, videoUrl, videoState }
const rooms = new Map();

const AVATAR_COLORS = [
  "#C084FC", "#F472B6", "#60A5FA", "#34D399", "#FBBF24", "#F87171", "#A78BFA",
];

function getRoom(roomId, isPublic = false, name = null) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      host: null,
      participants: new Map(),
      videoUrl: null,
      videoState: { playing: false, currentTime: 0, updatedAt: Date.now() },
      isPublic,
      name: name || roomId,
      platform: "youtube",
      createdAt: Date.now(),
    });
  }
  return rooms.get(roomId);
}

function getParticipantList(room) {
  return Array.from(room.participants.values());
}

function getColorForIndex(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

io.on("connection", (socket) => {
  let currentRoomId = null;
  let currentUsername = null;

  socket.on("join-room", ({ roomId, username, avatar, isPublic, roomName }) => {
    if (!roomId || !username) return;

    currentRoomId = roomId;
    currentUsername = username;

    const room = getRoom(roomId, isPublic, roomName);
    socket.join(roomId);

    const colorIndex = room.participants.size;
    const participant = {
      id: socket.id,
      name: username,
      color: getColorForIndex(colorIndex),
      avatar: avatar || "🎮",
    };
    room.participants.set(socket.id, participant);

    if (!room.host) room.host = socket.id;

    // Send current room state to the joining participant
    socket.emit("room-joined", {
      roomId,
      participants: getParticipantList(room),
      videoUrl: room.videoUrl,
      videoState: room.videoState,
      isHost: room.host === socket.id,
      you: participant,
    });

    // Notify others
    socket.to(roomId).emit("participant-joined", { participant });
  });

  socket.on("video-url-change", ({ roomId, url, platform }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.videoUrl = url;
    room.platform = platform || "youtube";
    room.videoState = { playing: false, currentTime: 0, updatedAt: Date.now() };
    io.to(roomId).emit("video-url-changed", { url, by: currentUsername });
  });

  socket.on("video-play", ({ roomId, currentTime }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.videoState = { playing: true, currentTime, updatedAt: Date.now() };
    socket.to(roomId).emit("video-play", { currentTime, by: currentUsername });
  });

  socket.on("video-pause", ({ roomId, currentTime }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.videoState = { playing: false, currentTime, updatedAt: Date.now() };
    socket.to(roomId).emit("video-pause", { currentTime, by: currentUsername });
  });

  socket.on("video-seek", ({ roomId, currentTime }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.videoState.currentTime = currentTime;
    room.videoState.updatedAt = Date.now();
    socket.to(roomId).emit("video-seek", { currentTime, by: currentUsername });
  });

  socket.on("chat-message", ({ roomId, text }) => {
    if (!text || !text.trim()) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const participant = room.participants.get(socket.id);
    if (!participant) return;

    const message = {
      id: `${Date.now()}-${socket.id}`,
      text: text.trim().slice(0, 500),
      username: participant.name,
      color: participant.color,
      avatar: participant.avatar,
      timestamp: Date.now(),
    };
    io.to(roomId).emit("chat-message", message);
  });

  socket.on("reaction", ({ roomId, emoji }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const participant = room.participants.get(socket.id);
    if (!participant) return;
    io.to(roomId).emit("reaction", { emoji, username: participant.name, id: Date.now() });
  });

  // WebRTC signaling
  socket.on("call-request", ({ roomId }) => {
    socket.to(roomId).emit("call-request", { from: currentUsername, fromId: socket.id });
  });
  socket.on("call-accept", ({ targetId }) => {
    io.to(targetId).emit("call-accepted", { fromId: socket.id });
  });
  socket.on("call-decline", ({ targetId }) => {
    io.to(targetId).emit("call-declined");
  });
  socket.on("call-offer", ({ offer, targetId }) => {
    io.to(targetId).emit("call-offer", { offer, fromId: socket.id });
  });
  socket.on("call-answer", ({ answer, targetId }) => {
    io.to(targetId).emit("call-answer", { answer, fromId: socket.id });
  });
  socket.on("call-ice-candidate", ({ candidate, targetId }) => {
    io.to(targetId).emit("call-ice-candidate", { candidate, fromId: socket.id });
  });
  socket.on("call-end", ({ roomId }) => {
    socket.to(roomId).emit("call-ended");
  });

  socket.on("disconnect", () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    room.participants.delete(socket.id);

    if (room.participants.size === 0) {
      rooms.delete(currentRoomId);
    } else {
      if (room.host === socket.id) {
        room.host = room.participants.keys().next().value;
      }
      socket.to(currentRoomId).emit("participant-left", {
        participantId: socket.id,
        name: participant?.name,
      });
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`\n  Socket.io server running on port ${PORT}\n`);
});
