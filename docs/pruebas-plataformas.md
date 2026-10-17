# Pruebas en plataformas reales

Las pruebas automáticas (`npm run test:extension`) usan imitaciones de Netflix, Prime Video y
Disney+. Las plataformas reales cambian sin aviso, así que antes de cada versión se revisa a mano
con cuentas reales. Marca ✅ / ❌ y anota el código de error si sale uno.

## Qué probar en cada plataforma (dos personas en la misma sala)

1. Abrir la película → al otro le llega "X abrió… · Ir" y el enlace /j/CODIGO lo lleva a la misma.
2. Play y pausa desde cada lado.
3. Adelantar y atrasar (también dos veces seguidas rápido).
4. Entrar tarde: el que llega se pone al día solo.
5. Modo "Solo yo": el invitado no puede pausar; si abre otra película, la sala no cambia y no se rompe su reproductor.
6. Chat abierto: no tapa la película.

## Estado

| Plataforma | Computador (extensión) | iPad (app) | iPhone (app) | Android (app) |
|---|---|---|---|---|
| Netflix | ✅ 16 oct 2026 | ✅ 16 oct 2026 | ✅ 16 oct (pantalla completa del sistema arreglada) | ❌ M7121-1957 / M7702-1290 (Expo Go) |
| Disney+ | ✅ play/pausa · saltos 2.4.3 | pendiente | ❌ "descarga la app" | pendiente |
| Prime Video | pendiente | pendiente | pendiente | pendiente |
| HBO Max | pendiente | pendiente | pendiente | pendiente |
| Paramount+ | pendiente | pendiente | pendiente | pendiente |
| Apple TV+ | pendiente | pendiente | pendiente | pendiente |
| Crunchyroll | pendiente | no cubierto (video en iframe) | no cubierto | no cubierto |

Para revisar el reproductor por dentro (cómo hacer play, pausa y saltos sin romperlo), inicia
sesión en esa plataforma en el panel de navegador de Claude y pide revisarla: así se encontró la
API interna de Disney+ (`<disney-web-player>.mediaPlayer`).
