"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Copy, Check, LogOut, Heart, Wifi, WifiOff } from "lucide-react";
import { VideoPlayer } from "@/components/room/VideoPlayer";
import { ChatPanel } from "@/components/room/ChatPanel";
import { useRoom } from "@/hooks/useRoom";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Props { roomId: string }

export function RoomClientPage({ roomId }: Props) {
  const [state, actions] = useRoom();
  const [username, setUsername] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();
  const router = useRouter();

  const handleJoin = () => {
    if (!username.trim()) return;
    actions.joinRoom(roomId, username.trim());
    setHasJoined(true);
  };

  const handleCopyLink = () => {
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
          <div className="glass rounded-3xl p-8 border shadow-2xl
            bg-white/90 dark:bg-night-800/60
            border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-bold gradient-text text-base">Togetherly</span>
            </div>

            <h1 className="text-2xl font-bold text-day-900 dark:text-white mb-1">
              Room <span className="gradient-text font-mono">{roomId}</span>
            </h1>
            <p className="text-sm text-day-900/40 dark:text-white/40 mb-6">Enter your name to join</p>

            <Input
              label={t.room.yourName}
              placeholder={t.room.namePlaceholder}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              maxLength={20}
            />

            <Button className="w-full mt-4" size="lg" onClick={handleJoin} disabled={!username.trim()}>
              {t.room.joinButton}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-day-100 dark:bg-night-950 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 glass border-b flex-shrink-0 z-10
        bg-white/90 dark:bg-night-900/80
        border-black/5 dark:border-white/5">
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
          <Button
            size="sm" variant="ghost"
            onClick={handleCopyLink}
            icon={copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          >
            <span className="hidden sm:inline">{copied ? t.watchRoom.linkCopied : t.watchRoom.copyLink}</span>
          </Button>
          <Button
            size="sm" variant="ghost"
            onClick={() => router.push("/")}
            icon={<LogOut className="w-3.5 h-3.5" />}
          >
            <span className="hidden sm:inline">{t.watchRoom.leaveRoom}</span>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
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

        <div className="w-72 xl:w-80 flex-shrink-0 border-l border-black/5 dark:border-white/5">
          <ChatPanel
            messages={state.messages}
            reactions={state.reactions}
            participants={state.participants}
            youId={state.you?.id ?? null}
            roomId={roomId}
            onSendMessage={(text) => actions.sendMessage(roomId, text)}
            onSendReaction={(emoji) => actions.sendReaction(roomId, emoji)}
          />
        </div>
      </div>
    </div>
  );
}
