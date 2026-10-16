import type { NextConfig } from "next";

// Cabeceras de seguridad para todas las páginas (control 18 de SECURITY.md).
// Si agregas una plataforma nueva dentro de la sala, suma su dominio en FRAME_SOURCES
// (y en SCRIPT_SOURCES si su reproductor se carga con <script>).

const isDev = process.env.NODE_ENV === "development";
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
const socketWs = socketUrl.replace(/^http/, "ws");

const SCRIPT_SOURCES = ["https://www.youtube.com", "https://s.ytimg.com", "https://embed.twitch.tv", "https://player.vimeo.com"];
const FRAME_SOURCES = [
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
  "https://player.twitch.tv",
  "https://embed.twitch.tv",
  "https://clips.twitch.tv",
  "https://player.vimeo.com",
  "https://open.spotify.com",
];

const csp = [
  "default-src 'self'",
  // Next.js necesita scripts en línea para hidratar la página (sin nonce las páginas siguen siendo estáticas).
  // (react-youtube pide el script por http cuando la página es http, como en localhost)
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval' http://www.youtube.com" : ""} ${SCRIPT_SOURCES.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  // Fotos de perfil de Google y miniaturas de los reproductores
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "media-src 'self' blob:",
  `connect-src 'self' ${socketUrl} ${socketWs}${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
  `frame-src ${FRAME_SOURCES.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com https://checkout.stripe.com",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Cámara y micrófono solo para la videollamada de la propia página
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), fullscreen=(self), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Los planes se reemplazaron por /apoyar (Togetherly es gratis y de código abierto).
  async redirects() {
    return [{ source: "/pricing", destination: "/apoyar", permanent: true }];
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
