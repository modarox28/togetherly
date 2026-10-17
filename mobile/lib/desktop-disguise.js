/* eslint-disable @typescript-eslint/no-require-imports */
// Se inyecta ANTES de que cargue la página de streaming (injectedJavaScriptBeforeContentLoaded).
// Netflix y Disney+ mandan a su app si detectan un celular: además del "user agent" de
// computador, aquí se ocultan las otras pistas (plataforma, pantalla táctil, puntero).
// También revisa qué protección de video (DRM) tiene el navegador interno y se lo avisa a la app:
//   { type: "drm", widevine, fairplay, webkitKeys }
// Ojo: va dentro de String.raw`…`: no usar comillas invertidas ni "${" en el código.

const disguise = (platform) => String.raw`
(function () {
  var PLATFORM = "__PLATFORM__";
  function define(obj, key, value) {
    try { Object.defineProperty(obj, key, { get: function () { return value; }, configurable: true }); } catch (e) {}
  }
  var proto = Navigator.prototype;
  define(proto, "platform", PLATFORM === "ios" ? "MacIntel" : "Win32");
  define(proto, "maxTouchPoints", 0);
  if ("userAgentData" in navigator) {
    var brands = [{ brand: "Google Chrome", version: "141" }, { brand: "Chromium", version: "141" }];
    define(proto, "userAgentData", {
      mobile: false, platform: "Windows", brands: brands,
      getHighEntropyValues: function () {
        return Promise.resolve({ mobile: false, platform: "Windows", platformVersion: "15.0.0", architecture: "x86", model: "", brands: brands });
      },
      toJSON: function () { return { mobile: false, platform: "Windows", brands: brands }; }
    });
  }
  try { delete window.ontouchstart; delete Document.prototype.ontouchstart; } catch (e) {}
  // Consultas CSS de "pantalla táctil": se responden como en un computador con mouse.
  var realMatchMedia = window.matchMedia ? window.matchMedia.bind(window) : null;
  if (realMatchMedia) {
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
            type: "drm", widevine: r[0], fairplay: r[1] || r[2], webkitKeys: typeof window.WebKitMediaKeys !== "undefined"
          }));
        } catch (e) {}
      });
  }, 1500);
})();
true;
`.replace("__PLATFORM__", platform);

module.exports = { disguise };
