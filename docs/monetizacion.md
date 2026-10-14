# Monetización de Togetherly

Decisión (octubre 2026): **freemium, con los pagos apagados por ahora.** Sin anuncios.

## Qué hay hoy

- Plan **Gratis**: salas de 2 personas, todo lo demás incluido.
- Plan **Premium** (salas de hasta 8): se muestra en `/pricing` como "Próximamente".
  No se puede comprar y la ruta `/api/stripe/checkout` responde 503.
- El interruptor es la variable `NEXT_PUBLIC_PAYMENTS_ENABLED` (ver `src/lib/plans.ts`).
  Mientras no valga `true`, nadie puede pagar.

## Por qué no cobramos todavía

1. **Vercel Hobby (gratis) prohíbe el uso comercial.** Cualquier forma de cobrar a los
   visitantes, o poner anuncios (AdSense incluido), exige el plan Pro (USD 20/mes).
   Las donaciones sí están permitidas.
   Fuente: https://vercel.com/docs/limits/fair-use-guidelines
2. **Stripe no abre cuentas para negocios de Colombia** (en Latinoamérica solo Brasil y
   México). Fuente: https://stripe.com/global
3. Meta del proyecto: no gastar un solo peso sin avisar antes.

## Opciones para más adelante (todas por verificar antes de usarlas)

| Opción | Costo fijo | Notas |
|---|---|---|
| Donaciones (Ko-fi, Buy Me a Coffee) | 0 | Permitido en Vercel Hobby. Lo más simple para empezar. |
| Mercado Pago / Wompi | 0 + comisión | Funcionan en Colombia; requieren cambiar `src/app/api/stripe/*`. |
| Lemon Squeezy / Paddle | 0 + comisión | "Merchant of record": cobran ellos y te pagan; revisar si pagan a Colombia. |
| Pasarse a Vercel Pro | USD 20/mes | Obligatorio en cuanto se cobre o haya anuncios. |

## Cómo activar Premium cuando se decida

1. Tener la pasarela configurada (claves solo como variables de entorno en Vercel).
2. Pasar el proyecto de Vercel a un plan que permita uso comercial.
3. En Vercel → Settings → Environment Variables: `NEXT_PUBLIC_PAYMENTS_ENABLED=true`.
4. Redesplegar (las variables `NEXT_PUBLIC_` se leen al compilar).
5. Poner `ROOM_PASS_SECRET` (el mismo valor) en Vercel y en Render para que el límite
   de 8 personas se respete en el servidor de salas.
