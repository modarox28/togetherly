// Popup: crear una sala nueva o unirse a una con su código, sin pasar por la web.
const $ = (id) => document.getElementById(id);
const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{3,32}$/; // igual que en background.js
// Igual que src/lib/room.ts: 6 caracteres sin letras confusas (I, O, 0, 1)
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const WEB_ROOM_URL = "https://togetherly-weld.vercel.app/room/";

let currentRoom = null;

function generateRoomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let id = "";
  for (const byte of bytes) id += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
  return id;
}

function render(connected, roomId) {
  currentRoom = roomId ?? null;
  $("status-dot").className = connected ? "status-dot ok" : "status-dot";
  $("status-text").textContent = connected ? "Sincronizando" : roomId ? "Conectando… (puede tardar un minuto)" : "Sin conectar";
  $("view-connect").hidden = !!roomId;
  $("view-connected").hidden = !roomId;
  $("room-code").textContent = roomId ?? "";
}

function refreshStatus() {
  chrome.runtime.sendMessage({ type: "PING" }, (reply) => {
    if (chrome.runtime.lastError || !reply) return;
    render(reply.connected, reply.roomId);
    if (reply.username) $("input-name").value = reply.username;
  });
}

function showError(message, field) {
  $("error").textContent = message;
  field?.focus();
}

function readName() {
  const name = $("input-name").value.trim();
  if (!name) {
    showError("Escribe tu nombre primero.", $("input-name"));
    return null;
  }
  chrome.storage.local.set({ savedName: name });
  return name;
}

function join(roomId, name, button) {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = "Conectando…";
  chrome.runtime.sendMessage({ type: "JOIN_ROOM", roomId, username: name, avatar: "🍿" }, (reply) => {
    button.disabled = false;
    button.textContent = label;
    if (reply?.ok) {
      render(false, roomId);
    } else {
      $("status-dot").className = "status-dot error";
      showError(reply?.error ?? "No se pudo conectar.");
    }
  });
}

async function copy(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    $("copied").textContent = message;
  } catch {
    $("copied").textContent = "No se pudo copiar: selecciona el código a mano.";
  }
  setTimeout(() => ($("copied").textContent = ""), 2500);
}

// ── Eventos ───────────────────────────────────────────────────────────────
$("btn-create").addEventListener("click", () => {
  $("error").textContent = "";
  const name = readName();
  if (name) join(generateRoomId(), name, $("btn-create"));
});

$("btn-connect").addEventListener("click", () => {
  $("error").textContent = "";
  // Los códigos de Togetherly van en mayúsculas.
  const roomId = $("input-room").value.trim().toUpperCase();
  if (!ROOM_ID_PATTERN.test(roomId)) return showError("Escribe el código de la sala (letras y números).", $("input-room"));
  const name = readName();
  if (name) join(roomId, name, $("btn-connect"));
});

$("btn-copy-code").addEventListener("click", () => currentRoom && copy(currentRoom, "Código copiado ✓"));
$("btn-copy-link").addEventListener("click", () => currentRoom && copy(WEB_ROOM_URL + currentRoom, "Enlace copiado ✓"));

$("btn-disconnect").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "LEAVE_ROOM" }, () => render(false, null));
});

$("input-name").addEventListener("keydown", (e) => e.key === "Enter" && $("btn-create").click());
$("input-room").addEventListener("keydown", (e) => e.key === "Enter" && $("btn-connect").click());

// ── Inicio ────────────────────────────────────────────────────────────────
chrome.storage.local.get(["savedName"], ({ savedName }) => {
  if (savedName) $("input-name").value = savedName;
});
refreshStatus();
// Mientras el popup está abierto, el estado se actualiza solo (el servidor gratis tarda en despertar).
setInterval(refreshStatus, 1500);
