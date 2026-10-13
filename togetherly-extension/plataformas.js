// Adaptadores por plataforma. Cada uno sabe:
//  - si la página actual es un reproductor (no un catálogo con avances),
//  - cómo encontrar el <video> correcto (algunos están en shadow DOM o hay varios),
//  - cómo dar play, pausa y saltar sin romper el reproductor.
// Se carga antes de content.js en el mismo contexto aislado.

(() => {
  const host = location.hostname;

  // Busca videos también dentro de shadow roots anidados (Disney+, Apple TV).
  function todosLosVideos(raiz = document, profundidad = 0) {
    const lista = [...raiz.querySelectorAll("video")];
    if (profundidad > 4) return lista;
    const conSombra = raiz.querySelectorAll("*");
    for (const el of conSombra) {
      if (el.shadowRoot) lista.push(...todosLosVideos(el.shadowRoot, profundidad + 1));
    }
    return lista;
  }

  // Elige el video principal: visible, con duración real y el más largo/grande.
  // Así se descartan anuncios cortos y avances que se reproducen al fondo.
  function mejorVideo(videos, duracionMinima = 60) {
    let mejor = null;
    let mejorPuntaje = -1;
    for (const v of videos) {
      if (!v.isConnected || v.readyState === 0) continue;
      const r = v.getBoundingClientRect();
      const area = r.width * r.height;
      if (area < 4000) continue; // videos ocultos o miniaturas
      const dur = Number.isFinite(v.duration) ? v.duration : 0;
      if (dur < duracionMinima) continue;
      const puntaje = Math.min(dur, 100000) + area / 1000;
      if (puntaje > mejorPuntaje) {
        mejor = v;
        mejorPuntaje = puntaje;
      }
    }
    return mejor;
  }

  // Control por el elemento <video>: sirve en casi todas las plataformas.
  const controlNativo = {
    play: (v) => v.play().then(() => true).catch(() => false),
    pause: (v) => {
      v.pause();
      return Promise.resolve(true);
    },
    seek: (v, t) => {
      v.currentTime = t;
      return Promise.resolve(true);
    },
  };

  // Control de Netflix por su API interna (ver netflix-main.js).
  let siguienteId = 1;
  const pendientes = new Map();
  document.addEventListener("togetherly:respuesta", (e) => {
    try {
      const { id, ok } = JSON.parse(e.detail);
      pendientes.get(id)?.(ok);
      pendientes.delete(id);
    } catch {}
  });
  function comandoNetflix(accion, tiempo) {
    const id = siguienteId++;
    return new Promise((resolver) => {
      pendientes.set(id, resolver);
      setTimeout(() => {
        if (pendientes.has(id)) {
          pendientes.delete(id);
          resolver(false);
        }
      }, 1500);
      document.dispatchEvent(
        new CustomEvent("togetherly:comando", { detail: JSON.stringify({ id, accion, tiempo }) })
      );
    });
  }
  const controlNetflix = {
    play: async (v) => (await comandoNetflix("play")) || controlNativo.play(v),
    pause: async (v) => (await comandoNetflix("pause")) || controlNativo.pause(v),
    // Nunca se cambia currentTime en Netflix: si la API no responde, no se salta.
    seek: (_v, t) => comandoNetflix("seek", t),
  };

  const PLATAFORMAS = [
    {
      id: "netflix",
      nombre: "Netflix",
      coincide: () => /(^|\.)netflix\.com$/.test(host),
      esReproductor: () => location.pathname.startsWith("/watch"),
      buscar: () => mejorVideo([...document.querySelectorAll("video")], 30),
      control: controlNetflix,
    },
    {
      id: "prime",
      nombre: "Prime Video",
      coincide: () => /(^|\.)primevideo\.com$/.test(host) || /(^|\.)amazon\.[a-z.]+$/.test(host),
      esReproductor: () => true,
      // El reproductor de Prime vive en un contenedor "webPlayer"; fuera de él hay avances.
      buscar: () => {
        const enReproductor = [
          ...document.querySelectorAll("[class*='webPlayer'] video, [id*='dv-web-player'] video"),
        ];
        return mejorVideo(enReproductor.length ? enReproductor : todosLosVideos(), 120);
      },
      control: controlNativo,
    },
    {
      id: "disney",
      nombre: "Disney+",
      coincide: () => /(^|\.)disneyplus\.com$/.test(host),
      esReproductor: () => /\/(play|video)\//.test(location.pathname),
      buscar: () => mejorVideo(todosLosVideos()),
      control: controlNativo,
    },
    {
      id: "hbo",
      nombre: "HBO Max",
      coincide: () => /(^|\.)(hbomax|max)\.com$/.test(host),
      esReproductor: () => /\/(video|watch|player)/.test(location.pathname),
      buscar: () => mejorVideo(todosLosVideos()),
      control: controlNativo,
    },
    {
      id: "appletv",
      nombre: "Apple TV+",
      coincide: () => host === "tv.apple.com",
      esReproductor: () => true,
      buscar: () => mejorVideo(todosLosVideos(), 120),
      control: controlNativo,
    },
    {
      id: "paramount",
      nombre: "Paramount+",
      coincide: () => /(^|\.)paramountplus\.com$/.test(host),
      esReproductor: () => /\/(video|movies|shows)\//.test(location.pathname),
      buscar: () => mejorVideo(todosLosVideos()),
      control: controlNativo,
    },
    {
      id: "crunchyroll",
      nombre: "Crunchyroll",
      // El video de Crunchyroll está dentro de un iframe en static.crunchyroll.com.
      coincide: () => /(^|\.)crunchyroll\.com$/.test(host),
      esReproductor: () => host.startsWith("static.") || location.pathname.includes("/watch/"),
      buscar: () => mejorVideo(todosLosVideos()),
      control: controlNativo,
    },
  ];

  globalThis.TogetherlyPlataformas = {
    actual: () => PLATAFORMAS.find((p) => p.coincide()) ?? null,
    mejorVideo,
    todosLosVideos,
  };
})();
