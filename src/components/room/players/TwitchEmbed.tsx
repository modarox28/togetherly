"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { extractTwitchId } from "@/lib/platforms";

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

export const TwitchEmbed = forwardRef<PlayerHandle, Props>(function TwitchEmbed(
  { url, onReady, onPlay, onPause },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const cachedTime = useRef(0);
  const mountedRef = useRef(true);

  useImperativeHandle(ref, () => ({
    play() { playerRef.current?.play(); },
    pause() { playerRef.current?.pause(); },
    seekTo(s) { playerRef.current?.seek(s); },
    getCurrentTime() { return playerRef.current?.getCurrentTime?.() ?? cachedTime.current; },
    getDuration() { return playerRef.current?.getDuration?.() ?? 0; },
    setVolume(v) { playerRef.current?.setVolume(v / 100); },
    mute() { playerRef.current?.setMuted(true); },
    unmute() { playerRef.current?.setMuted(false); },
  }));

  useEffect(() => {
    mountedRef.current = true;
    const info = extractTwitchId(url);
    if (!info || !containerRef.current) return;

    const container = containerRef.current;

    const initPlayer = () => {
      if (!mountedRef.current || !container) return;
      const TwitchLib = (window as any).Twitch;
      if (!TwitchLib?.Player) return;

      // Clear any previous player
      container.innerHTML = "";

      const opts: any = {
        width: "100%",
        height: "100%",
        autoplay: false,
        parent: [window.location.hostname],
      };
      if (info.type === "vod") opts.video = info.id;
      else opts.channel = info.id;

      const player = new TwitchLib.Player(container, opts);
      playerRef.current = player;

      player.addEventListener(TwitchLib.Player.READY, () => {
        if (!mountedRef.current) return;
        onReady(player.getDuration?.() ?? 0);
      });
      player.addEventListener(TwitchLib.Player.PLAY, () => {
        if (!mountedRef.current) return;
        cachedTime.current = player.getCurrentTime?.() ?? 0;
        onPlay(cachedTime.current);
      });
      player.addEventListener(TwitchLib.Player.PAUSE, () => {
        if (!mountedRef.current) return;
        cachedTime.current = player.getCurrentTime?.() ?? 0;
        onPause(cachedTime.current);
      });
    };

    if ((window as any).Twitch?.Player) {
      initPlayer();
    } else {
      const existing = document.querySelector('script[src*="twitch.tv/embed"]');
      if (existing) {
        existing.addEventListener("load", initPlayer);
      } else {
        const script = document.createElement("script");
        script.src = "https://embed.twitch.tv/embed/v1.js";
        script.onload = initPlayer;
        document.head.appendChild(script);
      }
    }

    return () => {
      mountedRef.current = false;
      playerRef.current = null;
      if (container) container.innerHTML = "";
    };
  }, [url]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
});
