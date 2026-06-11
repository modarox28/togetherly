"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ArrowRight, Users, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { generateRoomId } from "@/lib/utils";
import { CHARACTERS } from "@/lib/characters";

export default function RoomSetupPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [step, setStep] = useState<"info" | "character">("info");
  const [username, setUsername] = useState("");
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [tab, setTab] = useState<"create" | "join">("create");
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ username?: string; joinCode?: string; character?: string }>({});

  const handleNextStep = () => {
    if (!username.trim()) { setErrors({ username: t.room.nameRequired }); return; }
    if (tab === "join") {
      const code = joinCode.trim().toUpperCase();
      if (code.length !== 6) { setErrors({ joinCode: t.room.invalidCode }); return; }
    }
    setErrors({});
    setStep("character");
  };

  const handleFinish = () => {
    if (!selectedCharacter) { setErrors({ character: t.room.characterRequired }); return; }
    sessionStorage.setItem("togetherly-username", username.trim());
    sessionStorage.setItem("togetherly-character", selectedCharacter);
    if (tab === "create") {
      const roomId = generateRoomId();
      router.push(`/room/${roomId}`);
    } else {
      router.push(`/room/${joinCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-day-50 dark:bg-night-950">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full animate-blob-drift"
          style={{ background: "radial-gradient(circle, rgba(192,132,252,0.12) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full animate-blob-drift-reverse"
          style={{ background: "radial-gradient(circle, rgba(244,114,182,0.10) 0%, transparent 70%)" }} />
      </div>

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

            <AnimatePresence mode="wait">
              {step === "info" ? (
                <motion.div
                  key="info"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
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
                        <Button size="lg" className="w-full" onClick={handleNextStep} disabled={!username.trim()}>
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
                        <Button size="lg" className="w-full" onClick={handleNextStep} disabled={!username.trim() || joinCode.length !== 6}>
                          <Users className="w-4 h-4" />
                          {t.room.joinButton}
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="character"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-8">
                    <button
                      onClick={() => setStep("info")}
                      className="flex items-center gap-1.5 text-sm text-day-900/40 dark:text-white/40 hover:text-day-900/70 dark:hover:text-white/70 mb-5 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {t.room.back}
                    </button>

                    <h2 className="text-lg font-bold text-day-900 dark:text-white mb-1">
                      {t.room.chooseCharacter}
                    </h2>
                    <p className="text-sm text-day-900/40 dark:text-white/40 mb-5">
                      {t.room.characterSubtitle}
                    </p>

                    {errors.character && (
                      <p className="text-xs text-red-400 mb-3">{errors.character}</p>
                    )}

                    <div className="grid grid-cols-4 gap-2 mb-6">
                      {CHARACTERS.map((char) => (
                        <button
                          key={char.id}
                          onClick={() => { setSelectedCharacter(char.id); setErrors((p) => ({ ...p, character: undefined })); }}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all cursor-pointer ${
                            selectedCharacter === char.id
                              ? "border-neon-purple bg-neon-purple/10 scale-105"
                              : "border-transparent bg-black/3 dark:bg-white/3 hover:bg-black/5 dark:hover:bg-white/5 hover:scale-105"
                          }`}
                        >
                          <span className="text-2xl">{char.emoji}</span>
                          <span className="text-[10px] font-medium text-day-900/70 dark:text-white/70 leading-tight text-center">{char.name}</span>
                        </button>
                      ))}
                    </div>

                    {selectedCharacter && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-center text-day-900/40 dark:text-white/30 mb-4"
                      >
                        {CHARACTERS.find(c => c.id === selectedCharacter)?.emoji}{" "}
                        {CHARACTERS.find(c => c.id === selectedCharacter)?.name} · {CHARACTERS.find(c => c.id === selectedCharacter)?.from}
                      </motion.p>
                    )}

                    <Button
                      size="lg"
                      className="w-full"
                      onClick={handleFinish}
                      disabled={!selectedCharacter}
                    >
                      <Heart className="w-4 h-4" />
                      {tab === "create" ? t.room.enterRoom : t.room.joinButton}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
