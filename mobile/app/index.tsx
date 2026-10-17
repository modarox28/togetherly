import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { storage, SESSION_KEYS } from "@/lib/storage";
import { generateRoomId, isRoomCode } from "@/lib/utils";
import { CHARACTERS, SOCKET_URL } from "@/lib/constants";
import { PublicRooms } from "@/components/PublicRooms";
import { acceptTerms, hasAcceptedTerms } from "@/lib/terms";
import { API_URL } from "@/lib/constants";

// Inicio: tu nombre, tu personaje y crear sala o unirte con el código.
// Si llegas con un enlace de invitación (/j/CODIGO), el código ya viene puesto.
export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; aviso?: string }>();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(CHARACTERS[0].emoji);
  const [code, setCode] = useState(typeof params.code === "string" ? params.code.toUpperCase() : "");
  const [error, setError] = useState(typeof params.aviso === "string" ? params.aviso.slice(0, 120) : "");
  const [isPublic, setIsPublic] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [checking, setChecking] = useState(false);
  // Edad mínima (18) y términos: se aceptan una vez antes de crear o entrar a una sala.
  const [termsOk, setTermsOk] = useState(true);
  const [termsChecked, setTermsChecked] = useState(false);
  useEffect(() => {
    hasAcceptedTerms().then(setTermsOk);
  }, []);
  const needTerms = () => {
    if (termsOk) return false;
    if (!termsChecked) {
      setError("Confirma que tienes 18 años o más y aceptas los términos.");
      return true;
    }
    acceptTerms();
    setTermsOk(true);
    return false;
  };

  /** true/false si la sala existe; null si el servidor no respondió (Render gratis tarda en despertar). */
  const roomExists = async (id: string): Promise<boolean | null> => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      const response = await fetch(`${SOCKET_URL}/api/rooms/${encodeURIComponent(id)}`, { signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) return null;
      return (await response.json())?.exists === true;
    } catch {
      return null;
    }
  };

  // Unirse: la sala tiene que existir. Antes, un código cualquiera creaba una sala vacía.
  const join = async (roomId: string) => {
    const id = roomId.trim().toUpperCase();
    if (!name.trim()) return setError("Escribe tu nombre para que te reconozcan en la sala");
    if (needTerms()) return;
    if (!isRoomCode(id)) return setError("El código de la sala tiene 6 letras o números");
    setChecking(true);
    setError("");
    const exists = await roomExists(id);
    setChecking(false);
    if (exists === false) return setError("No hay ninguna sala con ese código. Revisa que esté bien escrito.");
    if (exists === null) return setError("No pude revisar el código (el servidor puede estar despertando). Intenta de nuevo en unos segundos.");
    enter(id);
  };

  useEffect(() => {
    storage.get(SESSION_KEYS.username).then((v) => v && setName(v));
    storage.get(SESSION_KEYS.character).then((v) => {
      const found = CHARACTERS.find((c) => c.id === v || c.emoji === v);
      if (found) setAvatar(found.emoji);
    });
  }, []);

  const enter = async (roomId: string, makePublic = false) => {
    const cleanName = name.trim();
    if (!cleanName) return setError("Escribe tu nombre para que te reconozcan en la sala");
    if (needTerms()) return;
    if (!isRoomCode(roomId)) return setError("El código de la sala tiene 6 letras o números");
    await storage.set(SESSION_KEYS.username, cleanName.slice(0, 24));
    await storage.set(SESSION_KEYS.character, avatar);
    const id = roomId.toUpperCase();
    if (makePublic) {
      router.push({ pathname: "/room/[roomId]", params: { roomId: id, pub: "1", rname: roomName.trim().slice(0, 40) || `Sala de ${cleanName}` } });
    } else router.push(`/room/${id}`);
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

          {!termsOk ? (
            <Pressable
              onPress={() => setTermsChecked((v) => !v)}
              className="flex-row items-start mt-6 gap-3"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsChecked }}
            >
              <View className={`w-6 h-6 rounded-md items-center justify-center mt-0.5 ${termsChecked ? "bg-cozy-lamp" : "bg-cozy-card"}`}>
                {termsChecked ? <Text className="text-cozy-deep font-extrabold">✓</Text> : null}
              </View>
              <Text className="text-cozy-cream flex-1 text-sm leading-5">
                Tengo 18 años o más y acepto los{" "}
                <Text className="text-cozy-lamp font-bold underline" onPress={() => Linking.openURL(`${API_URL}/terminos`)}>
                  Términos de uso
                </Text>{" "}
                y la{" "}
                <Text className="text-cozy-lamp font-bold underline" onPress={() => Linking.openURL(`${API_URL}/privacidad`)}>
                  Privacidad
                </Text>
                .
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => setIsPublic((v) => !v)}
            className="flex-row items-center mt-6 gap-3"
            accessibilityRole="switch"
            accessibilityState={{ checked: isPublic }}
          >
            <View className={`w-12 h-7 rounded-full justify-center px-1 ${isPublic ? "bg-cozy-lamp" : "bg-cozy-card"}`}>
              <View className={`w-5 h-5 rounded-full bg-cozy-deep ${isPublic ? "self-end" : "self-start"}`} />
            </View>
            <Text className="text-cozy-cream flex-1">Sala pública (cualquiera puede verla y entrar)</Text>
          </Pressable>
          {isPublic ? (
            <TextInput
              value={roomName}
              onChangeText={setRoomName}
              placeholder="Nombre de la sala (ej. Noche de terror)"
              placeholderTextColor="#8E80A6"
              maxLength={40}
              className="bg-cozy-plum text-cozy-cream px-4 py-3 rounded-2xl text-base mt-3"
            />
          ) : null}

          <Pressable onPress={() => enter(generateRoomId(), isPublic)} className="bg-cozy-lamp rounded-full py-4 items-center mt-5">
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
            <Pressable onPress={() => join(code)} disabled={checking} className="bg-cozy-card rounded-2xl px-6 items-center justify-center">
              <Text className="text-cozy-cream font-extrabold">{checking ? "Revisando…" : "Unirme"}</Text>
            </Pressable>
          </View>

          {error ? <Text className="text-[#FF9AA2] mt-4 text-center">{error}</Text> : null}

          <PublicRooms onJoin={(id) => join(id)} />

          <Text className="text-cozy-muted text-xs text-center mt-10 leading-5">
            <Text className="underline" onPress={() => Linking.openURL(`${API_URL}/terminos`)}>Términos</Text> ·{" "}
            <Text className="underline" onPress={() => Linking.openURL(`${API_URL}/privacidad`)}>Privacidad</Text>
            {"\n"}Togetherly no está afiliado a Netflix, Disney+ ni otras plataformas. Cada persona ve con su propia
            suscripción.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
