import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";

export interface StreamingWebViewHandle {
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
}

interface Props {
  url: string;
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onSeek: (time: number) => void;
  onRemotePlay: (cb: (t: number) => void) => void;
  onRemotePause: (cb: (t: number) => void) => void;
  onRemoteSeek: (cb: (t: number) => void) => void;
}

// JavaScript injected into every streaming page to hook video playback
const INJECT_JS = `
(function() {
  let video = null;
  let lastSentTime = -1;
  let isSyncing = false;

  function findVideo() {
    const v = document.querySelector('video');
    if (v && v !== video) {
      video = v;
      attachListeners();
    }
  }

  function attachListeners() {
    video.addEventListener('play', () => {
      if (isSyncing) return;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'play', time: video.currentTime }));
    });
    video.addEventListener('pause', () => {
      if (isSyncing) return;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pause', time: video.currentTime }));
    });
    video.addEventListener('seeked', () => {
      if (isSyncing) return;
      const t = video.currentTime;
      if (Math.abs(t - lastSentTime) > 1) {
        lastSentTime = t;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'seek', time: t }));
      }
    });
  }

  // Poll for video element (streaming sites load it dynamically)
  setInterval(findVideo, 1000);
  findVideo();

  // Receive commands from React Native
  window.addEventListener('message', function(e) {
    try {
      const msg = JSON.parse(e.data);
      if (!video) { findVideo(); if (!video) return; }
      isSyncing = true;
      if (msg.type === 'play') {
        if (Math.abs(video.currentTime - msg.time) > 1) video.currentTime = msg.time;
        video.play().catch(() => {});
      } else if (msg.type === 'pause') {
        if (Math.abs(video.currentTime - msg.time) > 1) video.currentTime = msg.time;
        video.pause();
      } else if (msg.type === 'seek') {
        video.currentTime = msg.time;
      }
      setTimeout(() => { isSyncing = false; }, 500);
    } catch(e) {}
  });
})();
true;
`;

export const StreamingWebView = forwardRef<StreamingWebViewHandle, Props>(
  ({ url, onPlay, onPause, onSeek, onRemotePlay, onRemotePause, onRemoteSeek }, ref) => {
    const webViewRef = useRef<WebView>(null);

    const postMessage = (msg: object) => {
      webViewRef.current?.postMessage(JSON.stringify(msg));
    };

    useImperativeHandle(ref, () => ({
      play: () => postMessage({ type: "play" }),
      pause: () => postMessage({ type: "pause" }),
      seekTo: (time: number) => postMessage({ type: "seek", time }),
    }));

    useEffect(() => {
      onRemotePlay((time) => postMessage({ type: "play", time }));
      onRemotePause((time) => postMessage({ type: "pause", time }));
      onRemoteSeek((time) => postMessage({ type: "seek", time }));
    }, []);

    const handleMessage = (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === "play") onPlay(msg.time);
        else if (msg.type === "pause") onPause(msg.time);
        else if (msg.type === "seek") onSeek(msg.time);
      } catch {}
    };

    return (
      <View className="flex-1">
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          className="flex-1"
          injectedJavaScript={INJECT_JS}
          onMessage={handleMessage}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        />
      </View>
    );
  }
);
