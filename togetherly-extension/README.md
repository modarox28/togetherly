# Togetherly Sync

Extensión que sincroniza el play, la pausa y los saltos de **Netflix, Prime Video, HBO Max, Disney+, Apple TV+, Paramount+ y Crunchyroll** entre las personas de una sala de Togetherly.

Cada persona ve la película con **su propia cuenta**: la extensión no comparte ni transmite video, solo avisa "play en el minuto 42:10" a los demás.

## Instalarla

La guía para usuarios, con capturas y video, está en **[togetherly-weld.vercel.app/extension](https://togetherly-weld.vercel.app/extension)**. Desde ahí se descarga el .zip correcto para cada navegador.

| Navegador | Descarga | Dónde se carga |
|---|---|---|
| Chrome, Edge, Brave, Opera, Vivaldi | `togetherly-sync-chromium.zip` | `chrome://extensions` (o `edge://`, `brave://`, `opera://`) → Modo de desarrollador → Cargar extensión sin empaquetar |
| Firefox 128 o más nuevo | `togetherly-sync-firefox.zip` | `about:debugging#/runtime/this-firefox` → Cargar complemento temporal → `manifest.json` |
| Safari | No disponible | Requiere cuenta de Apple Developer (USD 99/año) |

Los .zip se generan desde esta carpeta con `node scripts/build-extension-zip.mjs` (se ejecuta solo antes de `npm run dev` y `npm run build`). La versión de Firefox cambia únicamente el manifest: proceso de fondo como *event page*, id propio y declaración de que no recolecta datos.

## Publicar en tiendas (pendiente, lo hace el dueño de la cuenta)

| Tienda | Costo | Qué subir |
|---|---|---|
| Firefox Add-ons (addons.mozilla.org) | Gratis | `togetherly-sync-firefox.zip` |
| Microsoft Edge Add-ons | Gratis | `togetherly-sync-chromium.zip` |
| Opera Add-ons | Gratis | `togetherly-sync-chromium.zip` |
| Chrome Web Store | USD 5, pago único | `togetherly-sync-chromium.zip` |

Antes de publicar, valida la versión de Firefox con `npx web-ext lint --source-dir <carpeta descomprimida>` (hoy: 0 errores, 0 advertencias).

## Cómo está hecha

| Archivo | Qué hace |
|---|---|
| `manifest.json` | Manifest V3 para navegadores Chromium. Solo pide `storage`; se inyecta únicamente en las plataformas de la lista. |
| `background.js` | Conexión con el servidor de Togetherly (Socket.io sobre WebSocket) y reparto de órdenes. |
| `platforms.js` | Un adaptador por plataforma: cómo encontrar el video correcto (shadow DOM, avances de fondo) y cómo controlarlo. Instrucciones para agregar otra al inicio del archivo. |
| `content.js` | Motor de sincronización: anti-rebote por evento esperado, cola de órdenes, ponerse al día y aviso flotante. También avisa qué película está abierta (`NOW_WATCHING`) para que el enlace de invitación `/j/CODIGO` lleve a los demás a la misma. |
| `netflix-main.js` | Corre dentro de la página de Netflix para usar su reproductor interno; cambiar `currentTime` directo provoca el error M7375. |
| `bridge.js` | Puente con la web de Togetherly. Solo acepta 3 tipos de mensaje y del mismo origen. |
| `popup.html/js` | Crear una sala nueva o unirse con un código, copiar el enlace de invitación y ver qué está viendo la sala. |
| `icons/` | Ícono en 16, 32, 48 y 128 px. |

Pruebas de punta a punta (dos navegadores con la extensión y páginas que imitan Netflix, Prime y Disney+): `npm run test:extension` desde la raíz del repo.

Capturas y video de la guía: `node scripts/capture-extension-guide.mjs` (solo si Chrome cambia su diseño).
