"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { parseNowWatching, type NowWatching } from "@/lib/streaming";
import { getClientKey } from "@/lib/clientKey";
import { cleanTrivia, type TriviaState } from "@/lib/trivia";

export interface Participant {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  username: string;
  color: string;
  timestamp: number;
  /** socket de quien lo escribió (para saber cuáles son "míos") */
  senderId?: string;
  avatar?: string;
  /** Mensajes del sistema: el texto se traduce al mostrarlo (ver ChatPanel). */
  system?: "you-joined" | "joined" | "left";
}

export interface VideoState {
  playing: boolean;
  currentTime: number;
  updatedAt: number;
}

export interface Reaction {
  id: string;
  emoji: string;
  username: string;
  /** Posición horizontal (0–100 %) donde sube la reacción */
  x: number;
}

interface RoomState {
  connected: boolean;
  joined: boolean;
  participants: Participant[];
  you: Participant | null;
  isHost: boolean;
  videoUrl: string | null;
  videoState: VideoState;
  messages: ChatMessage[];
  reactions: Reaction[];
  typingUsers: string[];
  /** Máximo de personas si la sala está llena; null si se pudo entrar. */
  roomFull: number | null;
  /** Cupo de la sala (2 gratis; más con Premium). */
  maxParticipants: number;
  /** La sala la abrió alguien con Premium (pase válido). */
  premium: boolean;
  /** Sala pública: sin videollamada (puede haber desconocidos). */
  isPublic: boolean;
  /** Película que alguien abrió con la extensión (Netflix, Prime…), si hay. */
  nowWatching: NowWatching | null;
  /** Trivia de la sala (ver server/trivia.js) */
  trivia: TriviaState | null;
  /** La película está por terminar: se ofrece la trivia (con el título, si se sabe). */
  triviaOffer: string | null;
  triviaError: string | null;
}

interface RoomActions {
  joinRoom: (roomId: string, username: string, avatar: string, isPublic?: boolean, roomName?: string, pass?: string | null) => void;
  changeVideoUrl: (roomId: string, url: string) => void;
  sendPlay: (roomId: string, currentTime: number | null) => void;
  sendPause: (roomId: string, currentTime: number | null) => void;
  sendSeek: (roomId: string, currentTime: number | null) => void;
  sendMessage: (roomId: string, text: string) => void;
  sendReaction: (roomId: string, emoji: string) => void;
  sendTyping: (roomId: string) => void;
  onRemotePlay: (cb: (t: number) => void) => void;
  onRemotePause: (cb: (t: number) => void) => void;
  onRemoteSeek: (cb: (t: number) => void) => void;
  startTrivia: (roomId: string, title?: string) => void;
  answerTrivia: (roomId: string, id: number, index: number, choice: number) => void;
  submitTrivia: (roomId: string, id: number, question: string, options: string[], answer: number) => void;
  controlTrivia: (roomId: string, action: "begin" | "stop") => void;
  dismissTriviaOffer: () => void;
}

