"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, SmilePlus } from "lucide-react";
import type { ChatMessage, Participant, Reaction } from "@/hooks/useRoom";
import { useLanguage } from "@/components/providers/LanguageProvider";

const REACTIONS = ["❤️", "😂", "😮", "😭", "🔥", "👏", "😍", "💀", "🤣", "🥰"];

interface ChatPanelProps {
  messages: ChatMessage[];
  reactions: Reaction[];
  participants: Participant[];
  youId: string | null;
  roomId: string;
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
}

export function ChatPanel({ messages, reactions, participants, youId, roomId, onSendMessage, onSendReaction }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [showReactions, setShowReactions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const myName = participants.find((p) => p.id === youId)?.name;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSendMessage(text);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-day-50 dark:bg-night-900 relative">
      {/* Floating reactions overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        <AnimatePresence>
          {reactions.map((r) => <FloatingReaction key={r.id} reaction={r} />)}
        </AnimatePresence>
      </div>

      {/* Participants bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-day-100/80 dark:bg-night-800/50 border-black/5 dark:border-white/5">
        <span className="text-xs text-day-900/40 dark:text-white/40">{t.watchRoom.participants}</span>
        <div className="flex items-center gap-1">
          {participants.map((p, i) => (
            <div
              key={p.id}
              title={p.name}
              className="w-6 h-6 rounded-full text-xs flex items-center justify-center border-2 -ml-1 first:ml-0 border-day-50 dark:border-night-900"
              style={{ background: p.color, zIndex: participants.length - i }}
            >
              {p.avatar ?? p.name[0].toUpperCase()}
            </div>
          ))}
        </div>
        <span className="text-xs text-day-900/30 dark:text-white/30 ml-auto">{participants.length} online</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {messages.map((msg) =>
          msg.isSystem ? (
            <div key={msg.id} className="text-center my-1">
              <span className="text-[11px] text-day-900/30 dark:text-white/30 px-3 py-1 rounded-full bg-black/3 dark:bg-white/3">
                {msg.text}
              </span>
            </div>
          ) : (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-2 items-start ${msg.username === myName ? "flex-row-reverse" : ""}`}
            >
              <div
                className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-0.5"
                style={{ background: msg.color }}
              >
                {(msg as any).avatar ?? msg.username[0].toUpperCase()}
              </div>
              <div className={`max-w-[80%] flex flex-col gap-0.5 ${msg.username === myName ? "items-end" : "items-start"}`}>
                <span className="text-[10px] font-medium px-1" style={{ color: msg.color }}>{msg.username}</span>
                <div
                  className="px-3 py-2 rounded-2xl text-sm leading-relaxed break-words text-day-900 dark:text-white/85"
                  style={{
                    background: msg.username === myName ? `${msg.color}18` : "rgba(0,0,0,0.04)",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: msg.username === myName ? `${msg.color}33` : "transparent",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            </motion.div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reaction picker */}
      <AnimatePresence>
        {showReactions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-3 pb-2"
          >
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-day-100 dark:bg-night-800 border border-black/5 dark:border-white/5">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { onSendReaction(emoji); setShowReactions(false); }}
                  className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-lg transition-all hover:scale-125 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-black/5 dark:border-white/5 flex gap-2 items-center">
        <button
          onClick={() => setShowReactions((v) => !v)}
          className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl
            bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10
            text-day-900/50 dark:text-white/50 hover:text-neon-pink transition-all"
        >
          <SmilePlus className="w-4 h-4" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={t.watchRoom.typeMessage}
          maxLength={500}
          className="flex-1 px-3 py-2 rounded-xl text-sm outline-none transition-all
            bg-day-100 dark:bg-night-800
            border border-black/5 dark:border-white/5
            text-day-900 dark:text-white
            placeholder:text-day-900/30 dark:placeholder:text-white/25
            focus:border-neon-purple/50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl
            bg-gradient-to-br from-neon-purple to-neon-pink text-white
            disabled:opacity-30 hover:opacity-90 transition-all hover:scale-105 active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function FloatingReaction({ reaction }: { reaction: Reaction }) {
  const x = Math.random() * 80 + 10;
  return (
    <motion.div
      className="absolute text-2xl pointer-events-none"
      style={{ left: `${x}%`, bottom: "80px" }}
      initial={{ y: 0, opacity: 1, scale: 1 }}
      animate={{ y: -150, opacity: 0, scale: 1.5 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2.5, ease: "easeOut" }}
    >
      {reaction.emoji}
    </motion.div>
  );
}
