"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, ArrowRight, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { generateRoomId } from "@/lib/utils";

export default function RoomSetupPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [tab, setTab] = useState<"create" | "join">("create");
  const [errors, setErrors] = useState<{ username?: string; joinCode?: string }>({});

  const handleCreate = () => {
    if (!username.trim()) { setErrors({ username: t.room.nameRequired }); return; }
    const roomId = generateRoomId();
    sessionStorage.setItem("togetherly-username", username.trim());
    router.push(`/room/${roomId}`);
  };

  const handleJoin = () => {
    if (!username.trim()) { setErrors({ username: t.room.nameRequired }); return; }
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) { setErrors({ joinCode: t.room.invalidCode }); return; }
    sessionStorage.setItem("togetherly-username", username.trim());
    router.push(`/room/${code}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-day-50 dark:bg-night-950">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full animate-blob-drift"
          style={{ background: "radial-gradient(circle, rgba(192,132,252,0.12) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full animate-blob-drift-reverse"
          style={{ background: "radial-gradient(circle, rgba(244,114,182,0.10) 0%, transparent 70%)" }} />
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-bold gradient-text">Togetherly</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <div className="glass rounded-3xl border shadow-2xl overflow-hidden
            bg-white/90 dark:bg-night-800/60
            border-black/5 dark:border-white/10">
            {/* Tab bar */}
            <div className="flex border-b border-black/5 dark:border-white/5">
              {(["create", "join"] as const).map((tabKey) => (
                <button
                  key={tabKey}
                  onClick={() => { setTab(tabKey); setErrors({}); }}
                  className={`flex-1 py-4 text-sm font-medium transition-colors cursor-pointer ${
                    tab === tabKey
                      ? "text-neon-purple border-b-2 border-neon-purple bg-neon-purple/5"
                      : "text-day-900/40 dark:text-white/40 hover:text-day-900/70 dark:hover:text-white/70"
                  }`}
                >
                  {tabKey === "create" ? t.room.createButton : t.room.joinButton}
                </button>
              ))}
            </div>

            <div className="p-8 flex flex-col gap-5">
              <Input
                label={t.room.yourName}
                placeholder={t.room.namePlaceholder}
                value={username}
                onChange={(e) => { setUsername(e.target.value); setErrors((p) => ({ ...p, username: undefined })); }}
                error={errors.username}
                maxLength={20}
              />

              {tab === "create" ? (
                <>
                  <Input
                    label={t.room.roomName}
                    placeholder={t.room.roomNamePlaceholder}
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    maxLength={30}
                  />
                  <Button size="lg" className="w-full" onClick={handleCreate}>
                    <Heart className="w-4 h-4" />
                    {t.room.createButton}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    label={t.room.roomCode}
                    placeholder={t.room.roomCodePlaceholder}
                    value={joinCode}
                    onChange={(e) => { setJoinCode(e.target.value.toUpperCase().slice(0, 6)); setErrors((p) => ({ ...p, joinCode: undefined })); }}
                    error={errors.joinCode}
                    maxLength={6}
                    className="font-mono tracking-widest text-center text-lg uppercase"
                  />
                  <Button size="lg" className="w-full" onClick={handleJoin}>
                    <Users className="w-4 h-4" />
                    {t.room.joinButton}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
