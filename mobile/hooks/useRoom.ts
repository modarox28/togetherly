import { useEffect, useRef, useState, useCallback } from "react";
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
    socket.on("disconnect", () => setState((s) => ({ ...s, connected: false })));

    socket.on("room-state", ({ participants, videoUrl }: any) => {
      setState((s) => ({ ...s, participants, videoUrl: videoUrl ?? s.videoUrl }));
    });

    socket.on("user-joined", (p: Participant) => {
      setState((s) => ({ ...s, participants: [...s.participants.filter((x) => x.id !== p.id), p] }));
    });

    socket.on("user-left", ({ userId }: { userId: string }) => {
      setState((s) => ({ ...s, participants: s.participants.filter((p) => p.id !== userId) }));
    });

    socket.on("chat-message", (msg: Message) => {
      setState((s) => ({ ...s, messages: [...s.messages, msg] }));
    });

    socket.on("reaction", ({ emoji }: { emoji: string }) => {
      const id = Math.random().toString(36).slice(2);
      setState((s) => ({ ...s, reactions: [...s.reactions, { id, emoji }] }));
      setTimeout(() => setState((s) => ({ ...s, reactions: s.reactions.filter((r) => r.id !== id) })), 3000);
    });

    socket.on("video-play", ({ time }: { time: number }) => remotePlayRef.current?.(time));
    socket.on("video-pause", ({ time }: { time: number }) => remotePauseRef.current?.(time));
    socket.on("video-seek", ({ time }: { time: number }) => remoteSeekRef.current?.(time));

    socket.on("video-url-changed", ({ url }: { url: string }) => {
      setState((s) => ({ ...s, videoUrl: url }));
    });

    return () => { socket.disconnect(); };
  }, [roomId]);

  const joinRoom = useCallback((name: string, avatar: string) => {
    socketRef.current?.emit("join-room", { roomId, name, avatar, isPublic: false, roomName: `${name}'s room` });
    const you: Participant = { id: socketRef.current?.id ?? "", name, avatar };
    setState((s) => ({ ...s, joined: true, you }));
  }, [roomId]);

  const sendMessage = useCallback((text: string) => {
    socketRef.current?.emit("chat-message", { roomId, text });
  }, [roomId]);

  const sendReaction = useCallback((emoji: string) => {
    socketRef.current?.emit("reaction", { roomId, emoji });
  }, [roomId]);

  const sendPlay = useCallback((time: number) => {
    socketRef.current?.emit("video-play", { roomId, time });
  }, [roomId]);

  const sendPause = useCallback((time: number) => {
    socketRef.current?.emit("video-pause", { roomId, time });
  }, [roomId]);

  const sendSeek = useCallback((time: number) => {
    socketRef.current?.emit("video-seek", { roomId, time });
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
