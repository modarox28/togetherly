import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Términos de uso — Togetherly",
  description: "Reglas para usar Togetherly, la web, la extensión Togetherly Sync y la app.",
};

// Términos de uso. Si cambian de forma importante, sube TERMS_VERSION (src/lib/terms.ts) para
// que todos los vuelvan a aceptar, y cambia la fecha.
const UPDATED = "17 de octubre de 2026";

const sections = [
  {
    title: "Qué es Togetherly",
    body: [
      "Togetherly es un proyecto gratuito y de código abierto (licencia AGPL-3.0) para ver contenido al mismo tiempo con otras personas: sincroniza el play, la pausa y los saltos, y ofrece chat, reacciones y videollamada en salas privadas.",
      "Togetherly no aloja, vende ni transmite películas o series. Cada persona ve el contenido con su propia cuenta en la plataforma correspondiente y bajo las condiciones de esa plataforma.",
    ],
  },
  {
    title: "Edad mínima",
    body: [
      "Para usar Togetherly debes tener 18 años o más. Al crear o entrar a una sala confirmas que cumples esa edad.",
      "Si eres padre, madre o tutor y crees que un menor de edad lo está usando, escríbenos y borraremos lo que corresponda.",
    ],
  },
  {
    title: "Tu cuenta en cada plataforma",
    body: [
      "Debes tener tu propia suscripción a la plataforma que uses (Netflix, Disney+, Prime Video, etc.) y cumplir sus términos. Togetherly no comparte cuentas ni contraseñas entre personas, y no las ve ni las guarda.",
      "Netflix, Disney+, Prime Video, HBO Max, Apple TV+, Paramount+, Crunchyroll, YouTube, Twitch, Vimeo y Spotify son marcas de sus respectivos dueños. Togetherly no está afiliado, patrocinado ni respaldado por ninguna de ellas.",
      "Las plataformas pueden cambiar sus páginas o limitar su uso en algunos dispositivos o aplicaciones; en ese caso alguna función de Togetherly puede dejar de funcionar.",
    ],
  },
  {
    title: "Conducta en las salas",
    body: [
      "No está permitido: acosar, amenazar o insultar; compartir contenido sexual, violento o ilegal en el chat o la videollamada; hacerse pasar por otra persona; enviar spam; ni intentar dañar el servicio o a otras personas.",
      "Quien lidera una sala puede sacar de ella a cualquier persona. Cualquiera puede reportar a alguien desde la lista de personas de la sala.",
      "Podemos cerrar salas o bloquear el acceso a quien incumpla estas reglas.",
    ],
  },
  {
    title: "Salas públicas",
    body: [
      "Las salas públicas aparecen en una lista que cualquiera puede ver y en ellas puede entrar gente que no conoces. Por seguridad, en las salas públicas no hay videollamada.",
      "No compartas datos personales (dirección, teléfono, contraseñas) en el chat.",
    ],
  },
  {
    title: "Sin garantías",
    body: [
      "Togetherly se ofrece \"tal cual\", sin garantía de que funcione siempre o sin errores. En la medida que lo permita la ley, no somos responsables por daños derivados de su uso, del contenido que compartan otras personas ni de los servicios de terceros.",
      "Las donaciones son voluntarias, no compran ningún servicio ni función adicional y no son reembolsables.",
    ],
  },
  {
    title: "Datos personales",
    body: [
      "Cómo tratamos tus datos está en la Política de privacidad, conforme a la Ley 1581 de 2012 de Colombia.",
    ],
  },
  {
    title: "Contacto",
    body: ["Escribe a mdq2804@gmail.com con el asunto \"Togetherly\" para reportes, dudas o solicitudes."],
  },
];

export default function TermsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-day-50 text-day-900 dark:bg-night-950 dark:text-white">
      <Navbar />
      <main className="grain flex-1 px-4 pb-16 pt-28 sm:pt-32">
        <article className="mx-auto max-w-2xl">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Términos de uso</h1>
          <p className="mt-3 text-sm text-day-900/60 dark:text-white/55">Actualizados el {UPDATED}</p>
          {sections.map((section) => (
            <section key={section.title} className="mt-10">
              <h2 className="font-display text-2xl font-extrabold">{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-3 leading-relaxed text-day-900/75 dark:text-white/75">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
          <p className="mt-10 text-sm text-day-900/60 dark:text-white/55">
            Ver también la <Link href="/privacidad" className="underline underline-offset-4">Política de privacidad</Link>.
          </p>
          <section className="mt-12 border-t-2 border-day-900/10 pt-8 dark:border-white/10" lang="en">
            <h2 className="font-display text-xl font-extrabold">In English</h2>
            <p className="mt-3 text-sm leading-relaxed text-day-900/70 dark:text-white/70">
              Togetherly is free, open-source software (AGPL-3.0) for watching content in sync. You must be 18 or older.
              Each person uses their own subscription and must follow that platform&apos;s terms; Togetherly does not host
              or stream content and is not affiliated with or endorsed by Netflix, Disney+, Prime Video or any other
              platform. No harassment, illegal or sexual content, impersonation or spam; room leaders can remove people
              and anyone can report. Public rooms have no video calls. Provided &quot;as is&quot;, without warranties.
              Contact: mdq2804@gmail.com.
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
