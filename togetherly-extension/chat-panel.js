// Panel de chat al lado de la película (Netflix, Prime, Disney+…), como Teleparty.
// Se muestra solo cuando la extensión está en una sala. Todo vive en un shadow DOM cerrado:
// los estilos de la página no lo tocan y el texto siempre se pone con textContent.
//
// Habla con el background:
//   pide   CHAT_STATE (al cargar) · manda CHAT_SEND { text } y REACTION_SEND { emoji }
//   recibe CHAT_MESSAGE { message, mine } · CHAT_REACTION { emoji, by } · CHAT_MEMBERS { members }
//          EXT_STATUS { connected, roomId }
//   trivia: manda TRIVIA_START · TRIVIA_ANSWER · TRIVIA_SUBMIT · TRIVIA_CONTROL
//           recibe TRIVIA_STATE { state } · TRIVIA_OFFER { title } · TRIVIA_ERROR { message }

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
    .trivia-open { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-size: 17px; }
    .trivia-open:hover { background: rgba(246,239,247,.08); }
    .trivia { margin: 10px 12px 0; padding: 12px; border-radius: 16px; background: #2A2140;
      box-shadow: inset 0 0 0 1.5px rgba(255,201,101,.35); display: flex; flex-direction: column; gap: 8px; max-height: 60vh; overflow-y: auto; }
    .trivia .top { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #C9BCD6; }
    .trivia .top b { flex: 1; color: #FFC965; font-weight: 800; }
    .trivia .q { font-size: 15px; font-weight: 800; line-height: 1.3; }
    .trivia .note { font-size: 12px; color: #C9BCD6; }
    .trivia .row { display: flex; gap: 6px; flex-wrap: wrap; }
    .trivia .btn { padding: 8px 14px; border-radius: 999px; background: #FFC965; color: #2A2140; font-weight: 800; font-size: 13px; }
    .trivia .btn.soft { background: rgba(246,239,247,.1); color: #F6EFF7; }
    .trivia .btn:disabled { opacity: .5; cursor: default; }
    .trivia .opt { width: 100%; text-align: left; padding: 9px 12px; border-radius: 12px; background: #1E1730;
      box-shadow: inset 0 0 0 1.5px rgba(246,239,247,.14); font-weight: 700; font-size: 13px; }
    .trivia .opt:not(:disabled):hover { box-shadow: inset 0 0 0 1.5px #FFC965; }
    .trivia .opt:disabled { cursor: default; }
    .trivia .opt.chosen { box-shadow: inset 0 0 0 2px #FFC965; }
    .trivia .opt.right { background: #6FD3A8; color: #1E1730; box-shadow: none; }
    .trivia .opt.wrong { background: #FF9AA2; color: #1E1730; box-shadow: none; }
    .trivia input { padding: 8px 12px; border-radius: 10px; font-size: 13px; }
    .trivia .optin { display: flex; gap: 6px; align-items: center; }
    .trivia .mark { width: 34px; height: 34px; flex-shrink: 0; border-radius: 50%; background: rgba(246,239,247,.1); font-weight: 800; }
    .trivia .mark[aria-pressed="true"] { background: #6FD3A8; color: #1E1730; }
    .trivia ol { padding-left: 4px; list-style: none; display: flex; flex-direction: column; gap: 4px; }
    .trivia li { display: flex; gap: 8px; font-size: 13px; }
    .trivia li span:nth-child(2) { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .trivia li b { color: #FFC965; }
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
  const triviaOpen = el("button", "trivia-open", "🎯");
  triviaOpen.setAttribute("aria-label", "Jugar trivia de lo que vieron");
  triviaOpen.title = "Trivia";
  header.append(logo, title, triviaOpen, close);

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

  const triviaBox = el("div", "trivia");
  triviaBox.hidden = true;
  triviaBox.setAttribute("aria-live", "polite");

  panel.append(header, memberList, actions, control, triviaBox, messageList, reactionRow, form);
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

  // ── Trivia al final de la película (ver server/trivia.js) ───────────────
  let trivia = null; // estado que manda el servidor
  let offerTitle = null; // la película está por terminar: se ofrece jugar
  let closedTriviaId = null; // la persona cerró la tabla final
  let triviaNote = "";
  let tick = null;
  let draft = { question: "", options: ["", "", "", ""], answer: null };

  const secondsLeft = () => (trivia?.endsAt ? Math.max(0, Math.min(99, Math.floor((trivia.endsAt - Date.now()) / 1000))) : null);
  const button = (text, className, onClick) => {
    const b = el("button", className, text);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  };

  function renderTrivia() {
    clearInterval(tick);
    const showOffer = offerTitle !== null && (!trivia || trivia.phase === "end");
    const showGame = !!trivia && !(trivia.phase === "end" && closedTriviaId === trivia.id);
    triviaBox.hidden = !showOffer && !showGame;
    if (triviaBox.hidden) return;
    // Mientras se escribe la pregunta no se redibuja (se perdería lo escrito).
    if (showGame && trivia.phase === "collect" && !trivia.you.submitted && triviaBox.dataset.view === `collect-${trivia.id}`) {
      updateCountdown();
      tick = setInterval(updateCountdown, 1000);
      return;
    }
    triviaBox.dataset.view = "";
    const top = el("div", "top");
    const label = el("b", null, "🎯 Trivia");
    const countdown = el("span", "countdown");
    top.append(label, countdown);
    const parts = [top];

    if (showOffer && !showGame) {
      parts.push(el("p", "q", offerTitle ? `¿Jugamos una trivia de «${offerTitle}»?` : "¿Jugamos una trivia?"));
      parts.push(el("div", "row"));
      parts[2].append(
        button("Jugar", "btn", () => startTrivia()),
        button("Ahora no", "btn soft", () => {
          offerTitle = null;
          renderTrivia();
        })
      );
    } else if (trivia.phase === "loading") {
      parts.push(el("p", "q", `Preparando preguntas de «${trivia.title}»…`));
    } else if (trivia.phase === "collect") {
      label.textContent = "🎯 Trivia entre amigos";
      if (trivia.you.submitted) {
        parts.push(el("p", "q", "¡Listo! Esperando las preguntas de los demás…"));
      } else {
        triviaBox.dataset.view = `collect-${trivia.id}`;
        parts.push(el("p", "note", "Escribe una pregunta sobre lo que vieron y marca con ✓ la respuesta correcta."));
        parts.push(...collectForm());
      }
      parts.push(el("p", "note", `${trivia.submitted} de ${trivia.players} ya escribieron`));
      if (trivia.you.canStop && trivia.submitted > 0) parts.push(button("Empezar ya", "btn soft", () => send({ type: "TRIVIA_CONTROL", action: "begin" })));
    } else if (trivia.phase === "question" || trivia.phase === "reveal") {
      label.textContent = `🎯 Pregunta ${trivia.index + 1} de ${trivia.total}`;
      if (trivia.author) parts.push(el("p", "note", `Pregunta de ${trivia.you.isAuthor ? "ti" : trivia.author}`));
      parts.push(el("p", "q", trivia.question));
      trivia.options.forEach((option, i) => {
        const b = button(option, "opt", () => {
          send({ type: "TRIVIA_ANSWER", id: trivia.id, index: trivia.index, choice: i });
          trivia.you = { ...trivia.you, answered: true, choice: i };
          renderTrivia();
        });
        b.disabled = trivia.phase === "reveal" || trivia.you.answered || trivia.you.isAuthor;
        if (trivia.you.choice === i) b.classList.add("chosen");
        if (trivia.phase === "reveal" && trivia.correct === i) b.classList.add("right");
        else if (trivia.phase === "reveal" && trivia.you.choice === i) b.classList.add("wrong");
        parts.push(b);
      });
      if (trivia.phase === "reveal") {
        const hit = trivia.you.choice !== null && trivia.you.choice === trivia.correct;
        parts.push(el("p", "note", trivia.you.isAuthor ? "Así les fue con tu pregunta" : hit ? "¡Correcto! 🎉" : trivia.you.answered ? "Esta no fue 😅" : "Se acabó el tiempo"));
      } else if (trivia.you.isAuthor) {
        parts.push(el("p", "note", "Es tu pregunta: mira cómo les va"));
      } else {
        parts.push(el("p", "note", `${trivia.answered} de ${trivia.players} respondieron`));
      }
    } else if (trivia.phase === "end") {
      label.textContent = "🏆 Resultados";
      if (trivia.total === 0) parts.push(el("p", "note", "Nadie escribió preguntas esta vez."));
      const list = el("ol");
      trivia.scores.slice(0, 8).forEach((score, i) => {
        const item = el("li");
        item.append(el("span", null, ["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`), el("span", null, `${score.avatar} ${score.name}`), el("b", null, String(score.points)));
        list.append(item);
      });
      parts.push(list);
      const row = el("div", "row");
      row.append(
        button("Cerrar", "btn soft", () => {
          closedTriviaId = trivia.id;
          renderTrivia();
        })
      );
      parts.push(row);
    }
    if (showGame && trivia.you.canStop && !["end", "collect"].includes(trivia.phase)) {
      top.append(button("Terminar", "btn soft", () => send({ type: "TRIVIA_CONTROL", action: "stop" })));
    }
    if (triviaNote) parts.push(el("p", "note", triviaNote));
    triviaBox.replaceChildren(...parts);
    updateCountdown();
    tick = setInterval(updateCountdown, 1000);
  }

  function updateCountdown() {
    const node = triviaBox.querySelector(".countdown");
    const left = secondsLeft();
    if (node) node.textContent = left !== null && trivia && ["question", "collect"].includes(trivia.phase) ? `${left} s` : "";
  }

  function collectForm() {
    const question = el("input");
    question.placeholder = "Tu pregunta";
    question.maxLength = 160;
    question.value = draft.question;
    question.addEventListener("input", () => (draft.question = question.value));
    const rows = draft.options.map((value, i) => {
      const row = el("div", "optin");
      const input = el("input");
      input.placeholder = i < 2 ? `Opción ${i + 1}` : `Opción ${i + 1} (opcional)`;
      input.maxLength = 60;
      input.value = value;
      input.addEventListener("input", () => (draft.options[i] = input.value));
      const mark = el("button", "mark", "✓");
      mark.type = "button";
      mark.setAttribute("aria-label", `Marcar la opción ${i + 1} como correcta`);
      mark.setAttribute("aria-pressed", String(draft.answer === i));
      mark.addEventListener("click", () => {
        draft.answer = i;
        for (const m of triviaBox.querySelectorAll(".mark")) m.setAttribute("aria-pressed", String(m === mark));
      });
      row.append(input, mark);
      return row;
    });
    const submit = button("Enviar pregunta", "btn", () => {
      // Se quitan las opciones vacías y se ajusta el índice de la correcta.
      const filled = draft.options.map((text, i) => ({ text: text.trim(), i })).filter((o) => o.text);
      const answer = filled.findIndex((o) => o.i === draft.answer);
      if (draft.question.trim().length < 3 || filled.length < 2 || answer === -1) {
        triviaNote = "Escribe la pregunta, al menos 2 opciones y marca la correcta con ✓";
        triviaBox.dataset.view = "";
        return renderTrivia();
      }
      triviaNote = "";
      send({ type: "TRIVIA_SUBMIT", id: trivia.id, question: draft.question.trim(), options: filled.map((o) => o.text), answer });
    });
    return [question, ...rows, submit];
  }

  function startTrivia() {
    offerTitle = null;
    triviaNote = "";
    if (!isOpen) setOpen(true);
    send({ type: "TRIVIA_START" });
  }
  triviaOpen.addEventListener("click", () => {
    if (trivia && trivia.phase !== "end") {
      closedTriviaId = null;
      return renderTrivia();
    }
    startTrivia();
  });

  function applyTrivia(state) {
    if (!state) return;
    if (trivia?.id !== state.id) {
      draft = { question: "", options: ["", "", "", ""], answer: null };
      triviaNote = "";
    }
    trivia = state;
    if (state.phase !== "end") offerTitle = null;
    renderTrivia();
  }

  function loadState(state) {
    roomId = state?.connected ? state.roomId : null;
    members = Array.isArray(state?.members) ? state.members : [];
    messageList.replaceChildren(empty);
    for (const message of state?.messages ?? []) addMessage(message, message.mine);
    applySettings(state?.roomSettings ? { ...state.roomSettings, isLeader: state.isLeader } : null);
    renderMembers();
    if (state?.trivia) applyTrivia(state.trivia);
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
    } else if (message.type === "TRIVIA_STATE" && message.state) {
      const isNew = trivia?.id !== message.state.id;
      applyTrivia(message.state);
      // Una trivia nueva abre el chat (una sola vez): si lo cierran, no se vuelve a abrir solo.
      if (isNew && !isOpen && message.state.phase !== "end") setOpen(true);
    } else if (message.type === "TRIVIA_OFFER") {
      offerTitle = typeof message.title === "string" ? message.title : "";
      if (!isOpen) {
        unread += 1;
        render();
      }
      renderTrivia();
    } else if (message.type === "TRIVIA_ERROR" && typeof message.message === "string") {
      triviaNote = message.message;
      triviaBox.dataset.view = "";
      if (!trivia) offerTitle = offerTitle ?? "";
      renderTrivia();
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
