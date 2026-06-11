export type Platform = "youtube" | "twitch" | "vimeo" | "spotify";

export function detectPlatform(url: string): Platform | null {
  if (/youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts/.test(url)) return "youtube";
  if (/twitch\.tv\//.test(url)) return "twitch";
  if (/vimeo\.com\/\d+/.test(url)) return "vimeo";
  if (/open\.spotify\.com\/(track|album|playlist|show|episode)/.test(url)) return "spotify";
  return null;
}

export function extractTwitchId(url: string): { type: "channel" | "vod"; id: string } | null {
  const vod = url.match(/twitch\.tv\/videos\/(\d+)/);
  if (vod) return { type: "vod", id: vod[1] };
  const channel = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  if (channel && channel[1] !== "videos") return { type: "channel", id: channel[1] };
  return null;
}

export function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

export function extractSpotifyInfo(url: string): { type: string; id: string } | null {
  const m = url.match(/open\.spotify\.com\/(track|album|playlist|show|episode)\/([a-zA-Z0-9]+)/);
  return m ? { type: m[1], id: m[2] } : null;
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: "YouTube",
  twitch: "Twitch",
  vimeo: "Vimeo",
  spotify: "Spotify",
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  youtube: "#FF0000",
  twitch: "#9146FF",
  vimeo: "#1AB7EA",
  spotify: "#1DB954",
};
