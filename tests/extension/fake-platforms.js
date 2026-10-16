/* eslint-disable @typescript-eslint/no-require-imports */
// Páginas falsas que imitan cómo cada plataforma arma su reproductor.
// window.__user simula lo que haría la persona con los controles de la plataforma.

const FAKE_PAGES = {
  // Netflix: expone una API interna como la real y marca window.__m7375
  // si alguien cambia currentTime directamente (lo que en Netflix real rompe el video).
  netflix: `<!doctype html><title>Netflix</title><body style="margin:0;background:#000">
    <video id="v" src="/video/movie.webm" muted style="width:100vw;height:100vh"></video>
    <script>
      const v = document.getElementById("v");
      const native = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentTime");
      let allowed = false;
      window.__m7375 = false;
      Object.defineProperty(v, "currentTime", {
        get() { return native.get.call(this); },
        set(t) { if (!allowed) window.__m7375 = true; native.set.call(this, t); },
      });
      const player = {
        seek(ms) { allowed = true; v.currentTime = ms / 1000; allowed = false; },
        play() { v.play(); },
        pause() { v.pause(); },
      };
      window.netflix = { appContext: { state: { playerApp: { getAPI: () => ({ videoPlayer: {
        getAllPlayerSessionIds: () => ["watch-1"],
        getVideoPlayerBySessionId: () => player,
      }}) } } } };
      window.__user = player;
      // Como en Netflix real: la barra espaciadora pausa o reanuda.
      document.addEventListener("keydown", (e) => {
        if (e.code === "Space") v.paused ? v.play() : v.pause();
      });
    </script></body>`,

  // Prime: un avance corto al fondo y la película dentro del contenedor del reproductor.
  prime: `<!doctype html><title>Prime Video</title><body style="margin:0">
    <video id="trailer" src="/video/trailer.webm" muted autoplay loop style="width:100vw;height:50vh"></video>
    <div class="webPlayerSDKContainer"><video id="v" src="/video/movie.webm" muted style="width:100vw;height:50vh"></video></div>
    <script>
      const v = document.getElementById("v");
      window.__user = { seek: (ms) => (v.currentTime = ms / 1000), play: () => v.play(), pause: () => v.pause() };
    </script></body>`,

  // Disney+: el video vive dentro de un shadow DOM anidado; el de afuera es "cerrado", como en el sitio real.
  // Y como en el Disney+ real: el <video> no sabe el minuto de la película (aquí va 7 s atrás),
  // no avisa "seeked" cuando el reproductor salta, y solo su reproductor interno
  // (<disney-web-player>.mediaPlayer) sabe saltar y en qué minuto va.
  disney: `<!doctype html><title>Disney+</title><body style="margin:0">
    <disney-web-player></disney-web-player>
    <script>
      const OFFSET = 7;
      const host = document.querySelector("disney-web-player");
      const outer = host.attachShadow({ mode: "closed" });
      const middle = document.createElement("div");
      outer.append(middle);
      const inner = middle.attachShadow({ mode: "open" });
      const v = document.createElement("video");
      v.src = "/video/movie.webm"; v.muted = true; v.style.cssText = "width:100%;height:100vh";
      v.addEventListener("seeked", (e) => e.stopImmediatePropagation());
      inner.append(v);
      host.mediaPlayer = {
        seek: (ms) => { v.currentTime = Math.max(0, ms / 1000 - OFFSET); },
        play: () => v.play(),
        pause: () => v.pause(),
        timeline: { get info() { return { playheadPositionMs: (v.currentTime + OFFSET) * 1000 }; } },
      };
      window.__video = v;
      window.__contentTime = () => v.currentTime + OFFSET;
      window.__user = { seek: (ms) => host.mediaPlayer.seek(ms), play: () => v.play(), pause: () => v.pause() };
    </script></body>`,
};

const PLATFORM_URLS = {
  netflix: "https://www.netflix.com/watch/81234567",
  prime: "https://www.primevideo.com/detail/0ABC/ref=atv_dp",
  // Como el Disney+ real: sin "www", con idioma en la ruta y un ?contextId= muy largo.
  disney: `https://disneyplus.com/es-419/play/1234-abcd?contextId=${"EiR1c".repeat(120)}`,
};

module.exports = { FAKE_PAGES, PLATFORM_URLS };
