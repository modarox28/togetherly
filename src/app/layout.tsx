import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

const APP_URL = "https://togetherly-weld.vercel.app";
const DESCRIPTION =
  "Synchronized streaming, live chat, reactions and video calls — for couples and friends at a distance. Supports YouTube, Twitch, Vimeo and Spotify.";

export const viewport: Viewport = {
  themeColor: "#a855f7",
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
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
