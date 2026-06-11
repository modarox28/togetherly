import { RoomClientPage } from "@/components/room/RoomClientPage";

interface PageProps {
  params: Promise<{ roomId: string }>;
}

export default async function WatchRoomPage({ params }: PageProps) {
  const { roomId } = await params;
  return <RoomClientPage roomId={roomId.toUpperCase()} />;
}
