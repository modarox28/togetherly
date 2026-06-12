const SOCKET_URL = "https://togetherly-production-44b8.up.railway.app";

// ── Minimal Socket.io client over raw WebSocket ────────────────────────────
// Socket.io v4 protocol: packets are text frames prefixed with EIO type.
// "0{...}" = engine open  "2" = ping  "3" = pong
// "40"     = namespace connect   "42[event,data]" = message
class SocketClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.handlers = new Map();
    this.alive = false;
    this._retryDelay = 2000;
  }

  connect() {
    this.alive = true;
    this._open();
  }

  _open() {
    const wsUrl = this.url.replace(/^http/, "ws");
    try {
      this.ws = new WebSocket(`${wsUrl}/socket.io/?EIO=4&transport=websocket`);
    } catch {
      this._retry();
      return;
    }
    this.ws.onopen = () => this.ws.send("40");
    this.ws.onmessage = ({ data }) => {
      if (data === "2") { this.ws.send("3"); return; }
      if (data === "40" || data.startsWith("40{")) {
        this._retryDelay = 2000;
        this._fire("connect");
        return;
      }
      if (data.startsWith("42")) {
        try {
          const [ev, payload] = JSON.parse(data.slice(2));
          this._fire(ev, payload);
        } catch {}
      }
    };
    this.ws.onclose = () => {
      this._fire("disconnect");
      if (this.alive) this._retry();
    };
    this.ws.onerror = () => {};
  }

  _retry() {
    setTimeout(() => { if (this.alive) this._open(); }, this._retryDelay);
    this._retryDelay = Math.min(this._retryDelay * 1.5, 30000);
  }

  emit(event, data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(`42${JSON.stringify([event, data])}`);
    }
  }

  on(event, fn) {
    const list = this.handlers.get(event) ?? [];
    this.handlers.set(event, [...list, fn]);
    return this;
  }

  _fire(event, data) {
    (this.handlers.get(event) ?? []).forEach((fn) => fn(data));
  }

  disconnect() {
    this.alive = false;
    this.ws?.close();
    this.ws = null;
  }

  get isOpen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// ── State ──────────────────────────────────────────────────────────────────
let socket = null;
let roomId = null;
let username = null;
let avatar = null;
let syncTabId = null; // tab running the streaming service

// Restore session on service-worker wake
chrome.storage.session.get(["roomId", "username", "avatar"], (stored) => {
  if (stored.roomId) {
    roomId = stored.roomId;
    username = stored.username || "User";
    avatar = stored.avatar || "🎮";
    _connect();
  }
});

// ── Socket connection ──────────────────────────────────────────────────────
function _connect() {
  socket?.disconnect();
  socket = new SocketClient(SOCKET_URL);

  socket.on("connect", () => {
    socket.emit("ext-connect", { roomId, username, avatar });
    _badge(true);
    _broadcastStatus(true);
  });

  socket.on("disconnect", () => {
    _badge(false);
    _broadcastStatus(false);
  });

  // Remote sync events → send to the streaming tab
  socket.on("video-play", ({ currentTime }) => {
    _toSyncTab({ type: "REMOTE_PLAY", currentTime });
  });
  socket.on("video-pause", ({ currentTime }) => {
    _toSyncTab({ type: "REMOTE_PAUSE", currentTime });
  });
  socket.on("video-seek", ({ currentTime }) => {
    _toSyncTab({ type: "REMOTE_SEEK", currentTime });
  });

  socket.connect();
}

function _badge(on) {
  chrome.action.setBadgeText({ text: on ? "●" : "" });
  chrome.action.setBadgeBackgroundColor({ color: on ? "#C084FC" : "#888" });
}

function _broadcastStatus(connected) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, {
        type: "EXT_STATUS",
        connected,
        roomId: connected ? roomId : null,
      }).catch(() => {});
    });
  });
}

function _toSyncTab(msg) {
  if (!syncTabId) return;
  chrome.tabs.sendMessage(syncTabId, msg).catch(() => {});
}

function _saveSession() {
  chrome.storage.session.set({ roomId, username, avatar });
}

// ── Message router ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // ── From bridge.js or popup (web app tells extension which room) ─────────
  if (msg.type === "JOIN_ROOM") {
    roomId = msg.roomId;
    username = msg.username || "User";
    avatar = msg.avatar || "🎮";
    _saveSession();
    _connect();
    sendResponse({ ok: true, roomId });
    return true;
  }

  if (msg.type === "LEAVE_ROOM") {
    roomId = null;
    username = null;
    avatar = null;
    syncTabId = null;
    chrome.storage.session.remove(["roomId", "username", "avatar"]);
    socket?.disconnect();
    socket = null;
    _badge(false);
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "PING") {
    sendResponse({
      type: "PONG",
      connected: socket?.isOpen ?? false,
      roomId,
      username,
    });
    return true;
  }

  // ── From content.js (streaming site) ─────────────────────────────────────
  if (msg.type === "CONTENT_READY") {
    syncTabId = sender.tab?.id ?? null;
    sendResponse({ roomId, username, connected: !!roomId && (socket?.isOpen ?? false) });
    return true;
  }

  if (msg.type === "VIDEO_PLAY" && roomId) {
    socket?.emit("video-play", { roomId, currentTime: msg.currentTime });
    return;
  }
  if (msg.type === "VIDEO_PAUSE" && roomId) {
    socket?.emit("video-pause", { roomId, currentTime: msg.currentTime });
    return;
  }
  if (msg.type === "VIDEO_SEEK" && roomId) {
    socket?.emit("video-seek", { roomId, currentTime: msg.currentTime });
    return;
  }
});
