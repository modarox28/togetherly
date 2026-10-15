"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Play, RefreshCw, Globe } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { PLATFORM_COLORS, PLATFORM_LABELS, type Platform } from "@/lib/platforms";
import { SOCKET_URL } from "@/lib/socket";

interface PublicRoom {
  id: string;
  name: string;
  participants: number;
  host: string | null;
  videoUrl: string | null;
  platform: Platform;
  createdAt: number;
}


async function fetchPublicRooms(): Promise<PublicRoom[]> {
  try {
    const res = await fetch(`${SOCKET_URL}/api/rooms`);
    const data: unknown = await res.json();
    return Array.isArray(data) ? (data as PublicRoom[]) : [];
  } catch {
    return [];
  }
}

export default function DiscoverPage() {
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const showRooms = (list: PublicRoom[]) => {
    setRooms(list);
    setLoading(false);
  };

  const refreshRooms = () => {
    setLoading(true);
    fetchPublicRooms().then(showRooms);
  };

  // Primera carga (loading ya empieza en true).
  useEffect(() => {
    let active = true;
    fetchPublicRooms().then((list) => active && showRooms(list));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-day-50 dark:bg-night-950">
      <Navbar />

      <main className="grain mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-28 sm:pt-32">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-day-900 dark:text-white">
              {t.discover.title}
            </h1>
            <p className="mt-2 text-day-900/65 dark:text-white/60">
              {t.discover.subtitle}
            </p>
          </div>
          <button onClick={refreshRooms} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-day-900/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {t.discover.refresh}
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Globe className="w-12 h-12 text-day-900/20 dark:text-white/20" />
            <p className="text-day-900/40 dark:text-white/40 text-sm">{t.discover.noRooms}</p>
            <Link href="/room" className="rounded-full bg-accent px-6 py-3 text-sm font-bold text-on-accent">
              {t.discover.createFirst}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room, i) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Link href={`/room/${room.id}`}
                  className="block p-5 rounded-2xl border transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer
                    bg-white dark:bg-night-800/60
                    border-black/5 dark:border-white/10
                    hover:border-accent/30">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-day-900 dark:text-white truncate">{room.name}</h3>
                      {room.host && (
                        <p className="text-xs text-day-900/40 dark:text-white/40 mt-0.5">by {room.host}</p>
                      )}
                    </div>
                    <span
                      className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: `${PLATFORM_COLORS[room.platform]}20`, color: PLATFORM_COLORS[room.platform] }}
                    >
                      {PLATFORM_LABELS[room.platform]}
                    </span>
                  </div>

                  {room.videoUrl ? (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-black/3 dark:bg-white/3">
                      <Play className="w-3 h-3 text-accent flex-shrink-0" />
                      <span className="text-xs text-day-900/50 dark:text-white/50 truncate">{room.videoUrl}</span>
                    </div>
                  ) : (
                    <div className="mb-3 px-3 py-2 rounded-xl bg-black/3 dark:bg-white/3">
                      <span className="text-xs text-day-900/30 dark:text-white/30">{t.discover.noVideo}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-day-900/50 dark:text-white/50">
                      <Users className="w-3.5 h-3.5" />
                      <span>{room.participants} {room.participants === 1 ? t.discover.person : t.discover.people}</span>
                    </div>
                    <span className="text-xs font-medium text-accent">{t.discover.joinRoom} →</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
