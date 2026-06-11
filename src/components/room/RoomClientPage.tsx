"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Copy, Check, LogOut, Heart, Wifi, WifiOff } from "lucide-react";
import { VideoPlayer } from "@/components/room/VideoPlayer";
import { ChatPanel } from "@/components/room/ChatPanel";
import { useRoom } from "@/hooks/useRoom";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { CHARACTERS } from "@/lib/characters";

interface Props { roomId: string }

export function RoomClientPage({ roomId }: Props) {
  const [state, actions] = useRoom();
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    const username = sessionStorage.getItem("togetherly-username");
    const characterId = sessionStorage.getItem("togetherly-character");
    if (!username || !characterId) {
      router.replace("/room");
      return;
    }
    const character = CHARACTERS.find((c) => c.id === characterId);
    const avatar = character?.emoji ?? "🎮";
    actions.joinRoom(roomId, username, avatar);
    setReady(true);
  }, [roomId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-day-50 dark:bg-night-950">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex items-center gap-3 text-day-900/40 dark:text-white/40"
        >
          <Heart className="w-5 h-5 text-neon-pink fill-neon-pink" />
          <span className="text-sm font-medium">Connecting...</span>
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
        <div className="flex-1 flex flex-col min-w-0 group">
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
