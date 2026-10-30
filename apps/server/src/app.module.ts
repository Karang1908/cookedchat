import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway.js';
import { loadConfig } from './config.js';
import type { Config } from './config.js';
import { Engine } from './engine.js';
import { GameLoop } from './game-loop.js';
import { HealthController } from './health.controller.js';
import { GiphyFinder } from './features/gif.js';
import { LlmCommentator, buildRouter } from './llm/factory.js';
import type { LlmRouter } from './llm/router.js';
import { RoomsService } from './rooms.service.js';
import { SocketBus } from './socket-bus.js';
import { NullStore, PgStore } from './store.js';
import type { Store } from './store.js';
import { CONFIG, STORE } from './tokens.js';

const ROUTER = Symbol('ROUTER');

@Module({
  controllers: [HealthController],
  providers: [
    { provide: CONFIG, useFactory: () => loadConfig() },
    { provide: STORE, useFactory: (c: Config): Store => (c.databaseUrl ? new PgStore(c.databaseUrl, c.databaseSsl) : new NullStore()), inject: [CONFIG] },
    { provide: ROUTER, useFactory: (c: Config) => buildRouter(c), inject: [CONFIG] },
    SocketBus,
    { provide: Engine, useFactory: (bus: SocketBus, store: Store, router: LlmRouter, c: Config) => new Engine({ bus, store, writer: new LlmCommentator(router), typingMs: (t) => Math.min(2600, 700 + t.length * 20), beatMs: 3500, gifs: c.giphyKey ? new GiphyFinder(c.giphyKey, fetch, c.giphyBase) : undefined }), inject: [SocketBus, STORE, ROUTER, CONFIG] },
    RoomsService,
    GameLoop,
    ChatGateway,
  ],
})
export class AppModule {}
