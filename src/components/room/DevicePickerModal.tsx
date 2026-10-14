"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Video, Mic, X, Phone, CameraOff } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface DeviceOption {
  deviceId: string;
  label: string;
}

interface Props {
  onConfirm: (videoDeviceId?: string, audioDeviceId?: string) => void;
  onCancel: () => void;
}

const stopStream = (stream: MediaStream | null) => stream?.getTracks().forEach((track) => track.stop());

// Ventana para elegir cámara y micrófono antes de llamar (con vista previa de la cámara).
export function DevicePickerModal({ onConfirm, onCancel }: Props) {
  const { t } = useLanguage();
  const [cameras, setCameras] = useState<DeviceOption[]>([]);
  const [mics, setMics] = useState<DeviceOption[]>([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMic, setSelectedMic] = useState("");
  const [previewError, setPreviewError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const startPreview = async (deviceId: string) => {
    stopStream(streamRef.current);
    setPreviewError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });
      if (!mountedRef.current) {
        stopStream(stream);
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      if (mountedRef.current) setPreviewError(true);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    const load = async () => {
      try {
        // Pedir permiso una vez para que el navegador muestre los nombres de los dispositivos.
        stopStream(await navigator.mediaDevices.getUserMedia({ video: true, audio: true }));
        const all = await navigator.mediaDevices.enumerateDevices();
        if (!mountedRef.current) return;
        const toOptions = (kind: MediaDeviceKind, fallback: string) =>
          all.filter((d) => d.kind === kind).map((d, i) => ({ deviceId: d.deviceId, label: d.label || `${fallback} ${i + 1}` }));
        const cams = toOptions("videoinput", t.roomUi.camera);
        const microphones = toOptions("audioinput", t.roomUi.microphone);
        setCameras(cams);
        setMics(microphones);
        setSelectedCamera(cams[0]?.deviceId ?? "");
        setSelectedMic(microphones[0]?.deviceId ?? "");
        if (cams[0]) startPreview(cams[0].deviceId);
      } catch {
        if (mountedRef.current) setPreviewError(true);
      }
    };
    load();
    return () => {
      mountedRef.current = false;
      stopStream(streamRef.current);
    };
    // Solo al abrir la ventana.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCameraChange = (id: string) => {
    setSelectedCamera(id);
    startPreview(id);
  };

  const close = (confirm: boolean) => {
    stopStream(streamRef.current);
    if (confirm) onConfirm(selectedCamera || undefined, selectedMic || undefined);
    else onCancel();
  };

  const selectClass =
    "w-full rounded-xl border border-white/10 bg-night-800 px-3 py-2.5 text-sm text-white outline-none focus:border-lamp";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={() => close(false)}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-picker-title"
        initial={{ y: 24 }}
        animate={{ y: 0 }}
        exit={{ y: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-t-3xl bg-night-900 text-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-5 py-3.5">
          <h2 id="device-picker-title" className="font-display text-base font-bold">{t.roomUi.setupCall}</h2>
          <button onClick={() => close(false)} aria-label={t.roomUi.cancel}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative aspect-[4/3] bg-night-800">
          {previewError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/45">
              <CameraOff className="h-8 w-8" aria-hidden="true" />
              <span className="text-sm">{t.roomUi.noCameraAccess}</span>
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
          )}
        </div>

        <div className="flex flex-col gap-3 p-5">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-white/60">
            <span className="flex items-center gap-1.5"><Video className="h-3.5 w-3.5" aria-hidden="true" /> {t.roomUi.camera}</span>
            <select value={selectedCamera} onChange={(e) => handleCameraChange(e.target.value)} className={selectClass}>
              {cameras.length === 0 && <option value="">{t.roomUi.noCameras}</option>}
              {cameras.map((c) => <option key={c.deviceId} value={c.deviceId}>{c.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-white/60">
            <span className="flex items-center gap-1.5"><Mic className="h-3.5 w-3.5" aria-hidden="true" /> {t.roomUi.microphone}</span>
            <select value={selectedMic} onChange={(e) => setSelectedMic(e.target.value)} className={selectClass}>
              {mics.length === 0 && <option value="">{t.roomUi.noMics}</option>}
              {mics.map((m) => <option key={m.deviceId} value={m.deviceId}>{m.label}</option>)}
            </select>
          </label>

          <div className="mt-1 flex gap-2">
            <button onClick={() => close(false)} className="flex-1 rounded-full bg-white/5 py-3 text-sm font-semibold text-white/70 hover:bg-white/10">
              {t.roomUi.cancel}
            </button>
            <button onClick={() => close(true)} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-lamp py-3 text-sm font-bold text-plum">
              <Phone className="h-4 w-4" aria-hidden="true" /> {t.roomUi.call}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
