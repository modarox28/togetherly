"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/components/providers/LanguageProvider";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

export function Hero() {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 pt-20 bg-day-50 dark:bg-night-950">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Blob 1 - purple */}
        <div
          className="absolute animate-blob-drift"
          style={{
            width: "700px", height: "700px",
            top: "-200px", left: "-150px",
            background: "radial-gradient(circle, rgba(192,132,252,0.18) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
        {/* Blob 2 - pink */}
        <div
          className="absolute animate-blob-drift-reverse"
          style={{
            width: "600px", height: "600px",
            bottom: "-100px", right: "-100px",
            background: "radial-gradient(circle, rgba(244,114,182,0.15) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
        {/* Blob 3 - center */}
        <div
          className="absolute animate-blob-drift"
          style={{
            width: "400px", height: "400px",
            top: "40%", left: "50%",
            transform: "translate(-50%,-50%)",
            background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)",
            borderRadius: "50%",
            animationDelay: "-5s",
          }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(192,132,252,1) 1px, transparent 1px), linear-gradient(90deg, rgba(192,132,252,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto gap-6"
      >
        {/* Badge */}
        <motion.div variants={itemVariants}>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-purple/10 border border-neon-purple/20 text-neon-purple text-sm font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse-glow" />
            {t.hero.badge}
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05]"
        >
          <span className="text-day-900 dark:text-white">{t.hero.title1}</span>
          <br />
          <span className="gradient-text">{t.hero.title2}</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-lg md:text-xl text-day-900/60 dark:text-white/60 max-w-2xl leading-relaxed"
        >
          {t.hero.subtitle}
        </motion.p>

        {/* CTAs */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 mt-2">
          <Button size="lg" onClick={() => window.location.href = "/room"}>
            <Play className="w-4 h-4 fill-white" />
            {t.hero.createRoom}
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button size="lg" variant="secondary" onClick={() => window.location.href = "/room?tab=join"}>
            <Users className="w-4 h-4" />
            {t.hero.joinRoom}
          </Button>
        </motion.div>

        {/* No account note */}
        <motion.p variants={itemVariants} className="text-sm text-day-900/40 dark:text-white/30">
          {t.hero.noAccount}
        </motion.p>

        {/* App preview */}
        <motion.div variants={itemVariants} className="w-full max-w-3xl mt-6 relative">
          <div className="animate-float-y">
            <AppPreview />
          </div>
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3/4 h-24 blur-3xl opacity-60 dark:opacity-100"
            style={{ background: "linear-gradient(90deg, rgba(192,132,252,0.2), rgba(244,114,182,0.2))" }}
          />
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-px h-12 bg-gradient-to-b from-transparent via-neon-purple/60 to-transparent animate-pulse-glow" />
      </motion.div>
    </section>
  );
}

function AppPreview() {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-2xl bg-night-900">
      {/* Window bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-night-800/80 border-b border-white/5">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <div className="flex-1 mx-4">
          <div className="w-48 h-4 mx-auto rounded-full bg-white/5 flex items-center justify-center">
            <span className="text-[10px] text-white/30">togetherly.app/room/A3X7KP</span>
          </div>
        </div>
      </div>

      {/* App layout mockup */}
      <div className="flex h-56 sm:h-72">
        {/* Video area */}
        <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-night-800 to-black" />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-neon-purple/20 border border-neon-purple/40 flex items-center justify-center">
              <Play className="w-5 h-5 text-neon-purple fill-neon-purple" />
            </div>
            <div className="text-white/40 text-xs">YouTube · Synced</div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80">
            <div className="w-full h-1 bg-white/10 rounded-full mb-2">
              <div className="w-1/3 h-full bg-gradient-to-r from-neon-purple to-neon-pink rounded-full" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-3 rounded bg-white/20" />
              <div className="w-8 h-3 rounded bg-white/10" />
              <div className="flex-1" />
              <div className="text-[10px] text-white/40">23:45 / 1:54:00</div>
            </div>
          </div>
          <FloatingReaction emoji="❤️" x="15%" delay={0} />
          <FloatingReaction emoji="😂" x="70%" delay={1.2} />
          <FloatingReaction emoji="😮" x="45%" delay={2.5} />
        </div>

        {/* Chat sidebar */}
        <div className="w-52 sm:w-64 bg-night-800 border-l border-white/5 flex flex-col">
          <div className="px-3 py-2 border-b border-white/5 text-xs font-medium text-white/50">Chat</div>
          <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
            {[
              { name: "Ana", msg: "omg this part!!! 😭", color: "#F472B6" },
              { name: "Carlos", msg: "I know right!! wait for it", color: "#C084FC" },
              { name: "Ana", msg: "❤️❤️❤️", color: "#F472B6" },
            ].map((m, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white mt-0.5" style={{ background: m.color }}>
                  {m.name[0]}
                </div>
                <div>
                  <span className="text-[9px] font-medium" style={{ color: m.color }}>{m.name}</span>
                  <p className="text-[10px] text-white/60 leading-tight">{m.msg}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-white/5">
            <div className="bg-night-700 rounded-lg px-3 py-2 text-[10px] text-white/30 flex items-center justify-between">
              <span>Type a message...</span>
              <div className="w-5 h-5 rounded-lg bg-neon-purple/30 flex items-center justify-center">
                <ArrowRight className="w-2.5 h-2.5 text-neon-purple" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingReaction({ emoji, x, delay }: { emoji: string; x: string; delay: number }) {
  return (
    <motion.div
      className="absolute bottom-12 text-xl pointer-events-none"
      style={{ left: x }}
      initial={{ y: 0, opacity: 1, scale: 1 }}
      animate={{ y: -80, opacity: 0, scale: 0.5 }}
      transition={{ duration: 2.5, delay, repeat: Infinity, repeatDelay: 4, ease: "easeOut" }}
    >
      {emoji}
    </motion.div>
  );
}
