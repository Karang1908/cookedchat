import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@cooked/shared';
import { SERVER_URL } from './config';

export type CookedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** websocket only: Render holds one instance, so there is no sticky-session problem with polling, and one less round trip. */
export function createSocket(): CookedSocket {
  return io(SERVER_URL, { transports: ['websocket'], reconnectionDelayMax: 3000 });
}
