# Togetherly

Para ver películas y series en sincronía con quien quieras, aunque estén en ciudades distintas. Incluye chat, reacciones y videollamada.

**En vivo:** [togetherly-weld.vercel.app](https://togetherly-weld.vercel.app)

## Qué hace

- **Dentro de la sala:** YouTube, Twitch, Vimeo y Spotify se reproducen sincronizados para todos.
- **Con la extensión de Chrome:** Netflix, Prime Video, HBO Max, Disney+, Apple TV+, Paramount+ y Crunchyroll. Cada quien usa su propia cuenta y la extensión sincroniza el play, la pausa y los saltos ([guía de la extensión](togetherly-extension/README.md)).
- Chat, reacciones flotantes, videollamada (WebRTC), salas públicas, modo claro/oscuro, español/inglés, PWA instalable.
- **Planes:** gratis para 2 personas por sala; Premium (USD 3.99/mes, Stripe) hasta 8.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · Framer Motion · Auth.js 5 · Prisma 7 + Neon PostgreSQL · Socket.io 4 (servidor aparte en Railway) · WebRTC · Stripe · Playwright.

```
Navegador ──HTTP──▶ Next.js (Vercel)      páginas, inicio de sesión, pagos, pases Premium
    │
    └──WebSocket──▶ socket-server.js (Railway)   salas, play/pausa, chat, señalización de llamadas
                          ▲
Extensión de Chrome ──────┘   (Netflix, Prime, etc.)
```

## Mapa del proyecto

| Carpeta / archivo | Qué hay |
|---|---|
| `src/app/` | Páginas (rutas de Next.js) y la API (`src/app/api/`). `globals.css` tiene los colores y fuentes. |
| `src/components/landing/` | Página de inicio. `TwoRoomsScene.tsx` es la ilustración animada del hero. |
| `src/components/room/` | La sala: reproductor, chat, videollamada. `players/` tiene un componente por plataforma. |
| `src/components/ui/` | Piezas reutilizables: botón, campo de texto, logo, cambio de tema e idioma. |
| `src/hooks/` | Lógica de la sala en el navegador: `useRoom` (sockets), `useWebRTC` (llamada). |
| `src/lib/translations.ts` | **Todos los textos** de la web en español e inglés. |
| `src/lib/plans.ts` | Planes Gratis y Premium (lo que se muestra en /pricing). |
| `src/lib/room.ts` | Reglas de los códigos de sala. |
| `src/lib/platforms.ts` | Plataformas soportadas y cómo se reconocen sus enlaces. |
| `src/lib/stripe.ts`, `roomPass.ts` | Solo servidor: Stripe y la firma de pases Premium. |
| `socket-server.js` + `server/` | Servidor de salas: `validation.js`, `rooms.js`, `room-pass.js`, `connection.js`. |
| `togetherly-extension/` | Extensión de Chrome. |
| `tests/extension/` | Pruebas de punta a punta (extensión, servidor y planes). |
| `prisma/schema.prisma` | Tablas de la base de datos (usuarios, sesiones, suscripción). |
| `mobile/` | App móvil con Expo (experimental). |

**Convención:** el código (archivos, funciones, variables) va en inglés, como el resto del ecosistema; los comentarios y los textos que ve la persona, en español.

## Cómo editar

| Quiero… | Dónde |
|---|---|
| Cambiar un texto de la web | `src/lib/translations.ts` (bloques `en` y `es`, misma estructura en los dos). |
| Cambiar los colores | `src/app/globals.css`: `--accent` en `:root` (día) y `.dark` (noche); fondos en `night-*` y `day-*`. En el código se usan como clases: `bg-accent`, `text-on-accent`, `bg-night-900`. |
| Cambiar las fuentes | Archivos en `src/app/fonts/` y `localFont(...)` en `src/app/layout.tsx`. |
| Cambiar precios o beneficios | `src/lib/plans.ts` (textos) y el precio real en el panel de Stripe. El límite de personas lo aplica `server/connection.js`. |
| Agregar una plataforma a la extensión | `togetherly-extension/platforms.js` (un objeto en `PLATFORMS`) y su dominio en `manifest.json`. Pasos en el propio archivo. |
| Agregar una plataforma dentro de la sala | `src/lib/platforms.ts` y un componente en `src/components/room/players/`. |
| Cambiar la animación del hero | `src/components/landing/TwoRoomsScene.tsx` (tiempos en `TIMING`, colores en `COLORS`). |
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

GitHub Actions corre TypeScript, la compilación y estas pruebas en cada push (`.github/workflows/ci.yml`).

## Variables de entorno

| Variable | Dónde | Para qué |
|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Vercel | Base de datos Neon |
| `AUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Vercel | Inicio de sesión |
| `NEXT_PUBLIC_SOCKET_URL` | Vercel | Dirección del servidor de salas |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PREMIUM_PRICE_ID` | Vercel | Pagos (opcionales: sin ellas la web se publica igual) |
| `ROOM_PASS_SECRET` | Vercel **y** Railway (mismo valor) | Pases Premium; sin ella no hay límite por plan |
| `SOCKET_PORT`, `ALLOWED_ORIGINS` | Railway | Puerto y dominios permitidos |

Ninguna clave va en el código ni en GitHub: solo en `.env.local` (tu computador) o en los paneles de Vercel y Railway.

## Despliegue

Un push a `main` publica la web en Vercel y el servidor de salas en Railway. Los cambios grandes van en una rama con PR: Vercel genera una vista previa del PR antes de unirlo.

## Pendientes conocidos

- 23 avisos del compilador de React 19 en la sala, la videollamada y los reproductores de Twitch y Vimeo (`npm run lint`). No bloquean, pero conviene corregirlos probando cada cambio con una llamada real.
- Los avatares usan personajes de marcas registradas (Mario, Pikachu…): reemplazarlos por personajes propios antes de cobrar en serio.
