"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, PhoneIncoming } from "lucide-react";
import { DevicePickerModal } from "@/components/room/DevicePickerModal";
import type { CallState, IncomingCall } from "@/hooks/useWebRTC";

interface Props {
  callState: CallState;
  incomingCall: IncomingCall | null;
  onStart: (videoDeviceId?: string, audioDeviceId?: string) => void;
  onAnswer: () => void;
  onDecline: () => void;
  onEnd: () => void;
  participantCount: number;
}

export function VideoCallPanel({
  callState, incomingCall,
  onStart, onAnswer, onDecline, onEnd,
  participantCount,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const handleStartClick = () => setShowPicker(true);
  const handlePickerConfirm = (videoId?: string, audioId?: string) => {
    setShowPicker(false);
    onStart(videoId, audioId);
  };
  const handlePickerCancel = () => setShowPicker(false);

  return (
    <>
      {/* Device picker overlay */}
      <AnimatePresence>
        {showPicker && (
          <DevicePickerModal onConfirm={handlePickerConfirm} onCancel={handlePickerCancel} />
        )}
      </AnimatePresence>

      {/* Incoming call notification */}
      <AnimatePresence>
        {callState === "incoming" && incomingCall && !showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 left-4 z-40 flex flex-col gap-3 p-4 rounded-2xl
              bg-night-900/95 border border-neon-purple/30 shadow-2xl backdrop-blur-sm w-64"
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
        )}
      </AnimatePresence>

      {/* Calling indicator */}
      <AnimatePresence>
        {callState === "calling" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 left-4 z-40 flex items-center gap-3 px-4 py-3 rounded-2xl
              bg-night-900/95 border border-neon-purple/30 shadow-xl backdrop-blur-sm"
          >
            <div className="w-2 h-2 rounded-full bg-neon-purple animate-pulse" />
            <span className="text-white/80 text-sm">Llamando...</span>
            <button onClick={onEnd}
              className="ml-2 px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors">
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Idle call button */}
      <AnimatePresence>
        {callState === "idle" && participantCount >= 2 && !showPicker && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStartClick}
            className="absolute bottom-4 left-4 z-40 flex items-center gap-2 px-3 py-2 rounded-xl
              bg-night-800/90 border border-white/10 text-white/60 hover:text-white
              hover:border-neon-purple/40 hover:bg-neon-purple/10 transition-all shadow-lg backdrop-blur-sm text-sm"
          >
            <Phone className="w-4 h-4" />
            <span>Videollamada</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
