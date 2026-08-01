# Togetherly

Watch party app para parejas a distancia y amigos — sincronización de video, chat en tiempo real, videollamada y descubrimiento de salas públicas.

**Live:** [togetherly-weld.vercel.app](https://togetherly-weld.vercel.app)

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **Tailwind CSS v4** (CSS-based config, sin tailwind.config.ts)
- **Socket.io v4** — servidor Node.js separado (Railway)
- **Framer Motion v12** — animaciones
- **Auth.js v5** — Google OAuth + email/contraseña
- **Prisma 7** + **Neon PostgreSQL** — base de datos
- **WebRTC** nativo — videollamadas P2P (Google STUN, costo $0)
- **Stripe** — suscripción Premium $3.99/mes

## Plataformas de video soportadas

YouTube · Twitch · Vimeo · Spotify + modo companion para Netflix, Disney+, HBO Max, Prime Video, Apple TV+, Paramount+, Crunchyroll

## Funcionalidades

- Sincronización de video en tiempo real (play/pause/seek)
- Chat con reacciones emoji flotantes
- Indicador de escritura animado
- Videollamada WebRTC (Google Meet style con CallStrip)
- Selección de cámara/micrófono con preview
- Avatares de personajes famosos (Mario, Pikachu, etc.)
- Página de descubrimiento de salas públicas (`/discover`)
- Extensión Chrome (Manifest V3) para sync en plataformas de streaming
- PWA instalable (Android, iOS, escritorio)
- Modo claro/oscuro + idioma EN/ES
- Atajos de teclado (Space, K, ←/→, ↑/↓, F)
- Página de precios `/pricing` con plan gratuito y Premium

## Arquitectura

```
Next.js :3000 (Vercel)          Socket.io :3001 (Railway)
     │                                  │
     └──────── WebSocket ───────────────┘
```

## Instalación local

```bash
npm install

# Configurar variables de entorno (.env.local):
# DATABASE_URL, DIRECT_URL (Neon PostgreSQL)
# GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
# AUTH_SECRET (npx auth secret)
# STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PREMIUM_PRICE_ID

npx prisma migrate dev --name init
npm run dev
```

Para el servidor de sockets:
```bash
node socket-server.js
```

## Despliegue

```bash
git push origin main  # → Vercel + Railway auto-deploy
```

## Extensión Chrome

Carpeta `togetherly-extension/` — cargar en `chrome://extensions` → "Cargar extensión sin empaquetar".
