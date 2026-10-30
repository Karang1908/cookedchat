import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { Room } from './room.js';
import { STORE } from './tokens.js';
import type { Store } from './store.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function normalizeCode(code: unknown): string | null {
  const c = typeof code === 'string' ? code.trim().toUpperCase() : '';
  return /^[A-Z]{4}$/.test(c) ? c : null;
}

@Injectable()
export class RoomsService implements OnModuleDestroy {
  private readonly rooms = new Map<string, Room>();

  constructor(@Inject(STORE) private readonly store: Store) {}

  all(): Room[] {
    return [...this.rooms.values()];
  }

  /** memory first, then the database (a Render restart wipes memory) */
  async ensure(code: string): Promise<Room | null> {
    const hit = this.rooms.get(code);
    if (hit) return hit;
    const loaded = await this.store.loadRoom(code);
    if (!loaded) return null;
    // another socket may have hydrated the same room while we awaited
    return this.rooms.get(code) ?? (this.rooms.set(code, loaded), loaded);
  }

  async create(tzOffsetMin: number): Promise<Room> {
    const tz = Number.isFinite(tzOffsetMin) ? Math.max(-840, Math.min(840, Math.round(tzOffsetMin))) : 0;
    for (let i = 0; i < 20; i++) {
      const code = Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
      if (this.rooms.has(code) || (await this.store.loadRoom(code))) continue;
      const room = new Room(code, tz);
      this.rooms.set(code, room);
      this.store.saveRoom(room);
      return room;
    }
    throw new Error('could not allocate a room code');
  }

  get persistent(): boolean {
    return this.store.persistent;
  }

  /** Drops an idle room from memory. With a database it is reloaded on the next join; without one it is gone for good. */
  evict(room: Room): void {
    if (room.extrasDirty) this.store.saveExtras(room);
    this.rooms.delete(room.code);
  }

  async onModuleDestroy() {
    await this.store.close();
  }
}
