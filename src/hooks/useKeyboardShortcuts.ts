import { useEffect, RefObject } from "react";
import type { VideoPlayerHandle } from "@/components/room/VideoPlayer";

export function useKeyboardShortcuts(playerRef: RefObject<VideoPlayerHandle | null>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          playerRef.current?.togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          playerRef.current?.seekRelative(e.shiftKey ? 30 : 5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          playerRef.current?.seekRelative(e.shiftKey ? -30 : -5);
          break;
        case "ArrowUp":
          e.preventDefault();
          playerRef.current?.adjustVolume(5);
          break;
        case "ArrowDown":
          e.preventDefault();
          playerRef.current?.adjustVolume(-5);
          break;
        case "f":
        case "F":
          playerRef.current?.toggleFullscreen();
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [playerRef]);
}
