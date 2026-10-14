"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, ExternalLink, Zap } from "lucide-react";
import { PLATFORM_LABELS, PLATFORM_COLORS, PLATFORM_BADGE, type Platform } from "@/lib/platforms";

interface CompanionEmbedProps {
  url: string;
  platform: Platform;
  extensionActive?: boolean;
  onPlay: (time: number | null) => void;
  onPause: (time: number | null) => void;
  onRemotePlay: (cb: (t: number) => void) => void;
  onRemotePause: (cb: (t: number) => void) => void;
}

export function CompanionEmbed({
  url, platform, extensionActive = false, onPlay, onPause, onRemotePlay, onRemotePause,
}: CompanionEmbedProps) {
  const [partnerAction, setPartnerAction] = useState<"play" | "pause" | null>(null);
  const [myState, setMyState] = useState<"playing" | "paused" | null>(null);

  useEffect(() => {
    onRemotePlay(() => {
      setPartnerAction("play");
      setTimeout(() => setPartnerAction(null), 7000);
    });
    onRemotePause(() => {
      setPartnerAction("pause");
      setTimeout(() => setPartnerAction(null), 7000);
    });
  }, [onRemotePlay, onRemotePause]);

  const label = PLATFORM_LABELS[platform];
  const color = PLATFORM_COLORS[platform];
  const badge = PLATFORM_BADGE[platform];

  const handlePlay = () => {
    onPlay(null); // sin tiempo: no rebobina a nadie
    setMyState("playing");
  };

  const handlePause = () => {
    onPause(null);
    setMyState("paused");
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 overflow-y-auto bg-plum p-5 sm:gap-6 sm:p-8">
      {/* Platform badge */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-xl"
          style={{ background: color }}
        >
          {badge || label[0]}
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-lg">{label}</p>
          <p className="text-white/40 text-sm mt-0.5">Modo sincronizado</p>
        </div>
      </div>

      {/* Open button */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-all hover:scale-105 active:scale-95 shadow-lg"
        style={{ background: color }}
      >
        <ExternalLink className="w-4 h-4" />
        Abrir en {label}
      </a>

      {/* Sync controls */}
      {extensionActive ? (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-accent/10 border border-accent/25">
          <Zap className="w-4 h-4 text-accent flex-shrink-0" />
          <div className="text-center">
            <p className="text-accent text-xs font-semibold">Extensión activa</p>
            <p className="text-white/40 text-[11px]">Play/pause se sincroniza automáticamente</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <p className="text-white/35 text-xs text-center">
            Cuando estés listo, sincroniza con tu pareja:
          </p>
          <div className="flex gap-3">
            <button
              onClick={handlePlay}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 ${
                myState === "playing"
                  ? "bg-accent text-on-accent shadow-lg"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              Di Play
            </button>
            <button
              onClick={handlePause}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 ${
                myState === "paused"
                  ? "bg-accent-2 text-on-accent shadow-lg"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              <Pause className="w-4 h-4 fill-current" />
              Di Pause
            </button>
          </div>
          <a
            href="/extension"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-semibold text-center text-accent underline underline-offset-4"
          >
            Instala la extensión para que se sincronice solo
          </a>
        </div>
      )}

      {/* Partner action banner */}
      <AnimatePresence>
        {partnerAction && (
          <motion.div
            key={partnerAction}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-4 left-4 right-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-night-800/95 border border-accent/30 shadow-xl"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: color }}
            >
              {partnerAction === "play" ? "▶" : "⏸"}
            </div>
            <div>
              <p className="text-white text-sm font-medium">
                Tu pareja {partnerAction === "play" ? "dio Play" : "pausó"} en {label}
              </p>
              <p className="text-white/40 text-xs">
                Da {partnerAction === "play" ? "play" : "pausa"} en tu app
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
