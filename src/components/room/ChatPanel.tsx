"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowDown, Bell, BellOff, BellRing } from "lucide-react";
import type { ChatMessage, Reaction } from "@/hooks/useRoom";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useNotifications } from "@/hooks/useNotifications";

export const REACTIONS = ["❤️", "😂", "😮", "😭", "🔥", "👏"];

interface ChatPanelProps {
  messages: ChatMessage[];
  reactions: Reaction[];
  youId: string | null;
  typingUsers: string[];
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
  onTyping: () => void;
}

const NEAR_BOTTOM_PX = 80;

export function ChatPanel({
  messages, reactions, youId,
  typingUsers, onSendMessage, onSendReaction, onTyping,
}: ChatPanelProps) {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [atBottom, setAtBottom] = useState(true);
  // Cuántos mensajes había cuando la persona dejó de estar al final (para contar los nuevos)
  const [seenCount, setSeenCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTypingRef = useRef(0);
  const notifiedCountRef = useRef(0);
  const { permission, request: requestNotifications, notify } = useNotifications();

  const isMine = (msg: ChatMessage) => !!youId && msg.senderId === youId;
  const unread = atBottom ? 0 : messages.slice(seenCount).filter((m) => !m.system && !isMine(m)).length;

  // Mensajes nuevos: avisar si la pestaña está oculta.
  useEffect(() => {
    for (const msg of messages.slice(notifiedCountRef.current)) {
      if (!msg.system && youId && msg.senderId !== youId) notify(msg.username, msg.text);
    }
    notifiedCountRef.current = messages.length;
  }, [messages, youId, notify]);

  // Si la persona estaba al final, se queda al final cuando llega algo.
  const messageCount = messages.length;
  useEffect(() => {
    const el = containerRef.current;
    if (el && atBottom) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messageCount, typingUsers.length, atBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (nearBottom !== atBottom) {
      setAtBottom(nearBottom);
      if (!nearBottom) setSeenCount(messages.length);
    }
  };

  const scrollToBottom = () => {
    const el = containerRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setAtBottom(true);
  };

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSendMessage(text);
    setInput("");
    scrollToBottom();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    const now = Date.now();
    if (now - lastTypingRef.current > 1000) {
      onTyping();
      lastTypingRef.current = now;
    }
  };

  const systemText = (msg: ChatMessage) => {
    if (msg.system === "you-joined") return t.roomUi.youJoined;
    if (msg.system === "joined") return t.roomUi.joined.replace("{name}", msg.username);
    return t.roomUi.left.replace("{name}", msg.username);
  };

  const notificationLabel =
    permission === "granted" ? t.roomUi.notificationsOn
      : permission === "denied" ? t.roomUi.notificationsDenied
        : t.roomUi.notificationsOff;

  const typingText = typingUsers.length === 1
    ? t.roomUi.typingOne.replace("{name}", typingUsers[0])
    : t.roomUi.typingMany.replace("{names}", typingUsers.slice(0, 2).join(", "));

  const hasChat = messages.some((m) => !m.system);

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden" aria-label={t.roomUi.chat}>
      {/* Reacciones que suben flotando */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
        <AnimatePresence>
          {reactions.map((r) => (
            <motion.span
              key={r.id}
              className="absolute bottom-20 text-3xl"
              style={{ left: `${r.x}%` }}
              initial={{ y: 0, opacity: 1, scale: 1 }}
              animate={{ y: -180, opacity: 0, scale: 1.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: "easeOut" }}
            >
              {r.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex flex-shrink-0 items-center justify-between px-4 pb-2 pt-3">
        <h2 className="font-display text-base font-bold text-day-900 dark:text-white">{t.roomUi.chat}</h2>
        <button
          onClick={requestNotifications}
          disabled={permission !== "default"}
          title={notificationLabel}
          aria-label={notificationLabel}
          className="flex h-9 w-9 items-center justify-center rounded-full text-day-900/50 hover:bg-day-900/5 hover:text-accent disabled:cursor-default disabled:hover:bg-transparent dark:text-white/50 dark:hover:bg-white/5"
        >
          {permission === "granted" ? <BellRing className="h-4 w-4 text-accent" />
            : permission === "denied" ? <BellOff className="h-4 w-4" />
              : <Bell className="h-4 w-4" />}
        </button>
      </div>

      {/* Mensajes */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-3"
        aria-live="polite"
      >
        {messages.map((msg) =>
          msg.system ? (
            <p key={msg.id} className="text-center text-xs text-day-900/45 dark:text-white/40">
              {systemText(msg)}
            </p>
          ) : (
            <ChatBubble key={msg.id} msg={msg} mine={isMine(msg)} youLabel={t.roomUi.you} />
          )
        )}

        {!hasChat && (
          <p className="mt-6 text-center text-sm text-day-900/45 dark:text-white/40">{t.roomUi.emptyChat}</p>
        )}

        {typingUsers.length > 0 && (
          <p className="flex items-center gap-2 text-xs text-day-900/50 dark:text-white/45">
            <span className="flex gap-0.5" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </span>
            {typingText}
          </p>
        )}
      </div>

      <AnimatePresence>
        {!atBottom && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={scrollToBottom}
            className="absolute bottom-[120px] right-4 z-30 flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-on-accent shadow-lg"
          >
            <ArrowDown className="h-3 w-3" aria-hidden="true" />
            {unread > 0 ? t.roomUi.newMessages.replace("{n}", String(unread)) : t.roomUi.scrollDown}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Reacciones rápidas + caja de texto */}
      <div className="flex-shrink-0 border-t border-day-900/10 px-3 pb-3 pt-2 dark:border-white/10">
        <div className="mb-2 flex justify-between gap-1" role="group" aria-label={t.roomUi.reactions}>
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              aria-label={`${t.roomUi.reactions}: ${emoji}`}
              className="flex h-10 flex-1 items-center justify-center rounded-xl text-xl hover:bg-day-900/5 active:scale-90 dark:hover:bg-white/5"
            >
              {emoji}
            </button>
          ))}
        </div>
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <label htmlFor="chat-input" className="sr-only">{t.watchRoom.typeMessage}</label>
          <input
            id="chat-input"
            value={input}
            onChange={handleInputChange}
            placeholder={t.watchRoom.typeMessage}
            maxLength={500}
            autoComplete="off"
            enterKeyHint="send"
            className="min-w-0 flex-1 rounded-full border border-day-900/10 bg-white px-4 py-2.5 text-base text-day-900 outline-none placeholder:text-day-900/40 focus:border-accent sm:text-sm dark:border-white/10 dark:bg-night-800 dark:text-white dark:placeholder:text-white/35"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label={t.watchRoom.send}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-accent text-on-accent disabled:opacity-35"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </section>
  );
}

function ChatBubble({ msg, mine, youLabel }: { msg: ChatMessage; mine: boolean; youLabel: string }) {
  return (
    <div className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
      <span
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm"
        style={{ background: msg.color }}
        aria-hidden="true"
      >
        {msg.avatar ?? msg.username.charAt(0).toUpperCase()}
      </span>
      <div className={`flex max-w-[78%] flex-col gap-0.5 ${mine ? "items-end" : "items-start"}`}>
        <span className="px-1 text-[11px] font-bold" style={{ color: msg.color }}>
          {mine ? youLabel : msg.username}
        </span>
        <p
          className={`break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
            mine
              ? "rounded-br-md bg-accent text-on-accent"
              : "rounded-bl-md bg-white text-day-900 dark:bg-night-800 dark:text-white/90"
          }`}
        >
          {msg.text}
        </p>
      </div>
    </div>
  );
}
