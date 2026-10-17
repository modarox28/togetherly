// Clave privada de este navegador para las salas: el servidor la usa para saber quién lidera
// (antes era el nombre, y cualquiera con el mismo nombre podía cambiar los permisos).
// Nunca se muestra ni se envía a las demás personas; vive solo en este navegador.
const STORAGE_KEY = "togetherly-client-key";
const PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

let memoryKey: string | null = null;

export function getClientKey(): string {
  if (memoryKey) return memoryKey;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && PATTERN.test(saved)) return (memoryKey = saved);
  } catch {}
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  memoryKey = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  try {
    window.localStorage.setItem(STORAGE_KEY, memoryKey);
  } catch {}
  return memoryKey;
}
