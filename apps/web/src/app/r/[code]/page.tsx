'use client';

import { useParams } from 'next/navigation';
import { RoomView } from '@/components/room/room-view';

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  return <RoomView code={String(code).toUpperCase()} />;
}
