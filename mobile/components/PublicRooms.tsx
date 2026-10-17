import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SOCKET_URL, STREAMING_PLATFORMS } from "@/lib/constants";
import { isRoomCode } from "@/lib/utils";

// "Salas públicas": las mismas que muestra la web en /discover (GET /api/rooms del servidor).
interface PublicRoom {
  id: string;
  name: string;
  participants: number;
  host: string | null;
  platform: string;
}

const PLATFORM_NAMES: Record<string, string> = {
  ...Object.fromEntries(STREAMING_PLATFORMS.map((p) => [p.id, p.name])),
  youtube: "YouTube",
  twitch: "Twitch",
  vimeo: "Vimeo",
  spotify: "Spotify",
};

const clean = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

function parseRooms(data: unknown): PublicRoom[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((r) => {
      const room = (r ?? {}) as Record<string, unknown>;
      const id = clean(room.id, 32);
      if (!isRoomCode(id)) return null;
      return {
        id,
        name: clean(room.name, 40) || id,
        participants: typeof room.participants === "number" ? Math.max(0, Math.min(99, room.participants)) : 0,
        host: clean(room.host, 24) || null,
        platform: clean(room.platform, 20),
      };
    })
    .filter((r): r is PublicRoom => r !== null)
    .slice(0, 30);
}

export function PublicRooms({ onJoin }: { onJoin: (roomId: string) => void }) {
  const [rooms, setRooms] = useState<PublicRoom[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`${SOCKET_URL}/api/rooms`)
        .then((r) => r.json())
        .then((data) => {
          if (!alive) return;
          setRooms(parseRooms(data));
          setFailed(false);
        })
        .catch(() => alive && setFailed(true));
    load();
    const timer = setInterval(load, 15000); // se actualiza sola
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <View className="mt-8">
      <Text className="text-cozy-cream text-lg font-extrabold mb-1">Salas públicas</Text>
      <Text className="text-cozy-muted text-sm mb-3">Únete a ver algo con otras personas.</Text>
      {rooms === null && !failed ? <ActivityIndicator color="#FFC965" /> : null}
      {failed && !rooms ? (
        <Text className="text-cozy-muted text-sm">No se pudo cargar la lista. El servidor puede estar despertando; intenta en un momento.</Text>
      ) : null}
      {rooms && rooms.length === 0 ? (
        <Text className="text-cozy-muted text-sm">No hay salas públicas ahora. ¡Crea una!</Text>
      ) : null}
      {rooms?.map((room) => (
        <Pressable key={room.id} onPress={() => onJoin(room.id)} className="bg-cozy-plum rounded-2xl px-4 py-3 mb-2 flex-row items-center">
          <View className="flex-1">
            <Text className="text-cozy-cream font-bold" numberOfLines={1}>
              {room.name}
            </Text>
            <Text className="text-cozy-muted text-xs mt-0.5">
              {PLATFORM_NAMES[room.platform] ?? "Video"} · {room.participants} {room.participants === 1 ? "persona" : "personas"}
              {room.host ? ` · 👑 ${room.host}` : ""}
            </Text>
          </View>
          <Text className="text-cozy-lamp font-extrabold">Entrar</Text>
        </Pressable>
      ))}
    </View>
  );
}
