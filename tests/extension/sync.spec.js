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
      return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: FAKE_PAGES[platform] });
    });
  }
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const extensionId = new URL(worker.url()).host;
  // El service worker puede tardar un instante en tener las APIs de Chrome listas.
  await expect
    .poll(() => worker.evaluate(() => !!globalThis.chrome?.storage?.local).catch(() => false), { timeout: 10000 })
    .toBe(true);
  // Apunta la extensión al servidor local de pruebas.
  await worker.evaluate((url) => chrome.storage.local.set({ serverUrl: url, termsAccepted: "2026-10-17" }), SERVER_URL);
  return { context, extensionId };
}

async function joinWithPopup({ context, extensionId }, roomId, name) {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  // Se escribe en minúsculas a propósito: el popup debe respetar el código en mayúsculas.
  const exists = (await (await fetch(`${SERVER_URL}/api/rooms/${roomId}`)).json()).exists;
  if (!exists) {
    // La primera persona crea la sala con ese código (como hace la web en /j/CODIGO).
    // "Unirme" en el popup solo deja entrar a salas que ya existen.
    await popup.evaluate(
      ({ id, who }) => new Promise((resolve) => chrome.runtime.sendMessage({ type: "JOIN_ROOM", roomId: id, username: who, avatar: "🍿" }, resolve)),
      { id: roomId, who: name }
    );
    await popup.reload();
  } else {
    await popup.fill("#input-room", roomId.toLowerCase());
    await popup.fill("#input-name", name);
    await popup.click("#btn-connect");
  }
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

// Imita la API de Workers AI de Cloudflare (la trivia con IA) sin salir a internet.
const AI_PORT = 3998;
const AI_ACCOUNT = "a".repeat(32);
let aiServer;
const aiRequests = [];
function startFakeAI() {
  const http = require("node:http");
  aiServer = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      aiRequests.push({ url: req.url, auth: req.headers.authorization, body });
      const known = body.includes("Separación");
      const questions = [
        { question: "¿Dónde trabaja Mark?", options: ["En Lumon", "En un banco", "En una escuela", "En un hospital"], answer: 0 },
        { question: "¿Qué separa el procedimiento?", options: ["Los recuerdos", "Los colores", "Los sueños", "Los idiomas"], answer: 0 },
        { question: "¿En qué piso trabajan?", options: ["El sótano", "El ático", "La azotea", "El lobby"], answer: 0 },
      ];
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ success: true, result: { response: known ? { known: true, questions } : { known: false, questions: [] } } }));
    });
  });
  return new Promise((resolve) => aiServer.listen(AI_PORT, resolve));
}

