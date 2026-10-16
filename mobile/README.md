# Togetherly — app móvil (prueba)

App de Expo (React Native) para ver Netflix, Disney+, Prime Video, HBO Max, Paramount+ y Apple TV+
en sincronía desde el celular. La película corre en un navegador dentro de la app, que se presenta
como navegador de computador, y el motor `lib/sync-engine.js` hace lo mismo que la extensión:
play, pausa y saltos (con el reproductor interno de Netflix y de Disney+), y avisa qué película está abierta.

La app entra a la sala como la extensión (eventos `ext-…` del servidor), así que se sincroniza con
quien usa la extensión en el computador.

## Probarla en tu celular (gratis, sin publicar)

1. Instala **Expo Go** en el celular (App Store o Play Store).
2. En el computador (CMD), con el celular en el **mismo Wi-Fi**:
   ```
   cd C:\Users\USUARIO\togetherly\mobile
   npm install
   npx expo start
   ```
3. Escanea el código QR: en iPhone con la cámara; en Android desde Expo Go.

Si el Wi-Fi no deja conectar, usa `npx expo start --tunnel`.

## Archivos

| Archivo | Qué hace |
|---|---|
| `app/index.tsx` | Inicio: nombre, personaje, crear sala o unirse con código |
| `app/room/[roomId].tsx` | Sala: plataforma o película, chat, reacciones, líder, invitar |
| `app/j/[code].tsx` | Enlace de invitación dentro de la app (`togetherly://j/CODIGO`) |
| `hooks/useRoom.ts` | Conexión con el servidor de salas |
| `components/StreamingWebView.tsx` | Navegador interno + motor de sincronización |
| `lib/sync-engine.js` | Motor que se inyecta en la página (lo prueba `tests/extension/mobile-engine.spec.js`) |
