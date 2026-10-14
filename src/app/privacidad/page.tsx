import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Privacidad — Togetherly",
  description: "Qué datos usa Togetherly y la extensión Togetherly Sync, y cuáles no.",
};

// Política de privacidad. Las tiendas de extensiones piden un enlace a esta página.
// Si cambia lo que guarda la app o la extensión, actualiza este texto y la fecha.
const UPDATED = "13 de octubre de 2026";

const sections = [
  {
    title: "Lo corto",
    body: [
      "Togetherly sirve para ver películas al mismo tiempo con otras personas. Para eso solo necesita saber en qué sala estás, tu nombre visible y cuándo das play, pausa o adelantas.",
      "No vendemos datos, no mostramos publicidad y no rastreamos lo que ves fuera de la sala.",
    ],
  },
  {
    title: "La extensión Togetherly Sync",
    body: [
      "Funciona solo en las páginas de streaming de la lista (Netflix, Prime Video, HBO Max, Disney+, Apple TV+, Paramount+ y Crunchyroll) y en el sitio de Togetherly.",
      "Envía al servidor de salas el código de la sala, tu nombre visible y los eventos de play, pausa y salto con el minuto del video. Nada más.",
      "No lee tus contraseñas, tu cuenta de streaming, tus cookies, tu historial ni el título de lo que ves.",
      "Guarda en tu navegador el último nombre que usaste y la sala activa, para no pedirlos otra vez. Puedes borrarlos quitando la extensión.",
    ],
  },
  {
    title: "Las salas",
    body: [
      "Las salas viven en la memoria del servidor mientras alguien está conectado. El chat no se guarda: al cerrarse la sala, desaparece.",
      "La videollamada va directo entre los navegadores (WebRTC, cifrada). Si una red no lo permite, puede pasar por un servidor de reenvío que no la graba.",
    ],
  },
  {
    title: "Las cuentas (opcionales)",
    body: [
      "Si creas una cuenta guardamos tu nombre, tu correo y tu contraseña cifrada (nunca la contraseña real). Si entras con Google, recibimos tu nombre, correo y foto de perfil.",
      "Si en el futuro pagas Premium, el pago lo procesa la pasarela de pagos; Togetherly no ve ni guarda los datos de tu tarjeta.",
      "Puedes pedir que borremos tu cuenta escribiendo al correo de abajo.",
    ],
  },
  {
    title: "Contacto",
    body: ["Escribe a mdq2804@gmail.com con el asunto \"Privacidad Togetherly\"."],
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-day-50 text-day-900 dark:bg-night-950 dark:text-white">
      <Navbar />
      <main className="grain flex-1 px-4 pb-16 pt-28 sm:pt-32">
        <article className="mx-auto max-w-2xl">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Privacidad</h1>
          <p className="mt-3 text-sm text-day-900/60 dark:text-white/55">Actualizada el {UPDATED}</p>

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

          <section className="mt-12 border-t-2 border-day-900/10 pt-8 dark:border-white/10" lang="en">
            <h2 className="font-display text-xl font-extrabold">In English</h2>
            <p className="mt-3 text-sm leading-relaxed text-day-900/70 dark:text-white/70">
              The Togetherly Sync extension only runs on the listed streaming sites and on Togetherly. It sends the room
              code, your display name and play/pause/seek events (with the video time) to the room server. It does not
              read passwords, accounts, cookies, browsing history or what you are watching. No data is sold and there
              are no ads. Contact: mdq2804@gmail.com.
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
