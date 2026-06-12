// Bridge script — injected on togetherly-weld.vercel.app and localhost:3000
// Relays messages between the web app (window.postMessage) and the extension background.

// 1. Announce extension presence to the web app
window.postMessage({ source: "togetherly-ext", type: "EXT_READY" }, "*");

// 2. Web app → background
window.addEventListener("message", (e) => {
  if (e.source !== window) return;
  if (e.data?.source !== "togetherly-web") return;

  chrome.runtime.sendMessage(e.data, (resp) => {
    if (chrome.runtime.lastError) return;
    if (resp) window.postMessage({ source: "togetherly-ext", ...resp }, "*");
  });
});

// 3. Background → web app
chrome.runtime.onMessage.addListener((msg) => {
  window.postMessage({ source: "togetherly-ext", ...msg }, "*");
});
