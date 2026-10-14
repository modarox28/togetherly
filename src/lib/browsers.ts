// Navegadores para la guía de instalación de la extensión (/extension).
// Etiquetas de Edge revisadas con la guía oficial de Microsoft en español (oct. 2026).
// Para agregar uno: añade un objeto a BROWSERS y, si no es Chromium, su descarga en
// scripts/build-extension-zip.mjs.

export type BrowserId = "chrome" | "edge" | "brave" | "opera" | "firefox";

type Labels = {
  /** Interruptor que hay que activar (no existe en Firefox) */
  devMode?: string;
  /** Botón para cargar la extensión desde la carpeta */
  load: string;
  /** Dónde está el interruptor dentro de la página */
  devModeWhere?: string;
};

export type BrowserGuide = {
  id: BrowserId;
  name: string;
  /** Dirección que se pega en la barra del navegador */
  extensionsUrl: string;
  download: "/downloads/togetherly-sync-chromium.zip" | "/downloads/togetherly-sync-firefox.zip";
  labels: { es: Labels; en: Labels };
  /** Las capturas de la guía son de Chrome: sirven tal cual para Chrome y Brave */
  screenshotsMatch: boolean;
};

const CHROMIUM_ZIP = "/downloads/togetherly-sync-chromium.zip";

export const BROWSERS: BrowserGuide[] = [
  {
    id: "chrome",
    name: "Chrome",
    extensionsUrl: "chrome://extensions",
    download: CHROMIUM_ZIP,
    labels: {
      es: { devMode: "Modo de desarrollador", devModeWhere: "arriba a la derecha", load: "Cargar extensión sin empaquetar" },
      en: { devMode: "Developer mode", devModeWhere: "top right", load: "Load unpacked" },
    },
    screenshotsMatch: true,
  },
  {
    id: "edge",
    name: "Edge",
    extensionsUrl: "edge://extensions",
    download: CHROMIUM_ZIP,
    labels: {
      es: { devMode: "Modo de desarrollador", devModeWhere: "en el menú de la izquierda", load: "Cargar desempaquetado" },
      en: { devMode: "Developer mode", devModeWhere: "in the left menu", load: "Load unpacked" },
    },
    screenshotsMatch: false,
  },
  {
    id: "brave",
    name: "Brave",
    extensionsUrl: "brave://extensions",
    download: CHROMIUM_ZIP,
    labels: {
      es: { devMode: "Modo de desarrollador", devModeWhere: "arriba a la derecha", load: "Cargar extensión sin empaquetar" },
      en: { devMode: "Developer mode", devModeWhere: "top right", load: "Load unpacked" },
    },
    screenshotsMatch: true,
  },
  {
    id: "opera",
    name: "Opera",
    extensionsUrl: "opera://extensions",
    download: CHROMIUM_ZIP,
    labels: {
      es: { devMode: "Modo de desarrollador", devModeWhere: "arriba a la derecha", load: "Cargar desempaquetada» o «Load unpacked" },
      en: { devMode: "Developer mode", devModeWhere: "top right", load: "Load unpacked" },
    },
    screenshotsMatch: false,
  },
  {
    id: "firefox",
    name: "Firefox",
    extensionsUrl: "about:debugging#/runtime/this-firefox",
    download: "/downloads/togetherly-sync-firefox.zip",
    labels: {
      es: { load: "Cargar complemento temporal…" },
      en: { load: "Load Temporary Add-on…" },
    },
    screenshotsMatch: false,
  },
];

/** Adivina el navegador por el user agent (solo para elegir la pestaña inicial). */
export function detectBrowser(userAgent: string, isBrave = false): BrowserId {
  if (/Firefox\//.test(userAgent)) return "firefox";
  if (/Edg\//.test(userAgent)) return "edge";
  if (/OPR\//.test(userAgent)) return "opera";
  if (isBrave) return "brave";
  return "chrome";
}
