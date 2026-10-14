"use client";

import { useSyncExternalStore } from "react";

// Permiso de notificaciones del navegador. Se lee con useSyncExternalStore para que el
// valor del servidor ("default") y el del navegador no choquen al hidratar.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const readPermission = (): NotificationPermission =>
  typeof Notification === "undefined" ? "denied" : Notification.permission;

/** Avisa solo si la pestaña está oculta (si la persona está mirando, no hace falta). */
function notify(title: string, body: string) {
  if (readPermission() !== "granted" || !document.hidden) return;
  new Notification(title, { body, icon: "/icon.svg", tag: "togetherly-chat" });
}

export function useNotifications() {
  const permission = useSyncExternalStore(subscribe, readPermission, () => "default" as NotificationPermission);

  const request = async (): Promise<NotificationPermission> => {
    if (typeof Notification === "undefined") return "denied";
    const result = await Notification.requestPermission();
    listeners.forEach((listener) => listener());
    return result;
  };

  return { permission, request, notify };
}
