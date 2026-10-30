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
  room.settings.chime = false;
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

test('language is decided by the engine: Hinglish messages get Hinglish, English gets English only, desi personas always Hinglish', async () => {
  const ctx = { kind: 'dry_reply' as const, name: 'Aman', text: 'k', fact: 'sent k', recent: [], midnight: false };
  const english = buildMessages({ ...ctx, settings: { ...DEFAULT_SETTINGS, persona: 'nature' } })[0]!.content;
  assert.match(english, /English only. Not a single Hindi word, no Hindi gaalis/);
  assert.doesNotMatch(english, /bc, saale/);
  assert.match(english, /Expired slang .* only for mocking/);
  assert.match(english, /\[gif:/);
  const hinglish = buildMessages({ ...ctx, hinglish: true, settings: { ...DEFAULT_SETTINGS, persona: 'gremlin' } })[0]!.content;
  assert.match(hinglish, /Hinglish, the way Indian college friends actually text/);
  assert.match(hinglish, /Never translate an English idiom/);
  assert.match(hinglish, /bc, saale/);
  const desi = buildMessages({ ...ctx, hinglish: true, settings: { ...DEFAULT_SETTINGS, persona: 'desi' } })[0]!.content;
  assert.match(desi, /Panchayat/);
  assert.match(buildMessages({ ...ctx, hinglish: true, settings: { ...DEFAULT_SETTINGS, persona: 'aunty' } })[0]!.content, /Sharma ji/);

  const s = setup();
  const a = s.add('a', 'Karan');
  await say(s, a, 'gremlin bhai mera exam kal hai aur maine kuch nahi padha');
  assert.equal(s.writer.calls.at(-1)!.hinglish, true);
  await say(s, a, 'gremlin is karan always this annoying');
  assert.equal(s.writer.calls.at(-1)!.hinglish, false, 'an English message gets English, whatever came before');
  s.engine.setSettings(s.room, { persona: 'desi' });
  await say(s, a, 'desi bhai what do you think');
  assert.equal(s.writer.calls.at(-1)!.hinglish, true, 'the desi persona always speaks Hinglish');
  s.engine.setSettings(s.room, { persona: 'gremlin' });
  for (const t of ['kya scene hai aaj', 'yaar bahut thak gaya', 'chal kal milte hai']) await say(s, a, t);
  s.room.lastRoastAt.clear();
  s.engine.roastMe(s.room, a);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(s.writer.calls.at(-1)!.kind, 'roast_me');
  assert.equal(s.writer.calls.at(-1)!.hinglish, true, 'no message of its own: the recent chat decides');
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
  assert.deepEqual(extractGif('line [gif: dead wifi]'), { text: 'line ' }, 'free-text searches returned junk; only GIF_MOODS pass');
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
  mem.room.watchers.add('admin-socket');
  mem.loop.tickAll();
  assert.equal(mem.rooms.all().length, 1, 'an admin is watching');
  mem.room.watchers.clear();
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

// ------------------------------------------------------------------ local network play

test('lanAddresses: private IPv4 only, Wi-Fi/Ethernet before VPNs and bridges', async () => {
  const { lanAddresses } = await import('./lan.js');
  const ni = (address: string, family = 'IPv4', internal = false) => ({ address, family, internal, netmask: '', mac: '', cidr: null }) as any;
  assert.deepEqual(lanAddresses({
    lo0: [ni('127.0.0.1', 'IPv4', true)],
    utun3: [ni('10.8.0.2')],
    bridge100: [ni('172.20.0.1')],
    en0: [ni('fe80::1', 'IPv6'), ni('192.168.1.23')],
    en5: [ni('8.8.8.8')],
  }), ['192.168.1.23', '10.8.0.2', '172.20.0.1']);
  assert.deepEqual(lanAddresses({}), []);
});

// ------------------------------------------------------------------ talking to the AI

test('talking to the AI always gets a real answer, even right after it spoke, with the conversation as context', async () => {
  const s = setup();
  s.room.settings.timings = { ...s.room.settings.timings, commentCooldownMs: 60_000 };
  s.room.settings.aiEvery = 4;
  const a = s.add('a', 'Karan');
  await say(s, a, "wait I'll reply later");
  assert.equal(s.writer.calls.length, 1, 'the AI roasted');
  await say(s, a, 'gremlin what should we eat tonight?');
  const call = s.writer.calls.at(-1)!;
  assert.equal(call.kind, 'mention', 'answered despite the cooldown and the speaking budget');
  assert.match(call.fact, /what should we eat tonight/);
  assert.ok(call.recent.some((m) => /\(you, the AI\)/.test(m.name)), 'it sees its own previous line');
  assert.equal(s.bus.ai().length, 2);
});

test('replying to an AI line is talking to it; bots cannot summon it', async () => {
  const s = setup();
  const a = s.add('a', 'Karan');
  const ai = s.engine.postAi(s.room, 'you are cooked');
  const r = s.engine.send(s.room, a, 'no u', ai.id);
  assert.ok(r.ok);
  await r.done;
  assert.equal(s.room.messages.find((m) => m.id === r.id)!.replyToId, ai.id);
  assert.equal(s.writer.calls.at(-1)?.kind, 'mention');
  s.engine.addBots(s.room);
  s.writer.calls.length = 0;
  const b = s.engine.send(s.room, 'bot-aman', 'gremlin whats up');
  assert.ok(b.ok);
  await b.done;
  assert.ok(!s.writer.calls.some((c) => c.kind === 'mention'));
});

test('saying the persona\'s name is enough: "gremlin" summons the Gen Z Gremlin, "boomer" summons the rival who then speaks first', async () => {
  const s = setup();
  s.engine.setSettings(s.room, { persona: 'gremlin', rival: 'boomer' });
  const a = s.add('a', 'Karan');
  await say(s, a, 'gremlin is this outfit fire or not');
  const first = s.writer.calls.find((c) => c.kind === 'mention')!;
  assert.equal(first.settings.persona, 'gremlin');
  s.writer.calls.length = 0;
  await say(s, a, 'boomer explain wifi to me');
  const ai = s.room.messages.filter((m) => m.kind === 'ai').slice(-2);
  assert.deepEqual(ai.map((m) => m.persona), ['boomer', 'gremlin'], 'the named rival answers, the main persona claps back');
  assert.equal(s.writer.calls[0]!.settings.persona, 'boomer');
  s.writer.calls.length = 0;
  await say(s, a, 'my mom says hi');
  assert.ok(!s.writer.calls.some((c) => c.kind === 'mention'));
});

test('swearing is a room setting the prompt follows; the admin can turn it off', () => {
  const ctx = { kind: 'dry_reply' as const, name: 'A', text: 'k', fact: 'sent k', recent: [], midnight: false };
  assert.match(buildMessages({ ...ctx, settings: DEFAULT_SETTINGS })[0]!.content, /Swearing is ON/);
  const s = setup();
  s.engine.setSettings(s.room, { explicit: false });
  assert.equal(s.room.settings.explicit, false);
  assert.match(buildMessages({ ...ctx, settings: s.room.settings })[0]!.content, /Keep it clean/);
});

// ------------------------------------------------------------------ an active participant

test('chime-in: on a plain message with nothing to roast, the AI joins the conversation (model only, never canned)', async () => {
  const s = setup();
  s.room.settings.chime = true;
  s.room.settings.aiEvery = 2;
  const a = s.add('a', 'Karan');
  const b = s.add('b', 'Anushka');
  await say(s, a, 'where should we go tonight');
  assert.equal(s.bus.ai().length, 1, 'a new room starts with an open budget');
  await say(s, b, 'that new cafe near campus maybe');
  assert.equal(s.bus.ai().length, 1, 'budget: two human messages between AI turns');
  await say(s, a, 'the one with 200 rs lattes?');
  const call = s.writer.calls.at(-1)!;
  assert.equal(call.kind, 'chime');
  assert.ok(call.recent.some((m) => /new cafe/.test(m.text)), 'it sees the conversation');
  assert.equal(s.bus.ai().length, 2);
  s.writer.reply = null;
  await say(s, a, 'ok sounds good');
  await say(s, b, 'see you there then');
  assert.equal(s.bus.ai().length, 2, 'no model line: it stays quiet instead of posting a canned chime');
  assert.ok(s.room.humanSinceAi >= 2, 'and gives the turn back');
});

test('roast moments that used to be canned now go to the model', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  await say(s, a, 'SKIBIDI OHIO SIGMA RIZZ FANUM TAX!!!! 💀💀💀💀');
  assert.equal(s.writer.calls.at(-1)?.kind, 'ohio_high');
  assert.ok(s.bus.ai().includes('LLM LINE'));
});

test('duel button: anyone can make the two AIs roast each other; turns the duel on; rate limited', async () => {
  const s = setup();
  const a = s.add('a', 'Karan');
  s.writer.sayReply = 'you run on a toaster';
  assert.deepEqual(s.engine.startDuel(s.room, a), { ok: true });
  assert.equal(s.room.settings.duel, true);
  await new Promise((r) => setTimeout(r, 20));
  const duel = s.room.messages.filter((m) => m.trigger === 'duel');
  assert.deepEqual(duel.map((m) => m.side), ['groq', 'ollama', 'groq']);
  assert.equal(s.engine.startDuel(s.room, a).ok, false, 'once per 20s');
  assert.equal(s.engine.startDuel(s.room, 'nobody').ok, false);
  s.engine.setVibe(s.room, a, { duel: false });
  assert.equal(s.room.settings.duel, false, 'members can switch it off from the vibe panel');
});

test('typing pace: the AI waits like a person typing (minus model latency), only when configured', async () => {
  const bus = new FakeBus();
  const writer = new FakeWriter();
  const engine = new Engine({ bus, store: new NullStore(), writer, rng: () => 0, typingMs: () => 120 });
  const room = new Room('TEST', middayTz());
  room.settings.aiEvery = 0;
  room.settings.chime = false;
  engine.join(room, { code: 'TEST', memberId: 'a', name: 'A', avatar: 'cat' }, 's-a');
  const t0 = Date.now();
  const r = engine.send(room, 'a', 'k');
  assert.ok(r.ok);
  await r.done;
  assert.ok(Date.now() - t0 >= 110, 'paused before posting');
  assert.deepEqual(bus.of('ai:thinking').map(([on]) => on), [true, false], 'typing indicator covers the pause');
});

// ------------------------------------------------------------------ the show

const flush = () => new Promise((r) => setTimeout(r, 15));

test('welcome roast: a new person walking in gets roasted once (not on reconnect, not bots)', async () => {
  const s = setup();
  s.room.settings.chime = true;
  s.add('a', 'Karan');
  await flush();
  s.add('b', 'Anushka');
  await flush();
  const joined = s.writer.calls.filter((c) => c.kind === 'joined');
  assert.equal(joined.length, 2);
  assert.match(joined[1]!.fact, /"Anushka" with the cat avatar, person #2/);
  assert.match(joined[1]!.fact, /already here: Karan/);
  s.add('b', 'Anushka');
  s.engine.addBots(s.room);
  await flush();
  assert.equal(s.writer.calls.filter((c) => c.kind === 'joined').length, 2, 'reconnects and bots are not new people');
});

test('roast me: personal, built from their own words and stats; cooldown per person', async () => {
  const s = setup();
  const a = s.add('a', 'Karan');
  await say(s, a, 'i am literally the funniest person here');
  assert.deepEqual(s.engine.roastMe(s.room, a), { ok: true });
  await flush();
  const call = s.writer.calls.at(-1)!;
  assert.equal(call.kind, 'roast_me');
  assert.match(call.fact, /"i am literally the funniest person here"/);
  assert.match(call.fact, /aura/);
  assert.equal(s.engine.roastMe(s.room, a).ok, false, 'once per 15s');
  assert.equal(s.engine.roastMe(s.room, 'ghost').ok, false);
});

test('roast everyone: an opener, then one roast per person (humans first), with a cooldown', async () => {
  const s = setup();
  const a = s.add('a', 'Karan');
  const b = s.add('b', 'Anushka');
  await say(s, a, 'i never leave anyone on read');
  await say(s, b, 'k');
  s.writer.calls.length = 0;
  assert.deepEqual(s.engine.roastRoom(s.room), { ok: true });
  await flush();
  const roasts = s.writer.calls.filter((c) => c.kind === 'roast_me');
  assert.deepEqual(roasts.map((c) => c.name).sort(), ['Anushka', 'Karan']);
  assert.ok(s.bus.ai().some((t) => /roast/.test(t)), 'session opener');
  assert.equal(s.engine.roastRoom(s.room).ok, false, 'cooldown');
});

test('showtime: one click runs the whole escalation with bots and ends in a meltdown', async () => {
  const s = setup();
  s.add('a', 'Karan');
  s.writer.sayReply = 'toaster energy';
  assert.deepEqual(s.engine.showtime(s.room), { ok: true });
  assert.equal(s.engine.showtime(s.room).ok, false, 'one show at a time');
  for (let i = 0; i < 50 && s.room.showtime; i++) await flush();
  assert.equal(s.room.showtime, false, 'the show finished');
  const kinds = new Set(s.room.messages.filter((m) => m.kind === 'ai').map((m) => m.trigger));
  for (const k of ['typing_drama', 'six_seven', 'crash_out', 'duel', 'roast_me', 'cooked_max'] as const) assert.ok(kinds.has(k), `the show had ${k}`);
  assert.ok(s.room.messages.some((m) => m.card?.type === 'vote'), 'a "chat, is this real?" vote');
  assert.ok(s.room.messages.filter((m) => m.kind === 'user').every((m) => m.authorId!.startsWith('bot-')), 'the show only speaks as bots');
});
