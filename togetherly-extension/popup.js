const dot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const viewConnect = document.getElementById("view-connect");
const viewConnected = document.getElementById("view-connected");
const displayRoom = document.getElementById("display-room");
const inputRoom = document.getElementById("input-room");
const inputName = document.getElementById("input-name");
const btnConnect = document.getElementById("btn-connect");
const btnDisconnect = document.getElementById("btn-disconnect");

function setUI(connected, room) {
  if (connected && room) {
    dot.className = "status-dot connected";
    statusText.textContent = "Sincronizando";
    viewConnect.style.display = "none";
    viewConnected.style.display = "flex";
    displayRoom.textContent = room.toUpperCase();
  } else {
    dot.className = "status-dot";
    statusText.textContent = "Desconectado";
    viewConnect.style.display = "flex";
    viewConnected.style.display = "none";
  }
}

// Restore saved name
chrome.storage.local.get(["savedName"], ({ savedName }) => {
  if (savedName) inputName.value = savedName;
});

// Check current state
chrome.runtime.sendMessage({ type: "PING" }, (resp) => {
  if (chrome.runtime.lastError || !resp) return;
  setUI(resp.connected, resp.roomId);
  if (resp.roomId) inputRoom.value = resp.roomId;
  if (resp.username) inputName.value = resp.username;
});

// Connect
btnConnect.addEventListener("click", () => {
  const room = inputRoom.value.trim().toLowerCase();
  const name = inputName.value.trim();
  if (!room || !name) {
    if (!room) inputRoom.focus();
    else inputName.focus();
    return;
  }

  chrome.storage.local.set({ savedName: name });
  btnConnect.disabled = true;
  btnConnect.textContent = "Conectando...";
  dot.className = "status-dot";
  statusText.textContent = "Conectando...";

  chrome.runtime.sendMessage(
    { type: "JOIN_ROOM", roomId: room, username: name, avatar: "🎮" },
    (resp) => {
      btnConnect.disabled = false;
      btnConnect.textContent = "Conectar";
      if (resp?.ok) {
        setUI(true, room);
      } else {
        dot.className = "status-dot error";
        statusText.textContent = "Error al conectar";
      }
    }
  );
});

// Disconnect
btnDisconnect.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "LEAVE_ROOM" }, () => {
    setUI(false, null);
  });
});

// Enter key in inputs
inputRoom.addEventListener("keydown", (e) => {
  if (e.key === "Enter") inputName.focus();
});
inputName.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnConnect.click();
});
