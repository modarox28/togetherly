import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { storage, SESSION_KEYS } from "@/lib/storage";
import { generateRoomId, isRoomCode } from "@/lib/utils";
import { CHARACTERS } from "@/lib/constants";

// Inicio: tu nombre, tu personaje y crear sala o unirte con el código.
// Si llegas con un enlace de invitación (/j/CODIGO), el código ya viene puesto.
export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(CHARACTERS[0].emoji);
  const [code, setCode] = useState(typeof params.code === "string" ? params.code.toUpperCase() : "");
  const [error, setError] = useState("");

  useEffect(() => {
    storage.get(SESSION_KEYS.username).then((v) => v && setName(v));
    storage.get(SESSION_KEYS.character).then((v) => {
      const found = CHARACTERS.find((c) => c.id === v || c.emoji === v);
      if (found) setAvatar(found.emoji);
    });
  }, []);

  const enter = async (roomId: string) => {
    const cleanName = name.trim();
    if (!cleanName) return setError("Escribe tu nombre para que te reconozcan en la sala");
    if (!isRoomCode(roomId)) return setError("El código de la sala tiene 6 letras o números");
    await storage.set(SESSION_KEYS.username, cleanName.slice(0, 24));
    await storage.set(SESSION_KEYS.character, avatar);
    router.push(`/room/${roomId.toUpperCase()}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#1C1530" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          <View className="items-center mb-8">
            <Text className="text-5xl">🍿</Text>
            <Text className="text-cozy-cream text-3xl font-extrabold mt-2">Togetherly</Text>
            <Text className="text-cozy-muted text-base mt-1 text-center">Vean la misma película, aunque estén lejos</Text>
          </View>

          <Text className="text-cozy-muted text-sm font-bold mb-2">Tu nombre</Text>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              setError("");
            }}
            placeholder="¿Cómo te llamas?"
            placeholderTextColor="#8E80A6"
            maxLength={24}
            className="bg-cozy-plum text-cozy-cream px-4 py-4 rounded-2xl text-base"
          />

          <Text className="text-cozy-muted text-sm font-bold mt-5 mb-2">Tu personaje</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {CHARACTERS.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setAvatar(c.emoji)}
                accessibilityLabel={c.name}
                className={`w-14 h-14 rounded-2xl items-center justify-center ${avatar === c.emoji ? "bg-cozy-lamp" : "bg-cozy-plum"}`}
              >
                <Text className="text-2xl">{c.emoji}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable onPress={() => enter(generateRoomId())} className="bg-cozy-lamp rounded-full py-4 items-center mt-8">
            <Text className="text-cozy-deep font-extrabold text-lg">Crear sala nueva</Text>
          </Pressable>

          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-cozy-card" />
            <Text className="text-cozy-muted mx-3">o únete con un código</Text>
            <View className="flex-1 h-px bg-cozy-card" />
          </View>

          <View className="flex-row gap-3">
            <TextInput
              value={code}
              onChangeText={(v) => {
                setCode(v.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32));
                setError("");
              }}
              placeholder="CÓDIGO"
              placeholderTextColor="#8E80A6"
              autoCapitalize="characters"
              autoCorrect={false}
              className="flex-1 bg-cozy-plum text-cozy-cream px-4 py-4 rounded-2xl text-lg text-center font-bold tracking-widest"
            />
            <Pressable onPress={() => enter(code)} className="bg-cozy-card rounded-2xl px-6 items-center justify-center">
              <Text className="text-cozy-cream font-extrabold">Unirme</Text>
            </Pressable>
          </View>

          {error ? <Text className="text-[#FF9AA2] mt-4 text-center">{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
