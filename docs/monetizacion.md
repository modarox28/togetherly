# Monetización de Togetherly

**Decisión (15 oct 2026): gratis para todos, de código abierto (AGPL-3.0) y sostenido con donaciones.** Sin anuncios y sin planes de pago.

## Por qué

1. **Vercel Hobby (gratis) prohíbe el uso comercial** (cobrar o poner anuncios exige Pro, USD 20/mes),
   pero **las donaciones sí están permitidas**. Fuente: https://vercel.com/docs/limits/fair-use-guidelines
2. **Stripe no abre cuentas para negocios de Colombia**. Fuente: https://stripe.com/global
3. Una extensión que entra a Netflix o Disney+ genera más confianza si su código se puede revisar.
4. Meta del proyecto: no gastar sin avisar antes.

## Cómo se reciben donaciones

| Opción | Desde Colombia | Comisión |
|---|---|---|
| GitHub Sponsors | Sí (región soportada) | 0 % si dona una persona; hasta 6 % si dona una organización |
| Ko-fi (cobra por PayPal) | Sí, con PayPal | 0 % de Ko-fi en propinas; PayPal cobra la suya |

Fuentes: https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors ·
https://talks.co/p/how-does-ko-fi-work/

## Cómo activar el botón de donar

1. Crear la cuenta (GitHub → Settings → Sponsors, o ko-fi.com con PayPal).
2. Vercel → proyecto → Settings → Environment Variables: `NEXT_PUBLIC_DONATE_URL` con el enlace
   (tipo Config, Production) y redesplegar.
3. Si usas Ko-fi, quita el `#` de `ko_fi:` en `.github/FUNDING.yml` y pon tu usuario.

## Lo que quedó guardado (por si algún día se cobra)

- El código de Stripe (`src/app/api/stripe/*`, `src/lib/stripe.ts`) sigue en el repositorio, apagado con
  `NEXT_PUBLIC_PAYMENTS_ENABLED`. La página de planes se reemplazó por `/apoyar` (`/pricing` redirige ahí).
- El límite de personas por plan solo se activa con `ROOM_PASS_SECRET`; sin él, cada sala admite hasta 20.
