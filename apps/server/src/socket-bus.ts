import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@cooked/shared';
import type { RoomBus } from './bus.js';

export type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;

/** Late-bound: the gateway hands over the Socket.IO server in afterInit. */
@Injectable()
export class SocketBus implements RoomBus {
  server?: IoServer;

  emit<K extends keyof ServerToClientEvents>(code: string, ev: K, ...args: Parameters<ServerToClientEvents[K]>): void {
    (this.server?.to(code) as { emit: (ev: string, ...a: unknown[]) => void } | undefined)?.emit(ev, ...args);
  }
}
