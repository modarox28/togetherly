// Puente entre la web de Togetherly y la extensión.
// Solo acepta mensajes de la propia página y solo los tipos que la web necesita.
(() => {
  const ORIGEN = window.location.origin;
  const PERMITIDOS = new Set(["JOIN_ROOM", "LEAVE_ROOM", "PING"]);

  const aWeb = (datos) => window.postMessage({ ...datos, source: "togetherly-ext" }, ORIGEN);

  aWeb({ type: "EXT_READY" });

  window.addEventListener("message", (e) => {
    if (e.source !== window || e.origin !== ORIGEN) return;
    const d = e.data;
    if (!d || d.source !== "togetherly-web" || !PERMITIDOS.has(d.type)) return;
    try {
      chrome.runtime.sendMessage(
        { type: d.type, roomId: d.roomId, username: d.username, avatar: d.avatar },
        (r) => {
          if (chrome.runtime.lastError || !r) return;
          aWeb(r);
        }
      );
    } catch {}
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "EXT_STATUS") aWeb({ type: "EXT_STATUS", connected: !!msg.connected, roomId: msg.roomId ?? null });
  });
})();
