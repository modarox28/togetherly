# Seguridad de Togetherly

Revisión contra la lista de 20 controles antes de lanzar (la misma de MedIA Suite). Cada punto dice qué se hizo, dónde está y cómo se comprueba.

| # | Control | Estado | Cómo está resuelto | Se comprueba en |
|---|---------|:------:|--------------------|-----------------|
| 1 | Ocultar API keys | ✅ | Stripe, Google, TURN y `ROOM_PASS_SECRET` solo existen como variables de entorno en Vercel o Render. El navegador nunca las ve: `/api/turn` entrega credenciales TURN temporales y la clave de Cloudflare se queda en el servidor. | `src/app/api/turn/route.ts` |
| 2 | Eliminar secretos de Git | ✅ | No hay secretos en el código ni en el historial (gitleaks, 0 hallazgos). `.gitignore` bloquea `.env*` y `*.pem`. Gitleaks revisa cada push y PR. | job `secretos` del CI |
| 3 | Key pública para la base de datos | ✅ | No aplica: la base de datos (Neon) solo se usa desde el servidor con Prisma; no hay ninguna clave de base de datos en el navegador. | — |
| 4 | Row-Level Security | ✅ | Toda consulta a la base de datos corre en el servidor y filtra por el usuario de la sesión (`auth()`); no hay acceso directo desde el navegador. | `src/app/api/**` |
| 5 | Encriptar datos sensibles | ✅ | En tránsito: HTTPS + HSTS en la web y en el servidor de salas. En reposo: Neon cifra la base de datos. Las contraseñas se guardan solo como hash (bcrypt). La videollamada viaja cifrada (WebRTC/DTLS-SRTP). | `next.config.ts` |
| 6 | Forzar la autenticación | ✅ | Pagos, portal y pases Premium exigen sesión. Las salas no exigen cuenta (es el diseño), pero el servidor solo acepta eventos de quien está dentro de la sala. | `tests/extension/sync.spec.js` ("rechaza eventos de quien no está en la sala") |
| 7 | Restringir el acceso a registros | ✅ | Cada persona solo ve su propia suscripción. Las salas públicas solo muestran nombre, cantidad de personas y plataforma. | `server/rooms.js` (`listPublicRooms`) |
| 8 | Bloquear manipulación de campos | ✅ | Nadie puede marcarse Premium: `isPremium` solo lo cambia el webhook de Stripe con firma verificada. El cupo de una sala solo sube con un pase firmado (HMAC) por la web. | `tests/extension/plans.spec.js` |
| 9 | Proteger la sesión | ✅ | Auth.js con cookies `HttpOnly`, `Secure` y `SameSite=Lax`. Sin cuentas configuradas, la web no consulta sesiones. | `src/auth.config.ts` |
| 10 | Hashear contraseñas | ✅ | bcrypt con costo 12; mínimo 8 caracteres. | `src/app/api/auth/register/route.ts` |
| 11 | Rate limiting | ✅ | Servidor de salas: 150 eventos cada 10 s por conexión, 20 conexiones por IP y 2.000 salas máximo. Web: registro 5 cada 10 min por IP, inicio de sesión 10 cada 15 min por correo, pases 30 por minuto, TURN 20 por minuto. (En Vercel el conteo es por instancia: es un freno, no un contador exacto.) | `server/connection.js`, `socket-server.js`, `src/lib/rateLimit.ts` |
| 12 | Protección contra bots | ⚠️ | Hoy solo los límites de uso. Si aparecen registros masivos, agregar Cloudflare Turnstile (gratis) al registro. | — |
| 13 | Parametrizar queries | ✅ | Prisma envía los valores separados de la consulta; no hay SQL armado a mano. | — |
| 14 | Validar inputs | ✅ | Navegador y servidor usan las mismas reglas: `src/lib/validations.ts` (zod) para cuentas y `src/lib/room.ts` + `server/validation.js` para salas (códigos, nombres de 24, mensajes de 500, enlaces solo http/https, tiempos de 0 a 24 h). La extensión vuelve a validar lo que recibe. | `tests/extension/*.spec.js` |
| 15 | Sanitizar contenido | ✅ | React escapa todo el texto (no se usa `dangerouslySetInnerHTML`). La extensión muestra avisos con `textContent` dentro de un shadow DOM cerrado. Content-Security-Policy: solo scripts propios y de los reproductores (YouTube, Twitch, Vimeo). | `next.config.ts` |
| 16 | Restringir archivos | ✅ | No aplica: la app no recibe archivos de los usuarios. | — |
| 17 | Devolver solo datos necesarios | ✅ | Las API responden mensajes cortos sin detalles internos. El chat solo envía nombre, color, avatar y texto. | — |
| 18 | Security headers | ✅ | `next.config.ts`: Content-Security-Policy, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy (cámara y micrófono solo para la propia página) y Cross-Origin-Opener-Policy. El servidor de salas envía `nosniff` y `no-referrer`. | `curl -I https://togetherly-weld.vercel.app` |
| 19 | Forzar HTTPS | ✅ | Vercel y Render solo sirven HTTPS; HSTS con `preload`; `upgrade-insecure-requests` en la CSP. | — |
| 20 | Escanear dependencias | ✅ | `npm audit` en el CI falla ante vulnerabilidades críticas; Dependabot propone actualizaciones cada semana. Next.js se actualizó a 16.3.8 (corregía una vulnerabilidad crítica). Quedan avisos "altos" solo en el CLI de Prisma (`mysql2`, `deepmerge-ts`), que se usa al compilar y no llega al navegador ni al servidor de salas. | job `verificar` del CI, `.github/dependabot.yml` |

## Extensión Togetherly Sync

- Permisos mínimos: solo `storage`. Corre únicamente en los dominios de streaming de la lista y en Togetherly.
- `bridge.js` solo acepta mensajes de la propia página de Togetherly y solo los tipos `JOIN_ROOM`, `LEAVE_ROOM` y `PING`.
- No lee contraseñas, cookies ni el historial: solo avisa play, pausa y saltos.

## Acciones manuales (no se pueden hacer desde el código)

1. Al configurar las cuentas, generar `AUTH_SECRET` con `npx auth secret` y guardarlo solo en Vercel.
2. Si se activa TURN de Cloudflare: revisar antes que la cuenta no cobre (1.000 GB gratis al mes).
3. Poner `ROOM_PASS_SECRET` con el mismo valor en Vercel y Render cuando se active Premium.

## Cómo reportar un problema de seguridad

Escribe a mdq2804@gmail.com con el asunto "Seguridad Togetherly". No abras un issue público con los detalles.
