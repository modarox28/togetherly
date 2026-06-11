"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, LogOut, Heart, Wifi, WifiOff, ArrowRight, Share2 } from "lucide-react";
import { VideoPlayer } from "@/components/room/VideoPlayer";
import { ChatPanel } from "@/components/room/ChatPanel";
import { VideoCallPanel } from "@/components/room/VideoCallPanel";
import { CallStrip } from "@/components/room/CallStrip";
import { useRoom } from "@/hooks/useRoom";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CHARACTERS } from "@/lib/characters";

interface Props { roomId: string }

export function RoomClientPage({ roomId }: Props) {
  const [state, actions] = useRoom();
  const [copied, setCopied] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  const [username, setUsername] = useState("");
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [step, setStep] = useState<"name" | "character">("name");

  const { t } = useLanguage();
  const router = useRouter();

  const {
    callState, localStream, remoteStream, incomingCall,
    isMicOn, isCameraOn,
    startCall, answerCall, declineCall, endCall,
    toggleMic, toggleCamera,
  } = useWebRTC(roomId);

  useWakeLock(hasJoined);

  useEffect(() => {
    const storedName = sessionStorage.getItem("togetherly-username");
    const storedCharId = sessionStorage.getItem("togetherly-character");
    if (storedName && storedCharId) {
      const character = CHARACTERS.find((c) => c.id === storedCharId);
      const avatar = character?.emoji ?? "🎮";
      const isPublic = sessionStorage.getItem("togetherly-is-public") === "1";
      const roomName = sessionStorage.getItem("togetherly-room-name") || storedName + "'s room";
      actions.joinRoom(roomId, storedName, avatar, isPublic, roomName);
      setHasJoined(true);
    }
  }, [roomId]);

  const handleJoinWithForm = () => {
    if (!username.trim() || !selectedCharacter) return;
    const character = CHARACTERS.find((c) => c.id === selectedCharacter);
    const avatar = character?.emoji ?? "🎮";
    sessionStorage.setItem("togetherly-username", username.trim());
    sessionStorage.setItem("togetherly-character", selectedCharacter);
    actions.joinRoom(roomId, username.trim(), avatar);
    setHasJoined(true);
  };

  const handleShareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Togetherly — Room ${roomId}`,
          text: "¡Únete a ver conmigo!",
          url: window.location.href,
        });
        return;
      } catch {}
    }
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!hasJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-day-50 dark:bg-night-950 px-4">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full animate-blob-drift"
            style={{ background: "radial-gradient(circle, rgba(192,132,252,0.15) 0%, transparent 70%)" }} />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full animate-blob-drift-reverse"
            style={{ background: "radial-gradient(circle, rgba(244,114,182,0.12) 0%, transparent 70%)" }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative w-full max-w-sm"
        >
          <div className="glass rounded-3xl p-8 border shadow-2xl bg-white/90 dark:bg-night-800/60 border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-bold gradient-text text-base">Togetherly</span>
            </div>

            <h1 className="text-xl font-bold text-day-900 dark:text-white mb-1">
              Room <span className="gradient-text font-mono">{roomId}</span>
            </h1>

            <AnimatePresence mode="wait">
              {step === "name" ? (
                <motion.div key="name" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <p className="text-sm text-day-900/40 dark:text-white/40 mb-5 mt-1">{t.room.namePlaceholder}</p>
                  <Input
                    label={t.room.yourName}
                    placeholder={t.room.namePlaceholder}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && username.trim() && setStep("character")}
                    maxLength={20}
                  />
                  <Button className="w-full mt-4" size="lg" onClick={() => setStep("character")} disabled={!username.trim()}>
                    {t.room.chooseCharacter} <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="character" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                  <p className="text-sm text-day-900/40 dark:text-white/40 mb-4 mt-1">{t.room.chooseCharacter}</p>
                  <div className="grid grid-cols-4 gap-2 mb-5">
                    {CHARACTERS.map((char) => (
                      <button
                        key={char.id}
                        onClick={() => setSelectedCharacter(char.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all cursor-pointer ${
                          selectedCharacter === char.id
                            ? "border-neon-purple bg-neon-purple/10 scale-105"
                            : "border-transparent bg-black/3 dark:bg-white/3 hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        <span className="text-xl">{char.emoji}</span>
                        <span className="text-[9px] font-medium text-day-900/60 dark:text-white/60 leading-tight text-center">{char.name}</span>
                      </button>
                    ))}
                  </div>
                  <Button className="w-full" size="lg" onClick={handleJoinWithForm} disabled={!selectedCharacter}>
                    <Heart className="w-4 h-4" /> {t.room.joinButton}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-day-100 dark:bg-night-950 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 glass border-b flex-shrink-0 z-10
        bg-white/90 dark:bg-night-900/80 border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
            <Heart className="w-3.5 h-3.5 text-white fill-white" />
          </div>
          <div>
            <span className="font-semibold text-day-900 dark:text-white text-sm">
              Room <span className="gradient-text font-mono font-bold">{roomId}</span>
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {state.connected
                ? <Wifi className="w-3 h-3 text-green-500" />
                : <WifiOff className="w-3 h-3 text-red-400" />}
              <span className="text-[10px] text-day-900/40 dark:text-white/30">
                {state.participants.length} watching
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={handleShareLink}
            icon={copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}>
            <span className="hidden sm:inline">{copied ? t.watchRoom.linkCopied : t.watchRoom.copyLink}</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => router.push("/")}
            icon={<LogOut className="w-3.5 h-3.5" />}>
            <span className="hidden sm:inline">{t.watchRoom.leaveRoom}</span>
          </Button>
        </div>
      </header>

      {/* Main content — stacks vertically on mobile, horizontal on desktop */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Video area */}
        <div className="h-[56vw] max-h-[60vh] md:h-auto md:max-h-none md:flex-1 flex flex-col min-w-0 group relative flex-shrink-0">
          <VideoCallPanel
            callState={callState}
            incomingCall={incomingCall}
            onStart={startCall}
            onAnswer={answerCall}
            onDecline={declineCall}
            onEnd={endCall}
            participantCount={state.participants.length}
          />
          <VideoPlayer
            videoUrl={state.videoUrl}
            roomId={roomId}
            isSynced={state.connected}
            onPlay={(t) => actions.sendPlay(roomId, t)}
            onPause={(t) => actions.sendPause(roomId, t)}
            onSeek={(t) => actions.sendSeek(roomId, t)}
            onUrlChange={(url) => actions.changeVideoUrl(roomId, url)}
            onRemotePlay={actions.onRemotePlay}
            onRemotePause={actions.onRemotePause}
            onRemoteSeek={actions.onRemoteSeek}
          />
        </div>

        {/* Chat column — includes call strip when active */}
        <div className="flex-1 md:flex-none md:w-72 xl:w-80 flex flex-col min-h-0 border-t md:border-t-0 md:border-l border-black/5 dark:border-white/5 overflow-hidden">
          <AnimatePresence>
            {(callState === "connected" || callState === "calling") && (
              <CallStrip
                callState={callState}
                localStream={localStream}
                remoteStream={remoteStream}
                isMicOn={isMicOn}
                isCameraOn={isCameraOn}
                onToggleMic={toggleMic}
                onToggleCamera={toggleCamera}
                onEnd={endCall}
              />
            )}
          </AnimatePresence>
          <ChatPanel
            messages={state.messages}
            reactions={state.reactions}
            participants={state.participants}
            youId={state.you?.id ?? null}
            roomId={roomId}
            typingUsers={state.typingUsers}
            onSendMessage={(text) => actions.sendMessage(roomId, text)}
            onSendReaction={(emoji) => actions.sendReaction(roomId, emoji)}
            onTyping={() => actions.sendTyping(roomId)}
          />
        </div>
      </div>
    </div>
  );
}
