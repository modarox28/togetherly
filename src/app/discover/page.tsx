"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Users, Play, RefreshCw, Globe } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { PLATFORM_COLORS, PLATFORM_LABELS, type Platform } from "@/lib/platforms";

interface PublicRoom {
  id: string;
  name: string;
  participants: number;
  host: string | null;
  videoUrl: string | null;
  platform: Platform;
  createdAt: number;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export default function DiscoverPage() {
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SOCKET_URL}/api/rooms`);
      const data = await res.json();
      setRooms(data);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRooms(); }, []);

  return (
    <div className="min-h-screen bg-day-50 dark:bg-night-950">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full animate-blob-drift"
          style={{ background: "radial-gradient(circle, rgba(192,132,252,0.10) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full animate-blob-drift-reverse"
          style={{ background: "radial-gradient(circle, rgba(244,114,182,0.08) 0%, transparent 70%)" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-night-900/80 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-bold gradient-text">Togetherly</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <Button size="sm" onClick={() => window.location.href = "/room"}>
            {t.nav.startWatching}
          </Button>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-day-900 dark:text-white">
              {t.discover.title}
            </h1>
            <p className="text-day-900/40 dark:text-white/40 mt-1 text-sm">
              {t.discover.subtitle}
            </p>
          </div>
          <button onClick={fetchRooms} disabled={loading}
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
            <Button onClick={() => window.location.href = "/room"}>
              {t.discover.createFirst}
            </Button>
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
                    hover:border-neon-purple/30">
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
                      <Play className="w-3 h-3 text-neon-purple flex-shrink-0" />
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
                    <span className="text-xs font-medium text-neon-purple">{t.discover.joinRoom} →</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
