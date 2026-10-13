// Service worker de la extensión: mantiene la conexión con el servidor de Togetherly
// y reparte las órdenes entre la web de la sala, el popup y las pestañas de streaming.
//
//   web (bridge.js) / popup ──JOIN_ROOM──▶ background ──socket──▶ servidor (Railway)
//   pestaña de streaming (content.js) ◀──REMOTE_COMMAND / ROOM_STATE── background

const DEFAULT_SERVER_URL = "https://togetherly-production-44b8.up.railway.app";
// Igual que en src/lib/room.ts y server/validation.js
const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

// ── Cliente mínimo de Socket.io (protocolo v4) sobre WebSocket ──────────────
// Un service worker no puede cargar la librería oficial, así que se habla el
// protocolo directamente: "0{...}" apertura · "2" ping · "3" pong ·
// "40" conectar · "42[evento,datos]" mensaje.
class SocketClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.handlers = new Map();
    this.active = false;
    this.retryDelay = 2000;
  }

  connect() {
    this.active = true;
    this.open();
  }

  open() {
    const wsUrl = this.url.replace(/^http/, "ws");
    try {
      this.ws = new WebSocket(`${wsUrl}/socket.io/?EIO=4&transport=websocket`);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.ws.onopen = () => this.ws.send("40");
    this.ws.onmessage = ({ data }) => {
      if (typeof data !== "string") return;
      if (data === "2") {
        this.ws.send("3");
        return;
      }
      if (data === "40" || data.startsWith("40{")) {
        this.retryDelay = 2000;
        this.fire("connect");
        return;
      }
      if (data.startsWith("42")) {
        try {
          const [event, payload] = JSON.parse(data.slice(2));
          this.fire(event, payload ?? {});
        } catch {}
      }
    };
    this.ws.onclose = () => {
      this.fire("disconnect");
      if (this.active) this.scheduleRetry();
    };
    this.ws.onerror = () => {};
  }

  // Reintenta con espera creciente (2 s, 3 s, 4,5 s… hasta 30 s)
  scheduleRetry() {
    setTimeout(() => {
      if (this.active) this.open();
    }, this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 1.5, 30000);
  }

  emit(event, payload) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(`42${JSON.stringify([event, payload])}`);
  }

  on(event, handler) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    return this;
  }

  fire(event, payload) {
    (this.handlers.get(event) ?? []).forEach((handler) => handler(payload));
  }

  disconnect() {
    this.active = false;
    this.ws?.close();
    this.ws = null;
  }

  get isOpen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// ── Estado ─────────────────────────────────────────────────────────────────
let socket = null;
let roomId = null;
let username = null;
let avatar = null;
const streamingTabs = new Set();

// El service worker se duerme y despierta: la sala activa se guarda en storage.session.
const ready = chrome.storage.session.get(["roomId", "username", "avatar"]).then((saved) => {
  if (saved.roomId && ROOM_ID_PATTERN.test(saved.roomId)) {
    roomId = saved.roomId;
    username = saved.username || "Invitado";
    avatar = saved.avatar || "🍿";
    connect();
  }
});

// Para pruebas o servidores propios se puede guardar otra URL en storage.local.serverUrl
async function getServerUrl() {
  const { serverUrl } = await chrome.storage.local.get("serverUrl");
  return typeof serverUrl === "string" && /^https?:\/\//.test(serverUrl) ? serverUrl : DEFAULT_SERVER_URL;
}

async function connect() {
  socket?.disconnect();
  const client = new SocketClient(await getServerUrl());
  socket = client;

  client.on("connect", () => {
    client.emit("ext-connect", { roomId, username, avatar });
    setBadge(true);
    broadcastStatus(true);
  });
  client.on("disconnect", () => {
    setBadge(false);
    broadcastStatus(false);
  });

  // Órdenes de los demás → pestañas de streaming
  const remoteEvents = { "video-play": "play", "video-pause": "pause", "video-seek": "seek" };
  for (const [event, action] of Object.entries(remoteEvents)) {
    client.on(event, ({ currentTime, by }) => sendToStreamingTabs({ type: "REMOTE_COMMAND", action, currentTime, by }));
  }
  // En qué va la sala (al entrar tarde o al pedirlo)
  client.on("ext-state", (state) => {
    if (state?.known) {
      sendToStreamingTabs({ type: "ROOM_STATE", playing: !!state.playing, currentTime: state.position });
    }
  });

  client.connect();
}

function setBadge(connected) {
  chrome.action.setBadgeText({ text: connected ? "●" : "" });
  chrome.action.setBadgeBackgroundColor({ color: connected ? "#FFC965" : "#5E4F80" });
}

function broadcastStatus(connected) {
  const message = { type: "EXT_STATUS", connected, roomId: connected ? roomId : null };
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) chrome.tabs.sendMessage(tab.id, message).catch(() => {});
  });
}

function sendToStreamingTabs(message) {
  for (const tabId of streamingTabs) {
    chrome.tabs.sendMessage(tabId, message).catch(() => streamingTabs.delete(tabId));
  }
}

chrome.tabs.onRemoved.addListener((tabId) => streamingTabs.delete(tabId));

function saveSession() {
  chrome.storage.session.set({ roomId, username, avatar });
}

function cleanText(value, maxLength, fallback) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : fallback;
}

function cleanTime(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 86400 ? value : null;
}

const LOCAL_EVENTS = { VIDEO_PLAY: "video-play", VIDEO_PAUSE: "video-pause", VIDEO_SEEK: "video-seek" };

// ── Mensajes de la web (bridge.js), el popup y las pestañas de streaming ───
async function handleMessage(message, sender) {
  await ready;
  switch (message.type) {
    case "JOIN_ROOM": {
      if (typeof message.roomId !== "string" || !ROOM_ID_PATTERN.test(message.roomId)) {
        return { ok: false, error: "Código de sala inválido" };
      }
      const alreadyConnected = message.roomId === roomId && socket?.isOpen;
      roomId = message.roomId;
      username = cleanText(message.username, 24, "Invitado");
      avatar = cleanText(message.avatar, 8, "🍿");
      saveSession();
      if (!alreadyConnected) await connect();
      return { ok: true, roomId };
    }
    case "LEAVE_ROOM": {
      roomId = username = avatar = null;
      chrome.storage.session.remove(["roomId", "username", "avatar"]);
      socket?.disconnect();
      socket = null;
      setBadge(false);
      broadcastStatus(false);
      return { ok: true };
    }
    case "PING":
      return { type: "PONG", connected: socket?.isOpen ?? false, roomId, username };
    case "CONTENT_READY":
      if (sender.tab?.id != null) streamingTabs.add(sender.tab.id);
      return { roomId, connected: !!roomId && (socket?.isOpen ?? false) };
    case "REQUEST_STATE":
      if (roomId) socket?.emit("ext-state-request", { roomId });
      return { ok: true };
    case "VIDEO_PLAY":
    case "VIDEO_PAUSE":
    case "VIDEO_SEEK": {
      if (sender.tab?.id != null) streamingTabs.add(sender.tab.id);
      const time = cleanTime(message.currentTime);
      if (roomId && time !== null) socket?.emit(LOCAL_EVENTS[message.type], { roomId, currentTime: time });
      return { ok: true };
    }
    default:
      return { ok: false };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") return;
  handleMessage(message, sender).then(sendResponse);
  return true; // la respuesta llega de forma asíncrona
});
