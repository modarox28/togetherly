"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { fetchIceServers } from "@/lib/iceServers";

// Si la conexión se cae (p. ej. cambio de wifi a datos), se espera un momento y se intenta
// reconectar (ICE restart) antes de colgar.
const RECONNECT_GRACE_MS = 5000;
const GIVE_UP_MS = 15000;

export type CallState = "idle" | "calling" | "incoming" | "connected";

export interface IncomingCall {
  from: string;
  fromId: string;
}

export function useWebRTC(roomId: string) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteIdRef = useRef<string | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const videoDeviceIdRef = useRef<string | undefined>(undefined);
  const audioDeviceIdRef = useRef<string | undefined>(undefined);
  const isCallerRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const giveUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (giveUpTimerRef.current) clearTimeout(giveUpTimerRef.current);
    reconnectTimerRef.current = giveUpTimerRef.current = null;
  };

  const getMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoDeviceIdRef.current
        ? { deviceId: { exact: videoDeviceIdRef.current }, width: { ideal: 640 }, height: { ideal: 480 } }
        : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      audio: audioDeviceIdRef.current
        ? { deviceId: { exact: audioDeviceIdRef.current } }
        : true,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  };

  const cleanup = useCallback(() => {
    clearTimers();
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setIncomingCall(null);
    remoteIdRef.current = null;
    pendingCandidates.current = [];
    isCallerRef.current = false;
  }, []);

  // Quien inició la llamada vuelve a negociar con iceRestart para recuperar la conexión.
  const restartIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !isCallerRef.current || !remoteIdRef.current) return;
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      getSocket().emit("call-offer", { roomId, offer, targetId: remoteIdRef.current });
    } catch {}
  }, [roomId]);

  const createPC = useCallback(async (stream: MediaStream) => {
    const pc = new RTCPeerConnection({ iceServers: await fetchIceServers() });
    pcRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && remoteIdRef.current) {
        getSocket().emit("call-ice-candidate", {
          roomId,
          candidate: candidate.toJSON(),
          targetId: remoteIdRef.current,
        });
      }
    };

    pc.ontrack = ({ streams }) => {
      setRemoteStream(streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc !== pcRef.current) return;
      if (pc.connectionState === "connected") {
        clearTimers();
        setCallState("connected");
        return;
      }
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        // "disconnected" suele ser pasajero: primero se espera, luego se reintenta y al final se cuelga.
        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(restartIce, pc.connectionState === "failed" ? 0 : RECONNECT_GRACE_MS);
        }
        if (!giveUpTimerRef.current) giveUpTimerRef.current = setTimeout(cleanup, GIVE_UP_MS);
      }
    };

    return pc;
  }, [roomId, cleanup, restartIce]);

  useEffect(() => {
    const socket = getSocket();

    socket.on("call-request", ({ from, fromId }: IncomingCall) => {
      if (pcRef.current) return;
      setIncomingCall({ from, fromId });
      setCallState("incoming");
    });

    socket.on("call-accepted", async ({ fromId }: { fromId: string }) => {
      remoteIdRef.current = fromId;
      isCallerRef.current = true;
      try {
        const stream = await getMedia();
        const pc = await createPC(stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call-offer", { roomId, offer, targetId: fromId });
      } catch {
        cleanup();
      }
    });

    socket.on("call-offer", async ({ offer, fromId }: { offer: RTCSessionDescriptionInit; fromId: string }) => {
      // Oferta nueva de la misma persona durante la llamada = reconexión (ICE restart).
      if (pcRef.current && remoteIdRef.current === fromId) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          socket.emit("call-answer", { roomId, answer, targetId: fromId });
        } catch {}
        return;
      }
      if (pcRef.current) return; // ya hay otra llamada en curso
      remoteIdRef.current = fromId;
      try {
        const stream = await getMedia();
        const pc = await createPC(stream);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        for (const c of pendingCandidates.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        pendingCandidates.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call-answer", { roomId, answer, targetId: fromId });
        setCallState("connected");
      } catch {
        cleanup();
      }
    });

    socket.on("call-answer", async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      try {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
      } catch {}
    });

    socket.on("call-ice-candidate", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (pcRef.current?.remoteDescription) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      } else {
        pendingCandidates.current.push(candidate);
      }
    });

    socket.on("call-declined", () => { cleanup(); });
    socket.on("call-ended", () => { cleanup(); });

    return () => {
      socket.off("call-request");
      socket.off("call-accepted");
      socket.off("call-offer");
      socket.off("call-answer");
      socket.off("call-ice-candidate");
      socket.off("call-declined");
      socket.off("call-ended");
    };
  }, [roomId, createPC, cleanup]);

  const startCall = useCallback((videoDeviceId?: string, audioDeviceId?: string) => {
    videoDeviceIdRef.current = videoDeviceId;
    audioDeviceIdRef.current = audioDeviceId;
    setCallState("calling");
    getSocket().emit("call-request", { roomId });
  }, [roomId]);

  const answerCall = useCallback(() => {
    if (!incomingCall) return;
    const fromId = incomingCall.fromId;
    setIncomingCall(null);
    getSocket().emit("call-accept", { roomId, targetId: fromId });
  }, [roomId, incomingCall]);

  const declineCall = useCallback(() => {
    if (!incomingCall) return;
    getSocket().emit("call-decline", { roomId, targetId: incomingCall.fromId });
    setIncomingCall(null);
    setCallState("idle");
  }, [roomId, incomingCall]);

  const endCall = useCallback(() => {
    getSocket().emit("call-end", { roomId });
    cleanup();
  }, [roomId, cleanup]);

  const toggleMic = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMicOn((v) => !v);
  }, []);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsCameraOn((v) => !v);
  }, []);

  return {
    callState, localStream, remoteStream, incomingCall,
    isMicOn, isCameraOn,
    startCall, answerCall, declineCall, endCall,
    toggleMic, toggleCamera,
  };
}
