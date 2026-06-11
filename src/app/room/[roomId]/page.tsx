import type { Metadata } from "next";
import { RoomClientPage } from "@/components/room/RoomClientPage";

interface PageProps {
  params: Promise<{ roomId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { roomId } = await params;
  const id = roomId.toUpperCase();
  return {
    title: `Room ${id} — Togetherly`,
    description: `Join room ${id} on Togetherly and watch together in perfect sync.`,
    openGraph: {
      title: `Room ${id} — Togetherly`,
      description: `Join room ${id} on Togetherly and watch together in perfect sync.`,
    },
  };
}

export default async function WatchRoomPage({ params }: PageProps) {
  const { roomId } = await params;
  return <RoomClientPage roomId={roomId.toUpperCase()} />;
}
