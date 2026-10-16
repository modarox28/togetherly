// Popup: crear una sala nueva o unirse a una con su código, sin pasar por la web.
const $ = (id) => document.getElementById(id);
const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{3,32}$/; // igual que en background.js
// Igual que src/lib/room.ts: 6 caracteres sin letras confusas (I, O, 0, 1)
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PLATFORM_NAMES = {
  netflix: "Netflix", prime: "Prime Video", disney: "Disney+", hbo: "HBO Max",
  appletv: "Apple TV+", paramount: "Paramount+", crunchyroll: "Crunchyroll",
};

let currentRoom = null;
let inviteUrl = null;
let watchingUrl = null;

function generateRoomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let id = "";
  for (const byte of bytes) id += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
  return id;
}

function render(connected, roomId, extra = {}) {
  currentRoom = roomId ?? null;
  inviteUrl = extra.inviteUrl ?? null;
  // La dirección ya viene validada por el background (solo plataformas soportadas).
  watchingUrl = extra.nowWatching?.url ?? null;
  $("watching").hidden = !watchingUrl;
  if (watchingUrl) {
    const name = PLATFORM_NAMES[extra.nowWatching.platform] ?? "streaming";
    $("watching-text").textContent = `${name} · lo abrió ${extra.nowWatching.by}`;
  }
  // Jerarquía: quién lidera elige si controlan todos o solo esa persona.
  const settings = extra.roomSettings ?? { controlMode: "all", leader: null };
  const leaderOnly = settings.controlMode === "leader";
  $("control-text").textContent = leaderOnly
    ? `👑 ${extra.isLeader ? "Solo tú" : `Solo ${settings.leader ?? "quien lidera"}`}`
    : "Todos";
  $("control-seg").hidden = !extra.isLeader;
  $("btn-control-all").setAttribute("aria-pressed", String(!leaderOnly));
  $("btn-control-leader").setAttribute("aria-pressed", String(leaderOnly));
  $("status-dot").className = connected ? "status-dot ok" : "status-dot";
  $("status-text").textContent = connected ? "Sincronizando" : roomId ? "Conectando… (puede tardar un minuto)" : "Sin conectar";
  $("view-connect").hidden = !!roomId;
  $("view-connected").hidden = !roomId;
  $("room-code").textContent = roomId ?? "";
}

// Con el permiso activeTab, al abrir el popup se puede leer la dirección de la pestaña actual.
// Sirve para avisarle a la sala qué película tienes abierta aunque esa pestaña se haya cargado
// antes de instalar o actualizar la extensión (ahí el content script no está corriendo).
// Solo páginas de reproducción (no el catálogo): /watch/, /play/, /video/, /detail/…
const WATCH_PATH = /\/(watch|play|video|detail|movie|movies|episode|show|shows|series)(\/|$)/i;

function shareActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs?.[0]?.url;
    let isWatchPage = false;
    try {
      isWatchPage = WATCH_PATH.test(new URL(url).pathname);
    } catch {}
    // El background además valida que sea una plataforma soportada antes de mandarla.
    if (isWatchPage) chrome.runtime.sendMessage({ type: "NOW_WATCHING", url: url.split("#")[0] }, () => void chrome.runtime.lastError);
  });
}

let sharedOnOpen = false;

function refreshStatus() {
  chrome.runtime.sendMessage({ type: "PING" }, (reply) => {
    if (chrome.runtime.lastError || !reply) return;
    render(reply.connected, reply.roomId, reply);
    if (reply.username) $("input-name").value = reply.username;
    // Si estoy en una sala y nadie ha dicho qué película ven, comparto la de esta pestaña.
    if (reply.connected && reply.roomId && !reply.nowWatching && !sharedOnOpen) {
      sharedOnOpen = true;
      shareActiveTab();
    }
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

/** openWatching: al unirse a la sala de otro, abrir su película en cuanto se sepa cuál es. */
function join(roomId, name, button, openWatching = false) {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = "Conectando…";
  chrome.runtime.sendMessage({ type: "JOIN_ROOM", roomId, username: name, avatar: "🍿", openWatching }, (reply) => {
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
  if (name) join(roomId, name, $("btn-connect"), true);
});

$("btn-copy-code").addEventListener("click", () => currentRoom && copy(currentRoom, "Código copiado ✓"));
$("btn-copy-link").addEventListener("click", () => inviteUrl && copy(inviteUrl, "Enlace copiado ✓"));
$("btn-go").addEventListener("click", () => watchingUrl && chrome.tabs.create({ url: watchingUrl }));

$("btn-control-all").addEventListener("click", () => chrome.runtime.sendMessage({ type: "SET_CONTROL", mode: "all" }, () => setTimeout(refreshStatus, 300)));
$("btn-control-leader").addEventListener("click", () => chrome.runtime.sendMessage({ type: "SET_CONTROL", mode: "leader" }, () => setTimeout(refreshStatus, 300)));

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

// ── Diagnóstico: versión y qué ve la extensión en la pestaña actual ─────────
$("version").textContent = `Togetherly Sync v${chrome.runtime.getManifest().version}`;

function showDiag(kind, title, detail, videos) {
  const box = $("diag");
  box.hidden = false;
  box.className = `diag ${kind}`;
  const strong = document.createElement("b");
  strong.textContent = title;
  box.replaceChildren(strong, document.createElement("br"), document.createTextNode(detail));
  // Detalle técnico: qué videos hay en la página (duración, carga, tamaño). Sirve para soporte.
  if (Array.isArray(videos)) {
    const tech = document.createElement("small");
    tech.style.display = "block";
    tech.style.marginTop = "6px";
    tech.textContent = videos.length
      ? `Videos: ${videos.map((v) => `${v.duration}s·${v.ready}·${v.size}`).join(" | ")}`
      : "Videos: ninguno visible para la extensión";
    box.append(tech);
  }
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs?.[0];
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "DIAG" }, (reply) => {
    if (chrome.runtime.lastError || !reply) {
      // Sin respuesta: no es una plataforma soportada, o la pestaña se abrió antes de instalar/actualizar.
      if (tab.url && /^https:/.test(tab.url)) {
        showDiag("warn", "Togetherly no está activo en esta pestaña", "Si es Netflix, Disney+, Prime u otra compatible, recárgala con F5.");
      }
      return;
    }
    if (reply.videoFound) {
      showDiag("ok", `${reply.platform}: video encontrado ✓`, reply.inRoom ? "Esta pestaña está sincronizada con tu sala." : "Únete o crea una sala para sincronizar.", reply.videos);
    } else if (reply.onPlayerPage) {
      showDiag("warn", `${reply.platform}: buscando el video…`, "Dale play a la película. Si no aparece en unos segundos, recarga con F5.", reply.videos);
    } else {
      showDiag("", `${reply.platform} detectado`, "Abre una película o serie para sincronizar.");
    }
  });
});
