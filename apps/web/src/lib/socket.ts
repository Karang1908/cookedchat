import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@cooked/shared';
import { serverUrl } from './config';

export type CookedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** websocket only: Render holds one instance, so there is no sticky-session problem with polling, and one less round trip. */
export function createSocket(): CookedSocket {
  return io(serverUrl(), { transports: ['websocket'], reconnectionDelayMax: 3000 });
}
