// Motor de sincronización: se inyecta en las plataformas de streaming.
// Escucha play/pausa/salto del video local y los manda a la sala; aplica los de los demás.
// La lógica de cada plataforma está en plataformas.js.

(() => {
  if (globalThis.__togetherlyMotor) return;
  globalThis.__togetherlyMotor = true;

  const plataforma = globalThis.TogetherlyPlataformas?.actual();
  if (!plataforma) return;

  const TOLERANCIA = 1.5; // segundos de diferencia aceptables antes de saltar
  let video = null;
  let sala = null;
  // Eventos que provoca la propia extensión al aplicar una orden remota: se ignoran
  // uno a uno (no por tiempo), así una acción real de la persona nunca se pierde.
  let esperados = [];
  let estadoPendiente = null; // orden que llegó antes de encontrar el video
  let colaComandos = Promise.resolve();
  let temporizadorSalto = null;

  const ahora = () => Date.now();
  function esperar(tipo) {
    esperados.push({ tipo, hasta: ahora() + 2500 });
  }
  // true si el evento lo provocamos nosotros (y lo descuenta)
  function propio(tipo) {
    esperados = esperados.filter((e) => e.hasta > ahora());
    const i = esperados.findIndex((e) => e.tipo === tipo);
    if (i === -1) return false;
    esperados.splice(i, 1);
    return true;
  }
  const tiempoValido = (t) => typeof t === "number" && Number.isFinite(t) && t >= 0;

  function enviar(mensaje, alResponder) {
    try {
      chrome.runtime.sendMessage({ ...mensaje, plataforma: plataforma.id }, (r) => {
        if (chrome.runtime.lastError) return;
        alResponder?.(r);
      });
    } catch {
      // La extensión se recargó: este script quedó huérfano.
    }
  }

  // ── Eventos del video local ─────────────────────────────────────────────
  function alPlay() {
    if (propio("play") || !sala) return;
    enviar({ type: "VIDEO_PLAY", currentTime: video.currentTime });
    aviso("▶ Diste play · sincronizando");
  }

  function alPausar() {
    if (propio("pause") || !sala || video.ended) return;
    enviar({ type: "VIDEO_PAUSE", currentTime: video.currentTime });
    aviso("⏸ Pausaste · sincronizando");
  }

  function alSaltar() {
    if (propio("seeked") || !sala) return;
    clearTimeout(temporizadorSalto);
    temporizadorSalto = setTimeout(() => {
      if (!video) return;
      enviar({ type: "VIDEO_SEEK", currentTime: video.currentTime });
    }, 300);
  }

  function conectarVideo(v) {
    if (video === v) return;
    soltarVideo();
    video = v;
    video.addEventListener("play", alPlay);
    video.addEventListener("pause", alPausar);
    video.addEventListener("seeked", alSaltar);

    if (estadoPendiente) {
      const orden = estadoPendiente;
      estadoPendiente = null;
      encolar(orden);
    } else if (sala) {
      // Entraste tarde o cambiaste de episodio: pide en qué va la sala.
      enviar({ type: "PEDIR_ESTADO" });
    }
    if (sala) aviso(`Sincronizado con la sala ${sala}`);
  }

  function soltarVideo() {
    if (!video) return;
    video.removeEventListener("play", alPlay);
    video.removeEventListener("pause", alPausar);
    video.removeEventListener("seeked", alSaltar);
    video = null;
  }

  // Busca el video cada segundo: las plataformas lo cambian al pasar de episodio
  // o al terminar un anuncio. Es barato porque solo busca cuando hace falta.
  setInterval(() => {
    if (!sala) return;
    if (!plataforma.esReproductor()) {
      soltarVideo();
      return;
    }
    if (video && video.isConnected && video.readyState > 0) return;
    const v = plataforma.buscar();
    if (v) conectarVideo(v);
  }, 1000);

  // ── Órdenes que llegan de la sala ───────────────────────────────────────
  function encolar(orden) {
    colaComandos = colaComandos.then(() => aplicar(orden)).catch(() => {});
  }

  async function aplicar(orden) {
    if (!video) {
      estadoPendiente = orden;
      return;
    }
    const c = plataforma.control;
    const t = orden.currentTime;
    const lejos = tiempoValido(t) && Math.abs(video.currentTime - t) > TOLERANCIA;
    const saltar = async () => {
      esperar("seeked");
      if (!(await c.seek(video, t))) aviso("No pude saltar: muévete al minuto a mano");
    };
    const reproducir = async () => {
      esperar("play");
      if (!(await c.play(video))) aviso("Toca el video para reanudar (el navegador bloqueó el play)");
    };
    const pausar = async () => {
      esperar("pause");
      await c.pause(video);
    };

    if (orden.accion === "play") {
      if (lejos) await saltar();
      if (video.paused) await reproducir();
    } else if (orden.accion === "pause") {
      if (!video.paused) await pausar();
      if (lejos) await saltar();
    } else if (orden.accion === "seek") {
      if (lejos) await saltar();
    } else if (orden.accion === "estado") {
      if (lejos) await saltar();
      if (orden.playing && video.paused) await reproducir();
      if (!orden.playing && !video.paused) await pausar();
      aviso("Te pusiste al día con la sala");
    }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "REMOTO") {
      encolar(msg);
      const quien = typeof msg.by === "string" && msg.by ? msg.by.slice(0, 24) : "Alguien";
      if (msg.accion === "play") aviso(`▶ ${quien} dio play`);
      if (msg.accion === "pause") aviso(`⏸ ${quien} pausó`);
      if (msg.accion === "seek") aviso(`⏩ ${quien} saltó a ${formato(msg.currentTime)}`);
    } else if (msg.type === "ESTADO" && msg.playing !== undefined) {
      encolar({ ...msg, accion: "estado" });
    } else if (msg.type === "EXT_STATUS") {
      sala = msg.connected ? msg.roomId : null;
      if (!sala) {
        soltarVideo();
        aviso("Togetherly desconectado");
      }
    }
  });

  enviar({ type: "CONTENT_READY" }, (r) => {
    if (r?.connected && r.roomId) sala = r.roomId;
  });

  function formato(t) {
    if (!tiempoValido(t)) return "?";
    const s = Math.floor(t % 60).toString().padStart(2, "0");
    const m = Math.floor((t / 60) % 60);
    const h = Math.floor(t / 3600);
    return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
  }

  // ── Aviso flotante ───────────────────────────────────────────────────────
  // Va en un shadow DOM cerrado para que los estilos de la plataforma no lo dañen,
  // y se mueve dentro del elemento en pantalla completa para seguir visible.
  let anfitrion = null;
  let caja = null;
  let texto = null;
  let ocultar = null;

  function crearAviso() {
    anfitrion = document.createElement("div");
    anfitrion.id = "togetherly-aviso";
    const sombra = anfitrion.attachShadow({ mode: "closed" });
    const estilo = document.createElement("style");
    estilo.textContent = `
      .caja{position:fixed;left:50%;bottom:28px;z-index:2147483647;display:flex;align-items:center;gap:10px;
        transform:translate(-50%,14px) scale(.96);opacity:0;pointer-events:none;
        padding:10px 18px 10px 12px;border-radius:999px;background:#FBF5EC;color:#3B2F2A;
        font:600 14px/1.2 ui-rounded,"Nunito","Segoe UI",system-ui,sans-serif;
        box-shadow:0 10px 30px rgba(43,26,18,.28),inset 0 -2px 0 rgba(59,47,42,.08);
        transition:opacity .35s ease,transform .45s cubic-bezier(.34,1.56,.64,1)}
      .caja.ver{opacity:1;transform:translate(-50%,0) scale(1)}
      .punto{width:22px;height:22px;border-radius:50%;background:#E07A5F;display:grid;place-items:center;flex-shrink:0}
      .punto::after{content:"";width:8px;height:8px;border-radius:50%;background:#FBF5EC;animation:latido 1.6s ease-in-out infinite}
      @keyframes latido{50%{transform:scale(1.35)}}
      @media (prefers-reduced-motion:reduce){.caja{transition:opacity .2s}.punto::after{animation:none}}`;
    caja = document.createElement("div");
    caja.className = "caja";
    caja.setAttribute("role", "status");
    const punto = document.createElement("span");
    punto.className = "punto";
    texto = document.createElement("span");
    caja.append(punto, texto);
    sombra.append(estilo, caja);
    document.addEventListener("fullscreenchange", ubicarAviso);
  }

  function ubicarAviso() {
    const destino = document.fullscreenElement ?? document.documentElement;
    if (anfitrion && anfitrion.parentNode !== destino) destino.appendChild(anfitrion);
  }

  function aviso(mensaje) {
    if (!anfitrion) crearAviso();
    ubicarAviso();
    texto.textContent = mensaje;
    requestAnimationFrame(() => caja.classList.add("ver"));
    clearTimeout(ocultar);
    ocultar = setTimeout(() => caja.classList.remove("ver"), 3800);
  }
})();
