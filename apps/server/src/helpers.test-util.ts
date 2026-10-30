import { DEFAULT_TIMINGS } from '@cooked/shared';
import type { ServerToClientEvents } from '@cooked/shared';
import type { RoomBus } from './bus.js';
import type { CommentContext } from './llm/prompt.js';
import { Engine } from './engine.js';
import type { CommentWriter } from './engine.js';
import { Room } from './room.js';
import { NullStore } from './store.js';

export type Ev = { code: string; ev: keyof ServerToClientEvents; args: any[] };

export class FakeBus implements RoomBus {
  events: Ev[] = [];
  emit(code: string, ev: any, ...args: any[]) {
    this.events.push({ code, ev, args });
  }
  of(ev: keyof ServerToClientEvents) {
    return this.events.filter((e) => e.ev === ev).map((e) => e.args);
  }
  /** texts of AI messages */
  ai() {
    return this.of('chat:message').map(([m]) => m).filter((m: any) => m.kind === 'ai').map((m: any) => m.text as string);
  }
  clear() {
    this.events = [];
  }
}

export class FakeWriter implements CommentWriter {
  calls: CommentContext[] = [];
  reply: string | null = 'LLM LINE';
  async write(ctx: CommentContext) {
    this.calls.push(ctx);
    return this.reply === null ? null : { text: this.reply, model: ctx.prefer === 'ollama' ? 'ollama' : 'groq-120b' };
  }
  said: { system: string; user: string; prefer?: 'groq' | 'ollama' }[] = [];
  sayReply: string | null = null;
  async say(p: { system: string; user: string; prefer?: 'groq' | 'ollama' }) {
    this.said.push(p);
    return this.sayReply === null ? null : { text: `${this.sayReply} (${p.prefer})`, model: p.prefer === 'ollama' ? 'ollama' : 'groq-120b' };
  }
  generated: { system: string; user: string }[] = [];
  generateReply: string | null = null;
  async generate(p: { system: string; user: string }) {
    this.generated.push(p);
    return this.generateReply;
  }
}

/** tz offset that puts a room's wall clock at midday: at UTC 03:xx a UTC room's first tick fires the 3am Tung Tung, which takes the AI's turn */
export const middayTz = () => ((12 - new Date().getUTCHours() + 24) % 24) * 60;

export function setup() {
  const bus = new FakeBus();
  const writer = new FakeWriter();
  const engine = new Engine({ bus, store: new NullStore(), writer, rng: () => 0 });
  const room = new Room('TEST', middayTz());
  room.settings.timings = { ...DEFAULT_TIMINGS, commentCooldownMs: 0 };
  // most tests check what a single message triggers; the speaking budget has its own tests (engine-e)
  room.settings.aiEvery = 0;
  const add = (id: string, name: string) => {
    engine.join(room, { code: 'TEST', memberId: id, name, avatar: 'cat' }, `s-${id}`);
    return id;
  };
  return { bus, writer, engine, room, add };
}
