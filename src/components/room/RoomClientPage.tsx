"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { ExternalLink, Link2, Phone } from "lucide-react";
import { PLATFORM_LABELS } from "@/lib/platforms";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/room/VideoPlayer";
import { ChatPanel } from "@/components/room/ChatPanel";
import { TriviaPanel } from "@/components/room/TriviaPanel";
import { VideoCallPanel } from "@/components/room/VideoCallPanel";
import { CallStrip } from "@/components/room/CallStrip";
import { RoomHeader } from "@/components/room/RoomHeader";
import { JoinRoomCard, type JoinProfile } from "@/components/room/JoinRoomCard";
import { RoomFullScreen } from "@/components/room/RoomFullScreen";
import { useRoom } from "@/hooks/useRoom";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { CHARACTERS, DEFAULT_AVATAR } from "@/lib/characters";

interface Props { roomId: string }

// ── Perfil guardado en sessionStorage (lo deja /room al crear o unirse) ──────
const PROFILE_KEYS = { name: "togetherly-username", character: "togetherly-character" } as const;

function readSavedProfile(): string | null {
  try {
    const name = sessionStorage.getItem(PROFILE_KEYS.name);
    const character = sessionStorage.getItem(PROFILE_KEYS.character);
    return name && character ? `${character}|${name}` : null;
  } catch {
    return null;
  }
}

const noSubscribe = () => () => {};

function parseProfile(saved: string | null): JoinProfile | null {
  if (!saved) return null;
  const [characterId, ...nameParts] = saved.split("|");
  return { name: nameParts.join("|"), characterId };
}

function saveProfile({ name, characterId }: JoinProfile) {
  try {
    sessionStorage.setItem(PROFILE_KEYS.name, name);
    sessionStorage.setItem(PROFILE_KEYS.character, characterId);
  } catch {}
}

