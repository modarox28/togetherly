import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Privacidad — Togetherly",
  description: "Qué datos usa Togetherly y la extensión Togetherly Sync, y cuáles no.",
};

// Política de privacidad. Las tiendas de extensiones piden un enlace a esta página.
// Si cambia lo que guarda la app o la extensión, actualiza este texto y la fecha.
const UPDATED = "17 de octubre de 2026";

const sections = [
  {
    title: "Lo corto",
    body: [
      "Togetherly sirve para ver películas al mismo tiempo con otras personas. Para eso solo necesita saber en qué sala estás, tu nombre visible y cuándo das play, pausa o adelantas.",
      "No vendemos datos, no mostramos publicidad y no rastreamos lo que ves fuera de la sala.",
    ],
  },
  {
    title: "Quién es responsable",
    body: [
      "El responsable del tratamiento de los datos es Moisés Rodríguez, creador de Togetherly, en Colombia (contacto: mdq2804@gmail.com). Tratamos los datos conforme a la Ley 1581 de 2012 y sus decretos reglamentarios.",
      "Togetherly es solo para personas de 18 años o más; no recogemos a propósito datos de menores de edad.",
    ],
  },
  {
    title: "La extensión Togetherly Sync",
    body: [
      "Funciona solo en las páginas de streaming de la lista (Netflix, Prime Video, HBO Max, Disney+, Apple TV+, Paramount+ y Crunchyroll) y en el sitio de Togetherly.",
      "Envía al servidor de salas el código de la sala, tu nombre visible, los eventos de play, pausa y salto con el minuto del video y la dirección de la página del video que tienes abierto (por ejemplo netflix.com/watch/123). Esa dirección solo la ve la gente de tu sala, para que el enlace de invitación los lleve a la misma película.",
      "Solo comparte direcciones de las plataformas de la lista, y solo mientras estás en una sala. No lee tus contraseñas, tu cuenta de streaming, tus cookies ni tu historial.",
      "Guarda en tu navegador el último nombre que usaste y la sala activa, para no pedirlos otra vez. Puedes borrarlos quitando la extensión.",
    ],
  },
  {
    title: "La app para celular",
    body: [
      "La app muestra la página de la plataforma de streaming dentro de un navegador interno. Tú inicias sesión directamente en esa plataforma: Togetherly no ve, no guarda y no envía tu usuario ni tu contraseña.",
      "La app envía lo mismo que la extensión (código de sala, nombre visible, play/pausa/salto con el minuto y la dirección de la película) y guarda en el celular tu nombre, tu personaje y una clave aleatoria del dispositivo.",
      "Esa clave sirve para saber quién lidera una sala sin depender del nombre; nunca se muestra a otras personas.",
    ],
  },
  {
    title: "Las salas",
    body: [
      "Las salas viven en la memoria del servidor mientras alguien está conectado. El chat no se guarda: al cerrarse la sala, desaparece.",
      "La videollamada va directo entre los navegadores (WebRTC, cifrada). Si una red no lo permite, puede pasar por un servidor de reenvío que no la graba. En las salas públicas no hay videollamada.",
      "Si reportas a alguien, guardamos en el registro del servidor el código de la sala, el nombre visible de la persona reportada, el de quien reporta, el motivo y la hora, para revisarlo. Ese registro se borra con el tiempo y no incluye el chat.",
      "Las salas públicas muestran en una lista su nombre, cuántas personas hay, quién lidera y qué plataforma están viendo.",
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
    title: "Tus derechos",
    body: [
      "Puedes conocer, actualizar, corregir y pedir que borremos tus datos, y revocar tu autorización, escribiendo al correo de abajo. Respondemos dentro de los plazos de la ley (10 días hábiles para consultas y 15 para reclamos).",
      "Si no quedas conforme, puedes acudir a la Superintendencia de Industria y Comercio (SIC).",
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
              code, your display name, play/pause/seek events (with the video time) and the address of the video page you
              have open, only while you are in a room and only to people in that room, so the invite link opens the same
              title. It does not read passwords, accounts, cookies or browsing history. No data is sold and there
              are no ads. Contact: mdq2804@gmail.com.
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
