// Empaqueta la carpeta togetherly-extension/ en dos descargas para la página /extension:
//   public/downloads/togetherly-sync-chromium.zip → Chrome, Edge, Brave, Opera, Vivaldi
//   public/downloads/togetherly-sync-firefox.zip  → Firefox (128 o más nuevo)
// El código es el mismo; solo cambia el manifest (ver firefoxManifest abajo).
// Se ejecuta solo antes de `npm run dev` y `npm run build` (ver package.json), así las
// descargas siempre coinciden con el código. No usa dependencias externas.
//
// Con --stores (`npm run package:stores`) genera además los paquetes para subir a las
// tiendas (Firefox Add-ons y Edge Add-ons) en store-listing/paquetes/: las tiendas piden
// los archivos en la raíz del .zip, sin la carpeta togetherly-sync/.
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { deflateRawSync } from "node:zlib";

const ROOT = new URL("..", import.meta.url).pathname;
const SOURCE = join(ROOT, "togetherly-extension");
const OUTPUT_DIR = join(ROOT, "public", "downloads");
const FOLDER_IN_ZIP = "togetherly-sync"; // al descomprimir queda una carpeta con este nombre
const EXCLUDE = new Set(["README.md", ".DS_Store"]);

// Firefox usa un "event page" en vez de service worker, necesita un id propio y
// declarar que la extensión no recolecta datos (requisito de addons.mozilla.org).
function firefoxManifest(manifest) {
  const { minimum_chrome_version: _chromeOnly, ...rest } = manifest;
  return {
    ...rest,
    background: { scripts: [manifest.background.service_worker] },
    browser_specific_settings: {
      gecko: {
        id: "togetherly-sync@togetherly.app",
        strict_min_version: "128.0", // primera versión con content scripts en el "mundo principal"
        data_collection_permissions: { required: ["none"] },
      },
    },
  };
}

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (EXCLUDE.has(name)) return [];
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

// CRC-32 (lo exige el formato ZIP para verificar cada archivo)
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// Fecha fija: el mismo código produce exactamente el mismo .zip.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

/** @param {{ path: string, data: Buffer }[]} entries */
function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const { path, data } of entries) {
    const name = Buffer.from(path);
    const compressed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // firma de archivo local
    local.writeUInt16LE(20, 4); // versión necesaria
    local.writeUInt16LE(0x0800, 6); // nombres en UTF-8
    local.writeUInt16LE(8, 8); // compresión deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // firma del directorio central
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + compressed.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // fin del directorio central
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

const files = listFiles(SOURCE)
  .sort()
  .map((file) => ({ relativePath: relative(SOURCE, file).split(sep).join("/"), data: readFileSync(file) }));
const chromiumManifest = JSON.parse(files.find((f) => f.relativePath === "manifest.json").data);

const builds = {
  "togetherly-sync-chromium.zip": chromiumManifest,
  "togetherly-sync-firefox.zip": firefoxManifest(chromiumManifest),
};

function writeBuilds(outputDir, folderInZip, suffix = "") {
  mkdirSync(outputDir, { recursive: true });
  for (const [zipName, manifest] of Object.entries(builds)) {
    const entries = files.map(({ relativePath, data }) => ({
      path: folderInZip ? `${folderInZip}/${relativePath}` : relativePath,
      data: relativePath === "manifest.json" ? Buffer.from(JSON.stringify(manifest, null, 2) + "\n") : data,
    }));
    const finalName = zipName.replace(".zip", `${suffix}.zip`);
    writeFileSync(join(outputDir, finalName), createZip(entries));
    console.log(`Extensión empaquetada: ${relative(ROOT, join(outputDir, finalName))} (${entries.length} archivos)`);
  }
}

writeBuilds(OUTPUT_DIR, FOLDER_IN_ZIP);
if (process.argv.includes("--stores")) writeBuilds(join(ROOT, "store-listing", "paquetes"), "", "-tienda");