/** Pide un pase Premium (si quien entra lo tiene). Sin sesión o con error: null y límite gratis. */
async function fetchRoomPass(roomId: string): Promise<string | null> {
  try {
    const response = await fetch("/api/rooms/pass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    return response.ok ? ((await response.json()).pass ?? null) : null;
  } catch {
    return null;
  }
}

const postToExtension = (data: Record<string, unknown>) =>
  window.postMessage({ source: "togetherly-web", ...data }, window.location.origin);

export function RoomClientPage({ roomId }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [state, actions] = useRoom();
  const playerRef = useRef<VideoPlayerHandle>(null);
  const [extensionActive, setExtensionActive] = useState(false);
  const [showDevicePicker, setShowDevicePicker] = useState(false);

  const savedProfile = parseProfile(useSyncExternalStore(noSubscribe, readSavedProfile, () => null));
  const [formProfile, setFormProfile] = useState<JoinProfile | null>(null);
  const profile = formProfile ?? savedProfile;

  const call = useWebRTC(roomId);
  useKeyboardShortcuts(playerRef);
  useWakeLock(!!profile);

  // Entrar a la sala en cuanto hay perfil (guardado o recién llenado).
  const profileKey = profile ? `${profile.characterId}|${profile.name}` : null;
  useEffect(() => {
    if (!profileKey) return;
    const { name, characterId } = parseProfile(profileKey)!;
    const avatar = CHARACTERS.find((c) => c.id === characterId)?.emoji ?? DEFAULT_AVATAR;
    let isPublic = false;
    let roomName = name;
    try {
      isPublic = sessionStorage.getItem("togetherly-is-public") === "1";
      roomName = sessionStorage.getItem("togetherly-room-name") || name;
    } catch {}
    fetchRoomPass(roomId).then((pass) => actions.joinRoom(roomId, name, avatar, isPublic, roomName, pass));
    // actions.joinRoom es estable (useCallback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileKey, roomId]);

  // La extensión (si está instalada) avisa que existe y si está conectada.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      if (event.data?.source !== "togetherly-ext") return;
      if (["EXT_READY", "EXT_STATUS", "PONG"].includes(event.data.type)) setExtensionActive(event.data.connected ?? true);
    };
    window.addEventListener("message", onMessage);
    postToExtension({ type: "PING" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Al entrar, la extensión se conecta sola a esta misma sala.
  const youName = state.you?.name;
  const youAvatar = state.you?.avatar;
  useEffect(() => {
    if (!state.joined || !youName) return;
    postToExtension({ type: "JOIN_ROOM", roomId, username: youName, avatar: youAvatar });
    return () => postToExtension({ type: "LEAVE_ROOM" });
  }, [state.joined, roomId, youName, youAvatar]);

  if (state.roomFull) return <RoomFullScreen max={state.roomFull} />;

  if (!profile) {
    return (
      <JoinRoomCard
        roomId={roomId}
        onJoin={(newProfile) => {
          saveProfile(newProfile);
          setFormProfile(newProfile);
        }}
      />
    );
  }

  const inCall = call.callState === "connected" || call.callState === "calling";
  // En salas públicas no hay videollamada (puede haber desconocidos).
  const canCall = call.callState === "idle" && state.participants.length >= 2 && !state.isPublic;
  const hasVideo = !!state.videoUrl;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-day-50 dark:bg-night-950">
      <RoomHeader
        roomId={roomId}
        connected={state.connected && state.joined}
        participants={state.participants}
        maxParticipants={state.maxParticipants}
        premium={state.premium}
        onLeave={() => router.push("/")}
      />

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-5 lg:px-5 lg:pb-5">
        {/* La "tele" de la sala */}
        <div className={`relative flex min-w-0 flex-col ${hasVideo ? "" : "min-h-0 flex-shrink"} lg:flex-1`}>
          {/* Luz de lámpara detrás de la pantalla (solo pantallas grandes) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-10 -z-0 hidden opacity-70 lg:block"
            style={{ background: "radial-gradient(60% 55% at 22% 18%, color-mix(in oklab, var(--color-lamp) 30%, transparent), transparent 70%)" }}
          />
          <div
            className={`relative overflow-hidden bg-[#1a1426] sm:mx-4 sm:rounded-[22px] sm:border-[5px] sm:border-night-700 lg:mx-0 lg:min-h-0 lg:flex-1 lg:rounded-[28px] lg:border-[7px] lg:shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] ${
              hasVideo ? "aspect-video max-h-[42dvh] w-full sm:max-h-[50dvh] lg:aspect-auto lg:max-h-none" : "max-h-[60dvh] overflow-y-auto lg:max-h-none"
            }`}
          >
            <VideoPlayer
              ref={playerRef}
              videoUrl={state.videoUrl}
              roomId={roomId}
              extensionActive={extensionActive}
              nowWatching={state.nowWatching}
              onPlay={(time) => actions.sendPlay(roomId, time)}
              onPause={(time) => actions.sendPause(roomId, time)}
              onSeek={(time) => actions.sendSeek(roomId, time)}
              onUrlChange={(url) => actions.changeVideoUrl(roomId, url)}
              onRemotePlay={actions.onRemotePlay}
              onRemotePause={actions.onRemotePause}
              onRemoteSeek={actions.onRemoteSeek}
            />
            <VideoCallPanel
              callState={call.callState}
              incomingCall={call.incomingCall}
              showPicker={showDevicePicker}
              onPickerConfirm={(videoId, audioId) => {
                setShowDevicePicker(false);
                call.startCall(videoId, audioId);
              }}
              onPickerCancel={() => setShowDevicePicker(false)}
              onAnswer={call.answerCall}
              onDecline={call.declineCall}
              onEnd={call.endCall}
            />
          </div>

          {state.nowWatching && hasVideo && (
            // Alguien abrió una película con la extensión (y hay otro video en la sala): un toque y abres la misma.
            <div className="relative mx-3 mt-2 flex flex-wrap items-center gap-3 rounded-2xl bg-lamp/15 px-4 py-3 sm:mx-4 lg:mx-0 lg:mt-3">
              <p className="min-w-0 flex-1 text-sm font-semibold text-day-900 dark:text-white">
                {t.invite.roomNowWatching
                  .replace("{name}", state.nowWatching.by || "Alguien")
                  .replace("{platform}", PLATFORM_LABELS[state.nowWatching.platform])}
              </p>
              <a
                href={state.nowWatching.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-bold text-on-accent"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" /> {t.invite.openAndSync}
              </a>
            </div>
          )}

          {(hasVideo || canCall) && (
            <div className="relative flex flex-wrap gap-2 px-3 py-2 sm:px-4 lg:px-0 lg:pb-0 lg:pt-3">
              {hasVideo && (
                <button
                  onClick={() => playerRef.current?.openUrlBar()}
                  className="flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-day-900/70 ring-1 ring-day-900/15 hover:bg-day-900/5 dark:text-white/75 dark:ring-white/15 dark:hover:bg-white/5"
                >
                  <Link2 className="h-4 w-4" aria-hidden="true" /> {t.roomUi.changeVideo}
                </button>
              )}
              {canCall && (
                <button
                  onClick={() => setShowDevicePicker(true)}
                  className="flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-day-900/70 ring-1 ring-day-900/15 hover:bg-day-900/5 dark:text-white/75 dark:ring-white/15 dark:hover:bg-white/5"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" /> {t.roomUi.videoCall}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Chat: debajo en celular y tableta, al lado en pantallas grandes */}
        <aside className="relative flex min-h-[260px] flex-1 flex-col overflow-hidden border-t border-day-900/10 bg-day-100 dark:border-white/10 dark:bg-night-900 lg:w-[340px] lg:flex-none lg:rounded-[28px] lg:border-t-0 xl:w-[380px]">
          <AnimatePresence>
            {inCall && (
              <CallStrip
                callState={call.callState}
                localStream={call.localStream}
                remoteStream={call.remoteStream}
                isMicOn={call.isMicOn}
                isCameraOn={call.isCameraOn}
                onToggleMic={call.toggleMic}
                onToggleCamera={call.toggleCamera}
                onEnd={call.endCall}
              />
            )}
          </AnimatePresence>
          <TriviaPanel
            trivia={state.trivia}
            offer={state.triviaOffer}
            error={state.triviaError}
            onStart={(title) => actions.startTrivia(roomId, title)}
            onDismissOffer={actions.dismissTriviaOffer}
            onAnswer={(id, index, choice) => actions.answerTrivia(roomId, id, index, choice)}
            onSubmit={(id, question, options, answer) => actions.submitTrivia(roomId, id, question, options, answer)}
            onControl={(action) => actions.controlTrivia(roomId, action)}
          />
          <ChatPanel
            messages={state.messages}
            reactions={state.reactions}
            youId={state.you?.id ?? null}
            typingUsers={state.typingUsers}
            onSendMessage={(text) => actions.sendMessage(roomId, text)}
            onSendReaction={(emoji) => actions.sendReaction(roomId, emoji)}
            onTyping={() => actions.sendTyping(roomId)}
          />
        </aside>
      </main>
    </div>
  );
}
