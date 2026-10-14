"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Crown, LogOut, Share2 } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { Participant } from "@/hooks/useRoom";

interface Props {
  roomId: string;
  connected: boolean;
  participants: Participant[];
  maxParticipants: number;
  premium: boolean;
  onLeave: () => void;
}

// Barra superior de la sala: código (para dictarlo o copiarlo), quién está y salir.
export function RoomHeader({ roomId, connected, participants, maxParticipants, premium, onLeave }: Props) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const flash = (what: "code" | "link") => {
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      flash("code");
    } catch {}
  };

  // En el celular abre el menú de compartir del sistema; en el computador copia el enlace.
  const invite = async () => {
    const url = window.location.href;
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: "Togetherly", text: t.roomUi.inviteText, url });
        return;
      } catch {
        // La persona cerró el menú: no pasa nada.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      flash("link");
    } catch {}
  };

  return (
    <header className="flex flex-shrink-0 items-center gap-3 px-3 py-2.5 sm:px-5 sm:py-3">
      <Link href="/" aria-label="Togetherly" className="flex-shrink-0 text-accent">
        <LogoMark className="h-8 w-8" />
      </Link>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="hidden text-sm font-semibold text-day-900/60 dark:text-white/55 sm:inline">{t.roomUi.room}</span>
          <button
            onClick={copyCode}
            title={t.roomUi.copyCode}
            className="group flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 font-display text-lg font-extrabold tracking-[0.12em] text-accent hover:bg-accent/10"
          >
            {roomId}
            {copied === "code" ? (
              <Check className="h-3.5 w-3.5 text-sage" aria-label={t.roomUi.codeCopied} />
            ) : (
              <Copy className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" aria-hidden="true" />
            )}
          </button>
        </div>
        <p className="flex items-center gap-1.5 truncate text-xs text-day-900/55 dark:text-white/50" role="status">
          <span
            className={`h-2 w-2 flex-shrink-0 rounded-full ${connected ? "bg-sage" : "animate-pulse bg-blanket"}`}
            aria-hidden="true"
          />
          {connected ? t.roomUi.inRoom.replace("{n}", String(participants.length)) : t.roomUi.reconnecting}
        </p>
      </div>

      {premium && (
        <span className="hidden items-center gap-1 rounded-full bg-lamp/15 px-2.5 py-1 text-xs font-bold text-lamp md:flex">
          <Crown className="h-3.5 w-3.5" aria-hidden="true" />
          {t.roomUi.premiumRoom.replace("{max}", String(maxParticipants))}
        </span>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        {/* Caritas de quienes están en la sala */}
        <div className="mr-1 hidden -space-x-2 sm:flex" aria-label={t.watchRoom.participants}>
          {participants.slice(0, 5).map((p) => (
            <span
              key={p.id}
              title={p.name}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--page)] text-sm"
              style={{ background: p.color }}
            >
              {p.avatar || p.name.charAt(0).toUpperCase()}
            </span>
          ))}
        </div>

        <button
          onClick={invite}
          className="flex h-10 items-center gap-2 rounded-full bg-accent px-3.5 text-sm font-bold text-on-accent sm:px-4"
        >
          {copied === "link" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
          <span className="hidden sm:inline">{copied === "link" ? t.roomUi.inviteCopied : t.roomUi.invite}</span>
          <span className="sr-only sm:hidden">{t.roomUi.invite}</span>
        </button>
        <button
          onClick={onLeave}
          className="flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-day-900/60 hover:bg-day-900/5 hover:text-day-900 dark:text-white/55 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t.roomUi.leave}</span>
          <span className="sr-only sm:hidden">{t.roomUi.leave}</span>
        </button>
      </div>
    </header>
  );
}
