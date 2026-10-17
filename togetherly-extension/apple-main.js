// Corre en el "mundo principal" de tv.apple.com (no en el aislado de la extensión),
// porque solo desde ahí se puede usar el reproductor de Apple TV+ (MusicKit).
//
// MusicKit.getInstance() da play(), pause(), seekToTime(segundos), currentPlaybackTime,
// currentPlaybackDuration y nowPlayingItem.title. Revisado en tv.apple.com (WebTvPlayer 2640).
//
// Recibe "togetherly:command" y responde "togetherly:result" (igual que disney-main.js).
// Mientras hay algo reproduciéndose, avisa cada medio segundo el minuto con "togetherly:time".
(() => {
  if (window.__togetherlyApple) return;
  window.__togetherlyApple = true;

  function getPlayer() {
    try {
      const player = window.MusicKit?.getInstance?.();
      // playbackState 0 = nada cargado (p. ej. en el catálogo, con videos de fondo).
      return player && player.nowPlayingItem && player.playbackState !== 0 ? player : null;
    } catch {
      return null;
    }
  }

  function reply(id, ok) {
    document.dispatchEvent(new CustomEvent("togetherly:result", { detail: JSON.stringify({ id, ok }) }));
  }

  document.addEventListener("togetherly:command", async (e) => {
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
      if (command.action === "play") await player.play();
      else if (command.action === "pause") player.pause();
      else if (command.action === "seek" && Number.isFinite(command.time) && command.time >= 0) {
        await player.seekToTime(command.time);
      } else return reply(command.id, false);
      reply(command.id, true);
    } catch {
      reply(command.id, false);
    }
  });

  setInterval(() => {
    const player = getPlayer();
    if (!player) return;
    try {
      const seconds = player.currentPlaybackTime;
      if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return;
      const detail = { seconds, duration: player.currentPlaybackDuration, title: player.nowPlayingItem?.title ?? "" };
      document.dispatchEvent(new CustomEvent("togetherly:time", { detail: JSON.stringify(detail) }));
    } catch {}
  }, 500);
})();
