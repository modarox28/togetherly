# Togetherly Sync

Extensión de Chrome que sincroniza el play, la pausa y los saltos de **Netflix, Prime Video, HBO Max, Disney+, Apple TV+, Paramount+ y Crunchyroll** entre las personas de una sala de Togetherly.

Cada persona ve la película con **su propia cuenta**: la extensión no comparte ni transmite video, solo avisa "play en el minuto 42:10" a los demás.

## Instalarla (2 minutos)

Todavía no está en la Chrome Web Store, así que se instala en modo desarrollador:

1. Descarga el repositorio: botón verde **Code → Download ZIP** en [github.com/modarox28/togetherly](https://github.com/modarox28/togetherly) y descomprímelo.
2. En Chrome abre `chrome://extensions`.
3. Activa **Modo de desarrollador** (arriba a la derecha).
4. Pulsa **Cargar extensión sin empaquetar** y elige la carpeta `togetherly-extension`.
5. Fija el ícono de la tele en la barra de Chrome.

Funciona también en Edge, Brave y Opera (todos basados en Chromium).

## Usarla

1. Entra a tu sala en Togetherly: la extensión se conecta sola. También puedes escribir el código en el popup.
2. Abre la película en tu app de streaming. Cuando aparezca el aviso "Sincronizado con la sala…", listo.
3. Si uno da play, pausa o adelanta, a los demás les pasa lo mismo. Quien entra tarde se pone al día solo.

## Cómo está hecha

| Archivo | Qué hace |
|---|---|
| `manifest.json` | Manifest V3. Solo pide `storage`; se inyecta únicamente en las plataformas de la lista. |
| `background.js` | Conexión con el servidor de Togetherly (Socket.io sobre WebSocket) y reparto de órdenes. |
| `platforms.js` | Un adaptador por plataforma: cómo encontrar el video correcto (shadow DOM, avances de fondo) y cómo controlarlo. |
| `content.js` | Motor de sincronización: anti-rebote por evento esperado, cola de órdenes, ponerse al día y aviso flotante. |
| `netflix-main.js` | Corre dentro de la página de Netflix para usar su reproductor interno; cambiar `currentTime` directo provoca el error M7375. |
| `bridge.js` | Puente con la web de Togetherly. Solo acepta 3 tipos de mensaje y del mismo origen. |
| `popup.html/js` | Conectarse a mano con un código. |

Pruebas de punta a punta (dos navegadores con la extensión y páginas que imitan Netflix, Prime y Disney+): `npm run test:extension` desde la raíz del repo.
