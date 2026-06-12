"use client";

import { useEffect, useState } from "react";

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  const request = async (): Promise<NotificationPermission> => {
    if (typeof Notification === "undefined") return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  const notify = (title: string, body: string) => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (!document.hidden) return;
    new Notification(title, { body, icon: "/icon.svg", tag: "togetherly-chat" });
  };

  return { permission, request, notify };
}
