"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function CTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useLanguage();
  const router = useRouter();
  const [code, setCode] = useState("");

  const handleJoin = () => {
    const clean = code.trim().toUpperCase();
    if (clean.length === 6) router.push(`/room/${clean}`);
  };

  return (
    <section ref={ref} className="relative py-28 px-4 overflow-hidden bg-day-100/80 dark:bg-night-950">
      <div
        className="absolute inset-0 opacity-40"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(192,132,252,0.12) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center shadow-lg shadow-neon-purple/30">
            <Sparkles className="w-7 h-7 text-white" />
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-day-900 dark:text-white">{t.cta.title}</h2>
          <p className="text-day-900/50 dark:text-white/50 text-lg">{t.cta.subtitle}</p>

          <div className="w-full flex gap-2 max-w-md">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder={t.cta.placeholder}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="flex-1 px-4 py-3 rounded-xl
                bg-white dark:bg-night-800/80
                border border-day-200 dark:border-night-600
                text-day-900 dark:text-white
                placeholder:text-day-900/40 dark:placeholder:text-white/30
                text-sm outline-none focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/20 transition-all font-mono tracking-widest"
            />
            <Button onClick={handleJoin} disabled={code.length !== 6}>
              {t.cta.join} <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3 text-day-900/20 dark:text-white/20 text-sm w-full max-w-md">
            <div className="flex-1 h-px bg-current" />
            <span>{t.cta.createNew}</span>
            <div className="flex-1 h-px bg-current" />
          </div>

          <Button size="lg" variant="secondary" onClick={() => router.push("/room")}>
            {t.hero.createRoom}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
