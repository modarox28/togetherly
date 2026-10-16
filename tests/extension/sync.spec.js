/* eslint-disable @typescript-eslint/no-require-imports */
// Prueba de punta a punta de la extensión Togetherly Sync.
// Levanta el servidor de sockets real, abre dos navegadores con la extensión
// y simula Netflix, Prime Video y Disney+ con páginas falsas (fake-platforms.js)
// y un video de 10 minutos generado con ffmpeg.
const { test, expect, chromium } = require("@playwright/test");
const { spawn, execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { FAKE_PAGES, PLATFORM_URLS } = require("./fake-platforms");

const ROOT = path.resolve(__dirname, "../..");
const EXTENSION_DIR = path.join(ROOT, "togetherly-extension");
const PORT = 3999;
const SERVER_URL = `http://localhost:${PORT}`;
const VIDEO_DIR = path.join(os.tmpdir(), "togetherly-tests");

let server;

// Videos de prueba: uno largo (película) y uno corto (avance).
function prepareVideos() {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  const create = (name, seconds) => {
    const file = path.join(VIDEO_DIR, name);
    if (fs.existsSync(file)) return;
    execFileSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi",
      "-i", "testsrc=size=320x180:rate=10", "-t", String(seconds),
      "-c:v", "libvpx", "-b:v", "40k", "-g", "20", file,
    ]);
  };
  create("movie.webm", 600);
  create("trailer.webm", 30);
}

// Sirve un video con soporte de rangos (necesario para poder saltar).
function serveVideo(route, fileName) {
  const data = fs.readFileSync(path.join(VIDEO_DIR, fileName));
  const range = route.request().headers()["range"];
  const headers = { "content-type": "video/webm", "accept-ranges": "bytes" };
  if (!range) return route.fulfill({ status: 200, body: data, headers });
  const [startText, endText] = range.replace("bytes=", "").split("-");
  const start = Number(startText);
  const end = endText ? Number(endText) : data.length - 1;
  return route.fulfill({
    status: 206,
    body: data.subarray(start, end + 1),
    headers: { ...headers, "content-range": `bytes ${start}-${end}/${data.length}` },
  });
}

async function openBrowser(name) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `tg-${name}-`));
  const context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    viewport: { width: 1280, height: 720 },
    args: [
      `--disable-extensions-except=${EXTENSION_DIR}`,
      `--load-extension=${EXTENSION_DIR}`,
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  for (const [platform, url] of Object.entries(PLATFORM_URLS)) {
    await context.route(`${new URL(url).origin}/**`, (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname.startsWith("/video/")) return serveVideo(route, path.basename(pathname));
      return route.fulfill({ status: 200, contentType: "text/html", body: FAKE_PAGES[platform] });
    });
  }
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const extensionId = new URL(worker.url()).host;
  // El service worker puede tardar un instante en tener las APIs de Chrome listas.
  await expect
    .poll(() => worker.evaluate(() => !!globalThis.chrome?.storage?.local).catch(() => false), { timeout: 10000 })
    .toBe(true);
  // Apunta la extensión al servidor local de pruebas.
  await worker.evaluate((url) => chrome.storage.local.set({ serverUrl: url }), SERVER_URL);
  return { context, extensionId };
}

async function joinWithPopup({ context, extensionId }, roomId, name) {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  // Se escribe en minúsculas a propósito: el popup debe respetar el código en mayúsculas.
  await popup.fill("#input-room", roomId.toLowerCase());
  await popup.fill("#input-name", name);
  await popup.click("#btn-connect");
  await expect(popup.locator("#status-text")).toHaveText("Sincronizando", { timeout: 10000 });
  await expect(popup.locator("#room-code")).toHaveText(roomId);
  await popup.close();
}

// Estado del video principal de la página (incluido el que está en shadow DOM).
const videoState = (page) =>
  page.evaluate(() => {
    const v = window.__video ?? document.getElementById("v");
    return { time: window.__contentTime?.() ?? v.currentTime, paused: v.paused, m7375: window.__m7375 ?? false };
  });

const hasMetadata = () => (window.__video ?? document.getElementById("v"))?.readyState >= 1;

async function openPlatform(browser, platform) {
  const page = await browser.context.newPage();
  await page.goto(PLATFORM_URLS[platform]);
  await page.waitForFunction(hasMetadata);
  await page.waitForTimeout(1600); // la extensión busca el video cada segundo
  return page;
}

