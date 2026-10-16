import type { Metadata } from "next";
import Link from "next/link";
import { Check, Code2, Heart, Star } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Apoya Togetherly",
  description: "Togetherly es gratis y de código abierto. Si te sirve, puedes apoyar con una donación.",
};

// /apoyar: Togetherly es gratis para todos; las donaciones ayudan a mantenerlo.
// El botón de donar sale cuando existe NEXT_PUBLIC_DONATE_URL (Vercel → Environment Variables),
// por ejemplo https://github.com/sponsors/modarox28 o https://ko-fi.com/tu_usuario.

const REPO_URL = "https://github.com/modarox28/togetherly";
const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL?.startsWith("https://") ? process.env.NEXT_PUBLIC_DONATE_URL : null;

function donateLabel(url: string) {
  if (url.includes("github.com/sponsors")) return "Donar con GitHub Sponsors";
  if (url.includes("ko-fi.com")) return "Donar con Ko-fi";
  return "Donar";
}

const INCLUDED = [
  "Netflix, Prime Video, HBO Max, Disney+ y más, sincronizados con la extensión",
  "Chat y reacciones dentro de la película",
  "Enlace de invitación que lleva directo a la misma película",
  "Líder de sala: tú decides si controlan todos o solo tú",
  "YouTube, Twitch, Vimeo y Spotify dentro de la sala web",
  "Videollamada y salas públicas",
];

const USES = [
  { title: "El servidor de salas", text: "Hoy corre en un plan gratis que se duerme si nadie lo usa; con apoyo puede estar siempre despierto." },
  { title: "Publicar la extensión", text: "La tienda de Chrome cobra USD 5 para que se instale con un clic, sin pasos de desarrollador." },
  { title: "Tiempo para mejorarlo", text: "Probar cada plataforma de streaming y arreglar lo que cambian sin aviso." },
];

const FAQ = [
  { q: "¿De verdad es gratis?", a: "Sí, para todos y con todas las funciones. Donar no desbloquea nada: es solo para apoyar el proyecto." },
  { q: "¿Qué significa que sea de código abierto?", a: "Que cualquiera puede ver, revisar y mejorar el código. Usa la licencia AGPL-3.0: si alguien lo modifica y lo ofrece como servicio, también tiene que publicar su código." },
  { q: "¿Es segura la extensión?", a: "Puedes revisar todo el código en GitHub. Solo envía el código de la sala, tu nombre visible, la película que tienes abierta y los play, pausa y saltos. Detalles en la página de privacidad." },
];

export default function SupportPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-day-50 text-day-900 dark:bg-night-950 dark:text-white">
      <Navbar />

      <main className="grain flex-1 px-4 pb-16 pt-28 sm:pb-24 sm:pt-32">
        <div className="mx-auto max-w-5xl">
          <h1 className="max-w-3xl font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Togetherly es gratis y de código abierto.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-day-900/70 dark:text-white/70">
            Sin anuncios y sin planes de pago. Lo hace una persona en Colombia para que ver una película a distancia se
            sienta como estar en el mismo sofá. Si te sirve, puedes ayudar a que siga creciendo.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {/* Apoyar */}
            <section className="flex flex-col rounded-[28px] bg-plum p-6 text-white sm:p-8">
              <Heart className="h-7 w-7 text-blanket" aria-hidden="true" />
              <h2 className="mt-4 font-display text-2xl font-extrabold">Apoya el proyecto</h2>
              <p className="mt-2 leading-relaxed text-white/75">Cualquier aporte suma. Esto es lo que cubre:</p>
              <dl className="mt-5 flex-1 space-y-4">
                {USES.map((use) => (
                  <div key={use.title}>
                    <dt className="font-bold text-lamp">{use.title}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-white/75">{use.text}</dd>
                  </div>
                ))}
              </dl>
              {DONATE_URL ? (
                <a
                  href={DONATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 flex items-center justify-center gap-2 rounded-full bg-lamp py-3.5 font-bold text-plum"
                >
                  <Heart className="h-4 w-4" aria-hidden="true" /> {donateLabel(DONATE_URL)}
                </a>
              ) : (
                <p className="mt-8 rounded-2xl border-2 border-dashed border-lamp/50 px-4 py-3 text-sm leading-relaxed text-white/80">
                  <b className="text-lamp">Las donaciones abren muy pronto.</b> Mientras tanto, una estrella en GitHub ayuda
                  mucho a que más gente lo encuentre.
                </p>
              )}
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white ring-2 ring-white/20 hover:bg-white/5"
              >
                <Star className="h-4 w-4" aria-hidden="true" /> Dar una estrella en GitHub
              </a>
            </section>

            {/* Qué incluye */}
            <section className="flex flex-col rounded-[28px] bg-white p-6 sm:p-8 dark:bg-night-900">
              <h2 className="font-display text-2xl font-extrabold">Todo incluido, para todos</h2>
              <ul className="mt-6 flex-1 space-y-3">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-day-900/80 dark:text-white/75">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-sage" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/room" className="mt-8 block rounded-full bg-accent py-3.5 text-center font-bold text-on-accent">
                Crear una sala
              </Link>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 text-sm font-bold text-day-900/70 underline underline-offset-4 dark:text-white/70"
              >
                <Code2 className="h-4 w-4" aria-hidden="true" /> Ver el código o ayudar a programarlo
              </a>
            </section>
          </div>

          <section className="mt-16 max-w-2xl">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Preguntas</h2>
            <dl className="mt-6">
              {FAQ.map(({ q, a }) => (
                <div key={q} className="border-t-2 border-day-900/10 py-5 dark:border-white/10">
                  <dt className="font-bold">{q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-day-900/70 dark:text-white/65">{a}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
