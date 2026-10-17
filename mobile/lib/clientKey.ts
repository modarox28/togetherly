import { storage } from "@/lib/storage";

// Clave privada de este celular para las salas: el servidor la usa para saber quién lidera
// (no el nombre, que cualquiera puede repetir). Nunca se muestra ni se envía a los demás.
const STORAGE_KEY = "togetherly-client-key";
const PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
let memoryKey: string | null = null;

export async function getClientKey(): Promise<string> {
  if (memoryKey) return memoryKey;
  const saved = await storage.get(STORAGE_KEY).catch(() => null);
  if (saved && PATTERN.test(saved)) return (memoryKey = saved);
  const bytes = new Uint8Array(16);
  // Hermes no siempre trae crypto: en ese caso se usa Math.random (la clave no se comparte con nadie).
  if (typeof globalThis.crypto?.getRandomValues === "function") globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  memoryKey = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  await storage.set(STORAGE_KEY, memoryKey).catch(() => {});
  return memoryKey;
}
