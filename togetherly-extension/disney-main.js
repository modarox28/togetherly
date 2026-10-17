// Corre en el "mundo principal" de disneyplus.com (no en el aislado de la extensión),
// porque solo desde ahí se puede usar el reproductor interno de Disney+.
//
// Por qué: en Disney+ el <video> no sabe en qué minuto va la película (su duración es
// "infinita" y solo tiene cargados unos segundos). Cambiar video.currentTime no salta.
// Su reproductor (<disney-web-player>.mediaPlayer) sí: seek(ms) y timeline.info.playheadPositionMs.
//
// Recibe "togetherly:command" y responde "togetherly:result" (igual que netflix-main.js).
// Además avisa cada medio segundo el minuto real con "togetherly:time".
(() => {
  if (window.__togetherlyDisney) return;
  window.__togetherlyDisney = true;

  function getPlayer() {
    try {
      return document.querySelector("disney-web-player")?.mediaPlayer ?? null;
    } catch {
      return null;
    }
  }

  // Minuto real de la película en segundos, o null si el reproductor todavía no lo sabe.
  function positionSeconds() {
    try {
      const ms = getPlayer()?.timeline?.info?.playheadPositionMs;
      return typeof ms === "number" && Number.isFinite(ms) && ms >= 0 ? ms / 1000 : null;
    } catch {
      return null;
    }
  }

  function reply(id, ok) {
    document.dispatchEvent(new CustomEvent("togetherly:result", { detail: JSON.stringify({ id, ok }) }));
  }

  document.addEventListener("togetherly:command", (e) => {
    let command;
    try {
      command = JSON.parse(e.detail);
    } catch {
      return;
    }
    if (!command || typeof command.id !== "number") return;

    const player = getPlayer();
    if (!player) return reply(command.id, false);

    try {
      if (command.action === "play") player.play();
      else if (command.action === "pause") player.pause();
      else if (command.action === "seek" && Number.isFinite(command.time) && command.time >= 0) {
        player.seek(Math.round(command.time * 1000));
      } else return reply(command.id, false);
      reply(command.id, true);
    } catch {
      reply(command.id, false);
    }
  });

  // Duración en segundos si el reproductor la expone (sirve para avisar el final de la película).
  function durationSeconds() {
    try {
      const info = getPlayer()?.timeline?.info;
      const ms = info?.durationMs ?? info?.endPositionMs ?? info?.playbackDurationMs;
      return typeof ms === "number" && Number.isFinite(ms) && ms > 0 ? ms / 1000 : null;
    } catch {
      return null;
    }
  }

  setInterval(() => {
    const seconds = positionSeconds();
    if (seconds === null) return;
    const detail = { seconds, duration: durationSeconds() };
    document.dispatchEvent(new CustomEvent("togetherly:time", { detail: JSON.stringify(detail) }));
  }, 500);
})();
