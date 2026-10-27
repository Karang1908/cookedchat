import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Engine } from './engine.js';
import { RoomsService } from './rooms.service.js';

const ACTIVE_WINDOW_MS = 5 * 60_000;

@Injectable()
export class GameLoop implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('GameLoop');
  private timer?: NodeJS.Timeout;

  constructor(@Inject(Engine) private readonly engine: Engine, @Inject(RoomsService) private readonly rooms: RoomsService) {}

  onModuleInit() {
    this.timer = setInterval(() => this.tickAll(), 1000);
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  tickAll(): void {
    for (const room of this.rooms.all()) {
      const humanOnline = [...room.members.values()].some((m) => m.online && !m.isBot);
      if (!humanOnline && Date.now() - room.lastActiveAt > ACTIVE_WINDOW_MS) continue;
      try {
        this.engine.tick(room);
      } catch (e) {
        // one broken room must not stop everyone else's clock
        this.log.error(`tick failed for ${room.code}: ${(e as Error).stack}`);
      }
    }
  }
}
