// Panel de chat al lado de la película (Netflix, Prime, Disney+…), como Teleparty.
// Se muestra solo cuando la extensión está en una sala. Todo vive en un shadow DOM cerrado:
// los estilos de la página no lo tocan y el texto siempre se pone con textContent.
//
// Habla con el background:
//   pide   CHAT_STATE (al cargar) · manda CHAT_SEND { text } y REACTION_SEND { emoji }
//   recibe CHAT_MESSAGE { message, mine } · CHAT_REACTION { emoji, by } · CHAT_MEMBERS { members }
//          EXT_STATUS { connected, roomId }

(() => {
  if (window.top !== window || globalThis.__togetherlyChat) return;
  globalThis.__togetherlyChat = true;

  const REACTIONS = ["❤️", "😂", "😮", "😭", "🔥", "👏"];
  const PANEL_WIDTH = 320;

  let roomId = null;
  let isOpen = true;
  let unread = 0;
  let members = [];
  let settings = { controlMode: "all", leader: null };
  let amLeader = false;

  // ── Estructura ────────────────────────────────────────────────────────────
  const host = document.createElement("div");
  host.id = "togetherly-chat";
  host.style.cssText = "all:initial;position:fixed;inset:0 0 auto auto;z-index:2147483647;display:none";
  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .root { font: 14px/1.4 "Nunito", ui-rounded, "Segoe UI", system-ui, sans-serif; color: #F6EFF7; }
    button { font: inherit; color: inherit; border: 0; background: none; cursor: pointer; }
    button:focus-visible, input:focus-visible { outline: 2px solid #FFC965; outline-offset: 2px; }

    .launcher { position: fixed; right: 20px; bottom: 96px; width: 56px; height: 56px; border-radius: 50%;
      background: #FFC965; color: #2A2140; display: grid; place-items: center;
      box-shadow: 0 10px 30px rgba(15,10,25,.5); }
    .launcher svg { width: 26px; height: 26px; }
    .badge { position: absolute; top: -4px; right: -4px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px;
      background: #F2A7B0; color: #2A2140; font-weight: 800; font-size: 12px; display: grid; place-items: center; }

    .panel { position: fixed; top: 0; right: 0; bottom: 0; width: ${PANEL_WIDTH}px; display: flex; flex-direction: column;
      background: #1E1730; border-left: 1px solid rgba(246,239,247,.12);
      box-shadow: -20px 0 50px rgba(10,6,20,.45); }
    header { display: flex; align-items: center; gap: 10px; padding: 14px 14px 10px; }
    .logo { width: 30px; height: 30px; flex-shrink: 0; }
    .title { flex: 1; min-width: 0; }
    .title b { display: block; font-size: 14px; font-weight: 800; }
    .title small { display: block; font-size: 12px; color: #C9BCD6; }
    .close { width: 34px; height: 34px; border-radius: 50%; color: #C9BCD6; display: grid; place-items: center; }
    .close:hover { background: rgba(246,239,247,.08); color: #F6EFF7; }
    .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px 14px; border-bottom: 1px solid rgba(246,239,247,.1); font-size: 12px; }
    .actions[hidden] { display: none; }
    .actions .who { flex: 1; min-width: 100%; color: #C9BCD6; }
    .actions button { padding: 5px 10px; border-radius: 999px; background: rgba(246,239,247,.1); font-weight: 700; font-size: 12px; }
    .actions button.danger { background: #FF9AA2; color: #2A2140; }
    button.member { cursor: pointer; }
    .members { display: flex; gap: 6px; padding: 0 14px 12px; flex-wrap: wrap; border-bottom: 1px solid rgba(246,239,247,.1); }
    .member { display: flex; align-items: center; gap: 6px; padding: 3px 10px 3px 3px; border-radius: 999px;
      background: rgba(246,239,247,.07); font-size: 12px; font-weight: 700; max-width: 140px; }
    .member span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .face { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font-size: 13px; flex-shrink: 0; }

    .control { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid rgba(246,239,247,.1); font-size: 12px; color: #C9BCD6; }
    .control .label { flex: 1; }
    .control b { color: #F6EFF7; }
    .seg { display: flex; padding: 3px; border-radius: 999px; background: rgba(246,239,247,.07); }
    .seg button { padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; color: #C9BCD6; }
    .seg button[aria-pressed="true"] { background: #FFC965; color: #2A2140; }
    .messages { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
    .empty { margin: auto 0; text-align: center; font-size: 13px; color: #C9BCD6; }
    .msg { display: flex; align-items: flex-end; gap: 8px; }
    .msg.mine { flex-direction: row-reverse; }
    .msg .body { display: flex; flex-direction: column; gap: 2px; max-width: 78%; }
    .msg.mine .body { align-items: flex-end; }
    .who { font-size: 11px; font-weight: 800; padding: 0 4px; }
    .text { padding: 8px 12px; border-radius: 16px 16px 16px 6px; background: #2F2547; word-break: break-word; }
    .msg.mine .text { border-radius: 16px 16px 6px 16px; background: #FFC965; color: #2A2140; }

    .reactions { display: flex; justify-content: space-between; padding: 8px 10px 4px; border-top: 1px solid rgba(246,239,247,.1); }
    .reactions button { flex: 1; height: 38px; border-radius: 12px; font-size: 20px; }
    .reactions button:hover { background: rgba(246,239,247,.08); }
    form { display: flex; gap: 8px; padding: 6px 12px 14px; }
    input { flex: 1; min-width: 0; padding: 10px 14px; border-radius: 999px; border: 1.5px solid rgba(246,239,247,.16);
      background: #1E1730; color: #F6EFF7; font: inherit; outline: none; }
    input::placeholder { color: rgba(246,239,247,.4); }
    input:focus { border-color: #FFC965; }
    .send { width: 42px; height: 42px; border-radius: 50%; background: #FFC965; color: #2A2140; display: grid; place-items: center; flex-shrink: 0; }
    .send:disabled { opacity: .4; cursor: default; }
    .send svg { width: 18px; height: 18px; }

    .float { position: fixed; bottom: 150px; font-size: 32px; pointer-events: none; animation: rise 2.6s ease-out forwards; }
    @keyframes rise { to { transform: translateY(-220px) scale(1.4); opacity: 0; } }
    [hidden] { display: none !important; }
    @media (prefers-reduced-motion: reduce) { .float { animation-duration: .01s; } }
  `;

  const root = document.createElement("div");
  root.className = "root";

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const svg = (markup) => {
    const wrapper = document.createElement("span");
    wrapper.style.display = "contents";
    // Íconos fijos escritos aquí mismo (nunca texto de usuarios).
    wrapper.innerHTML = markup;
    return wrapper;
  };

  const launcher = el("button", "launcher");
  launcher.setAttribute("aria-label", "Abrir el chat de la sala");
  launcher.append(svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>'));
  const badge = el("span", "badge");
  badge.hidden = true;
  launcher.append(badge);

  const panel = el("section", "panel");
  panel.setAttribute("aria-label", "Chat de la sala");
  const header = el("header");
  const logo = svg('<svg class="logo" viewBox="0 0 48 48" aria-hidden="true"><path d="M18 5l6 7 6-7" fill="none" stroke="#FFC965" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="12" width="40" height="31" rx="10" fill="#FFC965"/><rect x="9" y="17" width="30" height="21" rx="6" fill="#261D3A"/><circle cx="20" cy="26" r="4" fill="#FFC965"/><circle cx="28" cy="26" r="4" fill="#FFC965" opacity=".55"/></svg>');
  const title = el("div", "title");
  const titleText = el("b", null, "Togetherly");
  const subtitle = el("small");
  title.append(titleText, subtitle);
  const close = el("button", "close");
  close.setAttribute("aria-label", "Esconder el chat");
  close.append(svg('<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>'));
  header.append(logo, title, close);

  const memberList = el("div", "members");

  // Al tocar a alguien: reportarlo y, si lideras, expulsarlo de la sala.
  const actions = el("div", "actions");
  actions.hidden = true;
  const actionsWho = el("span", "who");
  const reportButton = el("button", null, "Reportar");
  const kickButton = el("button", "danger", "Expulsar de la sala");
  const cancelButton = el("button", null, "Cancelar");
  actions.append(actionsWho, reportButton, kickButton, cancelButton);
  let selected = null;
  function selectMember(member) {
    selected = member;
    actions.hidden = !member;
    if (!member) return;
    actionsWho.textContent = `${member.name}${member.leader ? " (lidera)" : ""}`;
    kickButton.hidden = !amLeader || member.leader;
  }
  reportButton.addEventListener("click", () => {
    if (!selected) return;
    send({ type: "REPORT_MEMBER", memberId: selected.id, reason: "Comportamiento inapropiado (desde el chat)" });
    actionsWho.textContent = `Reportaste a ${selected.name}. Gracias, lo revisaremos.`;
    reportButton.hidden = kickButton.hidden = true;
    setTimeout(() => selectMember(null), 2500);
  });
  kickButton.addEventListener("click", () => {
    if (!selected) return;
    send({ type: "KICK_MEMBER", memberId: selected.id });
    selectMember(null);
  });
  cancelButton.addEventListener("click", () => selectMember(null));

  // Quién controla la reproducción: quien lidera elige; los demás solo ven quién manda.
  const control = el("div", "control");
  const controlLabel = el("span", "label");
  const seg = el("div", "seg");
  seg.setAttribute("role", "group");
  seg.setAttribute("aria-label", "Quién controla la reproducción");
  const allButton = el("button", null, "Todos");
  const leaderButton = el("button", null, "Solo yo");
  allButton.addEventListener("click", () => send({ type: "SET_CONTROL", mode: "all" }));
  leaderButton.addEventListener("click", () => send({ type: "SET_CONTROL", mode: "leader" }));
  seg.append(allButton, leaderButton);
  control.append(controlLabel, seg);
  const messageList = el("div", "messages");
  messageList.setAttribute("aria-live", "polite");
  const empty = el("p", "empty", "Escribe algo: lo ven todos en la sala.");
  messageList.append(empty);

  const reactionRow = el("div", "reactions");
  for (const emoji of REACTIONS) {
    const button = el("button", null, emoji);
    button.setAttribute("aria-label", `Reacción ${emoji}`);
    button.addEventListener("click", () => send({ type: "REACTION_SEND", emoji }));
    reactionRow.append(button);
  }

  const form = el("form");
  const input = el("input");
  input.placeholder = "Escribe un mensaje…";
  input.maxLength = 500;
  input.setAttribute("aria-label", "Mensaje");
  input.autocomplete = "off";
  const sendButton = el("button", "send");
  sendButton.type = "submit";
  sendButton.disabled = true;
  sendButton.setAttribute("aria-label", "Enviar");
  sendButton.append(svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>'));
  form.append(input, sendButton);

  panel.append(header, memberList, actions, control, messageList, reactionRow, form);
  root.append(launcher, panel);
  shadow.append(style, root);

  // ── Que las teclas del chat no controlen el video ──────────────────────────
  // Sin esto, escribir un espacio pausaría Netflix o la "f" pondría pantalla completa.
  for (const type of ["keydown", "keyup", "keypress"]) {
    host.addEventListener(type, (event) => event.stopPropagation());
    window.addEventListener(type, (event) => {
      if (event.composedPath().includes(host)) event.stopImmediatePropagation();
    }, true);
  }

  // ── Comportamiento ────────────────────────────────────────────────────────
  function send(message, onReply) {
    try {
      chrome.runtime.sendMessage(message, (reply) => {
        if (chrome.runtime.lastError) return;
        onReply?.(reply);
      });
    } catch {
      // La extensión se recargó: este script quedó huérfano.
    }
  }

  // Como Teleparty: con el chat abierto la página se encoge para que el panel no tape la película.
  // Con transform, los elementos "fixed" de la página (el reproductor) quedan dentro del body encogido.
  // Si en alguna plataforma el video no se encoge, se deja el panel encima como antes.
  const roomStyle = document.createElement("style");
  roomStyle.textContent = `html.togetherly-chat-open > body {
    transform: translateZ(0) !important; width: calc(100vw - ${PANEL_WIDTH}px) !important;
    height: 100vh !important; overflow: hidden !important; }`;
  let shrinkFailed = false;
  let shrinkCheck = null;

  function mainVideo() {
    try {
      return globalThis.TogetherlyPlatforms?.current()?.findVideo() ?? null;
    } catch {
      return null;
    }
  }

  function makeRoom(on) {
    const want = on && !shrinkFailed && !document.fullscreenElement;
    const html = document.documentElement;
    if (want && !roomStyle.isConnected) (document.head ?? html).append(roomStyle);
    html.classList.toggle("togetherly-chat-open", want);
    clearTimeout(shrinkCheck);
    if (!want) return;
    shrinkCheck = setTimeout(() => {
      const video = mainVideo();
      if (!video || !html.classList.contains("togetherly-chat-open")) return;
      if (video.getBoundingClientRect().right > window.innerWidth - PANEL_WIDTH + 4) {
        shrinkFailed = true;
        html.classList.remove("togetherly-chat-open");
      }
    }, 600);
  }

  function render() {
    host.style.display = roomId ? "block" : "none";
    makeRoom(!!roomId && isOpen);
    launcher.hidden = isOpen;
    panel.hidden = !isOpen;
    badge.hidden = unread === 0;
    badge.textContent = unread > 9 ? "9+" : String(unread);
    titleText.textContent = roomId ? `Sala ${roomId}` : "Togetherly";
    subtitle.textContent = members.length === 1 ? "1 persona en la sala" : `${members.length} personas en la sala`;
    renderControl();
  }

  function renderControl() {
    const leaderOnly = settings.controlMode === "leader";
    seg.hidden = !amLeader;
    allButton.setAttribute("aria-pressed", String(!leaderOnly));
    leaderButton.setAttribute("aria-pressed", String(leaderOnly));
    const strong = el("b", null, leaderOnly ? `👑 ${amLeader ? "Tú" : settings.leader ?? "Quien lidera"}` : "Todos");
    controlLabel.replaceChildren(leaderOnly ? "Controla: " : "Controlan: ", strong);
  }

  function applySettings(next) {
    if (!next) return;
    settings = { controlMode: next.controlMode === "leader" ? "leader" : "all", leader: next.leader ?? null };
    amLeader = next.isLeader === true;
    render();
  }

  function renderMembers() {
    memberList.replaceChildren(
      ...members.map((member) => {
        const chip = el("button", "member");
        chip.type = "button";
        chip.title = "Opciones";
        const face = el("span", "face", member.avatar);
        face.style.background = member.color;
        chip.append(face, el("span", null, member.leader ? `👑 ${member.name}` : member.name));
        if (typeof member.id === "string") chip.addEventListener("click", () => selectMember(member));
        return chip;
      })
    );
    render();
  }

  function addMessage(message, mine) {
    empty.remove();
    const row = el("div", mine ? "msg mine" : "msg");
    const face = el("span", "face", message.avatar);
    face.style.background = message.color;
    const body = el("div", "body");
    const who = el("span", "who", mine ? "Tú" : message.username);
    who.style.color = mine ? "#FFC965" : message.color;
    body.append(who, el("p", "text", message.text));
    row.append(face, body);
    const atBottom = messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight < 80;
    messageList.append(row);
    while (messageList.children.length > 80) messageList.firstChild.remove();
    if (atBottom || mine) messageList.scrollTop = messageList.scrollHeight;
  }

  function floatReaction(emoji) {
    const bubble = el("span", "float", emoji);
    const left = isOpen ? window.innerWidth - PANEL_WIDTH + 20 + Math.random() * (PANEL_WIDTH - 80) : window.innerWidth - 80 - Math.random() * 60;
    bubble.style.left = `${left}px`;
    root.append(bubble);
    setTimeout(() => bubble.remove(), 2700);
  }

  function setOpen(open) {
    isOpen = open;
    if (open) unread = 0;
    try {
      chrome.storage.local.set({ chatOpen: open });
    } catch {}
    render();
    if (open) messageList.scrollTop = messageList.scrollHeight;
  }

  launcher.addEventListener("click", () => {
    setOpen(true);
    input.focus();
  });
  close.addEventListener("click", () => setOpen(false));
  input.addEventListener("input", () => (sendButton.disabled = !input.value.trim()));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    send({ type: "CHAT_SEND", text }, (reply) => {
      if (reply?.ok) {
        input.value = "";
        sendButton.disabled = true;
      }
    });
  });

  // En pantalla completa solo se ve lo que está dentro del elemento en pantalla completa.
  // El panel va en <html>, no en <body>: el body encogido tiene transform y un "fixed" dentro de
  // él quedaría pegado al borde del body (encima de la película) y no al de la ventana.
  function placeHost() {
    const parent = document.fullscreenElement ?? document.documentElement;
    if (parent && host.parentNode !== parent) parent.appendChild(host);
  }
  document.addEventListener("fullscreenchange", () => {
    placeHost();
    render();
  });

  function loadState(state) {
    roomId = state?.connected ? state.roomId : null;
    members = Array.isArray(state?.members) ? state.members : [];
    messageList.replaceChildren(empty);
    for (const message of state?.messages ?? []) addMessage(message, message.mine);
    applySettings(state?.roomSettings ? { ...state.roomSettings, isLeader: state.isLeader } : null);
    renderMembers();
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || typeof message !== "object") return;
    if (message.type === "CHAT_MESSAGE" && message.message) {
      addMessage(message.message, message.mine === true);
      if (!isOpen && !message.mine) unread += 1;
      render();
    } else if (message.type === "CHAT_REACTION" && typeof message.emoji === "string") {
      floatReaction(message.emoji);
    } else if (message.type === "ROOM_SETTINGS") {
      applySettings(message);
    } else if (message.type === "CHAT_MEMBERS" && Array.isArray(message.members)) {
      members = message.members;
      renderMembers();
    } else if (message.type === "EXT_STATUS") {
      // Al conectarse (o reconectarse) se pide el estado completo del chat.
      if (message.connected) send({ type: "CHAT_STATE" }, loadState);
      else {
        roomId = null;
        render();
      }
    }
  });

  try {
    chrome.storage.local.get("chatOpen", ({ chatOpen }) => {
      isOpen = chatOpen !== false;
      render();
    });
  } catch {}
  placeHost();
  send({ type: "CHAT_STATE" }, loadState);
})();
