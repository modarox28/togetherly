// Service worker de la extensión: mantiene la conexión con el servidor de Togetherly
// y reparte las órdenes entre la web de la sala y las pestañas de streaming.

const SERVIDOR_PREDETERMINADO = "https://togetherly-production-44b8.up.railway.app";
const SALA_VALIDA = /^[a-zA-Z0-9_-]{3,32}$/;

// ── Cliente mínimo de Socket.io (protocolo v4) sobre WebSocket ──────────────
// "0{...}" apertura · "2" ping · "3" pong · "40" conectar · "42[evento,datos]" mensaje
class ClienteSocket {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.manejadores = new Map();
    this.activo = false;
    this.espera = 2000;
  }

  conectar() {
    this.activo = true;
    this._abrir();
  }

  _abrir() {
    const wsUrl = this.url.replace(/^http/, "ws");
    try {
      this.ws = new WebSocket(`${wsUrl}/socket.io/?EIO=4&transport=websocket`);
    } catch {
      this._reintentar();
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
        this.espera = 2000;
        this._disparar("connect");
        return;
      }
      if (data.startsWith("42")) {
        try {
          const [evento, datos] = JSON.parse(data.slice(2));
          this._disparar(evento, datos ?? {});
        } catch {}
      }
    };
    this.ws.onclose = () => {
      this._disparar("disconnect");
      if (this.activo) this._reintentar();
    };
    this.ws.onerror = () => {};
  }

  _reintentar() {
    setTimeout(() => {
      if (this.activo) this._abrir();
    }, this.espera);
    this.espera = Math.min(this.espera * 1.5, 30000);
  }

  emit(evento, datos) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(`42${JSON.stringify([evento, datos])}`);
  }

  on(evento, fn) {
    this.manejadores.set(evento, [...(this.manejadores.get(evento) ?? []), fn]);
    return this;
  }

  _disparar(evento, datos) {
    (this.manejadores.get(evento) ?? []).forEach((fn) => fn(datos));
  }

  desconectar() {
    this.activo = false;
    this.ws?.close();
    this.ws = null;
  }

  get abierto() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// ── Estado ─────────────────────────────────────────────────────────────────
let socket = null;
let roomId = null;
let username = null;
let avatar = null;
const pestanasStreaming = new Set();

const listo = chrome.storage.session.get(["roomId", "username", "avatar"]).then((g) => {
  if (g.roomId && SALA_VALIDA.test(g.roomId)) {
    roomId = g.roomId;
    username = g.username || "Invitado";
    avatar = g.avatar || "🍿";
    conectar();
  }
});

async function urlServidor() {
  const { serverUrl } = await chrome.storage.local.get("serverUrl");
  return typeof serverUrl === "string" && /^https?:\/\//.test(serverUrl)
    ? serverUrl
    : SERVIDOR_PREDETERMINADO;
}

async function conectar() {
  socket?.desconectar();
  const cliente = new ClienteSocket(await urlServidor());
  socket = cliente;

  cliente.on("connect", () => {
    cliente.emit("ext-connect", { roomId, username, avatar });
    insignia(true);
    avisarEstado(true);
  });
  cliente.on("disconnect", () => {
    insignia(false);
    avisarEstado(false);
  });

  // Órdenes de los demás → pestañas de streaming
  for (const [evento, accion] of [
    ["video-play", "play"],
    ["video-pause", "pause"],
    ["video-seek", "seek"],
  ]) {
    cliente.on(evento, ({ currentTime, by }) =>
      aPestanas({ type: "REMOTO", accion, currentTime, by })
    );
  }
  // Dónde va la sala (al entrar tarde o al pedirlo)
  cliente.on("ext-state", (estado) => {
    if (estado?.known) aPestanas({ type: "ESTADO", playing: !!estado.playing, currentTime: estado.position });
  });

  cliente.conectar();
}

function insignia(encendida) {
  chrome.action.setBadgeText({ text: encendida ? "●" : "" });
  chrome.action.setBadgeBackgroundColor({ color: encendida ? "#E07A5F" : "#9A8F86" });
}

function avisarEstado(conectado) {
  const msg = { type: "EXT_STATUS", connected: conectado, roomId: conectado ? roomId : null };
  chrome.tabs.query({}, (pestanas) => {
    for (const p of pestanas) chrome.tabs.sendMessage(p.id, msg).catch(() => {});
  });
}

function aPestanas(msg) {
  for (const id of pestanasStreaming) {
    chrome.tabs.sendMessage(id, msg).catch(() => pestanasStreaming.delete(id));
  }
}

chrome.tabs.onRemoved.addListener((id) => pestanasStreaming.delete(id));

function guardarSesion() {
  chrome.storage.session.set({ roomId, username, avatar });
}

function textoCorto(v, maximo, porDefecto) {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, maximo) : porDefecto;
}

function tiempo(t) {
  return typeof t === "number" && Number.isFinite(t) && t >= 0 && t < 86400 ? t : null;
}

// ── Mensajes de la web (bridge.js), el popup y las pestañas de streaming ───
chrome.runtime.onMessage.addListener((msg, sender, responder) => {
  if (!msg || typeof msg !== "object") return;

  (async () => {
    await listo;
    switch (msg.type) {
      case "JOIN_ROOM": {
        if (typeof msg.roomId !== "string" || !SALA_VALIDA.test(msg.roomId)) {
          return responder({ ok: false, error: "Código de sala inválido" });
        }
        const misma = msg.roomId === roomId && socket?.abierto;
        roomId = msg.roomId;
        username = textoCorto(msg.username, 24, "Invitado");
        avatar = textoCorto(msg.avatar, 8, "🍿");
        guardarSesion();
        if (!misma) await conectar();
        return responder({ ok: true, roomId });
      }
      case "LEAVE_ROOM": {
        roomId = username = avatar = null;
        chrome.storage.session.remove(["roomId", "username", "avatar"]);
        socket?.desconectar();
        socket = null;
        insignia(false);
        avisarEstado(false);
        return responder({ ok: true });
      }
      case "PING":
        return responder({ type: "PONG", connected: socket?.abierto ?? false, roomId, username });
      case "CONTENT_READY":
        if (sender.tab?.id != null) pestanasStreaming.add(sender.tab.id);
        return responder({ roomId, connected: !!roomId && (socket?.abierto ?? false) });
      case "PEDIR_ESTADO":
        if (roomId) socket?.emit("ext-state-request", { roomId });
        return responder({ ok: true });
      case "VIDEO_PLAY":
      case "VIDEO_PAUSE":
      case "VIDEO_SEEK": {
        if (sender.tab?.id != null) pestanasStreaming.add(sender.tab.id);
        const t = tiempo(msg.currentTime);
        if (roomId && t !== null) {
          const evento = { VIDEO_PLAY: "video-play", VIDEO_PAUSE: "video-pause", VIDEO_SEEK: "video-seek" }[msg.type];
          socket?.emit(evento, { roomId, currentTime: t });
        }
        return responder({ ok: true });
      }
      default:
        return responder({ ok: false });
    }
  })();
  return true; // respuesta asíncrona
});
