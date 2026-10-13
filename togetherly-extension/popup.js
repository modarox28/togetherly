// Popup: conectarse a una sala a mano con su código.
const $ = (id) => document.getElementById(id);
const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{3,32}$/; // igual que en background.js

function render(connected, roomId) {
  $("status-dot").className = connected ? "status-dot ok" : "status-dot";
  $("status-text").textContent = connected ? "Sincronizando" : roomId ? "Reconectando…" : "Sin conectar";
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

chrome.storage.local.get(["savedName"], ({ savedName }) => {
  if (savedName) $("input-name").value = savedName;
});
refreshStatus();

$("btn-connect").addEventListener("click", () => {
  // Los códigos de Togetherly van en mayúsculas: se respetan tal cual.
  const roomId = $("input-room").value.trim().toUpperCase();
  const name = $("input-name").value.trim();
  $("error").textContent = "";
  if (!ROOM_ID_PATTERN.test(roomId)) {
    $("error").textContent = "Escribe el código de la sala (letras y números).";
    return $("input-room").focus();
  }
  if (!name) {
    $("error").textContent = "Escribe tu nombre.";
    return $("input-name").focus();
  }

  chrome.storage.local.set({ savedName: name });
  const button = $("btn-connect");
  button.disabled = true;
  button.textContent = "Conectando…";

  chrome.runtime.sendMessage({ type: "JOIN_ROOM", roomId, username: name, avatar: "🍿" }, (reply) => {
    button.disabled = false;
    button.textContent = "Conectar";
    if (reply?.ok) {
      render(false, roomId);
    } else {
      $("status-dot").className = "status-dot error";
      $("error").textContent = reply?.error ?? "No se pudo conectar.";
    }
    // El socket tarda un instante en abrir: vuelve a preguntar el estado.
    setTimeout(refreshStatus, 1200);
  });
});

$("btn-disconnect").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "LEAVE_ROOM" }, () => render(false, null));
});

$("input-room").addEventListener("keydown", (e) => e.key === "Enter" && $("input-name").focus());
$("input-name").addEventListener("keydown", (e) => e.key === "Enter" && $("btn-connect").click());
