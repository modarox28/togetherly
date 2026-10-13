// Prueba de punta a punta de la extensión Togetherly Sync.
// Levanta el servidor de sockets real, abre dos navegadores con la extensión
// y simula Netflix, Prime Video y Disney+ con páginas falsas y un video de 10 min.
const { test, expect, chromium } = require("@playwright/test");
const { spawn, execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const RAIZ = path.resolve(__dirname, "../..");
const EXTENSION = path.join(RAIZ, "togetherly-extension");
const PUERTO = 3999;
const SERVIDOR = `http://localhost:${PUERTO}`;
const VIDEOS = path.join(os.tmpdir(), "togetherly-pruebas");

let servidor;

// Videos de prueba generados con ffmpeg: uno largo (película) y uno corto (avance).
function prepararVideos() {
  fs.mkdirSync(VIDEOS, { recursive: true });
  const crear = (nombre, segundos) => {
    const destino = path.join(VIDEOS, nombre);
    if (fs.existsSync(destino)) return;
    execFileSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi",
      "-i", `testsrc=size=320x180:rate=10`, "-t", String(segundos),
      "-c:v", "libvpx", "-b:v", "40k", "-g", "20", destino,
    ]);
  };
  crear("pelicula.webm", 600);
  crear("avance.webm", 30);
}

// Sirve un video con soporte de rangos (necesario para poder saltar).
function servirVideo(route, archivo) {
  const datos = fs.readFileSync(path.join(VIDEOS, archivo));
  const rango = route.request().headers()["range"];
  if (!rango) {
    return route.fulfill({ status: 200, body: datos, headers: { "content-type": "video/webm", "accept-ranges": "bytes" } });
  }
  const [inicio, fin] = rango.replace("bytes=", "").split("-");
  const a = Number(inicio);
  const b = fin ? Number(fin) : datos.length - 1;
  return route.fulfill({
    status: 206,
    body: datos.subarray(a, b + 1),
    headers: {
      "content-type": "video/webm",
      "accept-ranges": "bytes",
      "content-range": `bytes ${a}-${b}/${datos.length}`,
    },
  });
}

const PAGINAS = {
  // Netflix falso: expone una API interna como la real y marca window.__m7375
  // si alguien cambia currentTime directamente (lo que en Netflix real rompe el video).
  netflix: `<!doctype html><title>Netflix</title><body style="margin:0;background:#000">
    <video id="v" src="/video/pelicula.webm" muted style="width:100vw;height:100vh"></video>
    <script>
      const v = document.getElementById("v");
      const nativo = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentTime");
      let permitido = false;
      window.__m7375 = false;
      Object.defineProperty(v, "currentTime", {
        get() { return nativo.get.call(this); },
        set(t) { if (!permitido) window.__m7375 = true; nativo.set.call(this, t); },
      });
      const jugador = {
        seek(ms) { permitido = true; v.currentTime = ms / 1000; permitido = false; },
        play() { v.play(); }, pause() { v.pause(); },
      };
      window.netflix = { appContext: { state: { playerApp: { getAPI: () => ({ videoPlayer: {
        getAllPlayerSessionIds: () => ["watch-1"],
        getVideoPlayerBySessionId: () => jugador,
      }}) } } } };
      window.__usuario = jugador; // lo que haría la persona con los controles de Netflix
    </script></body>`,

  // Prime falso: un avance corto al fondo y la película dentro del contenedor del reproductor.
  prime: `<!doctype html><title>Prime Video</title><body style="margin:0">
    <video id="avance" src="/video/avance.webm" muted autoplay loop style="width:100vw;height:50vh"></video>
    <div class="webPlayerSDKContainer"><video id="v" src="/video/pelicula.webm" muted style="width:100vw;height:50vh"></video></div>
    <script>
      const v = document.getElementById("v");
      window.__usuario = { seek: (ms) => (v.currentTime = ms / 1000), play: () => v.play(), pause: () => v.pause() };
    </script></body>`,

  // Disney+ falso: el video vive dentro de un shadow DOM anidado.
  disney: `<!doctype html><title>Disney+</title><body style="margin:0">
    <disney-web-player></disney-web-player>
    <script>
      const externo = document.querySelector("disney-web-player").attachShadow({ mode: "open" });
      const intermedio = document.createElement("div");
      externo.append(intermedio);
      const interno = intermedio.attachShadow({ mode: "open" });
      const v = document.createElement("video");
      v.src = "/video/pelicula.webm"; v.muted = true; v.style.cssText = "width:100vw;height:100vh";
      interno.append(v);
      window.__v = v;
      window.__usuario = { seek: (ms) => (v.currentTime = ms / 1000), play: () => v.play(), pause: () => v.pause() };
    </script></body>`,
};

