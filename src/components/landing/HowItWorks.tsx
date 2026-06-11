"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { LinkIcon, Play, MessageCircleHeart } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

const stepIcons = [LinkIcon, Play, MessageCircleHeart];

export function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const { t } = useLanguage();

  return (
    <section id="how-it-works" ref={ref} className="relative py-24 px-4 overflow-hidden bg-day-100/80 dark:bg-night-900/50">
      <div className="relative z-10 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-day-900 dark:text-white mb-4">
            {t.howItWorks.title}
          </h2>
          <p className="text-day-900/50 dark:text-white/50 text-lg">
            {t.howItWorks.subtitle}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-transparent via-neon-purple/30 to-transparent" />

          {t.howItWorks.steps.map((step, i) => {
            const Icon = stepIcons[i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="relative group"
              >
                <div className="glass rounded-2xl p-6 border transition-all duration-300
                  bg-white/80 dark:bg-night-800/40
                  border-day-200 dark:border-white/5
                  hover:border-neon-purple/30 hover:shadow-xl hover:shadow-neon-purple/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 border border-neon-purple/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="w-5 h-5 text-neon-purple" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink text-white text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>
                    <span className="text-4xl font-black text-day-900/5 dark:text-white/5 select-none">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-day-900 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-day-900/60 dark:text-white/50 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
