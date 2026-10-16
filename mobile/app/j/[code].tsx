import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { storage, SESSION_KEYS } from "@/lib/storage";
import { isRoomCode } from "@/lib/utils";

// Enlace de invitación dentro de la app (togetherly://j/CODIGO):
// si ya sabemos tu nombre, entras directo a la sala; si no, te lo pide con el código puesto.
export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();

  useEffect(() => {
    const roomId = String(code ?? "").toUpperCase();
    storage.get(SESSION_KEYS.username).then((name) => {
      if (name && isRoomCode(roomId)) router.replace(`/room/${roomId}`);
      else router.replace({ pathname: "/", params: { code: roomId } });
    });
  }, [code, router]);

  return (
    <View className="flex-1 bg-cozy-deep items-center justify-center">
      <ActivityIndicator color="#FFC965" />
    </View>
  );
}
