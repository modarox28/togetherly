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

  // skip: selector de contenedores que nunca tienen la película (p. ej. videos de fondo).
  function findAllVideos(root = document, depth = 0, skip = null) {
    const videos = [...root.querySelectorAll("video")].filter((v) => !skip || !v.closest(skip));
    if (depth > 4) return videos;
    for (const el of root.querySelectorAll("*")) {
      if (skip && el.matches(skip)) continue;
      const shadow = shadowOf(el);
      if (shadow) videos.push(...findAllVideos(shadow, depth + 1, skip));
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

  // Reproductor interno de la página (disney-main.js, apple-main.js): avisa cada medio segundo
  // el minuto real, la duración y el título con "togetherly:time".
  // En Disney+ el <video> no sabe el minuto real de la película y cambiar currentTime no salta.
  let pagePosition = null; // { seconds, duration, title, at }
  document.addEventListener("togetherly:time", (e) => {
    try {
      const { seconds, duration, title } = JSON.parse(e.detail);
      if (typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0) {
        pagePosition = {
          seconds,
          duration: typeof duration === "number" && Number.isFinite(duration) && duration > 0 ? duration : null,
          title: typeof title === "string" ? title.trim().slice(0, 120) : "",
          at: Date.now(),
        };
      }
    } catch {}
  });
  const pageFresh = () => pagePosition && Date.now() - pagePosition.at <= 2000;
  // Minuto real: el que avisó el reproductor, corrido por el tiempo que pasó desde entonces.
  const pageTime = (v) => {
    if (!pageFresh()) return v.currentTime;
    const elapsed = v.paused ? 0 : ((Date.now() - pagePosition.at) / 1000) * (v.playbackRate || 1);
    return pagePosition.seconds + elapsed;
  };
  const disneyControl = {
    play: nativeControl.play,
    pause: nativeControl.pause,
    seek: (_v, seconds) => sendPageCommand("seek", seconds),
    time: pageTime,
  };
  // Apple TV+: su reproductor (MusicKit) da play, pausa y salto exactos; si no responde, el <video>.
  const appleControl = {
    play: async (v) => (await sendPageCommand("play")) || nativeControl.play(v),
    pause: async (v) => (await sendPageCommand("pause")) || nativeControl.pause(v),
    seek: async (v, seconds) => (await sendPageCommand("seek", seconds)) || nativeControl.seek(v, seconds),
    time: pageTime,
  };

  // Título de lo que se está viendo (para la trivia). Primero lo que dice el reproductor,
  // luego lo que el navegador muestra en los controles multimedia y al final el de la pestaña.
  const TITLE_SUFFIX = /\s*[-|–·]\s*(Netflix|Disney\+|Prime Video|Amazon\.?\w*|HBO Max|Max|Apple TV\+?|Paramount\+|Crunchyroll).*$/i;
  function cleanTitle(text) {
    const t = String(text ?? "").replace(/\u200e/g, "").replace(/^(Ver|Watch)\s+/i, "").replace(TITLE_SUFFIX, "").trim();
    return /^(Netflix|Disney\+|Prime Video|HBO Max|Max|Apple TV\+?|Paramount\+|Crunchyroll|Home|Inicio)$/i.test(t) ? "" : t.slice(0, 120);
  }
  function currentTitle(platformTitle) {
    if (pageFresh() && pagePosition.title) return cleanTitle(pagePosition.title);
    const fromPlatform = cleanTitle(platformTitle?.());
    if (fromPlatform) return fromPlatform;
    const fromSession = cleanTitle(navigator.mediaSession?.metadata?.title);
    if (fromSession) return fromSession;
    return cleanTitle(document.title);
  }
  // Duración real (para avisar cuando la película está por terminar).
  function currentDuration(v) {
    if (pageFresh() && pagePosition.duration) return pagePosition.duration;
    return v && Number.isFinite(v.duration) && v.duration > 0 ? v.duration : null;
  }

  const PLATFORMS = [
    {
      id: "netflix",
      name: "Netflix",
      matches: () => /(^|\.)netflix\.com$/.test(host),
      isPlayerPage: () => location.pathname.startsWith("/watch"),
      findVideo: () => pickMainVideo([...document.querySelectorAll("video")], 30),
      control: netflixControl,
      title: () => document.querySelector("[data-uia='video-title'] h4, [data-uia='video-title']")?.textContent,
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
      // Las páginas de series reproducen solas un video de fondo: ese nunca es la película.
      findVideo: () => pickMainVideo(findAllVideos(document, 0, "amp-background-video"), 120),
      control: appleControl,
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
    current: () => {
      const p = PLATFORMS.find((x) => x.matches()) ?? null;
      if (p) {
        p.currentTitle = () => currentTitle(p.title);
        p.currentDuration = currentDuration;
      }
      return p;
    },
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
