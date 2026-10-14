import { useEffect, useRef, useState, useCallback, type RefObject } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/constants";

export interface Participant {
  id: string;
  name: string;
  avatar: string;
}

export interface Message {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  text: string;
  timestamp: number;
}

interface RoomJoinedPayload {
  participants: Participant[];
  videoUrl: string | null;
  you: Participant;
}

interface ServerChatMessage {
  id: string;
  senderId?: string;
  username: string;
  avatar: string;
  text: string;
  timestamp: number;
}

export interface RoomState {
  connected: boolean;
  joined: boolean;
  participants: Participant[];
  messages: Message[];
  reactions: { id: string; emoji: string }[];
  videoUrl: string | null;
  you: Participant | null;
}

export function useRoom(roomId: string) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<RoomState>({
    connected: false,
    joined: false,
    participants: [],
    messages: [],
    reactions: [],
    videoUrl: null,
    you: null,
  });

  const remotePlayRef = useRef<((t: number) => void) | null>(null);
  const remotePauseRef = useRef<((t: number) => void) | null>(null);
  const remoteSeekRef = useRef<((t: number) => void) | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setState((s) => ({ ...s, connected: true })));
    socket.on("disconnect", () => setState((s) => ({ ...s, connected: false, joined: false })));

    // Mismo protocolo que la web (ver server/connection.js)
    socket.on("room-joined", ({ participants, videoUrl, you }: RoomJoinedPayload) => {
      setState((s) => ({ ...s, joined: true, participants, you, videoUrl: videoUrl ?? s.videoUrl }));
    });

    socket.on("participant-joined", ({ participant }: { participant: Participant }) => {
      setState((s) => ({ ...s, participants: [...s.participants.filter((x) => x.id !== participant.id), participant] }));
    });

    socket.on("participant-left", ({ participantId }: { participantId: string }) => {
      setState((s) => ({ ...s, participants: s.participants.filter((p) => p.id !== participantId) }));
    });

    socket.on("chat-message", (msg: ServerChatMessage) => {
      const message: Message = {
        id: msg.id,
        userId: msg.senderId ?? "",
        name: msg.username,
        avatar: msg.avatar,
        text: msg.text,
        timestamp: msg.timestamp,
      };
      setState((s) => ({ ...s, messages: [...s.messages, message] }));
    });

    socket.on("reaction", ({ emoji }: { emoji: string }) => {
      const id = Math.random().toString(36).slice(2);
      setState((s) => ({ ...s, reactions: [...s.reactions, { id, emoji }] }));
      setTimeout(() => setState((s) => ({ ...s, reactions: s.reactions.filter((r) => r.id !== id) })), 3000);
    });

    // currentTime puede llegar en null ("Di Play" sin extensión): entonces no se salta.
    const withTime = (cb: RefObject<((t: number) => void) | null>) =>
      ({ currentTime }: { currentTime: number | null }) => {
        if (typeof currentTime === "number") cb.current?.(currentTime);
      };
    socket.on("video-play", withTime(remotePlayRef));
    socket.on("video-pause", withTime(remotePauseRef));
    socket.on("video-seek", withTime(remoteSeekRef));

    socket.on("video-url-changed", ({ url }: { url: string }) => {
      setState((s) => ({ ...s, videoUrl: url }));
    });

    return () => { socket.disconnect(); };
  }, [roomId]);

  const joinRoom = useCallback((name: string, avatar: string) => {
    socketRef.current?.emit("join-room", { roomId, username: name, avatar, isPublic: false, roomName: name });
  }, [roomId]);

  const sendMessage = useCallback((text: string) => {
    socketRef.current?.emit("chat-message", { roomId, text });
  }, [roomId]);

  const sendReaction = useCallback((emoji: string) => {
    socketRef.current?.emit("reaction", { roomId, emoji });
  }, [roomId]);

  const sendPlay = useCallback((time: number) => {
    socketRef.current?.emit("video-play", { roomId, currentTime: time });
  }, [roomId]);

  const sendPause = useCallback((time: number) => {
    socketRef.current?.emit("video-pause", { roomId, currentTime: time });
  }, [roomId]);

  const sendSeek = useCallback((time: number) => {
    socketRef.current?.emit("video-seek", { roomId, currentTime: time });
  }, [roomId]);

  const changeVideoUrl = useCallback((url: string) => {
    socketRef.current?.emit("video-url-change", { roomId, url });
    setState((s) => ({ ...s, videoUrl: url }));
  }, [roomId]);

  const onRemotePlay = useCallback((cb: (t: number) => void) => { remotePlayRef.current = cb; }, []);
  const onRemotePause = useCallback((cb: (t: number) => void) => { remotePauseRef.current = cb; }, []);
  const onRemoteSeek = useCallback((cb: (t: number) => void) => { remoteSeekRef.current = cb; }, []);

  return {
    state,
    joinRoom,
    sendMessage,
    sendReaction,
    sendPlay,
    sendPause,
    sendSeek,
    changeVideoUrl,
    onRemotePlay,
    onRemotePause,
    onRemoteSeek,
  };
}
