// Corre en el "mundo principal" de netflix.com (no en el aislado de la extensión),
// porque solo desde ahí se puede usar el reproductor interno de Netflix.
// Si se cambia video.currentTime directamente, Netflix muestra el error M7375,
// así que play, pausa y salto pasan por su propia API.
// Recibe "togetherly:command" y responde "togetherly:result" (ver platforms.js).
(() => {
  if (window.__togetherlyNetflix) return;
  window.__togetherlyNetflix = true;

  function getPlayer() {
    try {
      const videoPlayer = window.netflix?.appContext?.state?.playerApp?.getAPI?.()?.videoPlayer;
      if (!videoPlayer) return null;
      const ids = videoPlayer.getAllPlayerSessionIds?.() ?? [];
      const id = ids.find((i) => String(i).startsWith("watch")) ?? ids[ids.length - 1];
      return id ? videoPlayer.getVideoPlayerBySessionId(id) : null;
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
})();
