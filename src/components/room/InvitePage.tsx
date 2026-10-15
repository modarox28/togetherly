"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MonitorSmartphone, Puzzle } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { SOCKET_URL, wakeSocketServer } from "@/lib/socket";
import { isValidRoomId } from "@/lib/room";
import { parseNowWatching, type NowWatching } from "@/lib/streaming";
import { PLATFORM_LABELS } from "@/lib/platforms";
import { detectExtension, joinRoomWithExtension } from "@/lib/extensionBridge";
import { CHARACTERS, DEFAULT_AVATAR } from "@/lib/characters";

// Página del enlace de invitación (/j/CODIGO). Hace lo mismo que Teleparty o Rave:
//   · con la extensión → conecta la extensión a la sala y abre la misma película;
//   · sin la extensión → explica cómo instalarla (o deja entrar solo al chat);
//   · en celular → lleva a la sala web (chat y videollamada).

type Step = "checking" | "name" | "joining" | "waiting" | "opening" | "install" | "touch" | "notFound";

interface Preview {
  exists: boolean;
  nowWatching: NowWatching | null;
}

const NAME_KEY = "togetherly-name";
const OPEN_DELAY_MS = 1200;
const POLL_MS = 3000;

/** Una consulta al servidor de salas; null si no respondió. */
async function fetchPreviewOnce(code: string): Promise<Preview | null> {
  try {
    const response = await fetch(`${SOCKET_URL}/api/rooms/${encodeURIComponent(code)}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    return { exists: data?.exists === true, nowWatching: parseNowWatching(data?.nowWatching) };
  } catch {
    return null; // El servidor está dormido o arrancando.
  }
}

/** Pregunta por la sala; reintenta (~75 s) mientras el servidor gratis despierta. */
async function fetchPreview(code: string, onSlow: () => void): Promise<Preview | null> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const preview = await fetchPreviewOnce(code);
    if (preview) return preview;
    if (attempt === 0) onSlow();
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  return null;
}

function readSavedName() {
  try {
    return localStorage.getItem(NAME_KEY)?.trim().slice(0, 20) || "";
  } catch {
    return "";
  }
}

const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(pointer: fine)").matches;

export function InvitePage({ code }: { code: string }) {
  const { t } = useLanguage();
  const router = useRouter();
  const validCode = isValidRoomId(code);
  const [step, setStep] = useState<Step>("checking");
  const [waking, setWaking] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [name, setName] = useState("");

  const platformName = preview?.nowWatching ? PLATFORM_LABELS[preview.nowWatching.platform] : null;

  /** Lleva a la sala web (chat y videollamada) con el nombre ya puesto. */
  const goToWebRoom = (displayName: string) => {
    try {
      sessionStorage.setItem("togetherly-username", displayName || "Invitado");
      // Si ya eligió personaje en /room se respeta; si no, el primero.
      if (!sessionStorage.getItem("togetherly-character")) sessionStorage.setItem("togetherly-character", CHARACTERS[0].id);
    } catch {}
    router.replace(`/room/${code}`);
  };

  const enterRoom = async (displayName: string, current: Preview) => {
    try {
      localStorage.setItem(NAME_KEY, displayName);
    } catch {}
    setStep("joining");
    let avatar = DEFAULT_AVATAR;
    try {
      avatar = CHARACTERS.find((c) => c.id === sessionStorage.getItem("togetherly-character"))?.emoji ?? DEFAULT_AVATAR;
    } catch {}
    const joined = await joinRoomWithExtension(code, displayName, avatar);
    if (!joined) goToWebRoom(displayName);
    else if (current.nowWatching) openMovie(current.nowWatching);
    // Todavía no eligen película: se espera aquí y se abre sola cuando la elijan.
    else setStep("waiting");
  };

  /** La extensión ya está en la sala: al cargar la película se pone al día sola. */
  const openMovie = (nowWatching: NowWatching) => {
    setPreview((prev) => ({ exists: true, ...prev, nowWatching }));
    setStep("opening");
    setTimeout(() => window.location.assign(nowWatching.url), OPEN_DELAY_MS);
  };

  // Esperando a que alguien de la sala abra la película.
  useEffect(() => {
    if (step !== "waiting") return;
    let cancelled = false;
    const timer = setInterval(async () => {
      const latest = await fetchPreviewOnce(code);
      if (!cancelled && latest?.nowWatching) {
        clearInterval(timer);
        openMovie(latest.nowWatching);
      }
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [step, code]);

  useEffect(() => {
    if (!validCode) return;
    let cancelled = false;
    wakeSocketServer();
    (async () => {
      const [hasExtension, result] = await Promise.all([detectExtension(), fetchPreview(code, () => setWaking(true))]);
      if (cancelled) return;
      if (!result?.exists) {
        setStep("notFound");
        return;
      }
      setPreview(result);
      if (!hasExtension) {
        setStep(isTouchDevice() ? "touch" : "install");
        return;
      }
      const savedName = readSavedName();
      if (savedName) enterRoom(savedName, result);
      else setStep("name");
    })();
    return () => {
      cancelled = true;
    };
    // enterRoom solo depende de code (ya en la lista)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, validCode]);

  const currentStep: Step = validCode ? step : "notFound";
  const host = preview?.nowWatching?.by;

  return (
    <div className="grain flex min-h-dvh flex-col bg-day-50 dark:bg-night-950">
      <header className="px-5 py-4">
        <Link href="/" className="inline-flex items-center gap-2 text-accent">
          <LogoMark />
          <span className="font-display text-xl font-extrabold tracking-tight text-day-900 dark:text-white">Togetherly</span>
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-12 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-xl shadow-plum/5 sm:p-8 dark:bg-night-900" aria-live="polite">
          {currentStep === "checking" && (
            <Status text={waking ? t.invite.waking : t.invite.checking} />
          )}

          {currentStep === "notFound" && (
            <>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-day-900 dark:text-white">{t.invite.notFound}</h1>
              <p className="mt-3 leading-relaxed text-day-900/70 dark:text-white/70">{t.invite.notFoundText}</p>
              <Link href="/room" className="mt-6 block rounded-full bg-accent py-3.5 text-center font-bold text-on-accent">
                {t.invite.createOwn}
              </Link>
            </>
          )}

          {(currentStep === "name" || currentStep === "install" || currentStep === "touch") && (
            <>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-day-900 dark:text-white">
                {host ? t.invite.title.replace("{name}", host) : t.invite.titleNoHost}
              </h1>
              <p className="mt-2 text-day-900/70 dark:text-white/70">
                {platformName ? t.invite.watching.replace("{platform}", platformName) : t.invite.notWatchingYet}
              </p>
            </>
          )}

          {currentStep === "name" && preview && (
            <form
              className="mt-6"
              onSubmit={(event) => {
                event.preventDefault();
                const clean = name.trim();
                if (clean) enterRoom(clean, preview);
              }}
            >
              <label htmlFor="invite-name" className="block text-sm font-bold text-day-900 dark:text-white">{t.invite.nameLabel}</label>
              <input
                id="invite-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.invite.namePlaceholder}
                maxLength={20}
                autoComplete="nickname"
                autoFocus
                className="mt-2 w-full rounded-xl border border-day-200 bg-day-50 px-4 py-3 text-base text-day-900 outline-none placeholder:text-day-900/40 focus:border-accent dark:border-night-600 dark:bg-night-800 dark:text-white dark:placeholder:text-white/35"
              />
              <button type="submit" disabled={!name.trim()} className="mt-5 w-full rounded-full bg-accent py-3.5 font-bold text-on-accent disabled:opacity-50">
                {t.invite.enter}
              </button>
            </form>
          )}

          {currentStep === "joining" && <Status text={t.invite.checking} />}

          {currentStep === "waiting" && (
            <>
              <Status text={host ? t.invite.waitingFor.replace("{name}", host) : t.invite.waitingGeneric} />
              <p className="mt-3 text-sm leading-relaxed text-day-900/65 dark:text-white/60">{t.invite.waitingHint}</p>
              <button onClick={() => goToWebRoom(readSavedName())} className="mt-6 w-full rounded-full py-3 text-sm font-bold text-day-900 ring-2 ring-day-900/15 hover:bg-day-900/5 dark:text-white dark:ring-white/20 dark:hover:bg-white/5">
                {t.invite.waitInWebRoom}
              </button>
            </>
          )}

          {currentStep === "opening" && preview?.nowWatching && (
            <>
              <Status text={t.invite.opening.replace("{platform}", platformName ?? "")} />
              <p className="mt-3 text-sm leading-relaxed text-day-900/65 dark:text-white/60">{t.invite.openingHint}</p>
              <a href={preview.nowWatching.url} className="mt-5 block rounded-full bg-accent py-3 text-center font-bold text-on-accent">
                {t.invite.openNow}
              </a>
            </>
          )}

          {currentStep === "install" && (
            <>
              <p className="mt-5 rounded-2xl bg-day-100 p-4 text-sm leading-relaxed text-day-900/80 dark:bg-night-800 dark:text-white/80">
                {platformName ? t.invite.needExtension.replace("{platform}", platformName) : t.invite.needExtensionGeneric}
              </p>
              <ol className="mt-5 space-y-4">
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent font-bold text-on-accent">1</span>
                  <div>
                    <a href="/extension" target="_blank" rel="noopener" className="inline-flex items-center gap-2 font-bold text-accent underline underline-offset-4">
                      <Puzzle className="h-4 w-4" aria-hidden="true" /> {t.invite.installStep}
                    </a>
                    <p className="mt-1 text-sm text-day-900/60 dark:text-white/55">{t.invite.installHint}</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent font-bold text-on-accent">2</span>
                  <div className="flex-1">
                    <p className="font-bold text-day-900 dark:text-white">{t.invite.returnStep}</p>
                    {/* Las extensiones recién instaladas solo funcionan en páginas cargadas después */}
                    <button onClick={() => window.location.reload()} className="mt-2 w-full rounded-full bg-accent py-3 font-bold text-on-accent">
                      {t.invite.installed}
                    </button>
                  </div>
                </li>
              </ol>
              <button onClick={() => goToWebRoom(readSavedName())} className="mt-6 w-full text-center text-sm font-semibold text-day-900/60 underline underline-offset-4 dark:text-white/55">
                {t.invite.withoutExtension}
              </button>
            </>
          )}

          {currentStep === "touch" && (
            <>
              <div className="mt-5 flex gap-3 rounded-2xl bg-day-100 p-4 dark:bg-night-800">
                <MonitorSmartphone className="h-5 w-5 flex-shrink-0 text-accent" aria-hidden="true" />
                <div>
                  <p className="font-bold text-day-900 dark:text-white">{t.invite.touchTitle}</p>
                  <p className="mt-1 text-sm leading-relaxed text-day-900/70 dark:text-white/65">{t.invite.touchText}</p>
                </div>
              </div>
              <button onClick={() => goToWebRoom(readSavedName())} className="mt-6 w-full rounded-full bg-accent py-3.5 font-bold text-on-accent">
                {t.invite.enterRoom}
              </button>
            </>
          )}

          <p className="mt-6 text-center text-xs text-day-900/45 dark:text-white/40">
            {t.roomUi.room} <span className="font-display font-extrabold tracking-[0.12em] text-accent">{code}</span>
          </p>
        </div>
      </main>
    </div>
  );
}

function Status({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-3 font-display text-xl font-bold text-day-900 dark:text-white" role="status">
      <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-accent" aria-hidden="true" />
      {text}
    </p>
  );
}
