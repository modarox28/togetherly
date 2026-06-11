"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, PhoneIncoming } from "lucide-react";
import type { CallState, IncomingCall } from "@/hooks/useWebRTC";

interface Props {
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  incomingCall: IncomingCall | null;
  isMicOn: boolean;
  isCameraOn: boolean;
  onStart: () => void;
  onAnswer: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  participantCount: number;
}

function VideoStream({ stream, muted, className }: { stream: MediaStream | null; muted?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  );
}

export function VideoCallPanel({
  callState, localStream, remoteStream, incomingCall,
  isMicOn, isCameraOn,
  onStart, onAnswer, onDecline, onEnd,
  onToggleMic, onToggleCamera,
  participantCount,
}: Props) {

  // Incoming call notification
  if (callState === "incoming" && incomingCall) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-20 left-4 z-50 flex flex-col gap-3 p-4 rounded-2xl bg-night-900/95 border border-neon-purple/30 shadow-2xl backdrop-blur-sm w-64"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center flex-shrink-0 animate-pulse">
              <PhoneIncoming className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{incomingCall.from}</p>
              <p className="text-white/50 text-xs">quiere hacer videollamada</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onDecline}
              className="flex-1 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center gap-1.5">
              <PhoneOff className="w-4 h-4" /> Rechazar
            </button>
            <button onClick={onAnswer}
              className="flex-1 py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium hover:bg-green-500/30 transition-colors flex items-center justify-center gap-1.5">
              <Phone className="w-4 h-4" /> Contestar
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Active call panel
  if (callState === "connected" || callState === "calling") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute bottom-4 left-4 z-50 flex flex-col gap-2 w-52 rounded-2xl overflow-hidden bg-night-900/95 border border-white/10 shadow-2xl"
      >
        {/* Remote video */}
        <div className="relative aspect-video bg-night-800">
          {remoteStream ? (
            <VideoStream stream={remoteStream} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-neon-purple/20 flex items-center justify-center animate-pulse">
                <Video className="w-5 h-5 text-neon-purple" />
              </div>
            </div>
          )}

          {/* Local video PiP */}
          <div className="absolute bottom-2 right-2 w-16 aspect-video rounded-lg overflow-hidden border border-white/20 bg-night-800">
            {localStream ? (
              <VideoStream stream={localStream} muted className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <div className="w-full h-full bg-night-700" />
            )}
          </div>

          {callState === "calling" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-night-900/80">
              <div className="w-10 h-10 rounded-full border-2 border-neon-purple border-t-transparent animate-spin mb-2" />
              <p className="text-white/60 text-xs">Llamando...</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 pb-3 px-3">
          <button onClick={onToggleMic}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isMicOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white"}`}>
            {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <button onClick={onToggleCamera}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isCameraOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white"}`}>
            {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
          <button onClick={onEnd}
            className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors">
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  // Call button (idle state, only show if more than 1 person)
  if (participantCount < 2) return null;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onStart}
      className="absolute bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl
        bg-night-800/90 border border-white/10 text-white/60 hover:text-white
        hover:border-neon-purple/40 hover:bg-neon-purple/10 transition-all shadow-lg backdrop-blur-sm text-sm"
    >
      <Phone className="w-4 h-4" />
      <span>Videollamada</span>
    </motion.button>
  );
}
