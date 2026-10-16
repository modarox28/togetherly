# Publicar Togetherly Sync en las tiendas (gratis)

Las dos tiendas de este documento **no cobran**. La de Chrome (Chrome Web Store) cobra USD 5 una sola vez: queda pendiente hasta que decidas pagarlo.

| Tienda | Costo | Cuenta |
|---|---|---|
| Firefox Add-ons (addons.mozilla.org) | Gratis | Cuenta de Firefox (correo) |
| Microsoft Edge Add-ons | Gratis | Cuenta Microsoft o tu GitHub |
| Chrome Web Store | USD 5 una vez | Cuenta de Google (pendiente) |

## 1. Preparar los archivos

```
npm run package:stores
```

Crea en `store-listing/paquetes/`:

- `togetherly-sync-firefox-tienda.zip` → para Firefox
- `togetherly-sync-chromium-tienda.zip` → para Edge (y Chrome si algún día se publica ahí)

Las imágenes ya están en `store-listing/capturas/` (1280×800) y el logo en `store-listing/logo-300.png`. Para volver a generarlas: `node scripts/capture-store-assets.mjs` (con `npm run dev` y `npm run server` abiertos).

Antes de cada versión nueva, sube el número `version` en `togetherly-extension/manifest.json`.

## 2. Firefox Add-ons

1. Entra a https://addons.mozilla.org/developers/ e inicia sesión (o crea la cuenta).
2. **Submit a New Add-on** → **On this site** (se lista en la tienda).
3. Sube `togetherly-sync-firefox-tienda.zip`. Firefox revisa el paquete solo; no debe mostrar errores.
4. Cuando pregunte por el código fuente: **No** (el código no está minificado ni compilado).
5. Llena la ficha con los textos de abajo, sube las 3 capturas, elige la categoría **Social & Communication** y pon la página de privacidad: `https://togetherly-weld.vercel.app/privacidad`.
6. Envía. La revisión suele tardar de unas horas a unos días.

## 3. Microsoft Edge Add-ons

1. Entra a https://partner.microsoft.com/dashboard/microsoftedge/public/login con tu GitHub o una cuenta Microsoft personal.
2. Completa el registro: país **Colombia**, tipo **Individual**, nombre público **Togetherly**. Acepta el acuerdo.
3. **Create new extension** → sube `togetherly-sync-chromium-tienda.zip`.
4. **Availability**: público, todos los mercados.
5. **Properties**: categoría **Social**, privacidad `https://togetherly-weld.vercel.app/privacidad`, sitio `https://togetherly-weld.vercel.app`.
6. **Store listings** → Español y English: textos de abajo, logo `logo-300.png`, capturas.
7. **Submission options** → en "Notes for certification" pega la nota para revisores de abajo.
8. **Publish**. La revisión puede tardar hasta 7 días hábiles.

## Textos de la ficha

### Nombre
Togetherly Sync

### Resumen corto (máx. 132 caracteres)
- **ES:** Ve Netflix, Prime Video, HBO Max y Disney+ al mismo tiempo con quien quieras: el play, la pausa y los saltos se sincronizan.
- **EN:** Watch Netflix, Prime Video, HBO Max and Disney+ in sync with anyone: play, pause and skips happen for everyone at once.

### Descripción (ES)
Togetherly Sync es para ver una película juntos aunque estén lejos.

Cómo se usa:
1. Abre la película, toca el ícono, escribe tu nombre y pulsa «Crear sala nueva».
2. Copia el enlace y mándaselo a quien va a ver contigo. Al abrirlo llega directo a la misma película (si no tiene la extensión, el enlace le explica cómo instalarla).
3. Cada quien ve con su propia cuenta. Si uno pausa, pausan todos; si uno adelanta, adelantan todos.

Funciona con Netflix, Prime Video, HBO Max, Disney+, Apple TV+, Paramount+ y Crunchyroll. Si quieren chat, reacciones y videollamada, abran la sala en togetherly-weld.vercel.app y la extensión se conecta sola.

Privacidad: la extensión solo envía el código de la sala, tu nombre visible, los eventos de play, pausa y salto, y la dirección de la película que tienes abierta (solo a la gente de tu sala, para que el enlace los lleve ahí). No lee contraseñas, cuentas, cookies ni tu historial. Es gratis y no tiene anuncios.

### Description (EN)
Togetherly Sync lets you watch a movie together even when you're far apart.

How it works:
1. Open the movie, click the icon, type your name and press "Create new room".
2. Copy the link and send it to whoever is watching with you. Opening it takes them straight to the same title (or explains how to install the extension).
3. Everyone watches on their own account. If one pauses, everyone pauses; if one skips, everyone skips.

Works with Netflix, Prime Video, HBO Max, Disney+, Apple TV+, Paramount+ and Crunchyroll. For chat, reactions and video calls, open the room at togetherly-weld.vercel.app and the extension connects by itself.

Privacy: the extension only sends the room code, your display name, play/pause/seek events and the address of the title you have open (only to people in your room, so the invite link opens it). It never reads passwords, accounts, cookies or your history. Free, no ads.

### Nota para revisores (Edge y Firefox)
The extension syncs playback between people in the same "room". To test: install it in two browser profiles, click the icon in the first one and press "Crear sala nueva" (create room), then paste the 6-letter code in the second profile and press "Unirme" (join). Open any video on one of the supported sites (a free YouTube video won't work; use a streaming account) and press play/pause: the other profile follows. Permissions: "storage" (remember the display name and active room) and "activeTab" (when the user clicks the icon on a movie page, read that tab's address so the invite link opens the same title). A chat panel is shown next to the video only while in a room. Content scripts run only on the listed streaming domains and on togetherly-weld.vercel.app. Network traffic goes only to the room server (togetherly-salas.onrender.com, WebSocket) and to togetherly-weld.vercel.app/api/config (to find that server). No remote code is loaded.

### Justificación de permisos
- **storage:** recordar el nombre que usaste y la sala activa.
- **activeTab:** al tocar el ícono sobre una película, leer la dirección de esa pestaña para que el enlace de invitación lleve a la misma película.
- **Acceso a los sitios de streaming:** detectar el reproductor de video para sincronizar play, pausa y saltos.
- **Acceso a togetherly-weld.vercel.app:** que la web de la sala conecte la extensión sola.
