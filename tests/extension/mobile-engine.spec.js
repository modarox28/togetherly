/* eslint-disable @typescript-eslint/no-require-imports */
// Prueba del motor de sincronización de la app móvil (mobile/lib/sync-engine.js).
// En la app corre dentro del navegador interno; aquí se carga en Chromium sobre las mismas
// páginas falsas de Netflix y Disney+ y se hace de "app": lo que una página avisa se le
// aplica a la otra, igual que haría el servidor de salas.
const { test, expect, chromium } = require("@playwright/test");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { FAKE_PAGES, PLATFORM_URLS } = require("./fake-platforms");
const { ENGINE_JS } = require("../../mobile/lib/sync-engine.js");

const VIDEO_DIR = path.join(os.tmpdir(), "togetherly-tests");

function ensureVideo() {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  const file = path.join(VIDEO_DIR, "movie.webm");
  if (fs.existsSync(file)) return;
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=320x180:rate=10",
    "-t", "600", "-c:v", "libvpx", "-b:v", "40k", "-g", "20", file]);
}

function serveVideo(route) {
  const data = fs.readFileSync(path.join(VIDEO_DIR, "movie.webm"));
  const range = route.request().headers()["range"];
  const headers = { "content-type": "video/webm", "accept-ranges": "bytes" };
  if (!range) return route.fulfill({ status: 200, body: data, headers });
  const [a, b] = range.replace("bytes=", "").split("-");
  const start = Number(a);
  const end = b ? Number(b) : data.length - 1;
  return route.fulfill({ status: 206, body: data.subarray(start, end + 1), headers: { ...headers, "content-range": `bytes ${start}-${end}/${data.length}` } });
}

async function openMoviePage(browser, platform) {
  const context = await browser.newContext({ viewport: { width: 1000, height: 600 } });
  await context.route(`${new URL(PLATFORM_URLS[platform]).origin}/**`, (route) => {
    if (new URL(route.request().url()).pathname.startsWith("/video/")) return serveVideo(route);
    return route.fulfill({ status: 200, contentType: "text/html", body: FAKE_PAGES[platform] });
  });
  // Lo que la app recibiría por ReactNativeWebView.postMessage
  await context.addInitScript(() => {
    window.__posted = [];
    window.ReactNativeWebView = { postMessage: (text) => window.__posted.push(JSON.parse(text)) };
  });
  const page = await context.newPage();
  await page.goto(PLATFORM_URLS[platform]);
  await page.waitForFunction(() => (window.__video ?? document.getElementById("v"))?.readyState >= 1);
  await page.evaluate(ENGINE_JS); // como injectedJavaScript de la app
  await expect.poll(() => page.evaluate(() => window.__posted.some((m) => m.type === "video" && m.found))).toBe(true);
  return page;
}

const state = (page) =>
  page.evaluate(() => {
    const v = window.__video ?? document.getElementById("v");
    return { time: window.__contentTime?.() ?? v.currentTime, paused: v.paused, m7375: window.__m7375 ?? false };
  });

// Hace de servidor: pasa los eventos de una página a la otra.
function relay(from, to) {
  const timer = setInterval(async () => {
    try {
      const messages = await from.evaluate(() => window.__posted.splice(0));
      for (const m of messages) {
        if (["play", "pause", "seek"].includes(m.type)) {
          await to.evaluate((order) => window.__togetherly.apply(order), { action: m.type, currentTime: m.time });
        }
      }
    } catch {}
  }, 150);
  return () => clearInterval(timer);
}

test.beforeAll(ensureVideo);

for (const platform of ["netflix", "disney"]) {
  test(`app móvil · ${platform}: play, pausa y saltos se sincronizan y avisa qué película es`, async () => {
    const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
    try {
      const a = await openMoviePage(browser, platform);
      const b = await openMoviePage(browser, platform);
      const watching = await a.evaluate(() => window.__posted.find((m) => m.type === "watching")?.url);
      expect(watching).toBe(PLATFORM_URLS[platform]);
      const stops = [relay(a, b), relay(b, a)];
      const poll = (fn) => expect.poll(fn, { timeout: 8000 });

      await a.evaluate(() => window.__user.seek(120000));
      await a.waitForTimeout(1200);
      await a.evaluate(() => window.__user.play());
      await poll(async () => (await state(b)).paused).toBe(false);
      await poll(async () => Math.abs((await state(a)).time - (await state(b)).time)).toBeLessThan(2.5);

      await b.evaluate(() => window.__user.pause());
      await poll(async () => (await state(a)).paused).toBe(true);

      await a.evaluate(() => window.__user.seek(300000));
      await poll(async () => (await state(b)).time).toBeGreaterThan(298);
      await a.waitForTimeout(2000);
      expect((await state(a)).time).toBeGreaterThan(298); // sin rebotes

      if (platform === "netflix") expect((await state(b)).m7375).toBe(false);
      stops.forEach((stop) => stop());
    } finally {
      await browser.close();
    }
  });
}

test("app móvil: la página ve un computador (no un celular) y se revisa el DRM", async () => {
  const { disguise } = require("../../mobile/lib/desktop-disguise.js");
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    await context.route("https://www.netflix.com/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>Netflix</title>" }));
    await context.addInitScript(() => {
      window.__posted = [];
      window.ReactNativeWebView = { postMessage: (text) => window.__posted.push(JSON.parse(text)) };
    });
    await context.addInitScript({ content: disguise("android") });
    const page = await context.newPage();
    await page.goto("https://www.netflix.com/browse");
    const seen = await page.evaluate(() => ({
      platform: navigator.platform,
      touch: navigator.maxTouchPoints,
      coarse: matchMedia("(pointer: coarse)").matches,
      fine: matchMedia("(pointer: fine)").matches,
    }));
    expect(seen).toEqual({ platform: "Win32", touch: 0, coarse: false, fine: true });
    await expect.poll(() => page.evaluate(() => window.__posted.find((m) => m.type === "drm")), { timeout: 5000 }).toMatchObject({ type: "drm" });
  } finally {
    await browser.close();
  }
});