const timeGap = async (a, b) => Math.abs((await videoState(a)).time - (await videoState(b)).time);

test.beforeAll(async () => {
  prepareVideos();
  server = spawn(process.execPath, [path.join(ROOT, "socket-server.js")], {
    env: { ...process.env, SOCKET_PORT: String(PORT) },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${SERVER_URL}/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("El servidor de sockets no arrancó");
});

test.afterAll(() => server?.kill());

for (const platform of Object.keys(PLATFORM_URLS)) {
  test(`${platform}: play, pausa, salto y entrada tardía se sincronizan`, async () => {
    const roomId = `PR${platform.slice(0, 3).toUpperCase()}${Date.now() % 10000}`;
    const ana = await openBrowser("ana");
    const beto = await openBrowser("beto");
    const poll = (fn, timeout = 8000) => expect.poll(fn, { timeout });
    try {
      await joinWithPopup(ana, roomId, "Ana");
      await joinWithPopup(beto, roomId, "Beto");
      const pageA = await openPlatform(ana, platform);
      const pageB = await openPlatform(beto, platform);

      // 1) Ana salta al minuto 2 y da play → Beto queda en el mismo punto reproduciendo.
      await pageA.evaluate(() => window.__user.seek(120000));
      await pageA.waitForTimeout(700);
      await pageA.evaluate(() => window.__user.play());
      await poll(async () => (await videoState(pageB)).paused).toBe(false);
      await poll(() => timeGap(pageA, pageB)).toBeLessThan(2.5);

      // 2) Sin rebotes: 3 s después Ana sigue reproduciendo (nadie le devolvió una pausa).
      await pageA.waitForTimeout(3000);
      expect((await videoState(pageA)).paused).toBe(false);

      // 3) Beto pausa → Ana se pausa.
      await pageB.evaluate(() => window.__user.pause());
      await poll(async () => (await videoState(pageA)).paused).toBe(true);

      // 4) Ana salta al minuto 5 justo después → Beto salta también.
      await pageA.evaluate(() => window.__user.seek(300000));
      await poll(async () => (await videoState(pageB)).time).toBeGreaterThan(298);

      // 5) Entrada tardía: Ana da play, Beto recarga y se pone al día solo.
      await pageA.evaluate(() => window.__user.play());
      await poll(async () => (await videoState(pageB)).paused).toBe(false);
      await pageB.reload();
      await pageB.waitForFunction(hasMetadata);
      await poll(async () => (await videoState(pageB)).paused, 10000).toBe(false);
      await poll(() => timeGap(pageA, pageB), 10000).toBeLessThan(2.5);

      if (platform === "netflix") {
        // Nunca se tocó currentTime directamente: Netflix real no se colgaría.
        expect((await videoState(pageA)).m7375).toBe(false);
        expect((await videoState(pageB)).m7375).toBe(false);
      }
      if (platform === "prime") {
        // El avance del fondo no se movió al minuto 5: se sincronizó la película.
        const trailerTime = await pageB.evaluate(() => document.getElementById("trailer").currentTime);
        expect(trailerTime).toBeLessThan(31);
      }
    } finally {
      await ana.context.close();
      await beto.context.close();
    }
  });
}

test("crear sala desde el popup: el otro se une con el código y el play se sincroniza", async () => {
  const ana = await openBrowser("ana-crea");
  const beto = await openBrowser("beto-une");
  try {
    // Ana crea la sala sin pasar por la web.
    const popup = await ana.context.newPage();
    await popup.goto(`chrome-extension://${ana.extensionId}/popup.html`);
    await popup.fill("#input-name", "Ana");
    await popup.click("#btn-create");
    await expect(popup.locator("#status-text")).toHaveText("Sincronizando", { timeout: 10000 });
    const roomId = (await popup.locator("#room-code").textContent()).trim();
    expect(roomId).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    await popup.close();

    // Beto se une con el código que le mandó Ana.
    await joinWithPopup(beto, roomId, "Beto");

    const pageA = await openPlatform(ana, "netflix");
    const pageB = await openPlatform(beto, "netflix");
    await pageA.evaluate(() => window.__user.play());
    await expect.poll(async () => (await videoState(pageB)).paused, { timeout: 8000 }).toBe(false);
  } finally {
    await ana.context.close();
    await beto.context.close();
  }
});

test("el servidor rechaza eventos de quien no está en la sala", async () => {
  const { io } = require("socket.io-client");
  const intruder = io(SERVER_URL, { transports: ["websocket"] });
  const member = io(SERVER_URL, { transports: ["websocket"] });
  const connected = (s) => new Promise((r) => (s.connected ? r() : s.once("connect", r)));
  try {
    const roomId = `SEGURA${Date.now() % 10000}`;
    await connected(member);
    member.emit("join-room", { roomId, username: "Ana" });
    await new Promise((r) => member.once("room-joined", r));
    let received = false;
    member.on("video-play", () => (received = true));
    member.on("chat-message", () => (received = true));

    await connected(intruder);
    intruder.emit("video-play", { roomId, currentTime: 0 });
    intruder.emit("chat-message", { roomId, text: "hola" });
    await new Promise((r) => setTimeout(r, 800));
    expect(received).toBe(false);
  } finally {
    intruder.close();
    member.close();
  }
});

test("protocolo de la web y la app móvil: entrar, chatear y sincronizar", async () => {
  const { io } = require("socket.io-client");
  const ana = io(SERVER_URL, { transports: ["websocket"] });
  const beto = io(SERVER_URL, { transports: ["websocket"] });
  const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
  try {
    const roomId = `MOVIL${Date.now() % 10000}`;
    ana.emit("join-room", { roomId, username: "Ana", avatar: "🐈" });
    const joined = await once(ana, "room-joined");
    expect(joined.you.name).toBe("Ana");
    expect(joined.premium).toBe(false);

    const anaSeesBeto = once(ana, "participant-joined");
    beto.emit("join-room", { roomId, username: "Beto", avatar: "☕" });
    await once(beto, "room-joined");
    expect((await anaSeesBeto).participant.name).toBe("Beto");

    // El chat dice quién lo mandó (senderId) para que cada app sepa cuáles son "míos".
    const message = once(ana, "chat-message");
    beto.emit("chat-message", { roomId, text: "hola" });
    const received = await message;
    expect(received.senderId).toBe(beto.id);
    expect(received.text).toBe("hola");

    // play con currentTime (formato nuevo; la app móvil antes mandaba "time")
    const play = once(ana, "video-play");
    beto.emit("video-play", { roomId, currentTime: 42 });
    expect((await play).currentTime).toBe(42);
  } finally {
    ana.close();
    beto.close();
  }
});

test("enlace de invitación: la sala sabe qué película abrió el anfitrión", async () => {
  const ana = await openBrowser("ana-anfitriona");
  try {
    const roomId = `INV${Date.now() % 100000}`;
    await joinWithPopup(ana, roomId, "Ana");
    // Ana abre la película: la extensión le avisa a la sala qué está viendo.
    await openPlatform(ana, "netflix");
    await expect
      .poll(async () => (await (await fetch(`${SERVER_URL}/api/rooms/${roomId}`)).json()).nowWatching?.url, { timeout: 8000 })
      .toBe(PLATFORM_URLS.netflix);
    const preview = await (await fetch(`${SERVER_URL}/api/rooms/${roomId}`)).json();
    expect(preview).toMatchObject({ exists: true, nowWatching: { platform: "netflix", by: "Ana" } });

    // El popup ofrece el enlace /j/ y muestra qué se está viendo.
    const popup = await ana.context.newPage();
    await popup.goto(`chrome-extension://${ana.extensionId}/popup.html`);
    await expect(popup.locator("#watching-text")).toContainText("Netflix");
    await popup.close();
  } finally {
    await ana.context.close();
  }
});

test("unirse desde el popup abre sola la película que está viendo la sala", async () => {
  const ana = await openBrowser("ana-abre");
  const beto = await openBrowser("beto-llega");
  try {
    const roomId = `ABRE${Date.now() % 100000}`;
    await joinWithPopup(ana, roomId, "Ana");
    await openPlatform(ana, "disney");
    await expect
      .poll(async () => (await (await fetch(`${SERVER_URL}/api/rooms/${roomId}`)).json()).nowWatching?.platform, { timeout: 8000 })
      .toBe("disney");

    // Beto se une con el código: la extensión le abre la misma película en una pestaña nueva.
    const pagesBefore = beto.context.pages().length;
    await joinWithPopup(beto, roomId, "Beto");
    // La extensión abre una pestaña nueva con la película. (Playwright no puede servir las páginas
    // falsas en pestañas que abre la extensión, así que aquí se vuelve a cargar la misma dirección.)
    await expect.poll(() => beto.context.pages().length, { timeout: 10000 }).toBeGreaterThan(pagesBefore);
    const moviePage = beto.context.pages().at(-1);
    await moviePage.goto(PLATFORM_URLS.disney);
    await moviePage.waitForFunction(hasMetadata);
    await moviePage.waitForTimeout(1600);

    // Y queda sincronizado: Ana da play y a Beto le arranca.
    const pageA = ana.context.pages().find((page) => page.url().startsWith(PLATFORM_URLS.disney));
    await pageA.evaluate(() => window.__user.play());
    await expect.poll(async () => (await videoState(moviePage)).paused, { timeout: 8000 }).toBe(false);
  } finally {
    await ana.context.close();
    await beto.context.close();
  }
});

// El panel de chat vive en un shadow DOM cerrado: se lee con el protocolo de Chrome (pierce).
async function chatPanel(page) {
  const cdp = await page.context().newCDPSession(page);
  const nodes = async () => {
    const { root } = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
    const all = [];
    const walk = (node) => {
      all.push(node);
      for (const child of [...(node.children ?? []), ...(node.shadowRoots ?? [])]) walk(child);
    };
    walk(root);
    return all;
  };
  const classOf = (node) => {
    const attrs = node.attributes ?? [];
    const i = attrs.indexOf("class");
    return i >= 0 ? attrs[i + 1] : "";
  };
  return {
    /** Textos de los mensajes del chat */
    async messages() {
      const all = await nodes();
      return all
        .filter((n) => n.nodeName === "P" && classOf(n) === "text")
        .map((n) => (n.children ?? []).map((c) => c.nodeValue ?? "").join(""));
    },
    /** Escribe y envía un mensaje desde el panel */
    async send(text) {
      const input = (await nodes()).find((n) => n.nodeName === "INPUT" && (n.attributes ?? []).includes("Mensaje"));
      await cdp.send("DOM.focus", { backendNodeId: input.backendNodeId });
      await page.keyboard.type(text);
      await page.keyboard.press("Enter");
    },
  };
}

test("chat dentro de la película: lo que escribe uno lo ve el otro, y escribir no pausa el video", async () => {
  const ana = await openBrowser("ana-chat");
  const beto = await openBrowser("beto-chat");
  try {
    const roomId = `CHAT${Date.now() % 100000}`;
    await joinWithPopup(ana, roomId, "Ana");
    await joinWithPopup(beto, roomId, "Beto");
    const pageA = await openPlatform(ana, "netflix");
    const pageB = await openPlatform(beto, "netflix");
    await pageA.evaluate(() => window.__user.play());
    await expect.poll(async () => (await videoState(pageB)).paused, { timeout: 8000 }).toBe(false);

    const chatA = await chatPanel(pageA);
    const chatB = await chatPanel(pageB);
    await chatA.send("¿Ya empezó? 🍿");
    await expect.poll(() => chatB.messages(), { timeout: 8000 }).toContain("¿Ya empezó? 🍿");
    await chatB.send("Sí, dale");
    await expect.poll(() => chatA.messages(), { timeout: 8000 }).toContain("Sí, dale");

    // El popup muestra la versión (para saber si la extensión está actualizada).
    const popup = await ana.context.newPage();
    await popup.goto(`chrome-extension://${ana.extensionId}/popup.html`);
    await expect(popup.locator("#version")).toContainText(/v\d+\.\d+\.\d+/);
    await popup.close();

    // Escribir con espacios en el chat no debe pausar la película.
    expect((await videoState(pageA)).paused).toBe(false);
    expect((await videoState(pageB)).paused).toBe(false);
  } finally {
    await ana.context.close();
    await beto.context.close();
  }
});

test("el chat abierto no tapa la película: la página se encoge, y si no se puede, queda encima", async () => {
  const ana = await openBrowser("ana-espacio");
  try {
    await joinWithPopup(ana, `ESPACIO${Date.now() % 10000}`, "Ana");
    const videoRight = (page) =>
      page.evaluate(() => (window.__video ?? document.getElementById("v")).getBoundingClientRect().right);
    const chatOpenClass = (page) => page.evaluate(() => document.documentElement.classList.contains("togetherly-chat-open"));

    // Disney+ (como el real): el reproductor se acomoda al ancho y queda a la izquierda del chat.
    const disney = await openPlatform(ana, "disney");
    await expect.poll(() => videoRight(disney), { timeout: 8000 }).toBeLessThanOrEqual(1280 - 320 + 1);
    expect(await chatOpenClass(disney)).toBe(true);

    // Un reproductor que no se deja encoger (ancho fijo de pantalla): se quita el arreglo y el chat queda encima.
    const netflix = await openPlatform(ana, "netflix");
    await expect.poll(() => chatOpenClass(netflix), { timeout: 8000 }).toBe(false);
    expect(await videoRight(netflix)).toBeGreaterThan(1200);
  } finally {
    await ana.context.close();
  }
});

test("modo líder: solo quien creó la sala controla; los demás vuelven a donde va la sala", async () => {
  const ana = await openBrowser("ana-lider");
  const beto = await openBrowser("beto-sigue");
  try {
    const roomId = `LID${Date.now() % 100000}`;
    await joinWithPopup(ana, roomId, "Ana"); // primera en entrar: lidera
    await joinWithPopup(beto, roomId, "Beto");
    const pageA = await openPlatform(ana, "netflix");
    const pageB = await openPlatform(beto, "netflix");

    // Beto no ve el selector; Ana sí, y elige "Solo yo".
    const popupB = await beto.context.newPage();
    await popupB.goto(`chrome-extension://${beto.extensionId}/popup.html`);
    await expect(popupB.locator("#control-seg")).toBeHidden();
    await popupB.close();
    const popupA = await ana.context.newPage();
    await popupA.goto(`chrome-extension://${ana.extensionId}/popup.html`);
    await expect(popupA.locator("#control-seg")).toBeVisible({ timeout: 8000 });
    await popupA.click("#btn-control-leader");
    await expect(popupA.locator("#control-text")).toContainText("Solo tú", { timeout: 8000 });
    await popupA.close();

    // Ana da play: a Beto le arranca.
    await pageA.evaluate(() => window.__user.play());
    await expect.poll(async () => (await videoState(pageB)).paused, { timeout: 8000 }).toBe(false);

    // Beto intenta pausar: Ana sigue y a Beto se le reanuda solo.
    await pageB.evaluate(() => window.__user.pause());
    await pageB.waitForTimeout(2500);
    expect((await videoState(pageA)).paused).toBe(false);
    await expect.poll(async () => (await videoState(pageB)).paused, { timeout: 8000 }).toBe(false);

    // Ana pausa: Beto se pausa.
    await pageA.evaluate(() => window.__user.pause());
    await expect.poll(async () => (await videoState(pageB)).paused, { timeout: 8000 }).toBe(true);
  } finally {
    await ana.context.close();
    await beto.context.close();
  }
});

test("el servidor solo acepta direcciones de plataformas soportadas", async () => {
  const { io } = require("socket.io-client");
  const ext = io(SERVER_URL, { transports: ["websocket"] });
  const connected = new Promise((r) => ext.once("connect", r));
  try {
    await connected;
    const roomId = `SEG${Date.now() % 100000}`;
    ext.emit("ext-connect", { roomId, username: "Eve" });
    await new Promise((r) => ext.once("ext-connected", r));
    const preview = async () => (await (await fetch(`${SERVER_URL}/api/rooms/${roomId}`)).json()).nowWatching;

    for (const url of ["https://evil.example/watch/1", "javascript:alert(1)", "http://www.netflix.com/watch/1", "https://netflix.com.evil.io/watch"]) {
      ext.emit("ext-now-watching", { roomId, url });
    }
    await new Promise((r) => setTimeout(r, 400));
    expect(await preview()).toBeNull();

    ext.emit("ext-now-watching", { roomId, url: "https://www.disneyplus.com/play/abc#t=10" });
    await expect.poll(preview).toMatchObject({ url: "https://www.disneyplus.com/play/abc", platform: "disney" });
    // Como en el Disney+ real: sin "www" y con un ?contextId= enorme → se guarda sin parámetros.
    ext.emit("ext-now-watching", { roomId, url: `https://disneyplus.com/es-419/play/e8569c2d?contextId=${"x".repeat(900)}` });
    await expect.poll(preview).toMatchObject({ url: "https://disneyplus.com/es-419/play/e8569c2d", platform: "disney" });
    expect((await (await fetch(`${SERVER_URL}/api/rooms/NOEXISTE1`)).json()).exists).toBe(false);
    expect((await fetch(`${SERVER_URL}/api/rooms/${encodeURIComponent("../etc")}`)).status).toBe(400);
  } finally {
    ext.close();
  }
});
