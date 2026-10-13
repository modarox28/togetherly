"use client";

import { useEffect, useState } from "react";
import { Code, Download } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { BROWSERS, detectBrowser, type BrowserGuide, type BrowserId } from "@/lib/browsers";

// Guía de instalación de la extensión. Los textos están en translations.ts → extensionPage,
// los datos de cada navegador en lib/browsers.ts y las imágenes/video en
// public/extension-guide/ (se regeneran con scripts/capture-extension-guide.mjs).

const GUIDE_DIR = "/extension-guide";
const SOURCE_URL = "https://github.com/modarox28/togetherly/tree/main/togetherly-extension";

/** Reemplaza {clave} por su valor en un texto traducido. */
function fill(text: string, values: Record<string, string | undefined>) {
  return text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

type StepImage = { src: string; alt: string };
type Step = { title: string; text: string; images?: StepImage[] };

export function ExtensionGuide() {
  const { t, language } = useLanguage();
  const copy = t.extensionPage;
  const [browserId, setBrowserId] = useState<BrowserId>("chrome");

  // Elige la pestaña del navegador que está usando la persona (solo al cargar).
  useEffect(() => {
    const nav = navigator as Navigator & { brave?: unknown };
    const detected = detectBrowser(navigator.userAgent, !!nav.brave);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de navigator, que solo existe en el navegador
    setBrowserId(detected);
  }, []);

  const browser = BROWSERS.find((b) => b.id === browserId) ?? BROWSERS[0];
  const steps = buildSteps(browser, copy, language === "en" ? "en" : "es");

  return (
    <div className="grain bg-day-50 px-4 pb-24 pt-28 dark:bg-night-950 sm:pt-36">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-[clamp(2.4rem,6vw,4.25rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-day-900 dark:text-white">
          {copy.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-day-900/75 dark:text-white/75">{copy.subtitle}</p>

        {/* Selector de navegador */}
        <fieldset className="mt-10">
          <legend className="font-display text-lg font-bold text-day-900 dark:text-white">{copy.pickBrowser}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {BROWSERS.map((b) => (
              <label
                key={b.id}
                className={`cursor-pointer rounded-full border-2 px-4 py-2 font-bold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
                  b.id === browser.id
                    ? "border-accent bg-accent text-on-accent"
                    : "border-day-900/15 text-day-900 hover:border-day-900/40 dark:border-white/20 dark:text-white dark:hover:border-white/50"
                }`}
              >
                <input
                  type="radio"
                  name="browser"
                  value={b.id}
                  checked={b.id === browser.id}
                  onChange={() => setBrowserId(b.id)}
                  className="sr-only"
                />
                {b.name}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Descarga */}
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <a
            href={browser.download}
            download
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 font-bold text-on-accent shadow-[0_4px_0_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-0.5"
          >
            <Download aria-hidden="true" className="h-5 w-5" />
            {fill(copy.download, { browser: browser.name })}
          </a>
          <p className="text-sm text-day-900/60 dark:text-white/60">{copy.downloadNote}</p>
        </div>

        {/* Pasos */}
        <ol className="mt-14 space-y-12">
          {steps.map((step, index) => (
            <li key={step.title} className="grid gap-5 md:grid-cols-[3.5rem_1fr]">
              <span aria-hidden="true" className="font-display text-5xl font-extrabold leading-none text-accent">
                {index + 1}
              </span>
              <div>
                <h2 className="font-display text-2xl font-bold text-day-900 dark:text-white">{step.title}</h2>
                <p className="mt-2 max-w-[60ch] leading-relaxed text-day-900/75 dark:text-white/75">{step.text}</p>
                {step.images?.map((image) => (
                  // Imagen estática y ya optimizada (WebP): no necesita next/image.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={image.src}
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    className="mt-5 w-full max-w-xl rounded-2xl border border-day-900/10 shadow-[0_20px_40px_-24px_rgba(30,23,48,0.6)] dark:border-white/10"
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>

        {browser.id === "firefox" && (
          <p className="mt-10 max-w-[60ch] rounded-2xl border-2 border-dashed border-accent/50 p-5 text-day-900/80 dark:text-white/80">
            {copy.firefoxNote}
          </p>
        )}
        {!browser.screenshotsMatch && browser.id !== "firefox" && (
          <p className="mt-10 max-w-[60ch] text-sm text-day-900/60 dark:text-white/60">
            {fill(copy.screenshotsNote, { browser: browser.name })}
          </p>
        )}

        {/* Cómo se usa */}
        <section className="mt-20 grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-day-900 dark:text-white">
              {copy.afterTitle}
            </h2>
            <p className="mt-3 max-w-[52ch] text-lg leading-relaxed text-day-900/75 dark:text-white/75">{copy.afterText}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${GUIDE_DIR}/4-conectada.webp`}
            alt="Togetherly Sync conectada a la sala K7M2QX"
            loading="lazy"
            className="w-64 rounded-2xl shadow-[0_20px_40px_-20px_rgba(30,23,48,0.7)]"
          />
        </section>

        {/* Video */}
        <section className="mt-20">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-day-900 dark:text-white">{copy.videoTitle}</h2>
          <video
            controls
            preload="none"
            playsInline
            poster={`${GUIDE_DIR}/video-poster.webp`}
            aria-label={copy.videoLabel}
            className="mt-5 aspect-video w-full rounded-2xl bg-night-950"
          >
            <source src={`${GUIDE_DIR}/instalar-extension.mp4`} type="video/mp4" />
          </video>
        </section>

        {/* Preguntas */}
        <section className="mt-20">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-day-900 dark:text-white">{copy.faqTitle}</h2>
          <div className="mt-5 divide-y-2 divide-day-900/10 border-y-2 border-day-900/10 dark:divide-white/10 dark:border-white/10">
            {copy.faq.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="cursor-pointer list-none font-display text-xl font-bold text-day-900 dark:text-white">
                  <span className="mr-3 inline-block text-accent transition-transform group-open:rotate-45">+</span>
                  {item.q}
                </summary>
                <p className="mt-3 max-w-[60ch] pl-7 leading-relaxed text-day-900/75 dark:text-white/75">{item.a}</p>
              </details>
            ))}
          </div>
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 font-bold text-day-900 underline decoration-accent decoration-2 underline-offset-4 dark:text-white"
          >
            <Code aria-hidden="true" className="h-4 w-4" />
            {copy.sourceCode}
          </a>
        </section>
      </div>
    </div>
  );
}

function buildSteps(
  browser: BrowserGuide,
  copy: ReturnType<typeof useLanguage>["t"]["extensionPage"],
  language: "es" | "en"
): Step[] {
  const labels = browser.labels[language];
  const values = { url: browser.extensionsUrl, ...labels };
  const s = copy.steps;
  // Las capturas son de Chrome: solo se muestran en navegadores que se ven igual.
  const shots = (...items: [name: string, alt: string][]) =>
    browser.screenshotsMatch ? items.map(([name, alt]) => ({ src: `${GUIDE_DIR}/${name}.webp`, alt })) : undefined;

  if (browser.id === "firefox") {
    return [
      { ...s.download },
      { title: s.open.title, text: fill(s.open.text, values) },
      { title: s.loadFirefox.title, text: fill(s.loadFirefox.text, values) },
      { ...s.pinFirefox },
    ];
  }
  return [
    { ...s.download },
    { title: s.open.title, text: fill(s.open.text, values) },
    {
      title: s.devMode.title,
      text: fill(s.devMode.text, values),
      images: shots(["1-modo-desarrollador", `Interruptor «${labels.devMode ?? ""}» señalado`]),
    },
    {
      title: s.load.title,
      text: fill(s.load.text, values),
      images: shots(
        ["2-cargar-sin-empaquetar", `Botón «${labels.load}» señalado`],
        ["3-instalada", "Togetherly Sync ya aparece en la lista de extensiones"]
      ),
    },
    { ...s.pin },
  ];
}