test.beforeAll(async () => {
  prepareVideos();
  await startFakeAI();
  server = spawn(process.execPath, [path.join(ROOT, "socket-server.js")], {
    env: {
      ...process.env,
      SOCKET_PORT: String(PORT),
      CF_ACCOUNT_ID: AI_ACCOUNT,
      CF_AI_TOKEN: "token-de-prueba-local",
      CF_AI_BASE_URL: `http://localhost:${AI_PORT}`,
    },
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

test.afterAll(() => {
  server?.kill();
  aiServer?.close();
});

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
      if (platform === "appletv") {
        // El video de fondo de la página no se movió al minuto 5: se sincronizó la película.
        const bgTime = await pageB.evaluate(() => document.querySelector("amp-background-video").shadowRoot.getElementById("bg").currentTime);
        expect(Math.abs(bgTime - 300)).toBeGreaterThan(20);
        // La extensión leyó el título del reproductor (sirve para la trivia).
        await poll(async () => (await (await fetch(`${SERVER_URL}/api/rooms/${roomId}`)).json()).nowWatching?.title).toBe("Separación");
        // Y los saltos de la sala pasaron por el reproductor de Apple (MusicKit).
        expect(await pageB.evaluate(() => window.__mkSeeks ?? 0)).toBeGreaterThan(0);
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
    /** Todo el texto visible del cuadro de trivia */
    async trivia() {
      const all = await nodes();
      const box = all.find((n) => n.nodeName === "DIV" && classOf(n) === "trivia");
      if (!box) return "";
      const texts = [];
      const walk = (n) => {
        if (n.nodeType === 3) texts.push(n.nodeValue);
        for (const c of n.children ?? []) walk(c);
      };
      walk(box);
      return texts.join(" | ");
    },
    /** Toca el botón del panel que tenga ese texto (o esa etiqueta) */
    async click(text, nth = 0) {
      const all = await nodes();
      const textOf = (n) => (n.children ?? []).map((c) => c.nodeValue ?? "").join("");
      const matches = all.filter(
        (n) => n.nodeName === "BUTTON" && (textOf(n) === text || (n.attributes ?? []).includes(text))
      );
      const target = matches[nth];
      if (!target) throw new Error(`No hay botón "${text}"`);
      const { object } = await cdp.send("DOM.resolveNode", { backendNodeId: target.backendNodeId });
      await cdp.send("Runtime.callFunctionOn", { objectId: object.objectId, functionDeclaration: "function(){ this.click(); }" });
    },
    /** Escribe en el campo del panel que tenga ese placeholder */
    async fill(placeholder, text) {
      const input = (await nodes()).find((n) => n.nodeName === "INPUT" && (n.attributes ?? []).includes(placeholder));
      if (!input) throw new Error(`No hay campo "${placeholder}"`);
      await cdp.send("DOM.focus", { backendNodeId: input.backendNodeId });
      await page.keyboard.type(text);
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
    // Y el panel queda en el espacio libre de la derecha, sin tapar la película.
    const panelLeft = await disney.evaluate(() => document.getElementById("togetherly-chat").getBoundingClientRect().left);
    const cdp = await disney.context().newCDPSession(disney);
    const { root } = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
    let panelBox = null;
    const walk = async (node) => {
      if (panelBox) return;
      if (node.attributes?.includes("class") && node.attributes[node.attributes.indexOf("class") + 1] === "panel") {
        panelBox = (await cdp.send("DOM.getBoxModel", { nodeId: node.nodeId })).model.border;
        return;
      }
      for (const child of [...(node.children ?? []), ...(node.shadowRoots ?? [])]) await walk(child);
    };
    await walk(root);
    expect(panelLeft).toBeGreaterThanOrEqual(0);
    expect(panelBox).not.toBeNull();
    expect(panelBox[0]).toBeGreaterThanOrEqual(1280 - 320 - 1); // borde izquierdo del panel
    expect(panelBox[0]).toBeGreaterThanOrEqual(await videoRight(disney) - 1);

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

test("líder: alguien con el mismo nombre no puede cambiar los permisos ni controlar", async () => {
  const { io } = require("socket.io-client");
  const roomId = `MISMO${Date.now() % 100000}`;
  const connect = () => io(SERVER_URL, { transports: ["websocket"], forceNew: true });
  const lider = connect();
  const impostor = connect();
  const settings = { lider: [], impostor: [] };
  lider.on("room-settings", (s) => settings.lider.push(s));
  impostor.on("room-settings", (s) => settings.impostor.push(s));
  const denied = [];
  impostor.on("control-denied", (d) => denied.push(d));
  // Claves de prueba armadas al vuelo (no son secretos reales).
  const keyAna = "ana".repeat(8);
  const keyOtra = "otra".repeat(6);
  try {
    lider.emit("ext-connect", { roomId, username: "Ana", avatar: "🍿", clientKey: keyAna });
    await expect.poll(() => settings.lider.at(-1)?.youLead).toBe(true);
    impostor.emit("ext-connect", { roomId, username: "Ana", avatar: "🍿", clientKey: keyOtra });
    await expect.poll(() => settings.impostor.at(-1)?.youLead).toBe(false);

    // El impostor intenta ponerse como único que controla: no pasa nada.
    impostor.emit("set-control", { roomId, mode: "leader" });
    await new Promise((r) => setTimeout(r, 500));
    expect(settings.lider.at(-1).controlMode).toBe("all");

    // La líder sí puede, y entonces el impostor no controla aunque se llame igual.
    lider.emit("set-control", { roomId, mode: "leader" });
    await expect.poll(() => settings.impostor.at(-1)?.controlMode).toBe("leader");
    impostor.emit("video-pause", { roomId, currentTime: 10 });
    await expect.poll(() => denied.length).toBeGreaterThan(0);

    // Y la clave nunca se reparte: no aparece en lo que reciben los demás.
    expect(JSON.stringify(settings.impostor)).not.toContain(keyAna);
  } finally {
    lider.close();
    impostor.close();
  }
});

test("unirse con un código que no existe avisa y no crea una sala", async () => {
  const ana = await openBrowser("ana-codigo");
  try {
    const popup = await ana.context.newPage();
    await popup.goto(`chrome-extension://${ana.extensionId}/popup.html`);
    await popup.fill("#input-room", "NOEXISTE9");
    await popup.fill("#input-name", "Ana");
    await popup.click("#btn-connect");
    await expect(popup.locator("body")).toContainText("No hay ninguna sala con ese código", { timeout: 10000 });
    const preview = await (await fetch(`${SERVER_URL}/api/rooms/NOEXISTE9`)).json();
    expect(preview.exists).toBe(false);
  } finally {
    await ana.context.close();
  }
});

test("si un invitado se va a otra película, no se sincroniza con la de la sala (ni la cambia)", async () => {
  const ana = await openBrowser("ana-otra");
  const beto = await openBrowser("beto-otra");
  try {
    const roomId = `OTRA${Date.now() % 100000}`;
    await joinWithPopup(ana, roomId, "Ana"); // lidera
    await joinWithPopup(beto, roomId, "Beto");
    const pageA = await openPlatform(ana, "netflix");
    await expect
      .poll(async () => (await (await fetch(`${SERVER_URL}/api/rooms/${roomId}`)).json()).nowWatching?.url, { timeout: 8000 })
      .toBe(PLATFORM_URLS.netflix);

    // Ana pone "Solo yo".
    const popupA = await ana.context.newPage();
    await popupA.goto(`chrome-extension://${ana.extensionId}/popup.html`);
    await expect(popupA.locator("#control-seg")).toBeVisible({ timeout: 8000 });
    await popupA.click("#btn-control-leader");
    await expect(popupA.locator("#control-text")).toContainText("Solo tú", { timeout: 8000 });
    await popupA.close();

    // Beto abre OTRA película y le da play.
    const pageB = await beto.context.newPage();
    await pageB.goto("https://www.netflix.com/watch/99999999");
    await pageB.waitForFunction(() => document.getElementById("v")?.readyState >= 1);
    await pageB.waitForTimeout(1600);
    await pageB.evaluate(() => window.__user.play());
    await pageB.waitForTimeout(1500);

    // La sala sigue en la película de Ana (Beto no lidera) y a Ana no le pasó nada.
    const preview = await (await fetch(`${SERVER_URL}/api/rooms/${roomId}`)).json();
    expect(preview.nowWatching.url).toBe(PLATFORM_URLS.netflix);
    expect((await videoState(pageA)).paused).toBe(true);

    // Ana da play y salta al minuto 5: a Beto (en otra película) no lo mueven.
    await pageA.evaluate(() => window.__user.seek(300000));
    await pageA.evaluate(() => window.__user.play());
    await pageA.waitForTimeout(2500);
    expect((await videoState(pageB)).time).toBeLessThan(60);
    expect((await videoState(pageB)).m7375).toBe(false);
  } finally {
    await ana.context.close();
    await beto.context.close();
  }
});

test("quien lidera puede expulsar (y no vuelve a entrar); reportar responde; sin videollamada en salas públicas", async () => {
  const { io } = require("socket.io-client");
  const roomId = `EXP${Date.now() % 100000}`;
  const connect = () => io(SERVER_URL, { transports: ["websocket"], forceNew: true });
  const lider = connect();
  const otro = connect();
  const keyLider = "lider".repeat(5);
  const keyOtro = "otrox".repeat(5);
  let members = [];
  lider.on("members", (d) => (members = d.members));
  let kicked = 0;
  otro.on("kicked", () => kicked++);
  let reported = false;
  otro.on("report-received", () => (reported = true));
  try {
    lider.emit("ext-connect", { roomId, username: "Ana", clientKey: keyLider, isPublic: true, roomName: "Pública" });
    await expect.poll(() => members.length).toBe(1);
    otro.emit("ext-connect", { roomId, username: "Beto", clientKey: keyOtro });
    await expect.poll(() => members.length).toBe(2);
    const beto = members.find((m) => m.name === "Beto");
    const ana = members.find((m) => m.name === "Ana");
    expect(beto.id).toMatch(/^[a-f0-9]{12}$/);
    expect(JSON.stringify(members)).not.toContain(keyOtro); // la clave nunca se reparte

    // Beto reporta a Ana: el servidor confirma.
    otro.emit("report-member", { roomId, memberId: ana.id, reason: "prueba" });
    await expect.poll(() => reported).toBe(true);

    // Sala pública: pedir videollamada no le llega a nadie.
    let callArrived = false;
    lider.on("call-request", () => (callArrived = true));
    otro.emit("call-request", { roomId });
    await new Promise((r) => setTimeout(r, 400));
    expect(callArrived).toBe(false);

    // Beto (no lidera) no puede expulsar a Ana.
    otro.emit("kick-member", { roomId, memberId: ana.id });
    await new Promise((r) => setTimeout(r, 400));
    expect(members.length).toBe(2);

    // Ana expulsa a Beto: sale de la sala y no puede volver a entrar.
    lider.emit("kick-member", { roomId, memberId: beto.id });
    await expect.poll(() => kicked).toBeGreaterThan(0);
    await expect.poll(() => members.length).toBe(1);
    const vuelve = connect();
    let rejected = false;
    vuelve.on("kicked", () => (rejected = true));
    vuelve.emit("ext-connect", { roomId, username: "Beto", clientKey: keyOtro });
    await expect.poll(() => rejected).toBe(true);
    vuelve.close();
  } finally {
    lider.close();
    otro.close();
  }
});

test("trivia entre amigos desde el chat: cada quien escribe una pregunta, el otro responde y salen los puntos", async () => {
  const ana = await openBrowser("ana-trivia");
  const beto = await openBrowser("beto-trivia");
  try {
    const roomId = `TRIV${Date.now() % 100000}`;
    await joinWithPopup(ana, roomId, "Ana");
    await joinWithPopup(beto, roomId, "Beto");
    const pageA = await openPlatform(ana, "netflix");
    const pageB = await openPlatform(beto, "netflix");
    const chatA = await chatPanel(pageA);
    const chatB = await chatPanel(pageB);

    // En la Netflix de prueba no hay título: la IA no sabe qué vieron → trivia entre amigos.
    await chatA.click("Jugar trivia de lo que vieron");
    await expect.poll(() => chatB.trivia(), { timeout: 8000 }).toContain("Trivia entre amigos");

    // Enviar sin marcar la correcta avisa qué falta.
    await chatA.fill("Tu pregunta", "¿De qué color era el carro?");
    await chatA.fill("Opción 1", "Rojo");
    await chatA.fill("Opción 2", "Azul");
    await chatA.click("Enviar pregunta");
    await expect.poll(() => chatA.trivia()).toContain("marca la correcta");
    await chatA.click("Marcar la opción 1 como correcta");
    await chatA.click("Enviar pregunta");
    await expect.poll(() => chatA.trivia(), { timeout: 8000 }).toContain("Esperando las preguntas");

    await chatB.fill("Tu pregunta", "¿Cómo se llamaba el perro?");
    await chatB.fill("Opción 1", "Max");
    await chatB.fill("Opción 2", "Toby");
    await chatB.click("Marcar la opción 2 como correcta");
    await chatB.click("Enviar pregunta");

    // Ya escribieron los dos: empiezan las preguntas. Cada quien responde la del otro.
    for (let round = 0; round < 2; round++) {
      await expect.poll(() => chatA.trivia(), { timeout: 10000 }).toMatch(new RegExp(`Pregunta ${round + 1} de 2`));
      const text = await chatA.trivia();
      if (text.includes("perro")) await chatA.click("Toby"); // Ana acierta
      else await chatB.click("Azul"); // Beto se equivoca (era Rojo)
      await expect.poll(() => chatA.trivia(), { timeout: 8000 }).toMatch(/Correcto|Así les fue/);
    }

    await expect.poll(() => chatB.trivia(), { timeout: 15000 }).toContain("Resultados");
    const results = await chatB.trivia();
    expect(results).toMatch(/Ana \| 1[0-5]\d/); // 100 por acertar + bono por rapidez
    expect(results).toMatch(/Beto \| 0/);
  } finally {
    await ana.context.close();
    await beto.context.close();
  }
});

test("trivia con IA: el título llega del reproductor, la respuesta solo se revela al final y se puntúa", async () => {
  const { io } = require("socket.io-client");
  const roomId = `TIA${Date.now() % 100000}`;
  const connect = () => io(SERVER_URL, { transports: ["websocket"], forceNew: true });
  const ana = connect();
  const beto = connect();
  const states = { ana: [], beto: [] };
  ana.on("trivia", (s) => states.ana.push(s));
  beto.on("trivia", (s) => states.beto.push(s));
  let titleEvent = null;
  beto.on("movie-title", (d) => (titleEvent = d.title));
  let offer = null;
  beto.on("trivia-offer", (d) => (offer = d));
  const last = (who) => states[who][states[who].length - 1];
  try {
    ana.emit("ext-connect", { roomId, username: "Ana", clientKey: "anaaa".repeat(4) });
    beto.emit("ext-connect", { roomId, username: "Beto", clientKey: "betoo".repeat(4) });
    const url = PLATFORM_URLS.appletv;
    await new Promise((r) => setTimeout(r, 300));
    ana.emit("ext-now-watching", { roomId, url });
    await new Promise((r) => setTimeout(r, 200));
    // Un título de otra película (otra dirección) no cuenta.
    ana.emit("ext-movie-title", { roomId, url: "https://tv.apple.com/co/episode/otra/umc.cmc.otra", title: "Otra" });
    await new Promise((r) => setTimeout(r, 300));
    expect(titleEvent).toBeNull();
    await new Promise((r) => setTimeout(r, 3000)); // límite de 1 título cada 3 s por conexión
    ana.emit("ext-movie-title", { roomId, url, title: "Separación" });
    await expect.poll(() => titleEvent).toBe("Separación");

    // Faltan 2 minutos: se ofrece la trivia una sola vez.
    ana.emit("ext-movie-ending", { roomId });
    await expect.poll(() => offer?.title).toBe("Separación");
    offer = null;
    beto.emit("ext-movie-ending", { roomId });
    await new Promise((r) => setTimeout(r, 300));
    expect(offer).toBeNull();

    beto.emit("trivia-start", { roomId });
    await expect.poll(() => last("ana")?.phase, { timeout: 10000 }).toBe("question");
    const q = last("ana");
    expect(q.mode).toBe("ai");
    expect(q.total).toBe(3);
    expect(q.options).toHaveLength(4);
    expect(q.correct).toBeUndefined(); // la respuesta no viaja mientras se puede responder
    const request = aiRequests[aiRequests.length - 1];
    expect(request.url).toBe(`/accounts/${AI_ACCOUNT}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`);
    expect(request.auth).toBe("Bearer token-de-prueba-local");

    // Ana responde bien, Beto mal; respuestas repetidas o fuera de rango no cuentan.
    const known = ["En Lumon", "Los recuerdos", "El sótano"];
    const right = q.options.findIndex((o) => known.includes(o));
    ana.emit("trivia-answer", { roomId, id: q.id, index: 0, choice: right });
    ana.emit("trivia-answer", { roomId, id: q.id, index: 0, choice: (right + 1) % 4 });
    beto.emit("trivia-answer", { roomId, id: q.id, index: 0, choice: 9 });
    beto.emit("trivia-answer", { roomId, id: q.id, index: 0, choice: (right + 1) % 4 });
    await expect.poll(() => last("beto")?.phase).toBe("reveal");
    expect(last("beto").correct).toBe(right);
    expect(last("ana").you.choice).toBe(right);
    const scores = Object.fromEntries(last("beto").scores.map((s) => [s.name, s.points]));
    expect(scores.Ana).toBeGreaterThanOrEqual(100);
    expect(scores.Beto).toBe(0);
    expect(JSON.stringify(states.beto)).not.toContain("anaaa"); // nunca se reparte la clave

    // Solo quien la abrió (o quien lidera) la termina.
    ana.emit("trivia-control", { roomId, action: "stop" }); // Ana lidera (entró primero)
    await expect.poll(() => last("beto")?.phase).toBe("end");
  } finally {
    ana.close();
    beto.close();
  }
});
