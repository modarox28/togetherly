// Content script — injected into Netflix, Disney+, HBO Max, Prime Video, etc.
// Hooks into the HTMLVideoElement to intercept and apply sync events.

let video = null;
let roomId = null;
let isRemote = false; // prevent echo when we apply a remote command
let overlay = null;
let overlayTimeout = null;

// ── Video discovery ────────────────────────────────────────────────────────
// Streaming sites load their <video> element dynamically.
// We watch the DOM with MutationObserver until we find it.

function findVideo() {
  // Direct search
  const direct = document.querySelector("video");
  if (direct && direct.readyState > 0) return direct;

  // Shadow DOM search (some players use shadow roots)
  for (const el of document.querySelectorAll("*")) {
    if (el.shadowRoot) {
      const v = el.shadowRoot.querySelector("video");
      if (v && v.readyState > 0) return v;
    }
  }
  return null;
}

function attachVideo(v) {
  if (video === v) return;
  video = v;

  video.addEventListener("play", onPlay);
  video.addEventListener("pause", onPause);
  video.addEventListener("seeked", onSeeked);

  showOverlay(`Togetherly conectado — sala ${roomId}`);
  console.log("[Togetherly] Video element hooked", video.src || video.currentSrc);
}

const observer = new MutationObserver(() => {
  const v = findVideo();
  if (v) attachVideo(v);
});

// ── Init: tell background we're here ──────────────────────────────────────
chrome.runtime.sendMessage({ type: "CONTENT_READY" }, (resp) => {
  if (chrome.runtime.lastError || !resp) return;
  roomId = resp.roomId;
  if (roomId) {
    observer.observe(document.body, { childList: true, subtree: true });
    const v = findVideo();
    if (v) attachVideo(v);
  }
});

// ── Local video events → send to background ───────────────────────────────
function onPlay() {
  if (isRemote) return;
  chrome.runtime.sendMessage({ type: "VIDEO_PLAY", currentTime: video.currentTime });
  showOverlay("▶ Enviando play a tu pareja...");
}

function onPause() {
  if (isRemote) return;
  chrome.runtime.sendMessage({ type: "VIDEO_PAUSE", currentTime: video.currentTime });
  showOverlay("⏸ Enviando pausa a tu pareja...");
}

function onSeeked() {
  if (isRemote) return;
  chrome.runtime.sendMessage({ type: "VIDEO_SEEK", currentTime: video.currentTime });
}

// ── Remote commands from background → apply to video ─────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "REMOTE_PLAY") {
    applyRemote(() => {
      if (Math.abs(video.currentTime - msg.currentTime) > 2) {
        video.currentTime = msg.currentTime;
      }
      video.play().catch(() => showOverlay("⚠ Toca la pantalla para reanudar"));
    });
    showOverlay("▶ Tu pareja dio play");
  }

  if (msg.type === "REMOTE_PAUSE") {
    applyRemote(() => {
      video.pause();
      if (Math.abs(video.currentTime - msg.currentTime) > 2) {
        video.currentTime = msg.currentTime;
      }
    });
    showOverlay("⏸ Tu pareja pausó");
  }

  if (msg.type === "REMOTE_SEEK") {
    applyRemote(() => {
      video.currentTime = msg.currentTime;
    });
  }

  if (msg.type === "EXT_STATUS") {
    if (msg.connected && msg.roomId) {
      roomId = msg.roomId;
      if (!video) {
        observer.observe(document.body, { childList: true, subtree: true });
        const v = findVideo();
        if (v) attachVideo(v);
      }
      showOverlay(`Togetherly — sala ${roomId}`);
    } else {
      showOverlay("Togetherly desconectado");
    }
  }
});

function applyRemote(fn) {
  if (!video) return;
  isRemote = true;
  fn();
  // Give the event loop a tick so play/pause events fire before we clear the flag
  setTimeout(() => { isRemote = false; }, 200);
}

// ── Overlay UI ────────────────────────────────────────────────────────────
function createOverlay() {
  const div = document.createElement("div");
  div.id = "togetherly-overlay";
  Object.assign(div.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "2147483647",
    background: "rgba(13,13,26,0.92)",
    border: "1px solid rgba(192,132,252,0.45)",
    borderRadius: "24px",
    padding: "9px 16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: "13px",
    fontWeight: "500",
    color: "#E5E7EB",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backdropFilter: "blur(12px)",
    webkitBackdropFilter: "blur(12px)",
    boxShadow: "0 4px 24px rgba(192,132,252,0.2)",
    pointerEvents: "none",
    transition: "opacity 0.3s ease, transform 0.3s ease",
    opacity: "0",
    transform: "translateY(8px)",
    userSelect: "none",
  });

  // Purple dot
  const dot = document.createElement("span");
  Object.assign(dot.style, {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#C084FC",
    flexShrink: "0",
    display: "inline-block",
  });
  div.appendChild(dot);

  const text = document.createElement("span");
  text.id = "togetherly-overlay-text";
  div.appendChild(text);

  document.body.appendChild(div);
  return div;
}

function showOverlay(message) {
  if (!overlay) overlay = createOverlay();
  const textEl = document.getElementById("togetherly-overlay-text");
  if (textEl) textEl.textContent = message;

  overlay.style.opacity = "1";
  overlay.style.transform = "translateY(0)";

  clearTimeout(overlayTimeout);
  overlayTimeout = setTimeout(() => {
    if (overlay) {
      overlay.style.opacity = "0";
      overlay.style.transform = "translateY(8px)";
    }
  }, 4000);
}
