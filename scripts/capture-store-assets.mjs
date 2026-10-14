// Genera las imágenes para publicar la extensión en las tiendas (Firefox Add-ons y Edge Add-ons):
//   store-listing/capturas/*.png  (1280×800, lo que piden ambas tiendas)
//   store-listing/logo-300.png    (logo cuadrado para Edge)
//
// Uso (Windows/CMD o Linux), con la web y el servidor de salas corriendo en otra terminal:
//   npm run server        (terminal 1)
//   npm run dev           (terminal 2)
//   node scripts/capture-store-assets.mjs
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const EXTENSION = join(ROOT, "togetherly-extension");
const OUT = join(ROOT, "store-listing");
const SHOTS = join(OUT, "capturas");
const WEB = process.env.TOGETHERLY_URL || "http://localhost:3000";
mkdirSync(SHOTS, { recursive: true });

const font = (file) => readFileSync(join(ROOT, "src", "app", "fonts", file)).toString("base64");
const FONTS = `
  @font-face { font-family: Bricolage; src: url(data:font/woff2;base64,${font("BricolageGrotesque.woff2")}) format("woff2"); font-weight: 200 800; }
  @font-face { font-family: Nunito; src: url(data:font/woff2;base64,${font("Nunito.woff2")}) format("woff2"); font-weight: 200 1000; }`;

const browser = await chromium.launch();

// 1) Popup de la extensión en sus dos estados (se abre como página normal con un chrome.* simulado).
async function popupShot(state) {
  const page = await browser.newPage({ viewport: { width: 300, height: 520 }, deviceScaleFactor: 2 });
  await page.addInitScript((connected) => {
    window.chrome = {
      runtime: {
        lastError: null,
        sendMessage: (message, reply) =>
          reply?.(message.type === "PING" ? { connected, roomId: connected ? "K7M2QX" : null, username: "Ana" } : { ok: true }),
      },
      storage: { local: { get: (_keys, done) => done({ savedName: "Ana" }), set() {} } },
    };
  }, state === "connected");
  await page.goto(`file://${join(EXTENSION, "popup.html")}`);
  await page.waitForTimeout(300);
  const file = join(tmpdir(), `popup-${state}.png`);
  await page.screenshot({ path: file });
  await page.close();
  return readFileSync(file).toString("base64");
}

// 2) La sala en la web con dos personas y algunos mensajes.
async function roomShot() {
  const openRoomAs = async (name, character) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
    await context.addInitScript(([n, c]) => {
      sessionStorage.setItem("togetherly-username", n);
      sessionStorage.setItem("togetherly-character", c);
    }, [name, character]);
    const page = await context.newPage();
    await page.goto(`${WEB}/room/K7M2QX`, { waitUntil: "networkidle" });
    return page;
  };
  const ana = await openRoomAs("Ana", "michi");
  const beto = await openRoomAs("Beto", "tinto");
  await ana.waitForTimeout(1500);
  for (const [page, text] of [[ana, "¿Arrancamos la peli?"], [beto, "Dale, ya tengo las palomitas 🍿"], [ana, "Le doy play en 3, 2, 1…"]]) {
    await page.fill("#chat-input", text);
    await page.press("#chat-input", "Enter");
    await page.waitForTimeout(500);
  }
  await ana.waitForTimeout(3500); // que se apague "está escribiendo"
  await ana.addStyleTag({ content: "nextjs-portal { display: none !important; }" }); // botón de desarrollo de Next
  await ana.locator("#chat-input").blur();
  const file = join(SHOTS, "3-sala-con-chat.png");
  await ana.screenshot({ path: file });
  await ana.context().close();
  await beto.context().close();
}

// Composición 1280×800: texto a la izquierda, popup a la derecha.
async function compose(fileName, title, text, popupBase64) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.setContent(`<!doctype html><html><head><style>${FONTS}
    body { margin: 0; width: 1280px; height: 800px; display: flex; align-items: center; gap: 80px; padding: 0 110px;
      box-sizing: border-box; background: radial-gradient(70% 70% at 80% 30%, #3A2E55 0%, #1E1730 70%); color: #F6EFF7; font-family: Nunito; }
    .copy { flex: 1; }
    h1 { font: 800 64px/1.02 Bricolage; letter-spacing: -1.5px; margin: 0 0 24px; }
    p { font-size: 26px; line-height: 1.45; color: #C9BCD6; margin: 0; max-width: 520px; }
    img { width: 340px; border-radius: 22px; box-shadow: 0 40px 80px -30px rgba(0,0,0,.7), 0 0 0 1px rgba(255,201,101,.25); }
  </style></head><body><div class="copy"><h1>${title}</h1><p>${text}</p></div>
  <img src="data:image/png;base64,${popupBase64}" alt=""></body></html>`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(SHOTS, fileName) });
  await page.close();
}

async function logo() {
  const page = await browser.newPage({ viewport: { width: 300, height: 300 } });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#2A2140;display:flex;align-items:center;justify-content:center;height:300px">
    <svg viewBox="0 0 40 40" width="220" height="220" style="color:#FFC965">
      <path d="M15 4l5 6 5-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="3" y="10" width="34" height="26" rx="9" fill="currentColor"/>
      <rect x="7.5" y="14.5" width="25" height="17" rx="5" fill="#2A2140"/>
      <circle cx="16.5" cy="22.5" r="3.4" fill="currentColor"/><circle cx="23.5" cy="22.5" r="3.4" fill="currentColor" opacity=".55"/>
      <path d="M10.5 31.5c1.4-3.6 3.6-5 6-5s4.6 1.4 6 5" fill="currentColor"/><path d="M17.5 31.5c1.4-3.6 3.6-5 6-5s4.6 1.4 6 5" fill="currentColor" opacity=".55"/>
    </svg></body></html>`);
  await page.screenshot({ path: join(OUT, "logo-300.png") });
  await page.close();
}

await compose("1-crear-sala.png", "Crea la sala desde la extensión", "Escribe tu nombre, toca «Crear sala nueva» y listo. Sin cuentas ni registros.", await popupShot("idle"));
await compose("2-compartir-codigo.png", "Manda el código y vean juntos", "Quien lo recibe lo pega en su extensión. El play, la pausa y los saltos se sincronizan en Netflix, Prime Video, HBO Max, Disney+ y más.", await popupShot("connected"));
try {
  await roomShot();
} catch (error) {
  console.warn("No se pudo capturar la sala (¿están corriendo `npm run dev` y `npm run server`?):", error.message);
}
await logo();
await browser.close();
writeFileSync(join(SHOTS, ".gitkeep"), "");
console.log("Imágenes listas en store-listing/");
