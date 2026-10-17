import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/constants";
import { getClientKey } from "@/lib/clientKey";

// La app entra a la sala igual que la extensión del navegador (eventos "ext-…" en
// server/connection.js). Así quien usa la app y quien usa la extensión en el computador
// están en la misma sala y se sincronizan entre sí.

export interface Member {
  id: string | null;
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

/** Trivia al final de la película (la manda el servidor, ver server/trivia.js). */
export interface TriviaState {
  id: number;
  mode: "ai" | "friends";
  phase: "loading" | "collect" | "question" | "reveal" | "end";
  title: string;
  index: number;
  total: number;
  endsAt: number | null;
  players: number;
  submitted: number;
  answered: number;
  question: string;
  options: string[];
  author: string | null;
  correct: number | null;
  scores: { name: string; avatar: string; points: number }[];
  you: { answered: boolean; choice: number | null; isAuthor: boolean; submitted: boolean; canStop: boolean };
}

const int = (v: unknown, max: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max ? (v as number) : 0);

function cleanTrivia(raw: unknown): TriviaState | null {
  const d = (raw ?? {}) as Record<string, unknown>;
  const phases = ["loading", "collect", "question", "reveal", "end"] as const;
  if (!Number.isInteger(d.id) || !phases.includes(d.phase as TriviaState["phase"])) return null;
  const options = Array.isArray(d.options) ? d.options.slice(0, 4).map((o) => text(o, 60, "?")) : [];
  const you = (d.you ?? {}) as Record<string, unknown>;
  return {
    id: d.id as number,
    mode: d.mode === "friends" ? "friends" : "ai",
    phase: d.phase as TriviaState["phase"],
    title: text(d.title, 120, ""),
    index: int(d.index, 50),
    total: int(d.total, 50),
    endsAt: typeof d.endsAt === "number" ? d.endsAt : null,
    players: int(d.players, 50),
    submitted: int(d.submitted, 50),
    answered: int(d.answered, 50),
    question: text(d.question, 160, ""),
    options,
    author: typeof d.author === "string" ? d.author.slice(0, 24) : null,
    correct: Number.isInteger(d.correct) && (d.correct as number) < options.length ? (d.correct as number) : null,
    scores: (Array.isArray(d.scores) ? d.scores.slice(0, 20) : []).map((x) => {
      const s = (x ?? {}) as Record<string, unknown>;
      return { name: text(s.name, 24, "Invitado"), avatar: text(s.avatar, 8, "🍿"), points: int(s.points, 100000) };
    }),
    you: {
      answered: you.answered === true,
      choice: Number.isInteger(you.choice) ? (you.choice as number) : null,
      isAuthor: you.isAuthor === true,
      submitted: you.submitted === true,
      canStop: you.canStop === true,
    },
  };
}

const text = (value: unknown, max: number, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
const time = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 86400 ? value : null;

export function useRoom(
  roomId: string,
  username: string,
  avatar: string,
  onOrder: (order: PlayerOrder) => void,
  options: { isPublic?: boolean; roomName?: string } = {}
) {
  const isPublic = options.isPublic === true;
  const roomName = options.roomName;
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
  const [kicked, setKicked] = useState(false);
  const [notice, setNotice] = useState<RoomNotice | null>(null);
  const [reaction, setReaction] = useState<{ id: number; emoji: string } | null>(null);

  const [trivia, setTrivia] = useState<TriviaState | null>(null);
  const [triviaOffer, setTriviaOffer] = useState<string | null>(null);
  const [triviaError, setTriviaError] = useState<string | null>(null);

  const showNotice = useCallback((message: string) => setNotice({ id: Date.now(), text: message }), []);

  useEffect(() => {
    if (!roomId || !username) return;
    const socket = io(SOCKET_URL, { transports: ["websocket"], reconnection: true });
    socketRef.current = socket;

    socket.on("connect", async () => {
      setConnected(true);
      // isPublic/roomName solo cuentan si la sala es nueva (lo decide el servidor).
      socket.emit("ext-connect", { roomId, username, avatar, clientKey: await getClientKey(), isPublic, roomName });
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
          const id = typeof member.id === "string" && /^[a-f0-9]{6,32}$/.test(member.id) ? member.id : null;
          return { id, name: text(member.name, 24, "Invitado"), avatar: text(member.avatar, 8, "🍿"), leader: member.leader === true };
        })
      );
    });
    socket.on("room-settings", (data: { controlMode?: unknown; leader?: unknown; youLead?: unknown }) => {
      setYouLead(data?.youLead === true);
      setControlMode(data?.controlMode === "leader" ? "leader" : "all");
      setLeader(typeof data?.leader === "string" ? data.leader.slice(0, 24) : null);
    });
    socket.on("kicked", () => {
      setKicked(true);
      socket.disconnect();
    });
    socket.on("report-received", () => showNotice("Gracias, revisaremos el reporte"));
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
    socket.on("trivia", (data: unknown) => {
      const state = cleanTrivia(data);
      if (!state) return;
      setTrivia(state);
      setTriviaError(null);
      if (state.phase !== "end") setTriviaOffer(null);
    });
    socket.on("trivia-offer", (data: { title?: unknown }) => setTriviaOffer(text(data?.title, 120, "")));
    socket.on("trivia-error", (data: { message?: unknown }) => setTriviaError(text(data?.message, 160, "No se pudo")));
    socket.on("reaction", (data: { emoji?: unknown }) => {
      const emoji = text(data?.emoji, 8, "");
      if (emoji) setReaction({ id: Date.now(), emoji });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, username, avatar, showNotice, isPublic, roomName]);

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
    kicked,
    trivia,
    triviaOffer,
    triviaError,
    dismissTriviaOffer: () => setTriviaOffer(null),
    startTrivia: () => {
      setTriviaOffer(null);
      emit("trivia-start");
    },
    answerTrivia: (id: number, index: number, choice: number) => {
      setTrivia((t) => (t && t.id === id ? { ...t, you: { ...t.you, answered: true, choice } } : t));
      emit("trivia-answer", { id, index, choice });
    },
    submitTrivia: (id: number, question: string, options: string[], answer: number) =>
      emit("trivia-submit", { id, question: question.trim().slice(0, 160), options: options.slice(0, 4).map((o) => o.trim().slice(0, 60)), answer }),
    controlTrivia: (action: "begin" | "stop") => emit("trivia-control", { action }),
    sendTitle: (url: string, title: string) => emit("ext-movie-title", { url, title: title.slice(0, 120) }),
    sendEnding: () => emit("ext-movie-ending"),
    kickMember: (memberId: string) => emit("kick-member", { memberId }),
    reportMember: (memberId: string, reason: string) => emit("report-member", { memberId, reason: reason.slice(0, 200) }),
  };
}

export function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
