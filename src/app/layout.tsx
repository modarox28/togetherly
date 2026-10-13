import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";

// Fuentes servidas desde el propio sitio (licencia OFL): sin peticiones a terceros.
const bricolage = localFont({
  src: "./fonts/BricolageGrotesque.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
});
const nunito = localFont({
  src: "./fonts/Nunito.woff2",
  variable: "--font-nunito",
  weight: "200 1000",
  display: "swap",
});

const APP_URL = "https://togetherly-weld.vercel.app";
const DESCRIPTION =
  "Watch Netflix, Prime Video, HBO Max, Disney+ and YouTube in sync with the people you love, wherever they are. Chat, reactions and video calls included.";

export const viewport: Viewport = {
  themeColor: "#2A2140",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Togetherly — Watch Together, Feel Closer",
  description: DESCRIPTION,
  keywords: [
    "watch party", "synchronized streaming", "couples", "long distance",
    "YouTube together", "Twitch together", "video call", "watch together",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Togetherly",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Togetherly — Watch Together, Feel Closer",
    description: DESCRIPTION,
    url: APP_URL,
    siteName: "Togetherly",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Togetherly — Watch Together, Feel Closer",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${bricolage.variable} ${nunito.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <SessionProvider>
          <ThemeProvider>
            <LanguageProvider>{children}</LanguageProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
