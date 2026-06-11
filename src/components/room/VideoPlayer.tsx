"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import YouTube, { type YouTubePlayer, type YouTubeEvent } from "react-youtube";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Maximize, CheckCircle2 } from "lucide-react";
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
  roomId,
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [syncIndicator, setSyncIndicator] = useState(false);
  const { t } = useLanguage();

  const videoId = videoUrl ? extractYouTubeId(videoUrl) : null;

  // Register remote callbacks
  useEffect(() => {
    onRemotePlay((time) => {
      isRemoteAction.current = true;
      playerRef.current?.seekTo(time, true);
      playerRef.current?.playVideo();
      setIsPlaying(true);
      setSyncIndicator(true);
      setTimeout(() => setSyncIndicator(false), 1500);
    });
    onRemotePause((time) => {
      isRemoteAction.current = true;
      playerRef.current?.seekTo(time, true);
      playerRef.current?.pauseVideo();
      setIsPlaying(false);
      setSyncIndicator(true);
      setTimeout(() => setSyncIndicator(false), 1500);
    });
    onRemoteSeek((time) => {
      isRemoteAction.current = true;
      playerRef.current?.seekTo(time, true);
      setCurrentTime(time);
      setSyncIndicator(true);
      setTimeout(() => setSyncIndicator(false), 1500);
    });
  }, [onRemotePlay, onRemotePause, onRemoteSeek]);

  // Progress update
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
        if (!isRemoteAction.current) {
          onPlay(e.target.getCurrentTime());
        }
        isRemoteAction.current = false;
      } else if (e.data === YT.PlayerState.PAUSED) {
        setIsPlaying(false);
        if (!isRemoteAction.current) {
          onPause(e.target.getCurrentTime());
        }
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

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleSeekBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
  };

  const handleSeekCommit = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const time = parseFloat((e.target as HTMLInputElement).value);
    playerRef.current?.seekTo(time, true);
    onSeek(time);
    setIsDragging(false);
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
    <div className="flex-1 flex flex-col bg-black relative group">
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
              className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-night-800/90 border border-neon-purple/30 text-neon-purple text-xs font-medium"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t.watchRoom.syncedWith}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Click to play/pause overlay */}
        <div className="absolute inset-0 cursor-pointer" onClick={togglePlay} />
      </div>

      {/* Controls bar */}
      <div className="bg-gradient-to-t from-black/95 to-transparent -mt-16 pt-16 pb-3 px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute bottom-0 left-0 right-0">
        {/* Progress bar */}
        <div className="mb-2 relative h-1.5 group/bar">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeekBar}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={handleSeekCommit}
            onTouchEnd={handleSeekCommit}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-purple to-neon-pink rounded-full transition-all"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
            />
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-8 h-8 flex items-center justify-center text-white hover:text-neon-purple transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
          <button
            onClick={toggleMute}
            className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <span className="text-white/50 text-xs font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <div className="flex-1" />

          {/* URL change input */}
          <div className="flex gap-2 items-center">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="New YouTube URL..."
              onKeyDown={(e) => e.key === "Enter" && handleLoadUrl()}
              className="w-40 px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-white/30 text-xs outline-none focus:border-neon-purple transition-all"
            />
            <button
              onClick={handleLoadUrl}
              className="px-2.5 py-1 rounded-lg bg-neon-purple/20 border border-neon-purple/30 text-neon-purple text-xs hover:bg-neon-purple/30 transition-colors"
            >
              Load
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