const URLS = {
  netflix: "https://www.netflix.com/watch/81234567",
  prime: "https://www.primevideo.com/detail/0ABC/ref=atv_dp",
  disney: "https://www.disneyplus.com/play/1234-abcd",
};

async function abrirNavegador(nombre) {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), `tg-${nombre}-`));
  const contexto = await chromium.launchPersistentContext(perfil, {
    channel: "chromium",
    headless: true,
    viewport: { width: 1280, height: 720 },
    args: [
      `--disable-extensions-except=${EXTENSION}`,
      `--load-extension=${EXTENSION}`,
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  for (const [plataforma, url] of Object.entries(URLS)) {
    const origen = new URL(url).origin;
    await contexto.route(`${origen}/**`, (route) => {
      const ruta = new URL(route.request().url()).pathname;
      if (ruta.startsWith("/video/")) return servirVideo(route, path.basename(ruta));
      return route.fulfill({ status: 200, contentType: "text/html", body: PAGINAS[plataforma] });
    });
  }
  let sw = contexto.serviceWorkers()[0];
  if (!sw) sw = await contexto.waitForEvent("serviceworker");
  const idExtension = new URL(sw.url()).host;
  // Apunta la extensión al servidor local de pruebas.
  await sw.evaluate((url) => chrome.storage.local.set({ serverUrl: url }), SERVIDOR);
  return { contexto, sw, idExtension };
}

async function unirseConPopup({ contexto, idExtension }, sala, nombre) {
  const popup = await contexto.newPage();
  await popup.goto(`chrome-extension://${idExtension}/popup.html`);
  // Se escribe en minúsculas a propósito: el popup debe respetar el código en mayúsculas.
  await popup.fill("#input-room", sala.toLowerCase());
  await popup.fill("#input-name", nombre);
  await popup.click("#btn-conectar");
  await expect(popup.locator("#texto-estado")).toHaveText("Sincronizando", { timeout: 10000 });
  await expect(popup.locator("#codigo-sala")).toHaveText(sala);
  await popup.close();
}

// Lee el estado del video principal de la página (incluido el que está en shadow DOM).
const estado = (pagina) =>
  pagina.evaluate(() => {
    const v = window.__v ?? document.getElementById("v");
    return { t: v.currentTime, pausado: v.paused, m7375: window.__m7375 ?? false };
  });

async function abrirPlataforma(navegador, plataforma) {
  const pagina = await navegador.contexto.newPage();
  await pagina.goto(URLS[plataforma]);
  // Espera a que el video tenga metadatos (duración) para que la extensión lo reconozca.
  await pagina.waitForFunction(() => {
    const v = window.__v ?? document.getElementById("v");
    return v && v.readyState >= 1;
  });
  await pagina.waitForTimeout(1600); // la extensión busca el video cada segundo
  return pagina;
}

test.beforeAll(async () => {
  prepararVideos();
  servidor = spawn(process.execPath, [path.join(RAIZ, "socket-server.js")], {
    env: { ...process.env, SOCKET_PORT: String(PUERTO) },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${SERVIDOR}/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("El servidor de sockets no arrancó");
});

test.afterAll(() => servidor?.kill());

for (const plataforma of ["netflix", "prime", "disney"]) {
  test(`${plataforma}: play, pausa, salto y entrada tardía se sincronizan`, async () => {
    const sala = `PR${plataforma.slice(0, 3).toUpperCase()}${Date.now() % 10000}`;
    const ana = await abrirNavegador("ana");
    const beto = await abrirNavegador("beto");
    try {
      await unirseConPopup(ana, sala, "Ana");
      await unirseConPopup(beto, sala, "Beto");
      const pa = await abrirPlataforma(ana, plataforma);
      const pb = await abrirPlataforma(beto, plataforma);

      // 1) Ana salta al minuto 2 y da play → Beto queda en el mismo punto reproduciendo.
      await pa.evaluate(() => window.__usuario.seek(120000));
      await pa.waitForTimeout(700);
      await pa.evaluate(() => window.__usuario.play());
      await expect.poll(async () => (await estado(pb)).pausado, { timeout: 8000 }).toBe(false);
      await expect.poll(async () => Math.abs((await estado(pb)).t - (await estado(pa)).t), { timeout: 8000 }).toBeLessThan(2.5);

      // 2) Sin rebotes: 3 s después Ana sigue reproduciendo (nadie le devolvió una pausa).
      await pa.waitForTimeout(3000);
      expect((await estado(pa)).pausado).toBe(false);

      // 3) Beto pausa → Ana se pausa.
      await pb.evaluate(() => window.__usuario.pause());
      await expect.poll(async () => (await estado(pa)).pausado, { timeout: 8000 }).toBe(true);

      // 4) Ana salta al minuto 5 → Beto salta también.
      await pa.evaluate(() => window.__usuario.seek(300000));
      await expect.poll(async () => (await estado(pb)).t, { timeout: 8000 }).toBeGreaterThan(298);

      // 5) Entrada tardía: Ana da play, Beto recarga y se pone al día solo.
      await pa.evaluate(() => window.__usuario.play());
      await expect.poll(async () => (await estado(pb)).pausado, { timeout: 8000 }).toBe(false);
      await pb.reload();
      await pb.waitForFunction(() => (window.__v ?? document.getElementById("v"))?.readyState >= 1);
      await expect.poll(async () => (await estado(pb)).pausado, { timeout: 10000 }).toBe(false);
      await expect.poll(async () => Math.abs((await estado(pb)).t - (await estado(pa)).t), { timeout: 10000 }).toBeLessThan(2.5);

      if (plataforma === "netflix") {
        // Nunca se tocó currentTime directamente: Netflix real no se colgaría.
        expect((await estado(pa)).m7375).toBe(false);
        expect((await estado(pb)).m7375).toBe(false);
      }
      if (plataforma === "prime") {
        // El avance del fondo no se movió al minuto 5: se sincronizó la película.
        const avance = await pb.evaluate(() => document.getElementById("avance").currentTime);
        expect(avance).toBeLessThan(31);
      }
    } finally {
      await ana.contexto.close();
      await beto.contexto.close();
    }
  });
}

test("el servidor rechaza eventos de quien no está en la sala", async () => {
  const { io } = require("socket.io-client");
  const intruso = io(SERVIDOR, { transports: ["websocket"] });
  const miembro = io(SERVIDOR, { transports: ["websocket"] });
  const conectado = (s) => new Promise((r) => (s.connected ? r() : s.once("connect", r)));
  try {
    const sala = `SEGURA${Date.now() % 10000}`;
    await conectado(miembro);
    miembro.emit("join-room", { roomId: sala, username: "Ana" });
    await new Promise((r) => miembro.once("room-joined", r));
    let recibido = false;
    miembro.on("video-play", () => (recibido = true));
    miembro.on("chat-message", () => (recibido = true));

    await conectado(intruso);
    intruso.emit("video-play", { roomId: sala, currentTime: 0 });
    intruso.emit("chat-message", { roomId: sala, text: "hola" });
    await new Promise((r) => setTimeout(r, 800));
    expect(recibido).toBe(false);
  } finally {
    intruso.close();
    miembro.close();
  }
});
