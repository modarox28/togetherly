// Motor de sincronización: se inyecta en las plataformas de streaming.
// Escucha play/pausa/salto del video local y los manda a la sala; aplica los de los demás.
// La lógica específica de cada plataforma está en platforms.js.
//
// Mensajes que recibe del background:
//   REMOTE_COMMAND { action: "play" | "pause" | "seek", currentTime, by }
//   ROOM_STATE     { playing, currentTime }   → al entrar tarde o cambiar de episodio
//   EXT_STATUS     { connected, roomId }
//   NOW_WATCHING_UPDATE { url, by } → alguien de la sala abrió otra película
//
// Y avisa al background qué página de video está abierta (NOW_WATCHING), para que
// quien entra con el enlace de invitación llegue directo a la misma película.

(() => {
  if (globalThis.__togetherlyEngine) return;
  globalThis.__togetherlyEngine = true;

  const platform = globalThis.TogetherlyPlatforms?.current();
  if (!platform) return;

  const DRIFT_TOLERANCE = 1.5; // segundos de diferencia aceptables antes de saltar
  const EXPECTED_EVENT_TTL = 2500; // ms que se espera un evento provocado por nosotros

  let video = null;
  let roomId = null;
  let pendingOrder = null; // orden que llegó antes de encontrar el video
  let orderQueue = Promise.resolve();
  let seekDebounce = null;
  let lastReportedUrl = null;
  const URL_PLAYER_PLATFORMS = new Set(["netflix", "disney", "hbo", "paramount", "crunchyroll"]);
  const isTopFrame = window.top === window;

  // Eventos que provoca la propia extensión al aplicar una orden remota.
  // Se ignoran uno a uno (no por tiempo): así una acción real de la persona nunca se pierde.
  let expectedEvents = [];

  const now = () => Date.now();
  const isValidTime = (t) => typeof t === "number" && Number.isFinite(t) && t >= 0;

  function expectEvent(type) {
    expectedEvents.push({ type, until: now() + EXPECTED_EVENT_TTL });
  }

  // true si el evento lo provocamos nosotros (y lo descuenta de la lista)
  function isOwnEvent(type) {
    expectedEvents = expectedEvents.filter((e) => e.until > now());
    const index = expectedEvents.findIndex((e) => e.type === type);
    if (index === -1) return false;
    expectedEvents.splice(index, 1);
    return true;
  }

  function sendToBackground(message, onReply) {
    try {
      chrome.runtime.sendMessage({ ...message, platform: platform.id }, (reply) => {
        if (chrome.runtime.lastError) return;
        onReply?.(reply);
      });
    } catch {
      // La extensión se recargó y este script quedó huérfano: no hay nada que hacer.
    }
  }

  // ── Eventos del video local ─────────────────────────────────────────────
  function onLocalPlay() {
    if (isOwnEvent("play") || !roomId) return;
    sendToBackground({ type: "VIDEO_PLAY", currentTime: video.currentTime });
    showToast("▶ Diste play · sincronizando");
  }

  function onLocalPause() {
    if (isOwnEvent("pause") || !roomId || video.ended) return;
    sendToBackground({ type: "VIDEO_PAUSE", currentTime: video.currentTime });
    showToast("⏸ Pausaste · sincronizando");
  }

  function onLocalSeek() {
    if (isOwnEvent("seeked") || !roomId) return;
    // Al arrastrar la barra llegan varios "seeked": se manda solo el último.
    clearTimeout(seekDebounce);
    seekDebounce = setTimeout(() => {
      if (video) sendToBackground({ type: "VIDEO_SEEK", currentTime: video.currentTime });
    }, 300);
  }

  function attachVideo(newVideo) {
    if (video === newVideo) return;
    detachVideo();
    video = newVideo;
    video.addEventListener("play", onLocalPlay);
    video.addEventListener("pause", onLocalPause);
    video.addEventListener("seeked", onLocalSeek);

    if (pendingOrder) {
      const order = pendingOrder;
      pendingOrder = null;
      enqueue(order);
    } else if (roomId) {
      // Entraste tarde o cambiaste de episodio: pide en qué va la sala.
      sendToBackground({ type: "REQUEST_STATE" });
    }
    if (roomId) showToast(`Sincronizado con la sala ${roomId}`);
  }

  function detachVideo() {
    if (!video) return;
    video.removeEventListener("play", onLocalPlay);
    video.removeEventListener("pause", onLocalPause);
    video.removeEventListener("seeked", onLocalSeek);
    video = null;
  }

  // Busca el video cada segundo: las plataformas lo cambian al pasar de episodio
  // o al terminar un anuncio. Es barato porque solo busca cuando hace falta.
  setInterval(() => {
    if (!roomId) return;
    if (!platform.isPlayerPage()) {
      detachVideo();
      return;
    }
    if (!(video && video.isConnected && video.readyState > 0)) {
      const found = platform.findVideo();
      if (found) attachVideo(found);
    }
    reportNowWatching();
  }, 1000);

  // Solo la pestaña principal sabe la dirección real (en Crunchyroll el video va en un iframe).
  function reportNowWatching() {
    // Se reconoce la película por la dirección (/watch/, /play/…), aunque el video
    // todavía no aparezca: así funciona aunque el reproductor tarde o esté escondido.
    // (Prime y Apple TV+ no tienen una dirección de reproductor clara: ahí se espera el video.)
    const onPlayerPage = URL_PLAYER_PLATFORMS.has(platform.id) && platform.isPlayerPage();
    if (!isTopFrame || !(video || onPlayerPage || platform.id === "crunchyroll")) return;
    const url = location.href.split("#")[0];
    if (url === lastReportedUrl) return;
    lastReportedUrl = url;
    sendToBackground({ type: "NOW_WATCHING", url });
  }

  const samePage = (a, b) => {
    try {
      const x = new URL(a);
      const y = new URL(b);
      return x.origin === y.origin && x.pathname === y.pathname;
    } catch {
      return false;
    }
  };

  // ── Órdenes que llegan de la sala ───────────────────────────────────────
  // Se aplican en fila para que un "play" y un "seek" seguidos no se pisen.
  function enqueue(order) {
    orderQueue = orderQueue.then(() => applyOrder(order)).catch(() => {});
  }

  async function applyOrder(order) {
    if (!video) {
      pendingOrder = order;
      return;
    }
    const control = platform.control;
    const target = order.currentTime;
    const isFar = isValidTime(target) && Math.abs(video.currentTime - target) > DRIFT_TOLERANCE;

    const seek = async () => {
      expectEvent("seeked");
      if (!(await control.seek(video, target))) showToast("No pude saltar: muévete al minuto a mano");
    };
    const play = async () => {
      expectEvent("play");
      if (!(await control.play(video))) showToast("Toca el video para reanudar (el navegador bloqueó el play)");
    };
    const pause = async () => {
      expectEvent("pause");
      await control.pause(video);
    };

    switch (order.action) {
      case "play":
        if (isFar) await seek();
        if (video.paused) await play();
        break;
      case "pause":
        if (!video.paused) await pause();
        if (isFar) await seek();
        break;
      case "seek":
        if (isFar) await seek();
        break;
      case "state":
        if (isFar) await seek();
        if (order.playing && video.paused) await play();
        if (!order.playing && !video.paused) await pause();
        showToast("Te pusiste al día con la sala");
        break;
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") return;

    // Diagnóstico para el popup: ¿qué ve la extensión en esta pestaña?
    // (En Crunchyroll el video está en un marco aparte: ese marco responde si lo tiene.)
    if (message.type === "DIAG") {
      const videoFound = !!(video && video.isConnected);
      if (isTopFrame || videoFound) {
        sendResponse({
          platform: platform.name,
          onPlayerPage: platform.isPlayerPage(),
          videoFound,
          inRoom: !!roomId,
        });
      }
      return;
    }

    if (message.type === "REMOTE_COMMAND") {
      enqueue(message);
      const who = typeof message.by === "string" && message.by ? message.by.slice(0, 24) : "Alguien";
      if (message.action === "play") showToast(`▶ ${who} dio play`);
      if (message.action === "pause") showToast(`⏸ ${who} pausó`);
      if (message.action === "seek") showToast(`⏩ ${who} saltó a ${formatTime(message.currentTime)}`);
    } else if (message.type === "ROOM_STATE" && message.playing !== undefined) {
      enqueue({ ...message, action: "state" });
    } else if (message.type === "NOW_WATCHING_UPDATE" && isTopFrame && roomId) {
      // El background ya validó la dirección (solo plataformas soportadas, https).
      if (typeof message.url === "string" && !samePage(message.url, location.href)) {
        const who = typeof message.by === "string" && message.by ? message.by.slice(0, 24) : "Alguien";
        showToast(`${who} abrió otra cosa`, { label: "Ir", onClick: () => location.assign(message.url) });
      }
    } else if (message.type === "EXT_STATUS") {
      roomId = message.connected ? message.roomId : null;
      if (!roomId) {
        detachVideo();
        showToast("Togetherly desconectado");
      }
    }
  });

  sendToBackground({ type: "CONTENT_READY" }, (reply) => {
    if (reply?.connected && reply.roomId) roomId = reply.roomId;
  });

  function formatTime(seconds) {
    if (!isValidTime(seconds)) return "?";
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    const m = Math.floor((seconds / 60) % 60);
    const h = Math.floor(seconds / 3600);
    return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
  }

  // ── Aviso flotante ───────────────────────────────────────────────────────
  // Va en un shadow DOM cerrado para que los estilos de la plataforma no lo dañen,
  // y se mueve dentro del elemento en pantalla completa para seguir visible.
  const TOAST_CSS = `
    .toast{position:fixed;left:50%;bottom:28px;z-index:2147483647;display:flex;align-items:center;gap:10px;
      transform:translate(-50%,14px) scale(.96);opacity:0;pointer-events:none;
      padding:10px 18px 10px 12px;border-radius:999px;background:#2A2140;color:#F6EFF7;
      font:700 14px/1.2 "Nunito",ui-rounded,"Segoe UI",system-ui,sans-serif;
      box-shadow:0 10px 30px rgba(15,10,25,.45),inset 0 0 0 1.5px rgba(255,201,101,.35);
      transition:opacity .35s ease,transform .45s cubic-bezier(.34,1.56,.64,1)}
    .toast.visible{opacity:1;transform:translate(-50%,0) scale(1)}
    .toast.has-action{pointer-events:auto}
    .action{margin-left:4px;border:0;border-radius:999px;padding:6px 14px;background:#FFC965;color:#2A2140;
      font:800 13px/1 "Nunito",ui-rounded,system-ui,sans-serif;cursor:pointer}
    .action:focus-visible{outline:2px solid #F2A7B0;outline-offset:2px}
    .dot{width:22px;height:22px;border-radius:50%;background:#FFC965;display:grid;place-items:center;flex-shrink:0}
    .dot::after{content:"";width:8px;height:8px;border-radius:50%;background:#2A2140;animation:beat 1.6s ease-in-out infinite}
    @keyframes beat{50%{transform:scale(1.35)}}
    @media (prefers-reduced-motion:reduce){.toast{transition:opacity .2s}.dot::after{animation:none}}`;

  let toastHost = null;
  let toastBox = null;
  let toastText = null;
  let toastAction = null;
  let hideTimer = null;

  function createToast() {
    toastHost = document.createElement("div");
    toastHost.id = "togetherly-toast";
    const shadow = toastHost.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = TOAST_CSS;
    toastBox = document.createElement("div");
    toastBox.className = "toast";
    toastBox.setAttribute("role", "status");
    const dot = document.createElement("span");
    dot.className = "dot";
    toastText = document.createElement("span");
    toastAction = document.createElement("button");
    toastAction.className = "action";
    toastAction.hidden = true;
    toastBox.append(dot, toastText, toastAction);
    shadow.append(style, toastBox);
    document.addEventListener("fullscreenchange", placeToast);
  }

  function placeToast() {
    const parent = document.fullscreenElement ?? document.documentElement;
    if (toastHost && toastHost.parentNode !== parent) parent.appendChild(toastHost);
  }

  /** action (opcional): { label, onClick } → muestra un botón y deja el aviso más tiempo. */
  function showToast(text, action) {
    if (!toastHost) createToast();
    placeToast();
    toastText.textContent = text; // textContent: nunca se interpreta como HTML
    toastAction.hidden = !action;
    toastBox.classList.toggle("has-action", !!action);
    if (action) {
      toastAction.textContent = action.label;
      toastAction.onclick = action.onClick;
    }
    requestAnimationFrame(() => toastBox.classList.add("visible"));
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      toastBox.classList.remove("visible", "has-action");
    }, action ? 12000 : 3800);
  }
})();
