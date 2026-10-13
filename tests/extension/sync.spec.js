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
    return { time: v.currentTime, paused: v.paused, m7375: window.__m7375 ?? false };
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
