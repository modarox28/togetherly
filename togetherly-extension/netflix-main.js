// Corre en el "mundo principal" de netflix.com (no en el aislado de la extensión),
// porque solo desde ahí se puede usar el reproductor interno de Netflix.
// Si se cambia video.currentTime directamente, Netflix muestra el error M7375,
// así que play, pausa y salto pasan por su propia API.
// Comunicación con content.js: eventos del DOM con texto JSON (sin datos sensibles).
(() => {
  if (window.__togetherlyNetflix) return;
  window.__togetherlyNetflix = true;

  function reproductor() {
    try {
      const vp = window.netflix?.appContext?.state?.playerApp?.getAPI?.()?.videoPlayer;
      if (!vp) return null;
      const ids = vp.getAllPlayerSessionIds?.() ?? [];
      const id = ids.find((i) => String(i).startsWith("watch")) ?? ids[ids.length - 1];
      return id ? vp.getVideoPlayerBySessionId(id) : null;
    } catch {
      return null;
    }
  }

  function responder(id, ok) {
    document.dispatchEvent(
      new CustomEvent("togetherly:respuesta", { detail: JSON.stringify({ id, ok }) })
    );
  }

  document.addEventListener("togetherly:comando", (e) => {
    let cmd;
    try {
      cmd = JSON.parse(e.detail);
    } catch {
      return;
    }
    if (!cmd || typeof cmd.id !== "number") return;

    const p = reproductor();
    if (!p) return responder(cmd.id, false);

    try {
      if (cmd.accion === "play") p.play();
      else if (cmd.accion === "pause") p.pause();
      else if (cmd.accion === "seek" && Number.isFinite(cmd.tiempo) && cmd.tiempo >= 0) {
        p.seek(Math.round(cmd.tiempo * 1000));
      } else return responder(cmd.id, false);
      responder(cmd.id, true);
    } catch {
      responder(cmd.id, false);
    }
  });
})();
