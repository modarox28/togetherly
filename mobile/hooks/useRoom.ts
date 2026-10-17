import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/constants";
import { getClientKey } from "@/lib/clientKey";

// La app entra a la sala igual que la extensión del navegador (eventos "ext-…" en
// server/connection.js). Así quien usa la app y quien usa la extensión en el computador
// están en la misma sala y se sincronizan entre sí.

export interface Member {
  name: string;
  avatar: string;
  leader: boolean;
}

export interface ChatMessage {
  id: string;
  name: string;
  avatar: string;
  text: string;
  mine: boolean;
}

export interface NowWatching {
  url: string;
  platform: string;
  by: string;
}

/** Orden para el reproductor: la manda el servidor cuando otra persona da play, pausa o salta. */
export interface PlayerOrder {
  action: "play" | "pause" | "seek" | "state";
  currentTime?: number;
  playing?: boolean;
  by?: string | null;
}

export interface RoomNotice {
  id: number;
  text: string;
}

const text = (value: unknown, max: number, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
const time = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 86400 ? value : null;

export function useRoom(roomId: string, username: string, avatar: string, onOrder: (order: PlayerOrder) => void) {
  const socketRef = useRef<Socket | null>(null);
  const orderRef = useRef(onOrder);
  useEffect(() => {
    orderRef.current = onOrder;
  }, [onOrder]);

  const [connected, setConnected] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nowWatching, setNowWatching] = useState<NowWatching | null>(null);
  const [controlMode, setControlMode] = useState<"all" | "leader">("all");
  const [leader, setLeader] = useState<string | null>(null);
  const [youLead, setYouLead] = useState(false);
  const [notice, setNotice] = useState<RoomNotice | null>(null);
  const [reaction, setReaction] = useState<{ id: number; emoji: string } | null>(null);

  const showNotice = useCallback((message: string) => setNotice({ id: Date.now(), text: message }), []);

  useEffect(() => {
    if (!roomId || !username) return;
    const socket = io(SOCKET_URL, { transports: ["websocket"], reconnection: true });
    socketRef.current = socket;

    socket.on("connect", async () => {
      setConnected(true);
      socket.emit("ext-connect", { roomId, username, avatar, clientKey: await getClientKey() });
    });
    socket.on("disconnect", () => setConnected(false));

    const remote = { "video-play": "play", "video-pause": "pause", "video-seek": "seek" } as const;
    for (const [event, action] of Object.entries(remote)) {
      socket.on(event, (data: { currentTime?: unknown; by?: unknown }) => {
        const currentTime = time(data?.currentTime);
        const by = text(data?.by, 24, "Alguien");
        orderRef.current({ action, currentTime: currentTime ?? undefined, by });
        if (action === "pause") showNotice(`⏸ ${by} pausó`);
        else if (action === "play") showNotice(`▶ ${by} dio play`);
        else if (currentTime !== null) showNotice(`⏩ ${by} saltó a ${formatClock(currentTime)}`);
      });
    }
    socket.on("ext-state", (state: { known?: boolean; playing?: boolean; position?: unknown }) => {
      const position = time(state?.position);
      if (state?.known && position !== null) orderRef.current({ action: "state", currentTime: position, playing: !!state.playing });
    });
    socket.on("now-watching", (data: { url?: unknown; platform?: unknown; by?: unknown }) => {
      if (typeof data?.url !== "string" || !data.url.startsWith("https://")) return;
      setNowWatching({ url: data.url, platform: text(data.platform, 20, ""), by: text(data.by, 24, "Alguien") });
    });
    socket.on("members", (data: { members?: unknown[] }) => {
      if (!Array.isArray(data?.members)) return;
      setMembers(
        data.members.slice(0, 20).map((m) => {
          const member = (m ?? {}) as Record<string, unknown>;
          return { name: text(member.name, 24, "Invitado"), avatar: text(member.avatar, 8, "🍿"), leader: member.leader === true };
        })
      );
    });
    socket.on("room-settings", (data: { controlMode?: unknown; leader?: unknown; youLead?: unknown }) => {
      setYouLead(data?.youLead === true);
      setControlMode(data?.controlMode === "leader" ? "leader" : "all");
      setLeader(typeof data?.leader === "string" ? data.leader.slice(0, 24) : null);
    });
    socket.on("control-denied", (data: { leader?: unknown }) => {
      showNotice(`👑 Solo ${text(data?.leader, 24, "quien lidera")} controla la reproducción`);
    });
    socket.on("chat-message", (data: Record<string, unknown>) => {
      const body = text(data?.text, 500, "");
      if (!body) return;
      setMessages((list) =>
        [
          ...list,
          {
            id: text(data.id, 80, String(Date.now())),
            name: text(data.username, 24, "Invitado"),
            avatar: text(data.avatar, 8, "🍿"),
            text: body,
            mine: data.senderId === socket.id,
          },
        ].slice(-100)
      );
    });
    socket.on("reaction", (data: { emoji?: unknown }) => {
      const emoji = text(data?.emoji, 8, "");
      if (emoji) setReaction({ id: Date.now(), emoji });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, username, avatar, showNotice]);

  const emit = useCallback(
    (event: string, payload: Record<string, unknown> = {}) => socketRef.current?.emit(event, { roomId, ...payload }),
    [roomId]
  );

  return {
    connected,
    members,
    messages,
    nowWatching,
    controlMode,
    leader,
    notice,
    reaction,
    // Lo decide el servidor por la clave privada del celular, no por el nombre.
    isLeader: youLead,
    /** La persona tocó play, pausa o saltó en su reproductor. */
    sendPlayback: (type: "play" | "pause" | "seek", currentTime: number) => {
      const t = time(currentTime);
      if (t !== null) emit(`video-${type}`, { currentTime: t });
    },
    sendWatching: (url: string) => emit("ext-now-watching", { url }),
    requestState: () => emit("ext-state-request"),
    sendChat: (message: string) => {
      const body = message.trim().slice(0, 500);
      if (body) emit("ext-chat", { text: body });
    },
    sendReaction: (emoji: string) => emit("ext-reaction", { emoji }),
    setControl: (mode: "all" | "leader") => emit("set-control", { mode }),
  };
}

export function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
