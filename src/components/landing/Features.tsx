"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Zap, MessageSquare, Smile, Lock, Palette, Languages } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

const featureIcons = [Zap, MessageSquare, Smile, Lock, Palette, Languages];
const featureColors = [
  "from-violet-500/20 to-purple-500/20 border-violet-500/20",
  "from-blue-500/20 to-cyan-500/20 border-blue-500/20",
  "from-pink-500/20 to-rose-500/20 border-pink-500/20",
  "from-green-500/20 to-emerald-500/20 border-green-500/20",
  "from-amber-500/20 to-orange-500/20 border-amber-500/20",
  "from-indigo-500/20 to-blue-500/20 border-indigo-500/20",
];
const iconColors = [
  "text-violet-500 dark:text-violet-400",
  "text-blue-500 dark:text-blue-400",
  "text-pink-500 dark:text-pink-400",
  "text-green-500 dark:text-green-400",
  "text-amber-500 dark:text-amber-400",
  "text-indigo-500 dark:text-indigo-400",
];

export function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useLanguage();

  return (
    <section id="features" ref={ref} className="py-24 px-4 bg-day-50 dark:bg-night-950">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-day-900 dark:text-white mb-4">
            {t.features.title}
          </h2>
          <p className="text-day-900/50 dark:text-white/50 text-lg">{t.features.subtitle}</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {t.features.items.map((feature, i) => {
            const Icon = featureIcons[i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="group relative rounded-2xl p-5 border transition-all duration-300 cursor-default overflow-hidden
                  bg-white dark:bg-night-800/60
                  border-day-200 dark:border-white/5
                  hover:border-neon-purple/20 hover:shadow-xl"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${featureColors[i]} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`} />
                <div className="relative z-10">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${featureColors[i]} border flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className={`w-5 h-5 ${iconColors[i]}`} />
                  </div>
                  <h3 className="text-base font-semibold text-day-900 dark:text-white mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-day-900/60 dark:text-white/50 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
