import type { ServerToClientEvents } from '@cooked/shared';

/** What the engine needs from Socket.IO. A fake in tests, `io.to(code).emit` in prod. */
export interface RoomBus {
  emit<K extends keyof ServerToClientEvents>(code: string, ev: K, ...args: Parameters<ServerToClientEvents[K]>): void;
}
