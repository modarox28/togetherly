"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, PhoneIncoming } from "lucide-react";
import { DevicePickerModal } from "@/components/room/DevicePickerModal";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { CallState, IncomingCall } from "@/hooks/useWebRTC";

interface Props {
  callState: CallState;
  incomingCall: IncomingCall | null;
  showPicker: boolean;
  onPickerConfirm: (videoDeviceId?: string, audioDeviceId?: string) => void;
  onPickerCancel: () => void;
  onAnswer: () => void;
  onDecline: () => void;
  onEnd: () => void;
}

// Avisos de la videollamada (entrante / llamando) y la ventana para elegir dispositivos.
// El botón para empezar la llamada vive en la barra de la sala (RoomClientPage).
export function VideoCallPanel({
  callState, incomingCall, showPicker,
  onPickerConfirm, onPickerCancel, onAnswer, onDecline, onEnd,
}: Props) {
  const { t } = useLanguage();
  const toastClass =
    "fixed inset-x-3 bottom-3 z-40 rounded-2xl bg-plum/95 p-4 text-white shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-72";

  return (
    <>
      <AnimatePresence>
        {showPicker && <DevicePickerModal onConfirm={onPickerConfirm} onCancel={onPickerCancel} />}
      </AnimatePresence>

      <AnimatePresence>
        {callState === "incoming" && incomingCall && !showPicker && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={toastClass} role="alertdialog" aria-label={`${incomingCall.from} ${t.roomUi.incomingCall}`}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 animate-pulse items-center justify-center rounded-full bg-lamp">
                <PhoneIncoming className="h-5 w-5 text-plum" aria-hidden="true" />
              </span>
              <p className="text-sm"><strong>{incomingCall.from}</strong> {t.roomUi.incomingCall}</p>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={onDecline}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/10 py-2.5 text-sm font-semibold hover:bg-white/15">
                <PhoneOff className="h-4 w-4" aria-hidden="true" /> {t.roomUi.decline}
              </button>
              <button onClick={onAnswer}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-sage py-2.5 text-sm font-bold text-plum">
                <Phone className="h-4 w-4" aria-hidden="true" /> {t.roomUi.answer}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {callState === "calling" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`${toastClass} flex items-center gap-3`} role="status">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-lamp" aria-hidden="true" />
            <span className="flex-1 text-sm">{t.roomUi.calling}</span>
            <button onClick={onEnd} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15">
              {t.roomUi.cancel}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
