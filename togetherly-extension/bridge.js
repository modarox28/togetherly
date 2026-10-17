// Puente entre la web de Togetherly y la extensión (se inyecta solo en el dominio de Togetherly).
// Solo acepta mensajes de la propia página y solo los tipos que la web necesita.
(() => {
  const ORIGIN = window.location.origin;
  const ALLOWED_TYPES = new Set(["JOIN_ROOM", "LEAVE_ROOM", "PING"]);

  const postToPage = (data) => window.postMessage({ ...data, source: "togetherly-ext" }, ORIGIN);

  postToPage({ type: "EXT_READY" });

  // Web → extensión
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== ORIGIN) return;
    const data = event.data;
    if (!data || data.source !== "togetherly-web" || !ALLOWED_TYPES.has(data.type)) return;
    try {
      chrome.runtime.sendMessage(
        { type: data.type, roomId: data.roomId, username: data.username, avatar: data.avatar, clientKey: data.clientKey },
        (reply) => {
          if (chrome.runtime.lastError || !reply) return;
          postToPage(reply);
        }
      );
    } catch {}
  });

  // Extensión → web (solo el estado de conexión)
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "EXT_STATUS") {
      postToPage({ type: "EXT_STATUS", connected: !!message.connected, roomId: message.roomId ?? null });
    }
  });
})();
