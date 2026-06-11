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
  const containerId = "twitch-player-container";
  const twitchPlayerRef = useRef<any>(null);
  const cachedTime = useRef(0);
  const cachedDuration = useRef(0);

  useImperativeHandle(ref, () => ({
    play() { twitchPlayerRef.current?.play(); },
    pause() { twitchPlayerRef.current?.pause(); },
    seekTo(s) { twitchPlayerRef.current?.seek(s); },
    getCurrentTime() { return twitchPlayerRef.current?.getCurrentTime() ?? cachedTime.current; },
    getDuration() { return twitchPlayerRef.current?.getDuration() ?? cachedDuration.current; },
    setVolume(v) { twitchPlayerRef.current?.setVolume(v / 100); },
    mute() { twitchPlayerRef.current?.setMuted(true); },
    unmute() { twitchPlayerRef.current?.setMuted(false); },
  }));

  useEffect(() => {
    const info = extractTwitchId(url);
    if (!info) return;

    const loadEmbed = () => {
      const TwitchLib = (window as any).Twitch;
      if (!TwitchLib) return;

      const hostname = window.location.hostname;
      const options: any = {
        width: "100%",
        height: "100%",
        autoplay: false,
        muted: false,
        parent: [hostname],
        layout: "video",
      };
      if (info.type === "vod") options.video = info.id;
      else options.channel = info.id;

      const embed = new TwitchLib.Embed(containerId, options);
      const player = embed.getPlayer();
      twitchPlayerRef.current = player;

      player.addEventListener(TwitchLib.Player.READY, () => {
        cachedDuration.current = player.getDuration?.() ?? 0;
        onReady(cachedDuration.current);
      });
      player.addEventListener(TwitchLib.Player.PLAY, () => {
        cachedTime.current = player.getCurrentTime?.() ?? 0;
        onPlay(cachedTime.current);
      });
      player.addEventListener(TwitchLib.Player.PAUSE, () => {
        cachedTime.current = player.getCurrentTime?.() ?? 0;
        onPause(cachedTime.current);
      });
    };

    if ((window as any).Twitch) {
      loadEmbed();
    } else {
      const script = document.createElement("script");
      script.src = "https://embed.twitch.tv/embed/v1.js";
      script.onload = loadEmbed;
      document.head.appendChild(script);
    }

    return () => {
      twitchPlayerRef.current = null;
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = "";
    };
  }, [url]);

  return <div id={containerId} className="absolute inset-0 w-full h-full" />;
});
