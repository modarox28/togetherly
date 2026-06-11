"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "@/lib/socket";

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
  isSystem?: boolean;
}

export interface VideoState {
  playing: boolean;
  currentTime: number;
  updatedAt: number;
}

export interface Reaction {
  id: number;
  emoji: string;
  username: string;
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
}

interface RoomActions {
  joinRoom: (roomId: string, username: string, avatar: string, isPublic?: boolean, roomName?: string) => void;
  changeVideoUrl: (roomId: string, url: string) => void;
  sendPlay: (roomId: string, currentTime: number) => void;
  sendPause: (roomId: string, currentTime: number) => void;
  sendSeek: (roomId: string, currentTime: number) => void;
  sendMessage: (roomId: string, text: string) => void;
  sendReaction: (roomId: string, emoji: string) => void;
  // Callbacks for video player to call when remote events arrive
  onRemotePlay: (cb: (t: number) => void) => void;
  onRemotePause: (cb: (t: number) => void) => void;
  onRemoteSeek: (cb: (t: number) => void) => void;
}

export function useRoom(): [RoomState, RoomActions] {
  const [state, setState] = useState<RoomState>({
    connected: false,
    joined: false,
    participants: [],
    you: null,
    isHost: false,
    videoUrl: null,
    videoState: { playing: false, currentTime: 0, updatedAt: Date.now() },
    messages: [],
    reactions: [],
  });

  const remotePlayRef = useRef<((t: number) => void) | null>(null);
  const remotePauseRef = useRef<((t: number) => void) | null>(null);
  const remoteSeekRef = useRef<((t: number) => void) | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    socket.on("connect", () => setState((s) => ({ ...s, connected: true })));
    socket.on("disconnect", () => setState((s) => ({ ...s, connected: false, joined: false })));

    socket.on("room-joined", ({ participants, videoUrl, videoState, isHost, you }) => {
      setState((s) => ({
        ...s,
        joined: true,
        participants,
        videoUrl,
        videoState,
        isHost,
        you,
        messages: [
          {
            id: "system-join",
            text: "You joined the room",
            username: "System",
            color: "#C084FC",
            timestamp: Date.now(),
            isSystem: true,
          },
        ],
      }));
    });

    socket.on("participant-joined", ({ participant }) => {
      setState((s) => ({
        ...s,
        participants: [...s.participants.filter((p) => p.id !== participant.id), participant],
        messages: [
          ...s.messages,
          {
            id: `sys-${Date.now()}`,
            text: `${participant.name} joined`,
            username: "System",
            color: participant.color,
            timestamp: Date.now(),
            isSystem: true,
          },
        ],
      }));
    });

    socket.on("participant-left", ({ participantId, name }) => {
      setState((s) => ({
        ...s,
        participants: s.participants.filter((p) => p.id !== participantId),
        messages: [
          ...s.messages,
          {
            id: `sys-${Date.now()}`,
            text: `${name} left the room`,
            username: "System",
            color: "#888",
            timestamp: Date.now(),
            isSystem: true,
          },
        ],
      }));
    });

    socket.on("video-url-changed", ({ url }) => {
      setState((s) => ({ ...s, videoUrl: url, videoState: { playing: false, currentTime: 0, updatedAt: Date.now() } }));
    });

    socket.on("video-play", ({ currentTime }) => {
      setState((s) => ({ ...s, videoState: { ...s.videoState, playing: true, currentTime, updatedAt: Date.now() } }));
      remotePlayRef.current?.(currentTime);
    });

    socket.on("video-pause", ({ currentTime }) => {
      setState((s) => ({ ...s, videoState: { ...s.videoState, playing: false, currentTime, updatedAt: Date.now() } }));
      remotePauseRef.current?.(currentTime);
    });

    socket.on("video-seek", ({ currentTime }) => {
      setState((s) => ({ ...s, videoState: { ...s.videoState, currentTime, updatedAt: Date.now() } }));
      remoteSeekRef.current?.(currentTime);
    });

    socket.on("chat-message", (message: ChatMessage) => {
      setState((s) => ({ ...s, messages: [...s.messages, message] }));
    });

    socket.on("reaction", (reaction: Reaction) => {
      setState((s) => {
        const reactions = [...s.reactions, reaction];
        return { ...s, reactions: reactions.slice(-20) };
      });
      setTimeout(() => {
        setState((s) => ({ ...s, reactions: s.reactions.filter((r) => r.id !== reaction.id) }));
      }, 3000);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room-joined");
      socket.off("participant-joined");
      socket.off("participant-left");
      socket.off("video-url-changed");
      socket.off("video-play");
      socket.off("video-pause");
      socket.off("video-seek");
      socket.off("chat-message");
      socket.off("reaction");
      socket.disconnect();
    };
  }, []);

  const actions: RoomActions = {
    joinRoom: useCallback((roomId, username, avatar, isPublic = false, roomName = "") => {
      getSocket().emit("join-room", { roomId, username, avatar, isPublic, roomName });
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
    onRemotePlay: useCallback((cb) => { remotePlayRef.current = cb; }, []),
    onRemotePause: useCallback((cb) => { remotePauseRef.current = cb; }, []),
    onRemoteSeek: useCallback((cb) => { remoteSeekRef.current = cb; }, []),
  };

  return [state, actions];
}
