"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { extractVimeoId } from "@/lib/platforms";

export interface PlayerHandle {
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(v: number): void;
  mute(): void;
  unmute(): void;
}

interface Props {
  url: string;
  onReady(duration: number): void;
  onPlay(time: number): void;
  onPause(time: number): void;
}

export const VimeoEmbed = forwardRef<PlayerHandle, Props>(function VimeoEmbed(
  { url, onReady, onPlay, onPause },
  ref
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const vimeoRef = useRef<any>(null);
  const cachedTime = useRef(0);
  const cachedDuration = useRef(0);
  const mountedRef = useRef(true);

  const videoId = extractVimeoId(url);

  useImperativeHandle(ref, () => ({
    play() { vimeoRef.current?.play(); },
    pause() { vimeoRef.current?.pause(); },
    seekTo(s) { vimeoRef.current?.setCurrentTime(s); },
    getCurrentTime() { return cachedTime.current; },
    getDuration() { return cachedDuration.current; },
    setVolume(v) { vimeoRef.current?.setVolume(v / 100); },
    mute() { vimeoRef.current?.setVolume(0); },
    unmute() { vimeoRef.current?.setVolume(1); },
  }));

  useEffect(() => {
    mountedRef.current = true;
    if (!videoId) return;

    const initPlayer = () => {
      if (!mountedRef.current || !iframeRef.current) return;
      const VimeoLib = (window as any).Vimeo;
      if (!VimeoLib?.Player) return;

      const player = new VimeoLib.Player(iframeRef.current);
      vimeoRef.current = player;

      player.getDuration().then((d: number) => {
        if (!mountedRef.current) return;
        cachedDuration.current = d;
        onReady(d);
      }).catch(() => {});

      player.on("play", () => {
        if (!mountedRef.current) return;
        player.getCurrentTime().then((t: number) => {
          cachedTime.current = t;
          onPlay(t);
        }).catch(() => {});
      });

      player.on("pause", () => {
        if (!mountedRef.current) return;
        player.getCurrentTime().then((t: number) => {
          cachedTime.current = t;
          onPause(t);
        }).catch(() => {});
      });

      player.on("timeupdate", ({ seconds }: { seconds: number }) => {
        cachedTime.current = seconds;
      });
    };

    // Small delay to ensure iframe is fully mounted in DOM
    const timer = setTimeout(() => {
      if ((window as any).Vimeo?.Player) {
        initPlayer();
      } else {
        const existing = document.querySelector('script[src*="player.vimeo.com"]');
        if (existing) {
          existing.addEventListener("load", initPlayer);
        } else {
          const script = document.createElement("script");
          script.src = "https://player.vimeo.com/api/player.js";
          script.onload = initPlayer;
          document.head.appendChild(script);
        }
      }
    }, 100);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      vimeoRef.current?.destroy?.().catch(() => {});
      vimeoRef.current = null;
    };
  }, [videoId]);

  if (!videoId) return null;

  return (
    <iframe
      ref={iframeRef}
      src={`https://player.vimeo.com/video/${videoId}?api=1&autopause=0&playsinline=1`}
      className="absolute inset-0 w-full h-full"
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
    />
  );
});
