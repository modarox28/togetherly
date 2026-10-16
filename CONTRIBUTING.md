# Cómo ayudar a Togetherly

¡Gracias por querer ayudar! Togetherly es de código abierto (licencia [AGPL-3.0](LICENSE)) y gratis para quien lo use.

## Formas de ayudar

- **Probar en tu plataforma de streaming** y contar qué falla: abre un issue con la plataforma, el navegador, la versión de la extensión (sale abajo en el popup) y lo que dice el cuadro gris del popup.
- **Corregir algo o agregar una plataforma.** Las recetas están en el [README](README.md#cómo-editar); para una plataforma nueva, mira `togetherly-extension/platforms.js`.
- **Traducir** textos en `src/lib/translations.ts`.
- **Apoyar con una donación** (botón "Sponsor" del repositorio o la página `/apoyar` del sitio): cubre el servidor y la publicación en tiendas.

## Antes de mandar un cambio

1. Crea una rama desde `main`.
2. Corre las pruebas (Windows/CMD o Linux):
   ```
   npm install
   npx tsc --noEmit
   npm run lint
   npm run test:extension
   ```
   Las pruebas de la extensión necesitan `ffmpeg` instalado.
3. Abre un pull request explicando qué cambia y cómo lo probaste. Si tocas una plataforma de streaming, di si lo probaste en el sitio real.

## Reglas

- El código va en inglés; los comentarios y los textos que ve la gente, en español.
- Nunca subas claves, tokens ni archivos `.env`: van como variables de entorno (ver `.env.example`). El CI revisa que no se filtren.
- La extensión solo debe leer lo necesario para sincronizar (ver la [política de privacidad](https://togetherly-weld.vercel.app/privacidad)).
- Trata a las demás personas con respeto: sin insultos, acoso ni discriminación.

## Seguridad

Si encuentras un problema de seguridad, no abras un issue público: escribe a mdq2804@gmail.com (ver [SECURITY.md](SECURITY.md)).
