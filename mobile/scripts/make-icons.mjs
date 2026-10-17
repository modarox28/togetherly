// Genera los íconos de la app a partir del logo de Togetherly (la tele con dos cabecitas,
// usa sharp de la raíz del repo: correr antes "npm install" en la raíz),
// el mismo de la web y de la extensión). Uso: node scripts/make-icons.mjs (desde mobile/)
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
const PLUM = "#2A2140";
const LAMP = "#FFC965";

// Logo (viewBox 0 0 40 40) — igual que src/components/ui/Logo.tsx
const mark = (color, screen) => `
  <path d="M15 4l5 6 5-6" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="3" y="10" width="34" height="26" rx="9" fill="${color}"/>
  <rect x="7.5" y="14.5" width="25" height="17" rx="5" fill="${screen}"/>
  <circle cx="16.5" cy="22.5" r="3.4" fill="${color}"/>
  <circle cx="23.5" cy="22.5" r="3.4" fill="${color}" opacity="0.55"/>
  <path d="M10.5 31.5c1.4-3.6 3.6-5 6-5s4.6 1.4 6 5" fill="${color}"/>
  <path d="M17.5 31.5c1.4-3.6 3.6-5 6-5s4.6 1.4 6 5" fill="${color}" opacity="0.55"/>`;

/** SVG cuadrado de `size` px con el logo ocupando `scale` del ancho (centrado). */
function svg({ size, scale, background, color = LAMP, screen = PLUM, cutout = false }) {
  const box = size * scale;
  const offset = (size - box) / 2;
  const s = box / 40;
  // cutout: la pantalla de la tele queda transparente (para el ícono monocromo de Android)
  const inner = cutout
    ? `<mask id="m"><rect width="40" height="40" fill="white"/><rect x="7.5" y="14.5" width="25" height="17" rx="5" fill="black"/></mask>
       <g mask="url(#m)">${mark(color, color)}</g>
       <g>${mark(color, "none").split("\n").filter((l) => l.includes("circle") || l.includes("c1.4")).join("")}</g>`
    : mark(color, screen);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    ${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ""}
    <g transform="translate(${offset} ${offset}) scale(${s})">${inner}</g></svg>`);
}

const write = (name, buffer) => sharp(buffer).png().toFile(join(ASSETS, name)).then(() => console.log("✓", name));

await write("icon.png", svg({ size: 1024, scale: 0.62, background: PLUM })); // iOS: sin transparencia
await write("android-icon-foreground.png", svg({ size: 1024, scale: 0.5 })); // dentro de la zona segura
await write("android-icon-background.png", svg({ size: 1024, scale: 0, background: PLUM }));
await write("android-icon-monochrome.png", svg({ size: 1024, scale: 0.5, color: "#FFFFFF", cutout: true }));
await write("splash-icon.png", svg({ size: 1024, scale: 0.5 }));
await write("favicon.png", svg({ size: 48, scale: 0.8, background: PLUM }));
