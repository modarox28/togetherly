export type Platform =
  | "youtube" | "twitch" | "vimeo" | "spotify"
  | "netflix" | "disney" | "hbo" | "prime" | "appletv" | "paramount" | "crunchyroll";

export type PlayerType = "embeddable" | "companion";

export function detectPlatform(url: string): Platform | null {
  if (/youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts/.test(url)) return "youtube";
  if (/twitch\.tv\//.test(url)) return "twitch";
  if (/vimeo\.com\/\d+/.test(url)) return "vimeo";
  if (/open\.spotify\.com\/(track|album|playlist|show|episode)/.test(url)) return "spotify";
  if (/netflix\.com\//.test(url)) return "netflix";
  if (/disneyplus\.com\/|disney\.com\//.test(url)) return "disney";
  if (/max\.com\/|hbomax\.com\//.test(url)) return "hbo";
  if (/amazon\.com\/.*video|primevideo\.com\//.test(url)) return "prime";
  if (/tv\.apple\.com\//.test(url)) return "appletv";
  if (/paramountplus\.com\//.test(url)) return "paramount";
  if (/crunchyroll\.com\//.test(url)) return "crunchyroll";
  return null;
}

export function getPlayerType(platform: Platform): PlayerType {
  if (["youtube", "twitch", "vimeo", "spotify"].includes(platform)) return "embeddable";
  return "companion";
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
  netflix: "Netflix",
  disney: "Disney+",
  hbo: "Max",
  prime: "Prime Video",
  appletv: "Apple TV+",
  paramount: "Paramount+",
  crunchyroll: "Crunchyroll",
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  youtube: "#FF0000",
  twitch: "#9146FF",
  vimeo: "#1AB7EA",
  spotify: "#1DB954",
  netflix: "#E50914",
  disney: "#0063E5",
  hbo: "#5822B4",
  prime: "#00A8E0",
  appletv: "#555",
  paramount: "#0064FF",
  crunchyroll: "#F47521",
};

// Short badge text shown inside the platform icon
export const PLATFORM_BADGE: Record<Platform, string> = {
  youtube: "YT", twitch: "TV", vimeo: "VI", spotify: "SP",
  netflix: "N", disney: "D+", hbo: "Max", prime: "▶",
  appletv: "", paramount: "P+", crunchyroll: "CR",
};
