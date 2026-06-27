import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { storage, SESSION_KEYS } from "@/lib/storage";
import { generateRoomId } from "@/lib/utils";
import { CHARACTERS } from "@/lib/constants";

type Tab = "create" | "join";
type Step = "info" | "character";

export default function HomeScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("create");
  const [step, setStep] = useState<Step>("info");
  const [username, setUsername] = useState("");
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    storage.get(SESSION_KEYS.username).then((v) => { if (v) setUsername(v); });
  }, []);

  const handleNext = () => {
    if (!username.trim()) { setError("Enter your name"); return; }
    if (tab === "join" && joinCode.length !== 6) { setError("Enter a 6-character room code"); return; }
    setError("");
    setStep("character");
  };

  const handleEnter = async () => {
    if (!selectedChar) { setError("Choose a character"); return; }
    const char = CHARACTERS.find((c) => c.id === selectedChar)!;
    await storage.set(SESSION_KEYS.username, username.trim());
    await storage.set(SESSION_KEYS.character, selectedChar);
    await storage.set(SESSION_KEYS.roomName, roomName.trim() || `${username.trim()}'s room`);
    const roomId = tab === "create" ? generateRoomId() : joinCode.trim().toUpperCase();
    router.push(`/room/${roomId}`);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-night-950">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 items-center justify-center px-6 py-12">
          {/* Logo */}
          <View className="items-center mb-8">
            <View className="w-14 h-14 rounded-2xl bg-purple-500 items-center justify-center mb-3">
              <Text className="text-2xl">❤️</Text>
            </View>
            <Text className="text-white text-2xl font-bold">Togetherly</Text>
            <Text className="text-white/40 text-sm mt-1">Watch together, feel closer</Text>
          </View>

          <View className="w-full bg-night-800 rounded-3xl overflow-hidden">
            {step === "info" ? (
              <>
                {/* Tabs */}
                <View className="flex-row border-b border-white/5">
                  {(["create", "join"] as Tab[]).map((t) => (
                    <TouchableOpacity key={t} onPress={() => { setTab(t); setError(""); }}
                      className={`flex-1 py-4 items-center ${tab === t ? "border-b-2 border-purple-400" : ""}`}>
                      <Text className={`font-medium text-sm ${tab === t ? "text-purple-400" : "text-white/40"}`}>
                        {t === "create" ? "Create room" : "Join room"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View className="p-6 gap-4">
                  <View>
                    <Text className="text-white/60 text-xs mb-1.5">Your name</Text>
                    <TextInput value={username} onChangeText={(v) => { setUsername(v); setError(""); }}
                      placeholder="Enter your name" placeholderTextColor="#ffffff40"
                      maxLength={20}
                      className="bg-night-700 text-white px-4 py-3 rounded-xl text-sm" />
                  </View>

                  {tab === "create" ? (
                    <View>
                      <Text className="text-white/60 text-xs mb-1.5">Room name (optional)</Text>
                      <TextInput value={roomName} onChangeText={setRoomName}
                        placeholder="My cozy room" placeholderTextColor="#ffffff40"
                        maxLength={30}
                        className="bg-night-700 text-white px-4 py-3 rounded-xl text-sm" />
                    </View>
                  ) : (
                    <View>
                      <Text className="text-white/60 text-xs mb-1.5">Room code</Text>
                      <TextInput value={joinCode} onChangeText={(v) => { setJoinCode(v.toUpperCase().slice(0, 6)); setError(""); }}
                        placeholder="ABC123" placeholderTextColor="#ffffff40"
                        autoCapitalize="characters" maxLength={6}
                        className="bg-night-700 text-white px-4 py-3 rounded-xl text-sm text-center font-mono tracking-widest text-lg" />
                    </View>
                  )}

                  {error ? <Text className="text-red-400 text-xs">{error}</Text> : null}

                  <TouchableOpacity onPress={handleNext}
                    className="bg-purple-500 py-4 rounded-xl items-center mt-1">
                    <Text className="text-white font-semibold">
                      {tab === "create" ? "Create room →" : "Join room →"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View className="p-6">
                <TouchableOpacity onPress={() => setStep("info")} className="mb-5">
                  <Text className="text-white/40 text-sm">← Back</Text>
                </TouchableOpacity>
                <Text className="text-white font-bold text-lg mb-1">Choose your character</Text>
                <Text className="text-white/40 text-sm mb-5">This is how others will see you</Text>

                <View className="flex-row flex-wrap gap-2 mb-5">
                  {CHARACTERS.map((c) => (
                    <TouchableOpacity key={c.id} onPress={() => { setSelectedChar(c.id); setError(""); }}
                      className={`w-[22%] items-center p-2 rounded-xl border-2 ${selectedChar === c.id ? "border-purple-400 bg-purple-400/10" : "border-transparent bg-night-700"}`}>
                      <Text className="text-2xl">{c.emoji}</Text>
                      <Text className="text-white/60 text-[10px] mt-1 text-center">{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {error ? <Text className="text-red-400 text-xs mb-3">{error}</Text> : null}

                <TouchableOpacity onPress={handleEnter}
                  className={`py-4 rounded-xl items-center ${selectedChar ? "bg-purple-500" : "bg-night-700"}`}
                  disabled={!selectedChar}>
                  <Text className="text-white font-semibold">❤️ Enter room</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
