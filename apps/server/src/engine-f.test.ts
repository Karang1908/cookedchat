import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, DEFAULT_TIMINGS } from '@cooked/shared';
import { Engine } from './engine.js';
import { GameLoop, EVICT_AFTER_MS } from './game-loop.js';
import { FakeBus, FakeWriter, middayTz, setup } from './helpers.test-util.js';
import { LlmCommentator } from './llm/factory.js';
import { buildMessages, extractGif } from './llm/prompt.js';
import { LlmRouter } from './llm/router.js';
import { Room } from './room.js';
import { RoomsService } from './rooms.service.js';
import { NullStore } from './store.js';

async function say(s: ReturnType<typeof setup>, id: string, text: string) {
  const r = s.engine.send(s.room, id, text);
  assert.ok(r.ok, JSON.stringify(r));
  await r.done;
  return r;
}

const settle = (ms = 5) => new Promise((r) => setTimeout(r, ms));

function withGifs() {
  const queries: string[] = [];
  const bus = new FakeBus();
  const writer = new FakeWriter();
  const engine = new Engine({ bus, store: new NullStore(), writer, rng: () => 0, gifs: { find: async (q) => (queries.push(q), `https://media.giphy.com/media/${q.replace(/ /g, '-')}/200.gif`) } });
  const room = new Room('TEST', middayTz());
  room.settings.timings = { ...DEFAULT_TIMINGS, commentCooldownMs: 0 };
  room.settings.aiEvery = 0;
  const add = (id: string, name: string) => (engine.join(room, { code: 'TEST', memberId: id, name, avatar: 'cat' }, `s-${id}`), id);
  return { bus, writer, engine, room, add, queries };
}

// ------------------------------------------------------------------ desi

test('Hinglish "baad mein reply karta hu" is reply-later: -500 aura and an LLM roast', async () => {
  const s = setup();
  const a = s.add('a', 'Karan');
  await say(s, a, 'baad mein reply karta hu');
  assert.equal(s.room.members.get(a)!.aura, -500);
  assert.equal(s.writer.calls[0]?.kind, 'reply_later');
});

test('Hinglish dry text "acha" is a dry reply', async () => {
  const s = setup();
  const a = s.add('a', 'Karan');
  await say(s, a, 'acha');
  assert.equal(s.writer.calls[0]?.kind, 'dry_reply');
});

