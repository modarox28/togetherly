"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

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

  const getMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      audio: true,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  };

  const createPC = useCallback((stream: MediaStream) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
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
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        cleanup();
      }
      if (pc.connectionState === "connected") {
        setCallState("connected");
      }
    };

    return pc;
  }, [roomId]);

  const cleanup = useCallback(() => {
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
  }, []);

  useEffect(() => {
    const socket = getSocket();

    // Someone in the room wants to call
    socket.on("call-request", ({ from, fromId }: IncomingCall) => {
      if (pcRef.current) return; // already in a call
      setIncomingCall({ from, fromId });
      setCallState("incoming");
    });

    // Our call-request was accepted — now create and send offer
    socket.on("call-accepted", async ({ fromId }: { fromId: string }) => {
      remoteIdRef.current = fromId;
      try {
        const stream = await getMedia();
        const pc = createPC(stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call-offer", { roomId, offer, targetId: fromId });
      } catch (e) {
        cleanup();
      }
    });

    // We received an offer — set remote desc, create answer
    socket.on("call-offer", async ({ offer, fromId }: { offer: RTCSessionDescriptionInit; fromId: string }) => {
      remoteIdRef.current = fromId;
      try {
        const stream = await getMedia();
        const pc = createPC(stream);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        for (const c of pendingCandidates.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        pendingCandidates.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call-answer", { roomId, answer, targetId: fromId });
        setCallState("connected");
      } catch (e) {
        cleanup();
      }
    });

    // We received an answer to our offer
    socket.on("call-answer", async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      try {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (e) {}
    });

    // ICE candidates
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

  const startCall = useCallback(() => {
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