export function useRoom(): [RoomState, RoomActions] {
  const [state, setState] = useState<RoomState>({
    connected: false,
    joined: false,
    roomFull: null,
    maxParticipants: 2,
    premium: false,
    isPublic: false,
    nowWatching: null,
    trivia: null,
    triviaOffer: null,
    triviaError: null,
    participants: [],
    you: null,
    isHost: false,
    videoUrl: null,
    videoState: { playing: false, currentTime: 0, updatedAt: 0 },
    messages: [],
    reactions: [],
    typingUsers: [],
  });

  const remotePlayRef = useRef<((t: number) => void) | null>(null);
  const remotePauseRef = useRef<((t: number) => void) | null>(null);
  const remoteSeekRef = useRef<((t: number) => void) | null>(null);
  const lastTimeRef = useRef(0);
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    socket.on("connect", () => setState((s) => ({ ...s, connected: true })));
    socket.on("disconnect", () => setState((s) => ({ ...s, connected: false, joined: false })));

    socket.on("room-full", ({ max }: { max: number }) => {
      setState((s) => ({ ...s, roomFull: max }));
    });

    socket.on("room-joined", ({ participants, videoUrl, videoState, isHost, you, maxParticipants, premium, nowWatching, isPublic }) => {
      setState((s) => ({
        ...s,
        joined: true,
        participants,
        videoUrl,
        videoState,
        isHost,
        you,
        maxParticipants: typeof maxParticipants === "number" ? maxParticipants : s.maxParticipants,
        premium: premium === true,
        isPublic: isPublic === true,
        nowWatching: parseNowWatching(nowWatching),
        messages: [systemMessage("you-joined", "", "#FFC965")],
      }));
    });

    socket.on("participant-joined", ({ participant }: { participant: Participant }) => {
      setState((s) => ({
        ...s,
        participants: [...s.participants.filter((p) => p.id !== participant.id), participant],
        messages: [...s.messages, systemMessage("joined", participant.name, participant.color)],
      }));
    });

    socket.on("participant-left", ({ participantId, name }: { participantId: string; name: string }) => {
      setState((s) => ({
        ...s,
        participants: s.participants.filter((p) => p.id !== participantId),
        messages: [...s.messages, systemMessage("left", name, "#888")],
      }));
    });

    socket.on("now-watching", (data: unknown) => {
      const nowWatching = parseNowWatching(data);
      if (nowWatching) setState((s) => ({ ...s, nowWatching }));
    });

    socket.on("video-url-changed", ({ url }) => {
      setState((s) => ({ ...s, videoUrl: url, videoState: { playing: false, currentTime: 0, updatedAt: Date.now() } }));
    });

    // currentTime llega en null cuando alguien usa "Di Play" sin extensión:
    // en ese caso se conserva el último tiempo conocido y no se salta.
    socket.on("video-play", ({ currentTime }: { currentTime: number | null }) => {
      const t = typeof currentTime === "number" ? currentTime : lastTimeRef.current;
      lastTimeRef.current = t;
      setState((s) => ({ ...s, videoState: { ...s.videoState, playing: true, currentTime: t, updatedAt: Date.now() } }));
      remotePlayRef.current?.(t);
    });

    socket.on("video-pause", ({ currentTime }: { currentTime: number | null }) => {
      const t = typeof currentTime === "number" ? currentTime : lastTimeRef.current;
      lastTimeRef.current = t;
      setState((s) => ({ ...s, videoState: { ...s.videoState, playing: false, currentTime: t, updatedAt: Date.now() } }));
      remotePauseRef.current?.(t);
    });

    socket.on("video-seek", ({ currentTime }: { currentTime: number | null }) => {
      if (typeof currentTime !== "number") return;
      lastTimeRef.current = currentTime;
      setState((s) => ({ ...s, videoState: { ...s.videoState, currentTime, updatedAt: Date.now() } }));
      remoteSeekRef.current?.(currentTime);
    });

    socket.on("chat-message", (message: ChatMessage) => {
      // Se guardan los últimos 300 mensajes para no llenar la memoria en sesiones largas.
      setState((s) => ({ ...s, messages: [...s.messages, message].slice(-300) }));
    });

    socket.on("typing", ({ username }: { username: string }) => {
      setState((s) => ({
        ...s,
        typingUsers: [...s.typingUsers.filter((u) => u !== username), username],
      }));
      const existing = typingTimeoutsRef.current.get(username);
      if (existing) clearTimeout(existing);
      const timeout = setTimeout(() => {
        setState((s) => ({ ...s, typingUsers: s.typingUsers.filter((u) => u !== username) }));
        typingTimeoutsRef.current.delete(username);
      }, 3000);
      typingTimeoutsRef.current.set(username, timeout);
    });

    socket.on("trivia", (data: unknown) => {
      const trivia = cleanTrivia(data);
      if (trivia) setState((s) => ({ ...s, trivia, triviaError: null, triviaOffer: trivia.phase === "end" ? s.triviaOffer : null }));
    });
    socket.on("trivia-offer", (data: { title?: unknown }) => {
      const title = typeof data?.title === "string" ? data.title.slice(0, 120) : "";
      setState((s) => ({ ...s, triviaOffer: title }));
    });
    socket.on("trivia-error", (data: { message?: unknown }) => {
      const message = typeof data?.message === "string" ? data.message.slice(0, 160) : "No se pudo";
      setState((s) => ({ ...s, triviaError: message }));
    });

    socket.on("reaction", ({ emoji, username }: { emoji: string; username: string }) => {
      const reaction: Reaction = { id: crypto.randomUUID(), emoji, username, x: 10 + Math.random() * 80 };
      setState((s) => ({ ...s, reactions: [...s.reactions, reaction].slice(-20) }));
      setTimeout(() => {
        setState((s) => ({ ...s, reactions: s.reactions.filter((r) => r.id !== reaction.id) }));
      }, 3000);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room-joined");
      socket.off("room-full");
      socket.off("participant-joined");
      socket.off("participant-left");
      socket.off("video-url-changed");
      socket.off("now-watching");
      socket.off("video-play");
      socket.off("video-pause");
      socket.off("video-seek");
      socket.off("chat-message");
      socket.off("typing");
      socket.off("reaction");
      socket.off("trivia");
      socket.off("trivia-offer");
      socket.off("trivia-error");
      socket.disconnect();
    };
  }, []);

  const actions: RoomActions = {
    joinRoom: useCallback((roomId, username, avatar, isPublic = false, roomName = "", pass = null) => {
      getSocket().emit("join-room", { roomId, username, avatar, isPublic, roomName, pass, clientKey: getClientKey() });
    }, []),
    changeVideoUrl: useCallback((roomId, url) => {
      getSocket().emit("video-url-change", { roomId, url });
    }, []),
    sendPlay: useCallback((roomId, currentTime) => {
      getSocket().emit("video-play", { roomId, currentTime });
    }, []),
    sendPause: useCallback((roomId, currentTime) => {
      getSocket().emit("video-pause", { roomId, currentTime });
    }, []),
    sendSeek: useCallback((roomId, currentTime) => {
      getSocket().emit("video-seek", { roomId, currentTime });
    }, []),
    sendMessage: useCallback((roomId, text) => {
      getSocket().emit("chat-message", { roomId, text });
    }, []),
    sendReaction: useCallback((roomId, emoji) => {
      getSocket().emit("reaction", { roomId, emoji });
    }, []),
    sendTyping: useCallback((roomId) => {
      getSocket().emit("typing", { roomId });
    }, []),
    onRemotePlay: useCallback((cb) => { remotePlayRef.current = cb; }, []),
    onRemotePause: useCallback((cb) => { remotePauseRef.current = cb; }, []),
    onRemoteSeek: useCallback((cb) => { remoteSeekRef.current = cb; }, []),
    startTrivia: useCallback((roomId, title = "") => {
      setState((s) => ({ ...s, triviaOffer: null, triviaError: null }));
      getSocket().emit("trivia-start", { roomId, title: title.trim().slice(0, 120) });
    }, []),
    answerTrivia: useCallback((roomId, id, index, choice) => {
      setState((s) => (s.trivia?.id === id ? { ...s, trivia: { ...s.trivia, you: { ...s.trivia.you, answered: true, choice } } } : s));
      getSocket().emit("trivia-answer", { roomId, id, index, choice });
    }, []),
    submitTrivia: useCallback((roomId, id, question, options, answer) => {
      getSocket().emit("trivia-submit", {
        roomId,
        id,
        question: question.trim().slice(0, 160),
        options: options.slice(0, 4).map((o) => o.trim().slice(0, 60)),
        answer,
      });
    }, []),
    controlTrivia: useCallback((roomId, action) => {
      getSocket().emit("trivia-control", { roomId, action });
    }, []),
    dismissTriviaOffer: useCallback(() => setState((s) => ({ ...s, triviaOffer: null })), []),
  };

  return [state, actions];
}

let systemCounter = 0;
function systemMessage(kind: NonNullable<ChatMessage["system"]>, name: string, color: string): ChatMessage {
  systemCounter += 1;
  return { id: `sys-${systemCounter}-${kind}`, text: "", username: name, color, timestamp: Date.now(), system: kind };
}
