"use client";

import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import YouTube, { type YouTubePlayer, type YouTubeEvent } from "react-youtube";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, CheckCircle2, Maximize2, Minimize2, X } from "lucide-react";
import { extractYouTubeId, formatTime } from "@/lib/utils";
import { detectPlatform, getPlayerType } from "@/lib/platforms";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TwitchEmbed } from "@/components/room/players/TwitchEmbed";
import { VimeoEmbed } from "@/components/room/players/VimeoEmbed";
import { SpotifyEmbed } from "@/components/room/players/SpotifyEmbed";
import { CompanionEmbed } from "@/components/room/players/CompanionEmbed";
import type { PlayerHandle } from "@/components/room/players/TwitchEmbed";
import { EmptyScreen, normalizeVideoInput } from "@/components/room/EmptyScreen";

// Estados del reproductor de YouTube (window.YT.PlayerState)
const YT_PLAYING = 1;
const YT_PAUSED = 2;

export interface VideoPlayerHandle {
  togglePlay: () => void;
  toggleFullscreen: () => void;
  seekRelative: (delta: number) => void;
  adjustVolume: (delta: number) => void;
  /** Abre la barra para pegar otro enlace */
  openUrlBar: () => void;
}

interface VideoPlayerProps {
  videoUrl: string | null;
  roomId: string;
  extensionActive?: boolean;
  onPlay: (currentTime: number | null) => void;
  onPause: (currentTime: number | null) => void;
  onSeek: (currentTime: number) => void;
  onUrlChange: (url: string) => void;
  onRemotePlay: (cb: (t: number) => void) => void;
  onRemotePause: (cb: (t: number) => void) => void;
  onRemoteSeek: (cb: (t: number) => void) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer({
  videoUrl, extensionActive = false,
  onPlay, onPause, onSeek, onUrlChange,
  onRemotePlay, onRemotePause, onRemoteSeek,
}, ref) {
  // YouTube-specific ref
  const ytPlayerRef = useRef<YouTubePlayer | null>(null);
  // Generic player ref (Twitch/Vimeo)
  const playerHandleRef = useRef<PlayerHandle | null>(null);

  const isRemoteAction = useRef(false);
  const pendingSyncRef = useRef<{ time: number } | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlBar, setShowUrlBar] = useState(false);
  const [syncIndicator, setSyncIndicator] = useState(false);
  const [pendingSync, setPendingSync] = useState<{ time: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { t } = useLanguage();
  const platform = videoUrl ? detectPlatform(videoUrl) : null;
  const videoId = (platform === "youtube" && videoUrl) ? extractYouTubeId(videoUrl) : null;
  const isSpotify = platform === "spotify";
  const isCompanion = platform ? getPlayerType(platform) === "companion" : false;

  // Helper: play/pause/seek regardless of platform
  const playerPlay = () => {
    if (platform === "youtube") ytPlayerRef.current?.playVideo();
    else playerHandleRef.current?.play();
  };
  const playerPause = () => {
    if (platform === "youtube") ytPlayerRef.current?.pauseVideo();
    else playerHandleRef.current?.pause();
  };
  const playerSeek = (t: number) => {
    if (platform === "youtube") ytPlayerRef.current?.seekTo(t, true);
    else playerHandleRef.current?.seekTo(t);
  };
  const playerGetTime = (): number => {
    if (platform === "youtube") return ytPlayerRef.current?.getCurrentTime?.() ?? 0;
    return playerHandleRef.current?.getCurrentTime() ?? 0;
  };

  const showSync = () => { setSyncIndicator(true); setTimeout(() => setSyncIndicator(false), 1500); };

  // Reset state when video changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsDragging(false);
    setPendingSync(null);
    pendingSyncRef.current = null;
    ytPlayerRef.current = null;
    playerHandleRef.current = null;
  }, [videoUrl]);

  // Register remote callbacks — companion mode handles its own remote events
  useEffect(() => {
    if (isCompanion) return;
    onRemotePlay((time) => {
      isRemoteAction.current = true;
      playerSeek(time);
      playerPlay();
      if (isSpotify) { setPendingSync({ time }); pendingSyncRef.current = { time }; }
      setIsPlaying(true);
      showSync();
    });
    onRemotePause((time) => {
      isRemoteAction.current = true;
      playerSeek(time);
      playerPause();
      setIsPlaying(false);
      showSync();
    });
    onRemoteSeek((time) => {
      isRemoteAction.current = true;
      playerSeek(time);
      setCurrentTime(time);
      showSync();
    });
    // Las funciones del reproductor dependen solo de platform (ya está en la lista).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRemotePlay, onRemotePause, onRemoteSeek, platform, isCompanion]);

  // Progress interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying && !isDragging && !isSpotify) {
        const t = playerGetTime();
        if (t) setCurrentTime(t);
      }
    }, 500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isDragging, platform]);

  // YouTube callbacks
  const handleYTReady = useCallback((e: YouTubeEvent) => {
    ytPlayerRef.current = e.target;
    setDuration(e.target.getDuration());
  }, []);

  const handleYTStateChange = useCallback((e: YouTubeEvent) => {
    if (e.data === YT_PLAYING) {
      setIsPlaying(true);
      setPendingSync(null);
      if (!isRemoteAction.current) onPlay(e.target.getCurrentTime());
      isRemoteAction.current = false;
    } else if (e.data === YT_PAUSED) {
      setIsPlaying(false);
      if (!isRemoteAction.current) onPause(e.target.getCurrentTime());
      isRemoteAction.current = false;
    }
  }, [onPlay, onPause]);

  // Generic player (Twitch/Vimeo) callbacks
  const handlePlayerReady = useCallback((dur: number) => { setDuration(dur); }, []);
  const handlePlayerPlay = useCallback((time: number) => {
    setIsPlaying(true);
    if (!isRemoteAction.current) onPlay(time);
    isRemoteAction.current = false;
  }, [onPlay]);
  const handlePlayerPause = useCallback((time: number) => {
    setIsPlaying(false);
    if (!isRemoteAction.current) onPause(time);
    isRemoteAction.current = false;
  }, [onPause]);

  const togglePlay = () => {
    if (isPlaying) { playerPause(); } else { playerPlay(); }
  };

  const handleTapToSync = () => {
    if (!pendingSyncRef.current) return;
    playerSeek(pendingSyncRef.current.time);
    playerPlay();
    pendingSyncRef.current = null;
    setPendingSync(null);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value);
    setVolume(v);
    if (platform === "youtube") {
      ytPlayerRef.current?.setVolume(v);
      if (v === 0) { ytPlayerRef.current?.mute(); setIsMuted(true); }
      else { ytPlayerRef.current?.unMute(); setIsMuted(false); }
    } else {
      playerHandleRef.current?.setVolume(v);
      if (v === 0) { playerHandleRef.current?.mute(); setIsMuted(true); }
      else { playerHandleRef.current?.unmute(); setIsMuted(false); }
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      if (platform === "youtube") { ytPlayerRef.current?.unMute(); ytPlayerRef.current?.setVolume(volume); }
      else { playerHandleRef.current?.unmute(); playerHandleRef.current?.setVolume(volume); }
      setIsMuted(false);
    } else {
      if (platform === "youtube") ytPlayerRef.current?.mute();
      else playerHandleRef.current?.mute();
      setIsMuted(true);
    }
  };

  const commitSeek = (value: number) => {
    playerSeek(value);
    onSeek(value);
    setIsDragging(false);
  };

  const handleLoadUrl = () => {
    const url = normalizeVideoInput(urlInput);
    if (!url) return;
    onUrlChange(url);
    setUrlInput("");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useImperativeHandle(ref, () => ({
    openUrlBar: () => setShowUrlBar(true),
    togglePlay,
    toggleFullscreen,
    seekRelative: (delta: number) => {
      const t = Math.max(0, playerGetTime() + delta);
      playerSeek(t);
      onSeek(t);
      setCurrentTime(t);
    },
    adjustVolume: (delta: number) => {
      const next = Math.max(0, Math.min(100, volume + delta));
      setVolume(next);
      if (platform === "youtube") {
        ytPlayerRef.current?.setVolume(next);
        if (next === 0) { ytPlayerRef.current?.mute(); setIsMuted(true); }
        else { ytPlayerRef.current?.unMute(); setIsMuted(false); }
      } else {
        playerHandleRef.current?.setVolume(next);
        if (next === 0) { playerHandleRef.current?.mute(); setIsMuted(true); }
        else { playerHandleRef.current?.unmute(); setIsMuted(false); }
      }
    },
  }));

  if (!videoUrl || !platform) {
    return <EmptyScreen extensionActive={extensionActive} onLoadUrl={onUrlChange} />;
  }

  return (
    <div ref={containerRef} className="group/player relative flex h-full flex-col bg-black">
      {/* Player area — [&_iframe]:pointer-events-none prevents iframes from stealing drag events (volume slider, etc.) */}
      <div className="flex-1 relative [&_iframe]:pointer-events-none">

        {/* YouTube */}
        {platform === "youtube" && videoId && (
          <YouTube
            key={videoId}
            videoId={videoId}
            onReady={handleYTReady}
            onStateChange={handleYTStateChange}
            opts={{ width: "100%", height: "100%", playerVars: { controls: 0, modestbranding: 1, rel: 0, iv_load_policy: 3, disablekb: 1, fs: 0, playsinline: 1 } }}
            className="absolute inset-0 w-full h-full"
            iframeClassName="w-full h-full"
          />
        )}

        {/* Twitch */}
        {platform === "twitch" && (
          <TwitchEmbed
            key={videoUrl}
            ref={(h) => { playerHandleRef.current = h; }}
            url={videoUrl!}
            onReady={handlePlayerReady}
            onPlay={handlePlayerPlay}
            onPause={handlePlayerPause}
          />
        )}

        {/* Vimeo */}
        {platform === "vimeo" && (
          <VimeoEmbed
            key={videoUrl}
            ref={(h) => { playerHandleRef.current = h; }}
            url={videoUrl!}
            onReady={handlePlayerReady}
            onPlay={handlePlayerPlay}
            onPause={handlePlayerPause}
          />
        )}

        {/* Spotify */}
        {platform === "spotify" && <SpotifyEmbed key={videoUrl} url={videoUrl!} />}

        {/* Companion (Netflix, Disney+, HBO Max, etc.) */}
        {isCompanion && platform && (
          <CompanionEmbed
            key={videoUrl}
            url={videoUrl!}
            platform={platform}
            extensionActive={extensionActive}
            onPlay={(t) => onPlay(t)}
            onPause={(t) => onPause(t)}
            onRemotePlay={onRemotePlay}
            onRemotePause={onRemotePause}
          />
        )}

        {/* Sync indicator */}
        <AnimatePresence>
          {syncIndicator && !isCompanion && (
            <motion.div initial={{ opacity: 0, scale: 0.8, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-plum/90 px-3 py-1.5 text-xs font-bold text-lamp">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t.watchRoom.syncedWith}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tap-to-sync (iOS) */}
        <AnimatePresence>
          {pendingSync && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
              <button onClick={handleTapToSync}
                className="flex flex-col items-center gap-3 rounded-2xl bg-plum/95 px-8 py-5 text-white shadow-2xl">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-lamp">
                  <Play className="ml-1 h-6 w-6 fill-plum text-plum" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">{t.roomUi.remotePlayed}</p>
                  <p className="mt-0.5 text-xs text-white/60">{t.roomUi.tapToSync}</p>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Click overlay (not for Spotify or companion) */}
        {!pendingSync && !isSpotify && !isCompanion && (
          <div className="absolute inset-0 cursor-pointer z-10" onClick={togglePlay} aria-hidden="true" />
        )}
      </div>

      {/* Controls — hidden for Spotify and companion mode */}
      {!isSpotify && !isCompanion && (
        <div className="bg-gradient-to-t from-black/95 to-transparent pb-3 px-4 pt-8 absolute bottom-0 left-0 right-0 z-20
          opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover/player:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
          {/* Progress bar */}
          <div className="mb-3 relative h-4 flex items-center">
            <input type="range" min={0} max={duration || 100} step={0.1} value={currentTime}
              aria-label={t.roomUi.progress}
              onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={(e) => commitSeek(parseFloat((e.target as HTMLInputElement).value))}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={(e) => commitSeek(parseFloat((e.target as HTMLInputElement).value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 touch-none"
            />
            <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-accent rounded-full"
                style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%", transition: isDragging ? "none" : "width 0.5s linear" }} />
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-2">
            <button onClick={togglePlay} aria-label={isPlaying ? t.roomUi.pause : t.roomUi.play} className="flex h-10 w-10 items-center justify-center text-white hover:text-lamp">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>
            <button onClick={toggleMute} aria-label={isMuted ? t.roomUi.unmute : t.roomUi.mute} className="flex h-10 w-10 flex-shrink-0 items-center justify-center text-white/75 hover:text-white">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input type="range" min={0} max={100} value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              aria-label={t.roomUi.volume}
              className="hidden w-20 cursor-pointer accent-lamp sm:block" />
            <span className="text-white/60 text-xs font-mono tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <div className="flex-1" />
            <button onClick={toggleFullscreen}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white"
              aria-label={isFullscreen ? t.roomUi.exitFullscreen : t.roomUi.fullscreen}>
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* URL bar (always accessible) */}
      <AnimatePresence>
        {showUrlBar && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
            className="absolute inset-x-0 top-0 z-30 flex gap-2 bg-plum/95 p-2.5"
            onClick={(e) => e.stopPropagation()}>
            <input autoFocus value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
              placeholder={t.roomUi.linkPlaceholder}
              aria-label={t.roomUi.changeVideo}
              onKeyDown={(e) => { if (e.key === "Enter") { handleLoadUrl(); setShowUrlBar(false); } if (e.key === "Escape") setShowUrlBar(false); }}
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-lamp" />
            <button onClick={() => { handleLoadUrl(); setShowUrlBar(false); }}
              className="whitespace-nowrap rounded-xl bg-lamp px-4 py-2 text-sm font-bold text-plum">
              {t.roomUi.watchHere}
            </button>
            <button onClick={() => setShowUrlBar(false)} aria-label={t.roomUi.cancel}
              className="flex w-10 flex-shrink-0 items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
