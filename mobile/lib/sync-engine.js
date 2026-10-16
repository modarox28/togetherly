/* eslint-disable @typescript-eslint/no-require-imports */
// Motor de sincronización que se inyecta en la página de streaming dentro de la app
// (Netflix, Disney+, Prime Video…). Es el mismo trabajo que hace la extensión
// (togetherly-extension/content.js + platforms.js), pero aquí corre directo en la página,
// así que puede usar el reproductor interno de Netflix y de Disney+ sin intermediarios.
//
// La app → la página:   window.__togetherly.apply({ action: "play"|"pause"|"seek"|"state", currentTime, playing })
// La página → la app:   ReactNativeWebView.postMessage(JSON) con
//   { type: "play"|"pause"|"seek", time }   la persona tocó play, pausa o saltó
//   { type: "watching", url }                abrió una película (para el enlace de invitación)
//   { type: "video", found }                 si hay reproductor en la página
//   { type: "failed", action }               no se pudo aplicar una orden
//
// Ojo: el texto va dentro de String.raw`…`: no usar comillas invertidas ni "${" en el código.

const ENGINE_JS = String.raw`
(function () {
  if (window.__togetherly) return;

  var DRIFT_TOLERANCE = 1.5;     // segundos de diferencia aceptables
  var JUMP_THRESHOLD = 3;        // un brinco mayor que esto es un salto de la persona
  var EXPECTED_TTL = 2500;       // ms que se espera un evento provocado por nosotros
  var host = location.hostname;

  function post(message) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(message)); } catch (e) {}
  }
  function now() { return Date.now(); }
  function validTime(t) { return typeof t === "number" && isFinite(t) && t >= 0; }

  var platform =
    /(^|\.)netflix\.com$/.test(host) ? "netflix" :
    /(^|\.)disneyplus\.com$/.test(host) ? "disney" :
    /(^|\.)primevideo\.com$/.test(host) || /(^|\.)amazon\.[a-z.]+$/.test(host) ? "prime" :
    /(^|\.)(hbomax|max)\.com$/.test(host) ? "hbo" :
    /(^|\.)paramountplus\.com$/.test(host) ? "paramount" :
    host === "tv.apple.com" ? "appletv" :
    /(^|\.)crunchyroll\.com$/.test(host) ? "crunchyroll" : "other";

  // ¿Es una página de reproductor? (y no el catálogo, que tiene avances sonando)
  function isPlayerPage() {
    var p = location.pathname;
    if (platform === "netflix") return p.indexOf("/watch") === 0;
    if (platform === "disney") return /\/(play|video)\//.test(p);
    if (platform === "hbo") return /\/(video|watch|player)/.test(p);
    if (platform === "paramount") return /\/(video|movies|shows)\//.test(p);
    if (platform === "crunchyroll") return p.indexOf("/watch/") !== -1;
    return true;
  }

  // ── Reproductores internos ───────────────────────────────────────────────
  function netflixPlayer() {
    try {
      var api = window.netflix.appContext.state.playerApp.getAPI().videoPlayer;
      var ids = api.getAllPlayerSessionIds() || [];
      var id = ids.filter(function (i) { return String(i).indexOf("watch") === 0; })[0] || ids[ids.length - 1];
      return id ? api.getVideoPlayerBySessionId(id) : null;
    } catch (e) { return null; }
  }
  function disneyPlayer() {
    try { return document.querySelector("disney-web-player").mediaPlayer || null; } catch (e) { return null; }
  }

  // ── Encontrar el video principal ─────────────────────────────────────────
  function allVideos(root, depth) {
    var list = Array.prototype.slice.call(root.querySelectorAll("video"));
    if (depth > 4) return list;
    var all = root.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      if (all[i].shadowRoot) list = list.concat(allVideos(all[i].shadowRoot, depth + 1));
    }
    return list;
  }
  function findVideo() {
    var best = null, bestScore = -1, videos = allVideos(document, 0);
    // Disney+ también expone su <video> en el reproductor (por si queda en un shadow DOM cerrado).
    try {
      var own = document.querySelector("disney-web-player").mediaElement;
      if (own && own.tagName === "VIDEO") videos.push(own);
    } catch (e) {}
    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      if (!v.isConnected || v.readyState === 0) continue;
      var r = v.getBoundingClientRect();
      var area = r.width * r.height;
      if (area < 4000) continue;
      var d = v.duration === Infinity ? 7200 : isFinite(v.duration) ? v.duration : 0;
      if (d < 30) continue;
      var score = Math.min(d, 100000) + area / 1000;
      if (score > bestScore) { best = v; bestScore = score; }
    }
    return best;
  }

  // ── Minuto real y controles por plataforma ───────────────────────────────
  function currentTime() {
    if (platform === "disney") {
      try {
        var ms = disneyPlayer().timeline.info.playheadPositionMs;
        if (validTime(ms)) return ms / 1000;
      } catch (e) {}
    }
    return video.currentTime;
  }
  function doPlay() {
    var p = platform === "netflix" ? netflixPlayer() : null;
    if (p) { p.play(); return; }
    var promise = video.play();
    if (promise && promise.catch) promise.catch(function () { post({ type: "failed", action: "play" }); });
  }
  function doPause() {
    var p = platform === "netflix" ? netflixPlayer() : null;
    if (p) p.pause(); else video.pause();
  }
  function doSeek(seconds) {
    if (platform === "netflix") {
      // En Netflix cambiar currentTime directo rompe el video (error M7375).
      var n = netflixPlayer();
      if (n) n.seek(Math.round(seconds * 1000)); else post({ type: "failed", action: "seek" });
      return;
    }
    if (platform === "disney") {
      // En Disney+ el <video> no sabe el minuto real: solo su reproductor sabe saltar.
      var d = disneyPlayer();
      if (d) { d.seek(Math.round(seconds * 1000)); return; }
    }
    video.currentTime = seconds;
  }

  // ── Eventos de la persona ────────────────────────────────────────────────
  var video = null;
  var expected = [];
  var seekTimer = null;
  var lastSeekSentAt = 0;
  var lastSeekSentTime = -1;
  var ignoreJumpsUntil = 0;
  var lastSample = null;
  var pending = null;

  function expect(type) { expected.push({ type: type, until: now() + EXPECTED_TTL }); }
  function isOwn(type) {
    expected = expected.filter(function (e) { return e.until > now(); });
    for (var i = 0; i < expected.length; i++) {
      if (expected[i].type === type) { expected.splice(i, 1); return true; }
    }
    return false;
  }
  function onPlay() { if (!isOwn("play")) post({ type: "play", time: currentTime() }); }
  function onPause() { if (!isOwn("pause") && !video.ended) post({ type: "pause", time: currentTime() }); }
  function onSeeked() {
    if (isOwn("seeked")) return;
    clearTimeout(seekTimer);
    seekTimer = setTimeout(sendSeek, platform === "disney" ? 900 : 300);
  }
  function sendSeek() {
    if (!video) return;
    lastSeekSentAt = now();
    lastSeekSentTime = currentTime();
    lastSample = null;
    post({ type: "seek", time: lastSeekSentTime });
  }

  function attach(v) {
    if (video === v) return;
    if (video) {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", onSeeked);
    }
    video = v;
    lastSample = null;
    if (!v) { post({ type: "video", found: false }); return; }
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("seeked", onSeeked);
    post({ type: "video", found: true });
    if (pending) { var order = pending; pending = null; apply(order); }
  }

  var lastUrl = null;
  setInterval(function () {
    if (!isPlayerPage()) { if (video) attach(null); return; }
    if (!(video && video.isConnected && video.readyState > 0)) attach(findVideo());
    var url = location.href.split("#")[0];
    if (url !== lastUrl && (video || platform !== "prime")) {
      lastUrl = url;
      post({ type: "watching", url: url });
    }
  }, 1000);

  // Saltos sin evento "seeked" (Disney+): el minuto brincó más de lo esperado.
  setInterval(function () {
    if (!video || !video.isConnected) { lastSample = null; return; }
    var t = currentTime();
    var sample = { time: t, at: now(), playing: !video.paused };
    var prev = lastSample;
    lastSample = sample;
    if (!prev || !validTime(t) || now() < ignoreJumpsUntil) return;
    var expectedTime = prev.time + (prev.playing ? ((sample.at - prev.at) / 1000) * (video.playbackRate || 1) : 0);
    if (Math.abs(t - expectedTime) < JUMP_THRESHOLD) return;
    // Ya se avisó este mismo salto (por "seeked"): no repetirlo. Un salto nuevo sí se avisa.
    if (now() - lastSeekSentAt < 2000 && Math.abs(t - lastSeekSentTime) < JUMP_THRESHOLD) return;
    clearTimeout(seekTimer);
    seekTimer = setTimeout(sendSeek, 300);
  }, 500);

  // ── Órdenes que llegan de la sala ────────────────────────────────────────
  function apply(order) {
    if (!order || typeof order !== "object") return;
    if (!video) { pending = order; return; }
    var target = order.currentTime;
    var far = validTime(target) && Math.abs(currentTime() - target) > DRIFT_TOLERANCE;
    function seek() {
      expect("seeked");
      ignoreJumpsUntil = now() + 6000;
      lastSample = null;
      doSeek(target);
    }
    function play() { expect("play"); doPlay(); }
    function pause() { expect("pause"); doPause(); }
    try {
      if (order.action === "play") { if (far) seek(); if (video.paused) play(); }
      else if (order.action === "pause") { if (!video.paused) pause(); if (far) seek(); }
      else if (order.action === "seek") { if (far) seek(); }
      else if (order.action === "state") {
        if (far) seek();
        if (order.playing && video.paused) play();
        if (!order.playing && !video.paused) pause();
      }
    } catch (e) {
      post({ type: "failed", action: order.action });
    }
  }

  window.__togetherly = { apply: apply, platform: platform };
})();
true;
`;

module.exports = { ENGINE_JS };
