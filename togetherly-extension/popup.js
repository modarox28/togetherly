const $ = (id) => document.getElementById(id);
const SALA_VALIDA = /^[A-Za-z0-9_-]{3,32}$/;

function pintar(conectado, sala) {
  $("punto").className = conectado ? "punto ok" : "punto";
  $("texto-estado").textContent = conectado ? "Sincronizando" : sala ? "Reconectando…" : "Sin conectar";
  $("vista-conectar").hidden = !!sala;
  $("vista-conectada").hidden = !sala;
  $("codigo-sala").textContent = sala ?? "";
}

chrome.storage.local.get(["nombreGuardado"], ({ nombreGuardado }) => {
  if (nombreGuardado) $("input-name").value = nombreGuardado;
});

chrome.runtime.sendMessage({ type: "PING" }, (r) => {
  if (chrome.runtime.lastError || !r) return;
  pintar(r.connected, r.roomId);
  if (r.username) $("input-name").value = r.username;
});

$("btn-conectar").addEventListener("click", () => {
  // Los códigos de Togetherly van en mayúsculas: se respetan tal cual.
  const sala = $("input-room").value.trim().toUpperCase();
  const nombre = $("input-name").value.trim();
  $("error").textContent = "";
  if (!SALA_VALIDA.test(sala)) {
    $("error").textContent = "Escribe el código de la sala (letras y números).";
    return $("input-room").focus();
  }
  if (!nombre) {
    $("error").textContent = "Escribe tu nombre.";
    return $("input-name").focus();
  }

  chrome.storage.local.set({ nombreGuardado: nombre });
  const btn = $("btn-conectar");
  btn.disabled = true;
  btn.textContent = "Conectando…";

  chrome.runtime.sendMessage({ type: "JOIN_ROOM", roomId: sala, username: nombre, avatar: "🍿" }, (r) => {
    btn.disabled = false;
    btn.textContent = "Conectar";
    if (r?.ok) pintar(false, sala);
    else {
      $("punto").className = "punto error";
      $("error").textContent = r?.error ?? "No se pudo conectar.";
    }
    // El socket tarda un instante: vuelve a preguntar el estado.
    setTimeout(() => chrome.runtime.sendMessage({ type: "PING" }, (p) => p && pintar(p.connected, p.roomId)), 1200);
  });
});

$("btn-salir").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "LEAVE_ROOM" }, () => pintar(false, null));
});

$("input-room").addEventListener("keydown", (e) => e.key === "Enter" && $("input-name").focus());
$("input-name").addEventListener("keydown", (e) => e.key === "Enter" && $("btn-conectar").click());
