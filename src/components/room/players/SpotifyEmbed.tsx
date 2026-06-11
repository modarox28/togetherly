"use client";

import { extractSpotifyInfo } from "@/lib/platforms";

interface Props { url: string }

export function SpotifyEmbed({ url }: Props) {
  const info = extractSpotifyInfo(url);
  if (!info) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <iframe
        src={`https://open.spotify.com/embed/${info.type}/${info.id}?utm_source=generator&theme=0`}
        width="100%"
        height="380"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="border-0"
      />
    </div>
  );
}
