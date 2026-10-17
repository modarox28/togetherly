import { forwardRef, useImperativeHandle, useRef, useState, type ComponentType, type Ref } from "react";
import { Platform, View } from "react-native";
import WebView, { type WebViewMessageEvent, type WebViewProps } from "react-native-webview";
import type { PlayerOrder } from "@/hooks/useRoom";
// Mismo motor para Android y iPhone; también lo prueban las pruebas e2e (tests/extension/mobile-engine.spec.js).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ENGINE_JS } = require("../lib/sync-engine.js") as { ENGINE_JS: string };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { disguise } = require("../lib/desktop-disguise.js") as { disguise: (profile: "none" | "ipad" | "desktop") => string };

// Los tipos de NativeWind chocan con el componente de clase de WebView: se le dan sus props a mano.
const Browser = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebView> }>;

export interface StreamingWebViewHandle {
  apply: (order: PlayerOrder) => void;
  goTo: (url: string) => void;
}

export type EngineEvent =
  | { type: "play" | "pause" | "seek"; time: number }
  | { type: "watching"; url: string }
  | { type: "video"; found: boolean }
  | { type: "failed"; action: string }
  | { type: "drm"; widevine: boolean; fairplay: boolean; webkitKeys: boolean; mse: string }
  | { type: "crashed"; retrying: boolean };

interface Props {
  url: string;
  onEvent: (event: EngineEvent) => void;
}

// Netflix y Disney+ no reproducen en navegadores de celular: se presenta como un navegador
// de computador. En iPhone el motor es WebKit (como Safari en Mac); en Android, Chrome.
const DESKTOP_USER_AGENT =
  Platform.OS === "ios"
    ? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
    : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

// iPad: sin cambios (así Netflix ya reproduce) · iPhone: se presenta como iPad · Android: como computador.
const PROFILE: Profile = Platform.OS === "android" ? "desktop" : Platform.OS === "ios" && Platform.isPad ? "none" : "ipad";
type Profile = "none" | "ipad" | "desktop";

function parseEvent(raw: string): EngineEvent | null {
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data.type !== "string") return null;
    if (["play", "pause", "seek"].includes(data.type) && typeof data.time === "number" && Number.isFinite(data.time)) return data;
    if (data.type === "watching" && typeof data.url === "string" && data.url.startsWith("https://")) return data;
    if (data.type === "video" || data.type === "failed") return data;
    if (data.type === "drm") return { type: "drm", widevine: data.widevine === true, fairplay: data.fairplay === true, webkitKeys: data.webkitKeys === true, mse: ["yes", "no", "managed"].includes(data.mse) ? data.mse : "?" };
  } catch {}
  return null;
}

export const StreamingWebView = forwardRef<StreamingWebViewHandle, Props>(function StreamingWebView({ url, onEvent }, ref) {
  const webViewRef = useRef<WebView>(null);
  // Si el navegador interno se cierra (pasó en una tablet Samsung con Netflix), se vuelve a
  // abrir una vez sin disfraz, en vez de cerrar toda la app.
  const [profile, setProfile] = useState<Profile>(PROFILE);
  const [attempt, setAttempt] = useState(0);
  const onCrash = () => {
    const retrying = attempt < 2;
    onEvent({ type: "crashed", retrying });
    if (!retrying) return;
    setProfile("none");
    setAttempt((n) => n + 1);
  };

  useImperativeHandle(ref, () => ({
    // La orden viaja como JSON: nunca se arma código con texto que llega de la sala.
    apply: (order) =>
      webViewRef.current?.injectJavaScript(
        `window.__togetherly && window.__togetherly.apply(JSON.parse(${JSON.stringify(JSON.stringify(order))}));true;`
      ),
    goTo: (next) => {
      if (next.startsWith("https://")) webViewRef.current?.injectJavaScript(`location.href=${JSON.stringify(next)};true;`);
    },
  }));

  const handleMessage = (event: WebViewMessageEvent) => {
    const parsed = parseEvent(event.nativeEvent.data);
    if (parsed) onEvent(parsed);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Browser
        key={`${profile}-${attempt}`}
        ref={webViewRef}
        source={{ uri: url }}
        style={{ flex: 1, backgroundColor: "#000" }}
        userAgent={DESKTOP_USER_AGENT}
        injectedJavaScriptBeforeContentLoaded={disguise(profile)}
        onRenderProcessGone={onCrash}
        onContentProcessDidTerminate={onCrash}
        injectedJavaScript={ENGINE_JS}
        onMessage={handleMessage}
        // Video con DRM (Netflix, Disney+…): en Android hay que permitirlo explícitamente.
        allowsProtectedMedia
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        // Sin zoom ni rebote: la película no se mueve por un toque accidental.
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        bounces={false}
        allowsFullscreenVideo
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        originWhitelist={["https://*"]}
      />
    </View>
  );
});
