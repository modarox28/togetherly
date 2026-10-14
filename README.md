# Togetherly

Para ver películas y series en sincronía con quien quieras, aunque estén en ciudades distintas. Incluye chat, reacciones y videollamada.

**En vivo:** [togetherly-weld.vercel.app](https://togetherly-weld.vercel.app)

## Qué hace

- **Dentro de la sala:** YouTube, Twitch, Vimeo y Spotify se reproducen sincronizados para todos.
- **Con la extensión** (Chrome, Edge, Brave, Opera y Firefox): Netflix, Prime Video, HBO Max, Disney+, Apple TV+, Paramount+ y Crunchyroll. Cada quien usa su propia cuenta y la extensión sincroniza el play, la pausa y los saltos. Guía para usuarios en [/extension](https://togetherly-weld.vercel.app/extension); detalles técnicos en [togetherly-extension/README.md](togetherly-extension/README.md).
- Chat, reacciones flotantes, videollamada (WebRTC), salas públicas, modo claro/oscuro, español/inglés, PWA instalable.
- **Planes:** gratis para 2 personas por sala; Premium (hasta 8) está en "Próximamente" mientras se elige una pasarela de pagos (ver `docs/monetizacion.md`).
- **Funciona en celular y tableta** (la sala, el chat y la videollamada); la extensión es solo para computador.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · Framer Motion · Auth.js 5 · Prisma 7 + Neon PostgreSQL · Socket.io 4 (servidor aparte en Render, plan gratis) · WebRTC · Stripe · Playwright.

```
Navegador ──HTTP──▶ Next.js (Vercel)      páginas, inicio de sesión, pagos, pases Premium
    │
    └──WebSocket──▶ socket-server.js (Render)    salas, play/pausa, chat, señalización de llamadas
                          ▲
Extensión del navegador ──┘   (Netflix, Prime, etc.; también puede crear la sala sola)
```

## Mapa del proyecto

| Carpeta / archivo | Qué hay |
|---|---|
| `src/app/` | Páginas (rutas de Next.js) y la API (`src/app/api/`). `globals.css` tiene los colores y fuentes. |
| `src/components/landing/` | Página de inicio. `TwoRoomsScene.tsx` es la ilustración animada del hero. |
| `src/components/room/` | La sala: `RoomClientPage` (arma todo), `RoomHeader`, `EmptyScreen` (qué ver), `VideoPlayer`, `ChatPanel`, `CallStrip`/`VideoCallPanel` (videollamada), `JoinRoomCard` y `CharacterPicker`. `players/` tiene un componente por plataforma. |
| `src/components/ui/` | Piezas reutilizables: botón, campo de texto, logo, cambio de tema e idioma. |
| `src/hooks/` | Lógica de la sala en el navegador: `useRoom` (sockets), `useWebRTC` (llamada). |
| `src/lib/translations.ts` | **Todos los textos** de la web en español e inglés. |
| `src/lib/plans.ts` | Planes Gratis y Premium (lo que se muestra en /pricing). |
| `src/lib/room.ts` | Reglas de los códigos de sala. |
| `src/lib/platforms.ts` | Plataformas soportadas y cómo se reconocen sus enlaces. |
| `src/lib/stripe.ts`, `roomPass.ts` | Solo servidor: Stripe y la firma de pases Premium. |
| `socket-server.js` + `server/` | Servidor de salas: `validation.js`, `rooms.js`, `room-pass.js`, `connection.js`. |
| `togetherly-extension/` | Extensión (Chrome, Edge, Brave, Opera, Firefox). |
| `src/app/extension/` + `src/components/extension/` | Página de instalación con descarga, pasos, capturas y video. Navegadores en `src/lib/browsers.ts`. |
| `scripts/` | `build-extension-zip.mjs` arma las descargas de la extensión (y con `--stores`, los paquetes de las tiendas); `capture-extension-guide.mjs` regenera capturas y video de la guía; `capture-store-assets.mjs`, las imágenes de las tiendas. |
| `tests/extension/` | Pruebas de punta a punta (extensión, servidor y planes). |
| `prisma/schema.prisma` | Tablas de la base de datos (usuarios, sesiones, suscripción). |
| `mobile/` | App móvil con Expo (experimental). Habla el mismo protocolo que la web; la dirección del servidor se cambia con `EXPO_PUBLIC_SOCKET_URL`. |
| `store-listing/` | Textos, capturas y pasos para publicar la extensión en Firefox y Edge (gratis). |
| `SECURITY.md` | Revisión de los 20 controles de seguridad. |
| `src/app/privacidad/` | Política de privacidad (la piden las tiendas). |

**Convención:** el código (archivos, funciones, variables) va en inglés, como el resto del ecosistema; los comentarios y los textos que ve la persona, en español.

## Cómo editar

| Quiero… | Dónde |
|---|---|
| Cambiar un texto de la web | `src/lib/translations.ts` (bloques `en` y `es`, misma estructura en los dos). |
| Cambiar los colores | `src/app/globals.css`: `--accent` en `:root` (día) y `.dark` (noche); fondos en `night-*` y `day-*`. En el código se usan como clases: `bg-accent`, `text-on-accent`, `bg-night-900`. |
| Cambiar las fuentes | Archivos en `src/app/fonts/` y `localFont(...)` en `src/app/layout.tsx`. |
| Cambiar precios o beneficios | `src/lib/plans.ts` (textos) y el precio real en el panel de Stripe. El límite de personas lo aplica `server/connection.js`. |
| Agregar una plataforma a la extensión | `togetherly-extension/platforms.js` (un objeto en `PLATFORMS`) y su dominio en `manifest.json`. Pasos en el propio archivo. |
| Cambiar la guía de instalación | Textos en `translations.ts` → `extensionPage`; navegadores en `src/lib/browsers.ts`; capturas y video con `node scripts/capture-extension-guide.mjs`. |
| Agregar una plataforma dentro de la sala | `src/lib/platforms.ts` y un componente en `src/components/room/players/`. |
| Cambiar la animación del hero | `src/components/landing/TwoRoomsScene.tsx` (tiempos en `TIMING`, colores en `COLORS`). |
| Agregar o cambiar avatares | `src/lib/characters.ts` (personajes propios, sin marcas). |
| Encender o apagar los pagos | `NEXT_PUBLIC_PAYMENTS_ENABLED` en Vercel. Antes, leer `docs/monetizacion.md`. |
| Cambiar el popup de la extensión (crear/unirse a sala) | `togetherly-extension/popup.html` y `popup.js`. |
| Cambiar cabeceras de seguridad o permitir un dominio nuevo | `next.config.ts` (`FRAME_SOURCES`, `SCRIPT_SOURCES`). |
| Cambiar reglas del servidor de salas | `server/connection.js` (eventos) y `server/validation.js` (validaciones). |

## Instalar y correr en tu computador (Windows / CMD)

```
git clone https://github.com/modarox28/togetherly.git
cd togetherly
npm install
copy .env.example .env.local
```

Llena `.env.local` (cada variable está explicada en `.env.example`) y luego:

```
npx prisma migrate dev
npm run dev
```

En otra ventana de CMD, el servidor de salas:

```
npm run server
```

Abre http://localhost:3000.

## Pruebas

```
npx playwright install chromium
npm run test:extension
```

Abren dos navegadores reales con la extensión, levantan el servidor de salas y comprueban play, pausa, saltos y entrada tardía en páginas que imitan Netflix, Prime y Disney+, además de los permisos del servidor y los límites de cada plan. Necesitan `ffmpeg` instalado (genera el video de prueba).

GitHub Actions corre TypeScript, lint, `npm audit`, la compilación, estas pruebas y gitleaks (claves filtradas) en cada push (`.github/workflows/ci.yml`). Dependabot propone actualizaciones cada semana.

## Variables de entorno

| Variable | Dónde | Para qué |
|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Vercel | Base de datos Neon |
| `AUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Vercel | Inicio de sesión |
| `NEXT_PUBLIC_SOCKET_URL` | Vercel | Dirección del servidor de salas |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PREMIUM_PRICE_ID` | Vercel | Pagos (opcionales: sin ellas la web se publica igual) |
| `NEXT_PUBLIC_PAYMENTS_ENABLED` | Vercel | `true` muestra el botón de pagar Premium. Apagado = "Próximamente" (ver `docs/monetizacion.md`) |
| `CLOUDFLARE_TURN_KEY_ID`, `CLOUDFLARE_TURN_API_TOKEN` | Vercel | Videollamada en redes difíciles (opcional, ver abajo) |
| `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` | Vercel | Alternativa a Cloudflare con otro proveedor TURN (opcional) |
| `ROOM_PASS_SECRET` | Vercel **y** Render (mismo valor) | Pases Premium; sin ella no hay límite por plan |
| `ALLOWED_ORIGINS` | Render (ya viene en `render.yaml`) | Dominios que pueden conectarse. Render pone el puerto en `PORT` |

Ninguna clave va en el código ni en GitHub: solo en `.env.local` (tu computador) o en los paneles de Vercel y Render.

## Despliegue

El build (`npm run build`) aplica solo las migraciones de base de datos pendientes (`prisma migrate deploy`) si existe `DATABASE_URL`; sin base de datos, se salta ese paso.

Un push a `main` publica la web en Vercel y el servidor de salas en Render. Los cambios grandes van en una rama con PR: Vercel genera una vista previa del PR antes de unirlo.

### Servidor de salas en Render (gratis)

`render.yaml` describe el servicio. Para crearlo desde cero:

1. Entra a [render.com](https://render.com) con tu cuenta de GitHub (plan gratis, sin tarjeta).
2. **New → Blueprint**, elige el repo `togetherly` y confirma. Render pide `ROOM_PASS_SECRET`: pega el mismo valor que tienes en Vercel.
3. Cuando termine, copia la dirección del servicio (algo como `https://togetherly-salas.onrender.com`) y ponla en Vercel como `NEXT_PUBLIC_SOCKET_URL`; luego vuelve a desplegar en Vercel.

La extensión pregunta la dirección del servidor a `/api/config`, así que no hay que reinstalarla si el servidor cambia.

Límites del plan gratis: se duerme tras 15 minutos sin uso y tarda cerca de 1 minuto en despertar (la web lo despierta sola al abrir la página de inicio o la de crear sala); 750 horas al mes.

### Videollamada (TURN opcional)

Sin configurar nada, la videollamada usa STUN y funciona en la mayoría de redes de casa. En datos móviles o redes de universidad a veces no conecta: para eso está TURN, que reenvía el video. `src/app/api/turn/route.ts` entrega credenciales temporales; las claves se quedan en el servidor. Cloudflare TURN trae 1.000 GB gratis al mes y cobra después, así que **antes de activarlo hay que revisar si la cuenta tiene tarjeta** (la regla del proyecto es no gastar sin avisar).

## Pendientes conocidos

- Cuentas en producción: faltan la base de datos (Neon) y las claves de Google en Vercel. Sin ellas, /login y /register muestran "Las cuentas llegan pronto" y todo lo demás funciona.
- Protección contra bots en el registro (Cloudflare Turnstile) si algún día hace falta.
- La app móvil (`mobile/`) no se ha probado en un teléfono real después del cambio de protocolo.
