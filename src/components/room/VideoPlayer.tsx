"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import YouTube, { type YouTubePlayer, type YouTubeEvent } from "react-youtube";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, CheckCircle2, Link } from "lucide-react";
import { extractYouTubeId, formatTime } from "@/lib/utils";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface VideoPlayerProps {
  videoUrl: string | null;
  roomId: string;
  isSynced: boolean;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onSeek: (currentTime: number) => void;
  onUrlChange: (url: string) => void;
  onRemotePlay: (cb: (t: number) => void) => void;
  onRemotePause: (cb: (t: number) => void) => void;
  onRemoteSeek: (cb: (t: number) => void) => void;
}

export function VideoPlayer({
  videoUrl,
  isSynced,
  onPlay,
  onPause,
  onSeek,
  onUrlChange,
  onRemotePlay,
  onRemotePause,
  onRemoteSeek,
}: VideoPlayerProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const isRemoteAction = useRef(false);
  const pendingSyncRef = useRef<{ time: number; action: "play" | "seek" } | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [showVolume, setShowVolume] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlBar, setShowUrlBar] = useState(false);
  const [syncIndicator, setSyncIndicator] = useState(false);
  const [pendingSync, setPendingSync] = useState<{ time: number; by?: string } | null>(null);

  const { t } = useLanguage();
  const videoId = videoUrl ? extractYouTubeId(videoUrl) : null;

  const showSync = () => {
    setSyncIndicator(true);
    setTimeout(() => setSyncIndicator(false), 1500);
  };

  // Register remote callbacks
  useEffect(() => {
    onRemotePlay((time) => {
      isRemoteAction.current = true;
      if (playerRef.current) {
        playerRef.current.seekTo(time, true);
        const result = playerRef.current.playVideo();
        // iOS blocks programmatic play — show tap-to-sync banner
        if (result === undefined || result === null) {
          pendingSyncRef.current = { time, action: "play" };
          setPendingSync({ time });
        }
      } else {
        pendingSyncRef.current = { time, action: "play" };
        setPendingSync({ time });
      }
      setIsPlaying(true);
      showSync();
    });

    onRemotePause((time) => {
      isRemoteAction.current = true;
      playerRef.current?.seekTo(time, true);
      playerRef.current?.pauseVideo();
      setIsPlaying(false);
      showSync();
    });

    onRemoteSeek((time) => {
      isRemoteAction.current = true;
      playerRef.current?.seekTo(time, true);
      setCurrentTime(time);
      showSync();
    });
  }, [onRemotePlay, onRemotePause, onRemoteSeek]);

  // Progress update interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && isPlaying && !isDragging) {
        const t = playerRef.current.getCurrentTime?.() ?? 0;
        setCurrentTime(t);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, isDragging]);

  const handleReady = useCallback((e: YouTubeEvent) => {
    playerRef.current = e.target;
    setDuration(e.target.getDuration());
  }, []);

  const handleStateChange = useCallback(
    (e: YouTubeEvent) => {
      const YT = (window as any).YT;
      if (!YT) return;

      if (e.data === YT.PlayerState.PLAYING) {
        setIsPlaying(true);
        setPendingSync(null);
        if (!isRemoteAction.current) onPlay(e.target.getCurrentTime());
        isRemoteAction.current = false;
      } else if (e.data === YT.PlayerState.PAUSED) {
        setIsPlaying(false);
        if (!isRemoteAction.current) onPause(e.target.getCurrentTime());
        isRemoteAction.current = false;
      }
    },
    [onPlay, onPause]
  );

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleTapToSync = () => {
    if (!playerRef.current || !pendingSyncRef.current) return;
    const { time } = pendingSyncRef.current;
    playerRef.current.seekTo(time, true);
    playerRef.current.playVideo();
    pendingSyncRef.current = null;
    setPendingSync(null);
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value);
    setVolume(v);
    if (playerRef.current) {
      playerRef.current.setVolume(v);
      if (v === 0) {
        playerRef.current.mute();
        setIsMuted(true);
      } else {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };

  const handleSeekBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  const commitSeek = (value: number) => {
    playerRef.current?.seekTo(value, true);
    onSeek(value);
    setIsDragging(false);
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    commitSeek(parseFloat((e.target as HTMLInputElement).value));
  };

  const handleSeekTouchEnd = (e: React.TouchEvent<HTMLInputElement>) => {
    commitSeek(parseFloat((e.target as HTMLInputElement).value));
  };

  const handleLoadUrl = () => {
    const clean = urlInput.trim();
    if (!clean) return;
    onUrlChange(clean);
    setUrlInput("");
  };

  if (!videoId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-night-900 dark:bg-night-900 bg-day-100/50">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center mb-4">
            <Play className="w-7 h-7 text-neon-purple" />
          </div>
          <h3 className="text-white dark:text-white text-day-900 font-semibold text-lg">
            {t.watchRoom.addVideo}
          </h3>
          <p className="text-white/40 dark:text-white/40 text-day-900/40 text-sm">
            {t.watchRoom.pasteToStart}
          </p>
        </div>
        <div className="w-full max-w-md flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={t.watchRoom.videoPaste}
            onKeyDown={(e) => e.key === "Enter" && handleLoadUrl()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-night-800 dark:bg-night-800 bg-white border border-night-600 dark:border-night-600 border-day-200 text-white dark:text-white text-day-900 placeholder:text-white/30 dark:placeholder:text-white/30 placeholder:text-day-900/40 text-sm outline-none focus:border-neon-purple transition-all"
          />
          <button
            onClick={handleLoadUrl}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-pink text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t.watchRoom.loadVideo}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-black relative">
      {/* YouTube Player */}
      <div className="flex-1 relative">
        <YouTube
          videoId={videoId}
          onReady={handleReady}
          onStateChange={handleStateChange}
          opts={{
            width: "100%",
            height: "100%",
            playerVars: {
              controls: 0,
              modestbranding: 1,
              rel: 0,
              iv_load_policy: 3,
              disablekb: 1,
              fs: 0,
              playsinline: 1,
            },
          }}
          className="absolute inset-0 w-full h-full"
          iframeClassName="w-full h-full"
        />

        {/* Sync indicator */}
        <AnimatePresence>
          {syncIndicator && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-night-800/90 border border-neon-purple/30 text-neon-purple text-xs font-medium z-20"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t.watchRoom.syncedWith}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tap-to-sync banner (iOS autoplay blocked) */}
        <AnimatePresence>
          {pendingSync && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-0 flex items-center justify-center z-30 bg-black/40"
            >
              <button
                onClick={handleTapToSync}
                className="flex flex-col items-center gap-3 px-8 py-5 rounded-2xl bg-night-900/95 border border-neon-purple/40 text-white shadow-2xl"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
                  <Play className="w-6 h-6 fill-white text-white ml-1" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm">Tu pareja dio play</p>
                  <p className="text-white/50 text-xs mt-0.5">Toca para sincronizar</p>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Click/tap overlay — only when no pending sync */}
        {!pendingSync && (
          <div className="absolute inset-0 cursor-pointer z-10" onClick={togglePlay} />
        )}
      </div>

      {/* Controls bar — always visible on mobile, hover on desktop */}
      <div className="bg-gradient-to-t from-black/95 to-transparent pb-3 px-4 pt-8 absolute bottom-0 left-0 right-0 z-20
        opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200"
        style={{ pointerEvents: "auto" }}
      >
        {/* Progress bar */}
        <div className="mb-3 relative h-4 flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeekBar}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={handleSeekMouseUp}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={handleSeekTouchEnd}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 touch-none"
          />
          <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-purple to-neon-pink rounded-full"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%", transition: isDragging ? "none" : "width 0.5s linear" }}
            />
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-9 h-9 flex items-center justify-center text-white hover:text-neon-purple transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
          <div className="relative flex items-center">
            <button
              onClick={() => setShowVolume((v) => !v)}
              onBlur={() => setTimeout(() => setShowVolume(false), 150)}
              className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {showVolume && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center gap-1 px-2 py-3 rounded-xl bg-night-800/95 border border-white/10 shadow-xl"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="h-20 cursor-pointer accent-neon-purple"
                    style={{ writingMode: "vertical-lr", direction: "rtl" }}
                  />
                  <span className="text-white/50 text-[10px] tabular-nums">{isMuted ? 0 : volume}%</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="text-white/60 text-xs font-mono tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />
          <button
            onClick={() => setShowUrlBar((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
            title="Change video"
          >
            <Link className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* URL change bar — always accessible, outside controls overlay */}
      <AnimatePresence>
        {showUrlBar && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="flex gap-2 px-3 py-2 bg-night-900 border-t border-white/5 z-30 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste YouTube URL..."
              onKeyDown={(e) => {
                if (e.key === "Enter") { handleLoadUrl(); setShowUrlBar(false); }
                if (e.key === "Escape") setShowUrlBar(false);
              }}
              className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:border-neon-purple transition-all"
            />
            <button
              onClick={() => { handleLoadUrl(); setShowUrlBar(false); }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-neon-purple to-neon-pink text-white text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Load
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
