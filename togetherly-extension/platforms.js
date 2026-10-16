// Adaptadores por plataforma de streaming.
// Cada adaptador sabe:
//  - isPlayerPage(): si la página actual es un reproductor (y no un catálogo con avances),
//  - findVideo(): cómo encontrar el <video> correcto (puede estar en shadow DOM o haber varios),
//  - control: cómo dar play, pausa y saltar sin romper el reproductor.
//
// Para agregar una plataforma nueva:
//  1. Agrega un objeto a PLATFORMS (abajo) con su dominio.
//  2. Agrega el dominio en "matches" del manifest.json.
//  3. Si su reproductor se rompe al cambiar currentTime (como Netflix), crea un control propio.
//
// Se carga antes de content.js en el mismo contexto aislado.

(() => {
  const host = location.hostname;

  // Busca <video> también dentro de shadow roots anidados (Disney+, Apple TV).
  // Algunos reproductores (p. ej. Disney+) guardan el video en un shadow DOM "cerrado".
  // Las extensiones sí pueden abrirlo: chrome.dom en Chromium, openOrClosedShadowRoot en Firefox.
  // Solo se intenta en etiquetas personalizadas (con guion), que son las que tienen shadow DOM.
  function shadowOf(el) {
    if (el.shadowRoot) return el.shadowRoot;
    if (!el.tagName.includes("-")) return null;
    try {
      return globalThis.chrome?.dom?.openOrClosedShadowRoot?.(el) ?? el.openOrClosedShadowRoot ?? null;
    } catch {
      return null;
    }
  }

  function findAllVideos(root = document, depth = 0) {
    const videos = [...root.querySelectorAll("video")];
    if (depth > 4) return videos;
    for (const el of root.querySelectorAll("*")) {
      const shadow = shadowOf(el);
      if (shadow) videos.push(...findAllVideos(shadow, depth + 1));
    }
    return videos;
  }

  // Elige el video principal: visible, con duración real y el más largo/grande.
  // Así se descartan anuncios cortos y avances que suenan de fondo.
  function pickMainVideo(videos, minDuration = 60) {
    let best = null;
    let bestScore = -1;
    for (const v of videos) {
      if (!v.isConnected || v.readyState === 0) continue;
      const rect = v.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area < 4000) continue; // oculto o miniatura
      // Algunos reproductores (MSE) dicen duración "infinita" mientras cargan: se acepta.
      const duration = v.duration === Infinity ? 7200 : Number.isFinite(v.duration) ? v.duration : 0;
      if (duration < minDuration) continue;
      const score = Math.min(duration, 100000) + area / 1000;
      if (score > bestScore) {
        best = v;
        bestScore = score;
      }
    }
    return best;
  }

  // Control directo sobre el elemento <video>: sirve en casi todas las plataformas.
  // Cada método devuelve una promesa con true si funcionó.
  const nativeControl = {
    play: (v) => v.play().then(() => true).catch(() => false),
    pause: (v) => {
      v.pause();
      return Promise.resolve(true);
    },
    seek: (v, seconds) => {
      v.currentTime = seconds;
      return Promise.resolve(true);
    },
  };

  // Control a través del reproductor interno de la página (ver netflix-main.js y disney-main.js).
  // Los mensajes viajan como eventos del DOM con texto JSON.
  let nextCommandId = 1;
  const pending = new Map();
  document.addEventListener("togetherly:result", (e) => {
    try {
      const { id, ok } = JSON.parse(e.detail);
      pending.get(id)?.(ok);
      pending.delete(id);
    } catch {}
  });
  function sendPageCommand(action, time) {
    const id = nextCommandId++;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      setTimeout(() => {
        if (pending.delete(id)) resolve(false); // sin respuesta en 1,5 s
      }, 1500);
      document.dispatchEvent(
        new CustomEvent("togetherly:command", { detail: JSON.stringify({ id, action, time }) })
      );
    });
  }
  const netflixControl = {
    play: async (v) => (await sendPageCommand("play")) || nativeControl.play(v),
    pause: async (v) => (await sendPageCommand("pause")) || nativeControl.pause(v),
    // En Netflix nunca se cambia currentTime: si la API no responde, no se salta.
    seek: (_v, seconds) => sendPageCommand("seek", seconds),
  };

  // Disney+: su <video> no sabe el minuto real de la película y cambiar currentTime no salta.
  // disney-main.js usa el reproductor de Disney y avisa el minuto real cada medio segundo.
  let disneyPosition = null; // { seconds, at }
  document.addEventListener("togetherly:time", (e) => {
    try {
      const { seconds } = JSON.parse(e.detail);
      if (typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0) {
        disneyPosition = { seconds, at: Date.now() };
      }
    } catch {}
  });
  const disneyControl = {
    // Play y pausa sobre el <video> funcionan bien en Disney+ (probado con el sitio real).
    play: nativeControl.play,
    pause: nativeControl.pause,
    seek: (_v, seconds) => sendPageCommand("seek", seconds),
    // Minuto real: el que avisó el reproductor de Disney, corrido por el tiempo que pasó desde entonces.
    time: (v) => {
      if (!disneyPosition || Date.now() - disneyPosition.at > 2000) return v.currentTime;
      const elapsed = v.paused ? 0 : ((Date.now() - disneyPosition.at) / 1000) * (v.playbackRate || 1);
      return disneyPosition.seconds + elapsed;
    },
  };

  const PLATFORMS = [
    {
      id: "netflix",
      name: "Netflix",
      matches: () => /(^|\.)netflix\.com$/.test(host),
      isPlayerPage: () => location.pathname.startsWith("/watch"),
      findVideo: () => pickMainVideo([...document.querySelectorAll("video")], 30),
      control: netflixControl,
    },
    {
      id: "prime",
      name: "Prime Video",
      matches: () => /(^|\.)primevideo\.com$/.test(host) || /(^|\.)amazon\.[a-z.]+$/.test(host),
      isPlayerPage: () => true,
      // El reproductor de Prime vive en un contenedor "webPlayer"; fuera de él hay avances.
      findVideo: () => {
        const inPlayer = [
          ...document.querySelectorAll("[class*='webPlayer'] video, [id*='dv-web-player'] video"),
        ];
        return pickMainVideo(inPlayer.length ? inPlayer : findAllVideos(), 120);
      },
      control: nativeControl,
    },
    {
      id: "disney",
      name: "Disney+",
      matches: () => /(^|\.)disneyplus\.com$/.test(host),
      isPlayerPage: () => /\/(play|video)\//.test(location.pathname),
      findVideo: () => pickMainVideo(findAllVideos()),
      control: disneyControl,
    },
    {
      id: "hbo",
      name: "HBO Max",
      matches: () => /(^|\.)(hbomax|max)\.com$/.test(host),
      isPlayerPage: () => /\/(video|watch|player)/.test(location.pathname),
      findVideo: () => pickMainVideo(findAllVideos()),
      control: nativeControl,
    },
    {
      id: "appletv",
      name: "Apple TV+",
      matches: () => host === "tv.apple.com",
      isPlayerPage: () => true,
      findVideo: () => pickMainVideo(findAllVideos(), 120),
      control: nativeControl,
    },
    {
      id: "paramount",
      name: "Paramount+",
      matches: () => /(^|\.)paramountplus\.com$/.test(host),
      isPlayerPage: () => /\/(video|movies|shows)\//.test(location.pathname),
      findVideo: () => pickMainVideo(findAllVideos()),
      control: nativeControl,
    },
    {
      id: "crunchyroll",
      name: "Crunchyroll",
      // El video de Crunchyroll está dentro de un iframe en static.crunchyroll.com.
      matches: () => /(^|\.)crunchyroll\.com$/.test(host),
      isPlayerPage: () => host.startsWith("static.") || location.pathname.includes("/watch/"),
      findVideo: () => pickMainVideo(findAllVideos()),
      control: nativeControl,
    },
  ];

  globalThis.TogetherlyPlatforms = {
    current: () => PLATFORMS.find((p) => p.matches()) ?? null,
    /** Para el diagnóstico del popup: todos los videos que ve la extensión en esta página. */
    describeVideos: () =>
      findAllVideos().map((v) => {
        const rect = v.getBoundingClientRect();
        return {
          duration: v.duration === Infinity ? "∞" : Number.isFinite(v.duration) ? Math.round(v.duration) : "?",
          ready: v.readyState,
          size: `${Math.round(rect.width)}×${Math.round(rect.height)}`,
        };
      }),
  };
})();