test('desi personas: Hinglish voice and desi references reach the model; every persona is told to match the chat language', () => {
  const ctx = { kind: 'dry_reply' as const, name: 'Aman', text: 'k', fact: 'sent k', recent: [], midnight: false };
  const desi = buildMessages({ ...ctx, settings: { ...DEFAULT_SETTINGS, persona: 'desi' } })[0]!.content;
  assert.match(desi, /Hinglish/);
  assert.match(desi, /Panchayat/);
  const aunty = buildMessages({ ...ctx, settings: { ...DEFAULT_SETTINGS, persona: 'aunty' } })[0]!.content;
  assert.match(aunty, /Sharma ji/);
  const nature = buildMessages({ ...ctx, settings: { ...DEFAULT_SETTINGS, persona: 'nature' } })[0]!.content;
  assert.match(nature, /answer in Hinglish/);
  assert.doesNotMatch(nature, /Desi references/);
  assert.match(nature, /Never use expired slang/);
  assert.match(nature, /\[gif:/);
});

test('a room can switch to the desi personas', () => {
  const s = setup();
  const a = s.add('a', 'Karan');
  s.engine.setVibe(s.room, a, { persona: 'aunty' });
  assert.equal(s.room.settings.persona, 'aunty');
  s.engine.setSettings(s.room, { rival: 'desi' });
  assert.equal(s.room.settings.rival, 'desi');
});

// ------------------------------------------------------------------ model-picked GIFs

test('extractGif: tag removed from the line, query cleaned, unsafe queries dropped', () => {
  assert.deepEqual(extractGif('bro really sent k 💀 [gif: Jethalal Shocked]'), { text: 'bro really sent k 💀 ', gif: 'jethalal shocked' });
  assert.deepEqual(extractGif('no gif here'), { text: 'no gif here' });
  assert.deepEqual(extractGif('line\n[GIF:"mic drop"]'), { text: 'line\n', gif: 'mic drop' });
  assert.deepEqual(extractGif('line [gif: ugly crying]'), { text: 'line ' }, 'off-limits searches never reach GIPHY');
});

test('LlmCommentator: the [gif: ...] tag becomes Line.gif and never shows in the chat line', async () => {
  const router = new LlmRouter([{ name: 'ollama', complete: async () => 'gemma ne mic drop kiya 🗿 [gif: mic drop]' }], { attemptTimeoutMs: 500, deadlineMs: 500, defaultCooldownMs: 1000 });
  const w = new LlmCommentator(router);
  const line = await w.write({ kind: 'dry_reply', name: 'A', text: 'k', fact: 'sent k', recent: [], settings: DEFAULT_SETTINGS, midnight: false });
  assert.deepEqual(line, { text: 'gemma ne mic drop kiya 🗿', model: 'ollama', gif: 'mic drop' });
  const said = await w.say({ system: 's', user: 'u', prefer: 'ollama' });
  assert.equal(said?.gif, 'mic drop');
});

test('duel: the Ollama side sends the GIF it picked, on its own line', async () => {
  const s = withGifs();
  const a = s.add('a', 'Aman');
  s.engine.setSettings(s.room, { duel: true });
  s.writer.gif = 'mic drop';
  await say(s, a, 'k');
  await settle();
  const ai = s.room.messages.filter((m) => m.kind === 'ai');
  const groq = ai.find((m) => m.side === 'groq')!;
  const ollama = ai.find((m) => m.side === 'ollama')!;
  assert.equal(ollama.gif, 'https://media.giphy.com/media/mic-drop/200.gif');
  assert.equal(groq.gif, 'https://media.giphy.com/media/mic-drop/200.gif', 'each side has its own GIF budget');
});

test('model-picked GIFs are rationed per side; big moments still get their fixed GIF', async () => {
  const s = withGifs();
  const a = s.add('a', 'Aman');
  s.writer.gif = 'crying cat';
  await say(s, a, 'k');
  await say(s, a, 'hmm');
  await settle();
  assert.deepEqual(s.queries, ['crying cat'], 'second picked GIF inside the gap is skipped (dry_reply has no fixed GIF)');
  await say(s, a, '67');
  await settle();
  assert.deepEqual(s.queries, ['crying cat', 'six seven'], 'rationed pick falls back to the moment\'s own GIF');
});

test('duel banter lines carry the GIF the model asked for', async () => {
  const s = withGifs();
  const a = s.add('a', 'Aman');
  s.engine.setSettings(s.room, { duel: true, commentary: true });
  s.writer.sayReply = 'clanker spotted';
  s.writer.gif = 'robot fail';
  await say(s, a, 'see you at five');
  s.room.lastGifAt.clear();
  await s.engine.duelBanter(s.room, true);
  await settle();
  const duel = s.room.messages.filter((m) => m.trigger === 'duel');
  assert.equal(duel.length, 3);
  assert.ok(duel.find((m) => m.side === 'ollama')!.gif, 'Ollama line has a GIF');
  assert.ok(duel.filter((m) => m.gif).length >= 2, 'one per side inside the gap');
});

// ------------------------------------------------------------------ memory cleanup

class PersistentStore extends NullStore {
  override readonly persistent = true;
  saved: string[] = [];
  override saveExtras(r?: Room) {
    this.saved.push(r!.code);
  }
}

async function loopWith(store: NullStore) {
  const rooms = new RoomsService(store);
  const engine = new Engine({ bus: new FakeBus(), store, writer: new FakeWriter(), rng: () => 0 });
  const loop = new GameLoop(engine, rooms);
  const room = await rooms.create(0);
  return { rooms, loop, room };
}

test('idle rooms nobody is connected to are evicted (sooner with a database), watched rooms never are', async () => {
  const mem = await loopWith(new NullStore());
  mem.room.lastActiveAt = Date.now() - EVICT_AFTER_MS.persistent - 1000;
  mem.loop.tickAll();
  assert.equal(mem.rooms.all().length, 1, 'memory-only rooms are kept much longer: eviction loses them');
  mem.room.lastActiveAt = Date.now() - EVICT_AFTER_MS.memoryOnly - 1000;
  mem.room.adminSockets.add('admin-socket');
  mem.loop.tickAll();
  assert.equal(mem.rooms.all().length, 1, 'an admin is watching');
  mem.room.adminSockets.clear();
  mem.room.sockets.set('m', new Set(['s1']));
  mem.loop.tickAll();
  assert.equal(mem.rooms.all().length, 1, 'a member is connected');
  mem.room.sockets.get('m')!.clear();
  mem.loop.tickAll();
  assert.equal(mem.rooms.all().length, 0);

  const store = new PersistentStore();
  const db = await loopWith(store);
  db.room.extrasDirty = true;
  db.room.lastActiveAt = Date.now() - EVICT_AFTER_MS.persistent - 1000;
  db.loop.tickAll();
  assert.equal(db.rooms.all().length, 0);
  assert.deepEqual(store.saved, [db.room.code], 'unsaved stats are flushed before the room leaves memory');
});
