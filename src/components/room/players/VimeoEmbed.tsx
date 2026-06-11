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
  const vimeoPlayerRef = useRef<any>(null);
  const cachedTime = useRef(0);
  const cachedDuration = useRef(0);

  const videoId = extractVimeoId(url);

  useImperativeHandle(ref, () => ({
    play() { vimeoPlayerRef.current?.play(); },
    pause() { vimeoPlayerRef.current?.pause(); },
    seekTo(s) { vimeoPlayerRef.current?.setCurrentTime(s); },
    getCurrentTime() { return cachedTime.current; },
    getDuration() { return cachedDuration.current; },
    setVolume(v) { vimeoPlayerRef.current?.setVolume(v / 100); },
    mute() { vimeoPlayerRef.current?.setVolume(0); },
    unmute() { vimeoPlayerRef.current?.setVolume(1); },
  }));

  useEffect(() => {
    if (!videoId || !iframeRef.current) return;

    const loadPlayer = () => {
      const VimeoLib = (window as any).Vimeo;
      if (!VimeoLib || !iframeRef.current) return;

      const player = new VimeoLib.Player(iframeRef.current);
      vimeoPlayerRef.current = player;

      player.getDuration().then((d: number) => {
        cachedDuration.current = d;
        onReady(d);
      });

      player.on("play", () => {
        player.getCurrentTime().then((t: number) => {
          cachedTime.current = t;
          onPlay(t);
        });
      });
      player.on("pause", () => {
        player.getCurrentTime().then((t: number) => {
          cachedTime.current = t;
          onPause(t);
        });
      });
      player.on("timeupdate", ({ seconds }: { seconds: number }) => {
        cachedTime.current = seconds;
      });
    };

    if ((window as any).Vimeo) {
      loadPlayer();
    } else {
      const script = document.createElement("script");
      script.src = "https://player.vimeo.com/api/player.js";
      script.onload = loadPlayer;
      document.head.appendChild(script);
    }

    return () => { vimeoPlayerRef.current = null; };
  }, [videoId]);

  if (!videoId) return null;

  return (
    <iframe
      ref={iframeRef}
      src={`https://player.vimeo.com/video/${videoId}?api=1&autopause=0`}
      className="absolute inset-0 w-full h-full"
      allow="autoplay; fullscreen"
      allowFullScreen
    />
  );
});
