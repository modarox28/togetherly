// Direcciones del servidor de salas y de la web. Se pueden cambiar sin tocar código con
// EXPO_PUBLIC_SOCKET_URL y EXPO_PUBLIC_API_URL (archivo mobile/.env o variables de EAS).
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || "https://togetherly-salas.onrender.com";
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://togetherly-weld.vercel.app";

// Mismos personajes propios que la web (src/lib/characters.ts), sin marcas registradas.
export const CHARACTERS = [
  { id: "palomita", emoji: "🍿", name: "Palomita" },
  { id: "luna", emoji: "🌙", name: "Luna" },
  { id: "michi", emoji: "🐈", name: "Michi" },
  { id: "buho", emoji: "🦉", name: "Búho" },
  { id: "zorro", emoji: "🦊", name: "Zorro" },
  { id: "panda", emoji: "🐼", name: "Panda" },
  { id: "pulpo", emoji: "🐙", name: "Pulpo" },
  { id: "girasol", emoji: "🌻", name: "Girasol" },
  { id: "tortuga", emoji: "🐢", name: "Tortuga" },
  { id: "tinto", emoji: "☕", name: "Tinto" },
  { id: "arepa", emoji: "🫓", name: "Arepa" },
  { id: "loro", emoji: "🦜", name: "Loro" },
];

// Plataformas que se sincronizan dentro de la app (las mismas de la extensión).
export const STREAMING_PLATFORMS = [
  { id: "netflix", name: "Netflix", url: "https://www.netflix.com/browse", color: "#E50914" },
  { id: "disney", name: "Disney+", url: "https://www.disneyplus.com/", color: "#113CCF" },
  { id: "prime", name: "Prime Video", url: "https://www.primevideo.com/", color: "#00A8E1" },
  { id: "hbo", name: "HBO Max", url: "https://play.hbomax.com/", color: "#6B2BD9" },
  { id: "paramount", name: "Paramount+", url: "https://www.paramountplus.com/", color: "#0064FF" },
  { id: "appletv", name: "Apple TV+", url: "https://tv.apple.com/", color: "#555555" },
];

export const REACTIONS = ["❤️", "😂", "😮", "😭", "🔥", "👏"];

/** Enlace de invitación: abre la web, que lleva a la app, a la extensión o a la misma película. */
export const inviteUrl = (roomId: string) => `${API_URL}/j/${roomId}`;
