/* eslint-disable @typescript-eslint/no-require-imports */
// Se inyecta ANTES de que cargue la página de streaming (injectedJavaScriptBeforeContentLoaded).
// Netflix y Disney+ mandan a su app si detectan un celular. Hay tres perfiles:
//   "none"    → no se cambia nada (iPad: Netflix ya lo acepta así; probado el 16 oct 2026)
//   "ipad"    → iPhone que se presenta como iPad (pantalla de iPad; Netflix acepta Safari de iPad)
//   "desktop" → Android que se presenta como computador (plataforma, sin pantalla táctil, puntero)
// También revisa qué protección de video (DRM) tiene el navegador interno y se lo avisa a la app:
//   { type: "drm", widevine, fairplay, webkitKeys }
// Ojo: va dentro de String.raw`…`: no usar comillas invertidas ni "${" en el código.

const disguise = (profile) => String.raw`
(function () {
  var PROFILE = "__PROFILE__";
  function define(obj, key, value) {
    try { Object.defineProperty(obj, key, { get: function () { return value; }, configurable: true }); } catch (e) {}
  }
  var proto = Navigator.prototype;
  if (PROFILE === "ipad") {
    // Safari de iPad dice "MacIntel" y tiene pantalla táctil; solo cambia el tamaño de pantalla.
    define(proto, "platform", "MacIntel");
    var sp = Screen.prototype;
    define(sp, "width", 1024); define(sp, "height", 1366);
    define(sp, "availWidth", 1024); define(sp, "availHeight", 1366);

    // El error S7351 de Netflix en iPhone es por falta de MediaSource (el iPad sí lo tiene).
    // El iPhone trae ManagedMediaSource (iOS 17.1+), casi igual: se usa en su lugar.
    // Exige que el video no ofrezca AirPlay, así que se apaga en cada <video>.
    if (!window.MediaSource && window.ManagedMediaSource) {
      window.__togetherlyMMS = true;
      window.MediaSource = window.ManagedMediaSource;
    }
  }
  if (PROFILE === "desktop") define(proto, "platform", "Win32");
  if (PROFILE === "desktop") define(proto, "maxTouchPoints", 0);
  if (PROFILE === "desktop" && "userAgentData" in navigator) {
    var brands = [{ brand: "Google Chrome", version: "141" }, { brand: "Chromium", version: "141" }];
    define(proto, "userAgentData", {
      mobile: false, platform: "Windows", brands: brands,
      getHighEntropyValues: function () {
        return Promise.resolve({ mobile: false, platform: "Windows", platformVersion: "15.0.0", architecture: "x86", model: "", brands: brands });
      },
      toJSON: function () { return { mobile: false, platform: "Windows", brands: brands }; }
    });
  }
  if (PROFILE === "desktop") { try { delete window.ontouchstart; delete Document.prototype.ontouchstart; } catch (e) {} }
  // Consultas CSS de "pantalla táctil": se responden como en un computador con mouse.
  var realMatchMedia = window.matchMedia ? window.matchMedia.bind(window) : null;
  if (realMatchMedia && PROFILE === "desktop") {
    window.matchMedia = function (query) {
      var q = String(query);
      var fake = null;
      if (/pointer\s*:\s*coarse|hover\s*:\s*none|any-pointer\s*:\s*coarse/.test(q)) fake = false;
      if (/pointer\s*:\s*fine|hover\s*:\s*hover|any-hover\s*:\s*hover/.test(q)) fake = true;
      var result = realMatchMedia(query);
      if (fake === null) return result;
      return { matches: fake, media: q, onchange: null,
        addListener: function () {}, removeListener: function () {},
        addEventListener: function () {}, removeEventListener: function () {}, dispatchEvent: function () { return false; } };
    };
  }

  // Cada <video>: dentro de la app (no en el reproductor de pantalla completa del iPhone)
  // y, si se usa ManagedMediaSource, sin AirPlay (lo exige).
  function fixVideo(v) {
    try {
      v.playsInline = true;
      v.setAttribute("playsinline", "");
      v.setAttribute("webkit-playsinline", "");
      if (window.__togetherlyMMS) v.disableRemotePlayback = true;
    } catch (e) {}
  }
  var realCreate = Document.prototype.createElement;
  Document.prototype.createElement = function (tag) {
    var el = realCreate.apply(this, arguments);
    if (String(tag).toLowerCase() === "video") fixVideo(el);
    return el;
  };

  // Sin zoom: así nadie agranda la página por error al tocar la película.
  // Se respeta el ancho que pide la página (el iPad ya funciona así); solo se agrega "sin zoom".
  var NO_ZOOM = "maximum-scale=1, user-scalable=no";
  function lockZoom() {
    var head = document.head || document.documentElement;
    if (!head) return;
    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) { meta = realCreate.call(document, "meta"); meta.name = "viewport"; meta.content = NO_ZOOM; head.appendChild(meta); return; }
    var content = meta.content || "";
    if (content.indexOf("user-scalable=no") === -1) meta.content = (content ? content + ", " : "") + NO_ZOOM;
  }
  document.addEventListener("gesturestart", function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener("touchmove", function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  new MutationObserver(function () {
    lockZoom();
    var videos = document.getElementsByTagName("video");
    for (var i = 0; i < videos.length; i++) fixVideo(videos[i]);
  }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["content"] });
  lockZoom();

  // ¿Qué DRM hay? (diagnóstico para saber si Netflix/Disney+ pueden reproducir aquí)
  function check(keySystem, initDataType) {
    if (!navigator.requestMediaKeySystemAccess) return Promise.resolve(false);
    return navigator.requestMediaKeySystemAccess(keySystem, [{
      initDataTypes: [initDataType],
      videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"' }]
    }]).then(function () { return true; }, function () { return false; });
  }
  setTimeout(function () {
    Promise.all([check("com.widevine.alpha", "cenc"), check("com.apple.fps", "sinf"), check("com.apple.fps.1_0", "sinf")])
      .then(function (r) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "drm", widevine: r[0], fairplay: r[1] || r[2], webkitKeys: typeof window.WebKitMediaKeys !== "undefined",
            mse: window.__togetherlyMMS ? "managed" : typeof window.MediaSource !== "undefined" ? "yes" : "no"
          }));
        } catch (e) {}
      });
  }, 1500);
})();
true;
`.replace("__PROFILE__", profile);

module.exports = { disguise };
