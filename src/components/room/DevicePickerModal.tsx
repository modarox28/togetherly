"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Mic, X, Phone, CameraOff } from "lucide-react";

interface MediaDeviceInfo2 {
  deviceId: string;
  label: string;
}

interface Props {
  onConfirm: (videoDeviceId?: string, audioDeviceId?: string) => void;
  onCancel: () => void;
}

export function DevicePickerModal({ onConfirm, onCancel }: Props) {
  const [cameras, setCameras] = useState<MediaDeviceInfo2[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo2[]>([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMic, setSelectedMic] = useState("");
  const [previewError, setPreviewError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    async function init() {
      try {
        const temp = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        temp.getTracks().forEach((t) => t.stop());
        const all = await navigator.mediaDevices.enumerateDevices();
        if (!mountedRef.current) return;
        const cams = all.filter((d) => d.kind === "videoinput").map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Cámara ${i + 1}`,
        }));
        const mikes = all.filter((d) => d.kind === "audioinput").map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Micrófono ${i + 1}`,
        }));
        setCameras(cams);
        setMics(mikes);
        const cam = cams[0]?.deviceId ?? "";
        const mic = mikes[0]?.deviceId ?? "";
        setSelectedCamera(cam);
        setSelectedMic(mic);
        if (cam) startPreview(cam);
      } catch {
        if (mountedRef.current) setPreviewError(true);
      }
    }
    init();
    return () => {
      mountedRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startPreview = async (deviceId: string) => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setPreviewError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });
      if (!mountedRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      if (mountedRef.current) setPreviewError(true);
    }
  };

  const handleCameraChange = (id: string) => {
    setSelectedCamera(id);
    startPreview(id);
  };

  const handleConfirm = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onConfirm(selectedCamera || undefined, selectedMic || undefined);
  };

  const handleCancel = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCancel();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.92, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 16 }}
          className="w-80 rounded-2xl bg-night-900 border border-white/10 shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="text-white font-semibold text-sm">Configurar videollamada</span>
            <button onClick={handleCancel}
              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Camera preview */}
          <div className="relative bg-night-800" style={{ aspectRatio: "4/3" }}>
            {!previewError ? (
              <video ref={videoRef} autoPlay playsInline muted
                className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <CameraOff className="w-8 h-8 text-white/20" />
                <span className="text-white/30 text-xs">Sin acceso a la cámara</span>
              </div>
            )}
          </div>

          <div className="p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-xs text-white/50 font-medium">
                <Video className="w-3.5 h-3.5" /> Cámara
              </label>
              <select value={selectedCamera} onChange={(e) => handleCameraChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-night-800 border border-white/10 text-white text-sm outline-none focus:border-neon-purple/50 transition-colors">
                {cameras.length === 0 && <option value="">Sin cámaras detectadas</option>}
                {cameras.map((c) => <option key={c.deviceId} value={c.deviceId}>{c.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-xs text-white/50 font-medium">
                <Mic className="w-3.5 h-3.5" /> Micrófono
              </label>
              <select value={selectedMic} onChange={(e) => setSelectedMic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-night-800 border border-white/10 text-white text-sm outline-none focus:border-neon-purple/50 transition-colors">
                {mics.length === 0 && <option value="">Sin micrófonos detectados</option>}
                {mics.map((m) => <option key={m.deviceId} value={m.deviceId}>{m.label}</option>)}
              </select>
            </div>

            <div className="flex gap-2 mt-1">
              <button onClick={handleCancel}
                className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-medium hover:bg-white/10 transition-colors">
                Cancelar
              </button>
              <button onClick={handleConfirm}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-neon-purple to-neon-pink text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <Phone className="w-3.5 h-3.5" /> Llamar
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
