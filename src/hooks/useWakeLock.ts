"use client";

import { useEffect, useRef } from "react";

export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let cancelled = false;

    navigator.wakeLock.request("screen").then((lock) => {
      if (cancelled) { lock.release(); return; }
      lockRef.current = lock;
      lock.addEventListener("release", () => { lockRef.current = null; });
    }).catch(() => {});

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !lockRef.current) {
        navigator.wakeLock.request("screen").then((lock) => {
          if (cancelled) { lock.release(); return; }
          lockRef.current = lock;
        }).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      lockRef.current?.release();
      lockRef.current = null;
    };
  }, [active]);
}
