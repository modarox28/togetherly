import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, FlatList, TextInput, Modal, KeyboardAvoidingView, Platform, Share, Animated } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StreamingWebView, type StreamingWebViewHandle, type EngineEvent } from "@/components/StreamingWebView";
import { useRoom, type PlayerOrder } from "@/hooks/useRoom";
import { storage, SESSION_KEYS } from "@/lib/storage";
import { REACTIONS, STREAMING_PLATFORMS, inviteUrl } from "@/lib/constants";

const platformName = (id: string) => STREAMING_PLATFORMS.find((p) => p.id === id)?.name ?? "streaming";
const samePage = (a: string | null, b: string | null) => {
  if (!a || !b) return false;
  try {
    const x = new URL(a);
    const y = new URL(b);
    return x.hostname.replace(/^www\./, "") === y.hostname.replace(/^www\./, "") && x.pathname === y.pathname;
  } catch {
    return false;
  }
};

export default function RoomScreen() {
  const { roomId: rawRoomId } = useLocalSearchParams<{ roomId: string }>();
  const roomId = String(rawRoomId ?? "").toUpperCase();
  const router = useRouter();
  const player = useRef<StreamingWebViewHandle>(null);

  const [me, setMe] = useState<{ name: string; avatar: string } | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [myWatching, setMyWatching] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [seenOthers, setSeenOthers] = useState(0);
  const [draft, setDraft] = useState("");
  const autoOpened = useRef(false);
  const drmShown = useRef(false);
  const [drm, setDrm] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([storage.get(SESSION_KEYS.username), storage.get(SESSION_KEYS.character)]).then(([name, avatar]) => {
      if (!name) router.replace({ pathname: "/", params: { code: roomId } });
      else setMe({ name, avatar: avatar && avatar.length <= 8 ? avatar : "🍿" });
    });
  }, [roomId, router]);

  const onOrder = useCallback((order: PlayerOrder) => player.current?.apply(order), []);
  const room = useRoom(roomId, me?.name ?? "", me?.avatar ?? "🍿", onOrder);

  // Como el enlace de invitación: si la sala ya está viendo algo, entras directo a esa película.
  useEffect(() => {
    if (room.nowWatching && !url && !autoOpened.current) {
      autoOpened.current = true;
      setUrl(room.nowWatching.url);
    }
  }, [room.nowWatching, url]);

  // Mensajes de los demás que llegaron sin tener el chat abierto
  const othersCount = room.messages.filter((m) => !m.mine).length;
  const unread = chatOpen ? 0 : Math.max(0, othersCount - seenOthers);

  const onEngineEvent = (event: EngineEvent) => {
    if (event.type === "play" || event.type === "pause" || event.type === "seek") room.sendPlayback(event.type, event.time);
    else if (event.type === "watching") {
      setMyWatching(event.url);
      room.sendWatching(event.url);
    } else if (event.type === "video" && event.found) room.requestState(); // entraste tarde: ponte al día
    else if (event.type === "drm" && !drmShown.current) {
      // Diagnóstico de la prueba: qué protección de video tiene el navegador interno de este celular.
      drmShown.current = true;
      setDrm(`Protección de video · Widevine: ${event.widevine ? "sí" : "no"} · FairPlay: ${event.fairplay ? "sí" : "no"}`);
    }
  };

  const closeChat = () => {
    setChatOpen(false);
    setSeenOthers(othersCount);
  };

  const share = () =>
    Share.share({ message: `Veamos juntos en Togetherly 🍿 Entra aquí: ${inviteUrl(roomId)} (código ${roomId})` });

  const otherMovie = room.nowWatching && url && myWatching && !samePage(room.nowWatching.url, myWatching) ? room.nowWatching : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#1C1530" }} edges={["top", "bottom"]}>
      {/* Barra superior */}
      <View className="flex-row items-center px-3 py-2 gap-2">
        <Pressable onPress={() => router.replace("/")} className="px-3 py-2" accessibilityLabel="Salir de la sala">
          <Text className="text-cozy-muted text-base">✕</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-cozy-cream font-extrabold">Sala {roomId}</Text>
          <Text className="text-cozy-muted text-xs">
            {room.connected ? `${room.members.length} ${room.members.length === 1 ? "persona" : "personas"}` : "Conectando…"}
            {room.controlMode === "leader" && room.leader ? ` · 👑 controla ${room.leader}` : ""}
          </Text>
        </View>
        {url ? (
          <Pressable onPress={() => setUrl(null)} className="bg-cozy-plum rounded-full px-3 py-2">
            <Text className="text-cozy-cream text-xs font-bold">Cambiar</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={share} className="bg-cozy-lamp rounded-full px-4 py-2">
          <Text className="text-cozy-deep font-extrabold text-sm">Invitar</Text>
        </Pressable>
      </View>

      {drm ? (
        <Pressable onPress={() => setDrm(null)} className="mx-3 mb-2 bg-cozy-plum rounded-xl px-3 py-2">
          <Text className="text-cozy-muted text-xs">{drm} (toca para ocultar)</Text>
        </Pressable>
      ) : null}

      {otherMovie ? (
        <Pressable
          onPress={() => setUrl(otherMovie.url)}
          className="mx-3 mb-2 bg-cozy-card rounded-2xl px-4 py-3 flex-row items-center"
        >
          <Text className="text-cozy-cream flex-1">
            🎬 {otherMovie.by} está viendo otra cosa en {platformName(otherMovie.platform)}
          </Text>
          <Text className="text-cozy-lamp font-extrabold">Ir</Text>
        </Pressable>
      ) : null}

      {/* Película o elegir plataforma */}
      <View className="flex-1">
        {url ? (
          <StreamingWebView key={url} ref={player} url={url} onEvent={onEngineEvent} />
        ) : (
          <View className="flex-1 px-5 justify-center">
            <Text className="text-cozy-cream text-2xl font-extrabold text-center">¿Qué van a ver?</Text>
            <Text className="text-cozy-muted text-center mt-2 mb-6">
              Entra con tu propia cuenta. Cuando alguien da play, pausa o adelanta, a todos les pasa lo mismo.
            </Text>
            {room.nowWatching ? (
              <Pressable onPress={() => setUrl(room.nowWatching!.url)} className="bg-cozy-lamp rounded-2xl p-4 mb-5">
                <Text className="text-cozy-deep font-extrabold text-base">
                  Ir a lo que está viendo {room.nowWatching.by} en {platformName(room.nowWatching.platform)} →
                </Text>
              </Pressable>
            ) : null}
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {STREAMING_PLATFORMS.map((p) => (
                <Pressable key={p.id} onPress={() => setUrl(p.url)} className="w-[48%] bg-cozy-plum rounded-2xl py-5 items-center">
                  <View className="w-8 h-1.5 rounded-full mb-2" style={{ backgroundColor: p.color }} />
                  <Text className="text-cozy-cream font-bold">{p.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        <Notice text={room.notice?.text} id={room.notice?.id} />
        <FloatingReaction emoji={room.reaction?.emoji} id={room.reaction?.id} />
      </View>

      {/* Reacciones y chat */}
      <View className="flex-row items-center px-3 py-2 gap-2">
        {REACTIONS.slice(0, 4).map((emoji) => (
          <Pressable key={emoji} onPress={() => room.sendReaction(emoji)} className="w-10 h-10 rounded-full bg-cozy-plum items-center justify-center">
            <Text className="text-lg">{emoji}</Text>
          </Pressable>
        ))}
        <View className="flex-1" />
        <Pressable
          onPress={() => {
            setChatOpen(true);
            setSeenOthers(othersCount);
          }}
          className="bg-cozy-lamp rounded-full px-5 py-3 flex-row items-center gap-2"
        >
          <Text className="text-cozy-deep font-extrabold">Chat</Text>
          {unread > 0 ? (
            <View className="bg-cozy-deep rounded-full px-2">
              <Text className="text-cozy-lamp text-xs font-extrabold">{unread > 9 ? "9+" : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <Modal visible={chatOpen} animationType="slide" transparent onRequestClose={closeChat}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 justify-end bg-black/40">
          <View className="bg-cozy-deep rounded-t-3xl h-[70%] pb-6">
            <View className="flex-row items-center px-5 pt-4 pb-2">
              <Text className="text-cozy-cream font-extrabold text-lg flex-1">Chat de la sala</Text>
              <Pressable onPress={closeChat} className="px-2 py-1">
                <Text className="text-cozy-muted text-base">Cerrar</Text>
              </Pressable>
            </View>

            <View className="flex-row flex-wrap gap-2 px-5 pb-2">
              {room.members.map((m) => (
                <View key={m.name} className="flex-row items-center bg-cozy-plum rounded-full px-3 py-1">
                  <Text>{m.avatar} </Text>
                  <Text className="text-cozy-cream text-xs font-bold">
                    {m.name}
                    {m.leader ? " 👑" : ""}
                  </Text>
                </View>
              ))}
            </View>

            {room.isLeader ? (
              <View className="flex-row items-center px-5 pb-2 gap-2">
                <Text className="text-cozy-muted text-xs flex-1">¿Quién controla play y pausa?</Text>
                {(["all", "leader"] as const).map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() => room.setControl(mode)}
                    className={`rounded-full px-3 py-1.5 ${room.controlMode === mode ? "bg-cozy-lamp" : "bg-cozy-plum"}`}
                  >
                    <Text className={`text-xs font-bold ${room.controlMode === mode ? "text-cozy-deep" : "text-cozy-cream"}`}>
                      {mode === "all" ? "Todos" : "Solo yo"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <FlatList
              data={room.messages}
              keyExtractor={(m) => m.id}
              className="flex-1 px-5"
              ListEmptyComponent={<Text className="text-cozy-muted text-center mt-8">Escribe algo para saludar 👋</Text>}
              renderItem={({ item }) => (
                <View className={`flex-row gap-2 my-1 ${item.mine ? "flex-row-reverse" : ""}`}>
                  <Text className="text-lg">{item.avatar}</Text>
                  <View className={`max-w-[78%] rounded-2xl px-3 py-2 ${item.mine ? "bg-cozy-lamp" : "bg-cozy-plum"}`}>
                    {!item.mine ? <Text className="text-cozy-muted text-xs font-bold">{item.name}</Text> : null}
                    {/* Texto plano: nunca se interpreta como código ni enlace */}
                    <Text className={item.mine ? "text-cozy-deep" : "text-cozy-cream"}>{item.text}</Text>
                  </View>
                </View>
              )}
            />

            <View className="flex-row gap-2 px-5 pt-2">
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Escribe un mensaje…"
                placeholderTextColor="#8E80A6"
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={() => {
                  room.sendChat(draft);
                  setDraft("");
                }}
                className="flex-1 bg-cozy-plum text-cozy-cream rounded-full px-4 py-3"
              />
              <Pressable
                onPress={() => {
                  room.sendChat(draft);
                  setDraft("");
                }}
                className="bg-cozy-lamp rounded-full w-12 items-center justify-center"
                accessibilityLabel="Enviar"
              >
                <Text className="text-cozy-deep font-extrabold text-lg">↑</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/** Aviso corto arriba de la película: "Ana pausó", "Solo Ana controla…". */
function Notice({ text, id }: { text?: string; id?: number }) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!text) return;
    opacity.setValue(1);
    Animated.timing(opacity, { toValue: 0, duration: 600, delay: 2200, useNativeDriver: true }).start();
  }, [id, text, opacity]);
  if (!text) return null;
  return (
    <Animated.View pointerEvents="none" style={{ opacity, position: "absolute", top: 12, left: 0, right: 0, alignItems: "center" }}>
      <View className="bg-cozy-deep/90 rounded-full px-4 py-2">
        <Text className="text-cozy-cream font-bold">{text}</Text>
      </View>
    </Animated.View>
  );
}

/** Reacción que sube por la pantalla cuando alguien la manda. */
function FloatingReaction({ emoji, id }: { emoji?: string; id?: number }) {
  const [rise] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!emoji) return;
    rise.setValue(0);
    Animated.timing(rise, { toValue: 1, duration: 2400, useNativeDriver: true }).start();
  }, [id, emoji, rise]);
  if (!emoji) return null;
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [0, -220] });
  const opacity = rise.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
  return (
    <Animated.Text pointerEvents="none" style={{ position: "absolute", right: 28, bottom: 20, fontSize: 40, opacity, transform: [{ translateY }] }}>
      {emoji}
    </Animated.Text>
  );
}
