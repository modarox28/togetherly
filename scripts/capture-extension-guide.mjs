// Toma las capturas de la guía de instalación (/extension) desde un Chrome real en español
// y arma el video corto del paso a paso.
//
// Uso (solo si Chrome cambia su diseño y hay que actualizar las imágenes):
//   npx playwright install chromium
//   node scripts/capture-extension-guide.mjs
// Necesita ffmpeg instalado para el video. Resultado en public/extension-guide/.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const EXTENSION_DIR = join(ROOT, "togetherly-extension");
const OUT = join(ROOT, "public", "extension-guide");
const WORK = mkdtempSync(join(tmpdir(), "tg-guide-"));
const VIEWPORT = { width: 1280, height: 720 };
const HIGHLIGHT = "outline: 4px solid #7A3B69 !important; outline-offset: 4px !important; border-radius: 999px; box-shadow: 0 0 0 12px rgba(122,59,105,.18) !important;";

mkdirSync(OUT, { recursive: true });

async function openChrome({ withExtension }) {
  const args = ["--lang=es-419"];
  if (withExtension) args.push(`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`);
  const context = await chromium.launchPersistentContext(mkdtempSync(join(WORK, "perfil-")), {
    channel: "chromium",
    headless: true,
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    args,
    env: { ...process.env, LANGUAGE: "es_419:es", LANG: "es_ES.UTF-8" },
  });
  const page = await context.newPage();
  await page.goto("chrome://extensions/");
  await page.waitForTimeout(1200);
  // Oculta el aviso "Tu organización administra el navegador": aparece solo en este
  // entorno de pruebas, no en el Chrome de las personas.
  await page.evaluate(() => {
    const walk = (root) => {
      for (const el of root.querySelectorAll("*")) {
        if (el.tagName === "MANAGED-FOOTNOTE") el.style.display = "none";
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    };
    walk(document);
  });
  return { context, page };
}

// Ejecuta una función dentro de los shadow DOM de la página de extensiones.
const toolbar = (page, fn) =>
  page.evaluate(`(${fn})(document.querySelector("extensions-manager").shadowRoot.querySelector("extensions-toolbar").shadowRoot)`);

async function shoot(page, name, clip) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `${name}.png`), clip });
}

// 1) Modo de desarrollador apagado: señalar el interruptor.
{
  const { context, page } = await openChrome({ withExtension: false });
  await toolbar(page, `(root) => { root.querySelector("#devMode").style.cssText += ${JSON.stringify(HIGHLIGHT)}; }`);
  await shoot(page, "1-modo-desarrollador", { x: 840, y: 2, width: 440, height: 54 });

  // 2) Modo encendido: señalar "Cargar extensión sin empaquetar".
  await toolbar(page, `(root) => { root.querySelector("#devMode").style.outline = "none"; root.querySelector("#devMode").style.boxShadow = "none"; root.querySelector("#devMode").click(); }`);
  await page.waitForTimeout(600);
  await toolbar(page, `(root) => { root.querySelector("#loadUnpacked").style.cssText += ${JSON.stringify(HIGHLIGHT)}; }`);
  await shoot(page, "2-cargar-sin-empaquetar", { x: 0, y: 0, width: 580, height: 120 });
  await context.close();
}

// 3) Extensión instalada: señalar la tarjeta de Togetherly Sync.
{
  const { context, page } = await openChrome({ withExtension: true });
  await toolbar(page, `(root) => { const t = root.querySelector("#devMode"); if (!t.checked) t.click(); }`);
  await page.waitForTimeout(600);
  await page.evaluate(`(() => {
    const list = document.querySelector("extensions-manager").shadowRoot.querySelector("extensions-item-list").shadowRoot;
    const card = list.querySelector("extensions-item").shadowRoot.querySelector("#card");
    card.style.cssText += ${JSON.stringify(HIGHLIGHT.replace("border-radius: 999px;", "border-radius: 12px;"))};
  })()`);
  await shoot(page, "3-instalada", { x: 300, y: 150, width: 500, height: 320 });

  // 4) Popup conectado a una sala.
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).host;
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 300, height: 520 });
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.evaluate(() => {
    // El popup consulta su estado cada segundo y medio: se detiene para la foto.
    for (let i = 1; i < 1000; i++) clearInterval(i);
    document.getElementById("view-connect").hidden = true;
    document.getElementById("view-connected").hidden = false;
    document.getElementById("room-code").textContent = "K7M2QX";
    document.getElementById("status-dot").className = "status-dot ok";
    document.getElementById("status-text").textContent = "Sincronizando";
  });
  await popup.screenshot({ path: join(OUT, "4-conectada.png") });
  await context.close();
}

// Convierte las capturas a WebP (pesan mucho menos) para la página.
const steps = ["1-modo-desarrollador", "2-cargar-sin-empaquetar", "3-instalada", "4-conectada"];
for (const step of steps) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", join(OUT, `${step}.png`), "-q:v", "82", join(OUT, `${step}.webp`)]);
}

