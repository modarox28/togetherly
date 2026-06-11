"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import type { CallState } from "@/hooks/useWebRTC";

interface Props {
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMicOn: boolean;
  isCameraOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onEnd: () => void;
}

function StreamVideo({ stream, muted, className }: { stream: MediaStream | null; muted?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream ?? null;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}

export function CallStrip({
  callState, localStream, remoteStream,
  isMicOn, isCameraOn, onToggleMic, onToggleCamera, onEnd,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="flex-shrink-0 bg-night-950 border-b border-white/5 overflow-hidden"
    >
      {/* Face tiles */}
      <div className="flex gap-1 p-1.5">
        {/* Remote */}
        <div className="flex-1 relative rounded-xl overflow-hidden bg-night-800" style={{ aspectRatio: "4/3" }}>
          {remoteStream ? (
            <StreamVideo stream={remoteStream} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-neon-purple/20 flex items-center justify-center animate-pulse">
                <Video className="w-4 h-4 text-neon-purple" />
              </div>
              {callState === "calling" && (
                <span className="text-white/40 text-[10px]">Llamando...</span>
              )}
            </div>
          )}
          <div className="absolute bottom-1 left-1.5 text-[9px] text-white/60 bg-black/40 px-1.5 py-0.5 rounded-md">
            {callState === "calling" ? "Esperando..." : ""}
          </div>
        </div>

        {/* Local */}
        <div className="relative rounded-xl overflow-hidden bg-night-800" style={{ width: "40%", aspectRatio: "4/3" }}>
          {localStream && isCameraOn ? (
            <StreamVideo stream={localStream} muted className="w-full h-full object-cover scale-x-[-1]" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <VideoOff className="w-5 h-5 text-white/20" />
            </div>
          )}
          <div className="absolute bottom-1 left-1.5 text-[9px] text-white/60 bg-black/40 px-1.5 py-0.5 rounded-md">
            Tú
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 pb-2 px-2">
        <button onClick={onToggleMic}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors text-xs ${isMicOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white"}`}>
          {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
        </button>
        <button onClick={onToggleCamera}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isCameraOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white"}`}>
          {isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
        </button>
        <button onClick={onEnd}
          className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors">
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
