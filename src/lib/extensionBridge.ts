// Hablar con la extensión Togetherly Sync desde la web (a través de togetherly-extension/bridge.js).
// El bridge solo existe si la extensión está instalada; si no responde, no está.

type ExtensionReply = { source?: string; type?: string; ok?: boolean; roomId?: string; connected?: boolean };

function postToExtension(data: Record<string, unknown>) {
  window.postMessage({ source: "togetherly-web", ...data }, window.location.origin);
}

/** Espera una respuesta de la extensión que cumpla `accept`, o null si no llega a tiempo. */
function waitForReply(accept: (reply: ExtensionReply) => boolean, timeoutMs: number): Promise<ExtensionReply | null> {
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data as ExtensionReply;
      if (data?.source !== "togetherly-ext" || !accept(data)) return;
      finish(data);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    function finish(result: ExtensionReply | null) {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(result);
    }
    window.addEventListener("message", onMessage);
  });
}

/** ¿Está instalada la extensión en este navegador? */
export async function detectExtension(timeoutMs = 1500): Promise<boolean> {
  const reply = waitForReply((data) => data.type === "EXT_READY" || data.type === "PONG", timeoutMs);
  postToExtension({ type: "PING" });
  return (await reply) !== null;
}

/** Conecta la extensión a la sala. true si respondió que sí. */
export async function joinRoomWithExtension(roomId: string, username: string, avatar: string): Promise<boolean> {
  const reply = waitForReply((data) => data.ok === true && data.roomId === roomId, 5000);
  postToExtension({ type: "JOIN_ROOM", roomId, username, avatar });
  return (await reply) !== null;
}
