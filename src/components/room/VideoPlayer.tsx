"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import YouTube, { type YouTubePlayer, type YouTubeEvent } from "react-youtube";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, CheckCircle2, Link } from "lucide-react";
import { extractYouTubeId, formatTime } from "@/lib/utils";
import { detectPlatform } from "@/lib/platforms";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TwitchEmbed } from "@/components/room/players/TwitchEmbed";
import { VimeoEmbed } from "@/components/room/players/VimeoEmbed";
import { SpotifyEmbed } from "@/components/room/players/SpotifyEmbed";
import type { PlayerHandle } from "@/components/room/players/TwitchEmbed";

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
  videoUrl, isSynced,
  onPlay, onPause, onSeek, onUrlChange,
  onRemotePlay, onRemotePause, onRemoteSeek,
}: VideoPlayerProps) {
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

  const { t } = useLanguage();
  const platform = videoUrl ? detectPlatform(videoUrl) : null;
  const videoId = (platform === "youtube" && videoUrl) ? extractYouTubeId(videoUrl) : null;
  const isSpotify = platform === "spotify";

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

  // Register remote callbacks
  useEffect(() => {
    onRemotePlay((time) => {
      isRemoteAction.current = true;
      playerSeek(time);
      const result = playerPlay();
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
  }, [onRemotePlay, onRemotePause, onRemoteSeek, platform]);

  // Progress interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying && !isDragging && !isSpotify) {
        const t = playerGetTime();
        if (t) setCurrentTime(t);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, isDragging, platform]);

  // YouTube callbacks
  const handleYTReady = useCallback((e: YouTubeEvent) => {
    ytPlayerRef.current = e.target;
    setDuration(e.target.getDuration());
  }, []);

  const handleYTStateChange = useCallback((e: YouTubeEvent) => {
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
    const clean = urlInput.trim();
    if (!clean) return;
    onUrlChange(clean);
    setUrlInput("");
  };

  if (!videoUrl || !platform) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-night-900">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center mb-4">
            <Play className="w-7 h-7 text-neon-purple" />
          </div>
          <h3 className="text-white font-semibold text-lg">{t.watchRoom.addVideo}</h3>
          <p className="text-white/40 text-sm">{t.watchRoom.pasteToStart}</p>
          <p className="text-white/25 text-xs mt-1">YouTube · Twitch · Vimeo · Spotify</p>
        </div>
        <div className="w-full max-w-md flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={t.watchRoom.videoPaste}
            onKeyDown={(e) => e.key === "Enter" && handleLoadUrl()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-night-800 border border-night-600 text-white placeholder:text-white/30 text-sm outline-none focus:border-neon-purple transition-all"
          />
          <button onClick={handleLoadUrl}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-pink text-white text-sm font-medium hover:opacity-90 transition-opacity">
            {t.watchRoom.loadVideo}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-black relative">
      {/* Player area */}
      <div className="flex-1 relative">

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

        {/* Sync indicator */}
        <AnimatePresence>
          {syncIndicator && (
            <motion.div initial={{ opacity: 0, scale: 0.8, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-night-800/90 border border-neon-purple/30 text-neon-purple text-xs font-medium z-20">
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
                className="flex flex-col items-center gap-3 px-8 py-5 rounded-2xl bg-night-900/95 border border-neon-purple/40 text-white shadow-2xl">
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

        {/* Click overlay (not for Spotify) */}
        {!pendingSync && !isSpotify && (
          <div className="absolute inset-0 cursor-pointer z-10" onClick={togglePlay} />
        )}
      </div>

      {/* Controls — hidden for Spotify */}
      {!isSpotify && (
        <div className="bg-gradient-to-t from-black/95 to-transparent pb-3 px-4 pt-8 absolute bottom-0 left-0 right-0 z-20
          opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
          {/* Progress bar */}
          <div className="mb-3 relative h-4 flex items-center">
            <input type="range" min={0} max={duration || 100} step={0.1} value={currentTime}
              onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={(e) => commitSeek(parseFloat((e.target as HTMLInputElement).value))}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={(e) => commitSeek(parseFloat((e.target as HTMLInputElement).value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 touch-none"
            />
            <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-neon-purple to-neon-pink rounded-full"
                style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%", transition: isDragging ? "none" : "width 0.5s linear" }} />
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-2">
            <button onClick={togglePlay} className="w-9 h-9 flex items-center justify-center text-white hover:text-neon-purple transition-colors">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>
            <button onClick={toggleMute} className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors flex-shrink-0">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input type="range" min={0} max={100} value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 sm:w-20 cursor-pointer accent-neon-purple" />
            <span className="text-white/60 text-xs font-mono tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <div className="flex-1" />
            <button onClick={() => setShowUrlBar((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
              title="Change video">
              <Link className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* URL bar (always accessible) */}
      <AnimatePresence>
        {showUrlBar && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
            className="flex gap-2 px-3 py-2 bg-night-900 border-t border-white/5 z-30 relative"
            onClick={(e) => e.stopPropagation()}>
            <input autoFocus value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
              placeholder="YouTube, Twitch, Vimeo o Spotify..."
              onKeyDown={(e) => { if (e.key === "Enter") { handleLoadUrl(); setShowUrlBar(false); } if (e.key === "Escape") setShowUrlBar(false); }}
              className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:border-neon-purple transition-all" />
            <button onClick={() => { handleLoadUrl(); setShowUrlBar(false); }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-neon-purple to-neon-pink text-white text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap">
              Load
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
