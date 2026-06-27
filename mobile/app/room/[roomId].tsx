import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Share, Modal, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StreamingWebView, type StreamingWebViewHandle } from "@/components/StreamingWebView";
import { useRoom } from "@/hooks/useRoom";
import { storage, SESSION_KEYS } from "@/lib/storage";
import { CHARACTERS, STREAMING_PLATFORMS } from "@/lib/constants";

export default function RoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const room = useRoom(roomId);
  const playerRef = useRef<StreamingWebViewHandle>(null);

  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("⚡");
  const [chatText, setChatText] = useState("");
  const [showPlatforms, setShowPlatforms] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  useEffect(() => {
    Promise.all([
      storage.get(SESSION_KEYS.username),
      storage.get(SESSION_KEYS.character),
      storage.get(SESSION_KEYS.roomName),
    ]).then(([name, charId, rName]) => {
      if (name && charId) {
        const char = CHARACTERS.find((c) => c.id === charId);
        const av = char?.emoji ?? "⚡";
        setUsername(name);
        setAvatar(av);
        room.joinRoom(name, av);
        setJoined(true);
      }
    });
  }, [roomId]);

  const handleShare = async () => {
    await Share.share({ message: `Join my Togetherly room! Code: ${roomId}` });
  };

  const handleSendMessage = () => {
    if (!chatText.trim()) return;
    room.sendMessage(chatText.trim());
    setChatText("");
  };

  const handleSelectPlatform = (url: string) => {
    room.changeVideoUrl(url);
    setShowPlatforms(false);
  };

  const handleLoadCustomUrl = () => {
    if (!customUrl.trim()) return;
    room.changeVideoUrl(customUrl.trim());
    setCustomUrl("");
    setShowUrlInput(false);
  };

  if (!joined) {
    return (
      <View className="flex-1 bg-night-950 items-center justify-center">
        <Text className="text-white/40">Joining room...</Text>
      </View>
    );
  }

  const activeUrl = room.state.videoUrl;

  return (
    <View className="flex-1 bg-night-950">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-12 pb-3 bg-night-900 border-b border-white/5">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Text className="text-white/60 text-sm">← Leave</Text>
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-white font-bold font-mono text-sm">{roomId}</Text>
          <Text className="text-white/30 text-xs">{room.state.participants.length} watching</Text>
        </View>
        <TouchableOpacity onPress={handleShare} className="p-1">
          <Text className="text-purple-400 text-sm">Share</Text>
        </TouchableOpacity>
      </View>

      {/* Video / Platform area */}
      <View className="flex-1">
        {activeUrl ? (
          <StreamingWebView
            ref={playerRef}
            url={activeUrl}
            onPlay={room.sendPlay}
            onPause={room.sendPause}
            onSeek={room.sendSeek}
            onRemotePlay={room.onRemotePlay}
            onRemotePause={room.onRemotePause}
            onRemoteSeek={room.onRemoteSeek}
          />
        ) : (
          /* Platform picker */
          <View className="flex-1 items-center justify-center px-6 gap-4">
            <Text className="text-white text-xl font-bold">What do you want to watch?</Text>
            <Text className="text-white/40 text-sm text-center">Choose a platform — you'll log in with your own account</Text>

            <View className="w-full flex-row flex-wrap gap-3 justify-center mt-2">
              {STREAMING_PLATFORMS.map((p) => (
                <TouchableOpacity key={p.id} onPress={() => handleSelectPlatform(p.url)}
                  className="bg-night-800 border border-white/10 rounded-2xl px-5 py-3 items-center w-[45%]"
                  style={{ borderColor: p.color + "40" }}>
                  <Text className="text-white font-semibold text-sm">{p.name}</Text>
                  <View className="w-6 h-1 rounded-full mt-1.5" style={{ backgroundColor: p.color }} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={() => setShowUrlInput(true)}
              className="mt-2 border border-white/10 rounded-xl px-6 py-3">
              <Text className="text-white/50 text-sm">Or enter any URL...</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom bar */}
      <View className="flex-row items-center px-4 py-3 gap-3 bg-night-900 border-t border-white/5">
        {activeUrl && (
          <TouchableOpacity onPress={() => { room.changeVideoUrl(""); }}
            className="bg-night-700 rounded-xl px-3 py-2">
            <Text className="text-white/60 text-xs">Change</Text>
          </TouchableOpacity>
        )}

        {/* Reactions */}
        {(["❤️","😂","😮","👏","🔥"] as const).map((emoji) => (
          <TouchableOpacity key={emoji} onPress={() => room.sendReaction(emoji)}
            className="w-9 h-9 bg-night-700 rounded-full items-center justify-center">
            <Text className="text-base">{emoji}</Text>
          </TouchableOpacity>
        ))}

        <View className="flex-1" />

        <TouchableOpacity onPress={() => setShowChat(true)}
          className="bg-purple-500/20 border border-purple-400/30 rounded-xl px-4 py-2">
          <Text className="text-purple-400 text-sm font-medium">Chat 💬</Text>
        </TouchableOpacity>
      </View>

      {/* Floating reactions */}
      <View className="absolute inset-0 pointer-events-none">
        {room.state.reactions.map((r) => (
          <View key={r.id} className="absolute bottom-20 left-6">
            <Text className="text-4xl">{r.emoji}</Text>
          </View>
        ))}
      </View>

      {/* Custom URL Modal */}
      <Modal visible={showUrlInput} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-night-800 rounded-t-3xl p-6">
            <Text className="text-white font-bold text-lg mb-4">Enter URL</Text>
            <TextInput value={customUrl} onChangeText={setCustomUrl}
              placeholder="https://..." placeholderTextColor="#ffffff40"
              autoFocus keyboardType="url"
              className="bg-night-700 text-white px-4 py-3 rounded-xl mb-4" />
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setShowUrlInput(false)}
                className="flex-1 py-3 rounded-xl items-center bg-night-700">
                <Text className="text-white/60">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLoadCustomUrl}
                className="flex-1 py-3 rounded-xl items-center bg-purple-500">
                <Text className="text-white font-semibold">Load</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Chat Modal */}
      <Modal visible={showChat} transparent animationType="slide">
        <View className="flex-1 bg-night-950/95">
          <View className="flex-row items-center justify-between px-4 pt-12 pb-3 border-b border-white/5">
            <Text className="text-white font-bold text-lg">Chat</Text>
            <TouchableOpacity onPress={() => setShowChat(false)}>
              <Text className="text-white/60">Done</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={room.state.messages}
            keyExtractor={(m) => m.id}
            className="flex-1 px-4 py-2"
            renderItem={({ item: msg }) => (
              <View className={`flex-row gap-2 mb-3 ${msg.userId === room.state.you?.id ? "flex-row-reverse" : ""}`}>
                <Text className="text-xl">{msg.avatar}</Text>
                <View className={`max-w-[70%] px-3 py-2 rounded-2xl ${msg.userId === room.state.you?.id ? "bg-purple-500" : "bg-night-800"}`}>
                  {msg.userId !== room.state.you?.id && (
                    <Text className="text-white/50 text-xs mb-0.5">{msg.name}</Text>
                  )}
                  <Text className="text-white text-sm">{msg.text}</Text>
                </View>
              </View>
            )}
          />

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View className="flex-row gap-2 px-4 py-3 border-t border-white/5">
              <TextInput value={chatText} onChangeText={setChatText}
                placeholder="Message..." placeholderTextColor="#ffffff40"
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
                className="flex-1 bg-night-800 text-white px-4 py-3 rounded-xl text-sm" />
              <TouchableOpacity onPress={handleSendMessage}
                className="bg-purple-500 w-12 rounded-xl items-center justify-center">
                <Text className="text-white text-lg">↑</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