// Video: diapositivas con el texto de cada paso + la captura, renderizadas con la
// identidad de Togetherly y unidas con fundidos.
const SLIDES = [
  { title: "Instala Togetherly Sync en un minuto", text: "Para ver Netflix, Prime Video, HBO Max y más en sincronía." },
  { title: "1. Descarga y descomprime", text: "Descarga togetherly-sync.zip desde togetherly-weld.vercel.app/extension y descomprímelo. Queda una carpeta llamada togetherly-sync." },
  { title: "2. Activa el modo de desarrollador", text: "Abre chrome://extensions y enciende «Modo de desarrollador», arriba a la derecha.", image: steps[0] },
  { title: "3. Carga la carpeta", text: "Pulsa «Cargar extensión sin empaquetar» y elige la carpeta togetherly-sync.", image: steps[1] },
  { title: "4. ¡Lista!", text: "Togetherly Sync aparece en tu lista de extensiones. Fíjala en la barra con el ícono de la pieza de rompecabezas.", image: steps[2] },
  { title: "5. Entra a tu sala", text: "Abre tu sala en Togetherly y luego tu película: la extensión se conecta sola.", image: steps[3] },
];
const FONTS = join(ROOT, "src", "app", "fonts");
const browser = await chromium.launch();
const slidePage = await browser.newPage({ viewport: VIEWPORT });
for (const [index, slide] of SLIDES.entries()) {
  const image = slide.image ? `<img src="file://${join(OUT, `${slide.image}.png`)}">` : "";
  const slideFile = join(WORK, `slide-${index}.html`);
  writeFileSync(slideFile, `<!doctype html><html><head><style>
    @font-face { font-family: Bricolage; src: url("file://${FONTS}/BricolageGrotesque.woff2"); font-weight: 200 800; }
    @font-face { font-family: Nunito; src: url("file://${FONTS}/Nunito.woff2"); font-weight: 200 1000; }
    html, body { margin: 0; width: 1280px; height: 720px; background: #1E1730; color: #F6EFF7; font-family: Nunito; }
    body { display: grid; grid-template-columns: ${image ? "1fr 1.25fr" : "1fr"}; align-items: center; gap: 56px; padding: 0 80px; box-sizing: border-box; }
    h1 { font: 800 ${image ? 54 : 72}px/1 Bricolage; letter-spacing: -0.03em; margin: 0 0 20px; color: #FFC965; }
    p { font-size: ${image ? 26 : 30}px; line-height: 1.4; margin: 0; max-width: 22ch; }
    img { width: 100%; max-height: 560px; object-fit: contain; border-radius: 18px; box-shadow: 0 30px 60px -20px rgba(0,0,0,.6); }
  </style></head><body><div><h1>${slide.title}</h1><p>${slide.text}</p></div>${image}</body></html>`);
  // Se abre como archivo (no como página en blanco) para que carguen fuentes e imágenes locales.
  await slidePage.goto(`file://${slideFile}`);
  await slidePage.evaluate(() => document.fonts.ready);
  await slidePage.waitForTimeout(200);
  await slidePage.screenshot({ path: join(WORK, `slide-${index}.png`) });
}
await browser.close();

const SLIDE_SECONDS = 4.2;
const FADE = 0.6;
const inputs = SLIDES.flatMap((_, i) => ["-loop", "1", "-t", String(SLIDE_SECONDS), "-i", join(WORK, `slide-${i}.png`)]);
const prepare = SLIDES.map((_, i) => `[${i}:v]format=yuv420p,setsar=1[v${i}]`).join(";");
let previous = "[v0]";
const fades = SLIDES.slice(1).map((_, i) => {
  const output = i === SLIDES.length - 2 ? "[out]" : `[x${i}]`;
  const part = `${previous}[v${i + 1}]xfade=transition=fade:duration=${FADE}:offset=${((i + 1) * (SLIDE_SECONDS - FADE)).toFixed(2)}${output}`;
  previous = `[x${i}]`;
  return part;
});
execFileSync("ffmpeg", [
  "-y", "-loglevel", "error", ...inputs,
  "-filter_complex", `${prepare};${fades.join(";")}`,
  "-map", "[out]", "-c:v", "libx264", "-crf", "26", "-preset", "slow", "-movflags", "+faststart", "-r", "30",
  join(OUT, "instalar-extension.mp4"),
]);
// Póster del video: la primera diapositiva.
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", join(WORK, "slide-0.png"), "-q:v", "80", join(OUT, "video-poster.webp")]);

for (const step of steps) rmSync(join(OUT, `${step}.png`));
rmSync(WORK, { recursive: true, force: true });
console.log("Guía lista en public/extension-guide/");
