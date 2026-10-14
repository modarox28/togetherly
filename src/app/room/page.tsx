"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Puzzle } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { LogoMark } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { CharacterPicker } from "@/components/room/CharacterPicker";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useFeatures } from "@/components/providers/FeaturesProvider";
import { wakeSocketServer } from "@/lib/socket";
import { generateRoomId, normalizeRoomCode, ROOM_CODE_PATTERN } from "@/lib/room";
import { CHARACTERS } from "@/lib/characters";

type Mode = "create" | "join";

const inputClass =
  "mt-2 w-full rounded-xl border border-day-200 bg-day-50 px-4 py-3 text-base text-day-900 outline-none placeholder:text-day-900/40 focus:border-accent dark:border-night-600 dark:bg-night-800 dark:text-white dark:placeholder:text-white/35";

// /room: crear una sala nueva o entrar a una con su código.
export default function RoomSetupPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { authEnabled } = useFeatures();
  const { data: session } = useSession();

  // Despierta el servidor de salas mientras la persona llena el formulario.
  useEffect(() => wakeSocketServer(), []);

  const [mode, setMode] = useState<Mode>("create");
  // null = la persona no ha escrito: se propone el nombre de su cuenta, si tiene.
  const [typedName, setTypedName] = useState<string | null>(null);
  const username = typedName ?? session?.user?.name ?? "";
  const [roomName, setRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [characterId, setCharacterId] = useState(CHARACTERS[0].id);
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({});

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const name = username.trim();
    const code = normalizeRoomCode(joinCode);
    const nextErrors = {
      name: name ? undefined : t.room.nameRequired,
      code: mode === "join" && !ROOM_CODE_PATTERN.test(code) ? t.room.invalidCode : undefined,
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.code) return;

    try {
      sessionStorage.setItem("togetherly-username", name);
      sessionStorage.setItem("togetherly-character", characterId);
      sessionStorage.setItem("togetherly-is-public", isPublic ? "1" : "0");
      sessionStorage.setItem("togetherly-room-name", roomName.trim() || name);
    } catch {}
    router.push(`/room/${mode === "create" ? generateRoomId() : code}`);
  };

  return (
    <div className="grain flex min-h-dvh flex-col bg-day-50 dark:bg-night-950">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-accent">
          <LogoMark />
          <span className="font-display text-xl font-extrabold tracking-tight text-day-900 dark:text-white">Togetherly</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-12 pt-2 sm:items-center sm:pt-0">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-day-900 sm:text-4xl dark:text-white">
            {t.roomUi.setupTitle}
          </h1>

          <form onSubmit={submit} className="mt-6 rounded-[28px] bg-white p-6 shadow-xl shadow-plum/5 sm:p-8 dark:bg-night-900">
            {/* Crear o unirse */}
            <div className="grid grid-cols-2 gap-1 rounded-full bg-day-100 p-1 dark:bg-night-800" role="tablist">
              {(["create", "join"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={mode === option}
                  onClick={() => {
                    setMode(option);
                    setErrors({});
                  }}
                  className={`rounded-full py-2.5 text-sm font-bold transition-colors ${
                    mode === option ? "bg-accent text-on-accent" : "text-day-900/60 hover:text-day-900 dark:text-white/60 dark:hover:text-white"
                  }`}
                >
                  {option === "create" ? t.roomUi.setupCreate : t.roomUi.setupJoin}
                </button>
              ))}
            </div>

            {mode === "join" && (
              <>
                <label htmlFor="room-code" className="mt-6 block text-sm font-bold text-day-900 dark:text-white">
                  {t.room.roomCode}
                </label>
                <input
                  id="room-code"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(normalizeRoomCode(e.target.value));
                    setErrors((prev) => ({ ...prev, code: undefined }));
                  }}
                  placeholder="ABC234"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  aria-invalid={!!errors.code}
                  className={`${inputClass} text-center font-display text-2xl font-extrabold tracking-[0.3em]`}
                />
                {errors.code && <p role="alert" className="mt-1.5 text-sm text-red-500 dark:text-blanket">{errors.code}</p>}
              </>
            )}

            <label htmlFor="your-name" className="mt-6 block text-sm font-bold text-day-900 dark:text-white">
              {t.room.yourName}
            </label>
            <input
              id="your-name"
              value={username}
              onChange={(e) => {
                setTypedName(e.target.value);
                setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder={t.room.namePlaceholder}
              maxLength={20}
              autoComplete="nickname"
              aria-invalid={!!errors.name}
              className={inputClass}
            />
            {errors.name && <p role="alert" className="mt-1.5 text-sm text-red-500 dark:text-blanket">{errors.name}</p>}

            {mode === "create" && (
              <>
                <label htmlFor="room-name" className="mt-5 block text-sm font-bold text-day-900 dark:text-white">
                  {t.roomUi.roomNameOptional}
                </label>
                <input
                  id="room-name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder={t.room.roomNamePlaceholder}
                  maxLength={30}
                  className={inputClass}
                />
                <label className="mt-5 flex cursor-pointer items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-bold text-day-900 dark:text-white">{t.room.publicRoom}</span>
                    <span className="block text-xs text-day-900/55 dark:text-white/50">{t.room.publicRoomHint}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-6 w-6 flex-shrink-0 accent-[var(--accent)]"
                  />
                </label>
              </>
            )}

            <div className="mt-6">
              <CharacterPicker value={characterId} onChange={setCharacterId} />
            </div>

            <button type="submit" className="mt-7 w-full rounded-full bg-accent py-3.5 text-base font-bold text-on-accent">
              {mode === "create" ? t.room.createButton : t.room.joinButton}
            </button>
          </form>

          <p className="mt-5 flex items-start gap-2 px-2 text-sm text-day-900/60 pointer-coarse:hidden dark:text-white/55">
            <Puzzle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" aria-hidden="true" />
            <span>
              {t.roomUi.extensionTip}{" "}
              <Link href="/extension" className="font-bold text-accent underline underline-offset-4">
                {t.roomUi.extInstall}
              </Link>
            </span>
          </p>

          {authEnabled && (
            <p className="mt-3 px-2 text-sm text-day-900/60 dark:text-white/55">
              {session?.user ? (
                <>
                  {t.roomUi.signedInAs.replace("{name}", session.user.name ?? "")}{" · "}
                  <button onClick={() => signOut({ callbackUrl: "/room" })} className="font-bold text-accent underline underline-offset-4">
                    {t.roomUi.signOut}
                  </button>
                </>
              ) : (
                <>
                  {t.roomUi.accountPrompt}{" "}
                  <Link href="/login" className="font-bold text-accent underline underline-offset-4">{t.roomUi.signIn}</Link>
                  {" · "}
                  <Link href="/register" className="font-bold text-accent underline underline-offset-4">{t.roomUi.signUp}</Link>
                </>
              )}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
