import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.test-util.js';

type S = ReturnType<typeof setup>;
const OHIO = 'SKIBIDI OHIO SIGMA RIZZ FANUM TAX!!!! 💀💀💀💀';
async function say(s: S, id: string, text: string) {
  const r = s.engine.send(s.room, id, text);
  assert.ok(r.ok, JSON.stringify(r));
  await r.done;
  return r;
}
const cards = (s: S, type: string) => s.room.messages.filter((m) => m.card?.type === type);
const tick = () => new Promise((r) => setImmediate(r));

// ------------------------------------------------------------------ lore keeper
test('lore: memorable moments are kept, and brought back only after the gap', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const b = s.add('b', 'Riya');
  await say(s, a, OHIO);
  await say(s, a, '67');
  assert.deepEqual(s.room.lore.map((l) => l.why), ['ohio', '67']);
  s.writer.calls.length = 0;
  await say(s, b, 'anyway what are we doing');
  assert.equal(s.writer.calls.filter((c) => c.kind === 'lore').length, 0, 'too soon');
  s.engine.warp(s.room, 7 * 3_600_000);
  await say(s, b, 'is anyone here');
  const lore = s.writer.calls.filter((c) => c.kind === 'lore');
  assert.equal(lore.length, 1);
  assert.equal(lore[0]!.name, 'Aman');
  assert.match(lore[0]!.fact, /days-old inside joke/);
  await say(s, b, 'another message right after');
  assert.equal(s.writer.calls.filter((c) => c.kind === 'lore').length, 1, 'once per gap');
});

test('lore: a deleted or edited message is forgotten and never resurfaces', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const b = s.add('b', 'Riya');
  const r = await say(s, a, OHIO);
  const r2 = await say(s, a, 'i swear i can literally run a marathon without even trying');
  assert.equal(s.room.lore.length, 2);
  s.engine.delete(s.room, a, r.id);
  s.engine.edit(s.room, a, r2.id, 'actually never mind');
  assert.equal(s.room.lore.length, 0);
  s.engine.warp(s.room, 7 * 3_600_000);
  s.writer.calls.length = 0;
  await say(s, b, 'hello');
  assert.equal(s.writer.calls.filter((c) => c.kind === 'lore').length, 0);
});

test('lore: capped at 30 through the real path, deduplicated, and listed in the persisted extras', async () => {
  const s = setup();
  s.engine.addBots(s.room);
  for (let i = 0; i < 35; i++) await say(s, 'bot-aman', `${OHIO} ${i}`);
  await say(s, 'bot-aman', `${OHIO} 34`); // exact repeat
  assert.equal(s.room.lore.length, 30, 'oldest dropped, repeat ignored');
  assert.ok(!s.room.lore.some((l) => l.text.endsWith(' 0')), 'the oldest entries were evicted');
  assert.ok(s.room.lore.some((l) => l.text.endsWith(' 34')));
  assert.equal(s.room.extras().lore.length, 30);
  assert.equal(s.room.extras().lore[0]!.why, 'ohio');
});

// ------------------------------------------------------------------ rival commentators
test('rival: a second persona answers every comment (LLM path carries rivalOf, instant path uses a canned retort)', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  s.engine.setSettings(s.room, { persona: 'gremlin', rival: 'boomer' });
  await say(s, a, 'k');
  const ai = s.room.messages.filter((m) => m.kind === 'ai');
  assert.equal(ai.length, 2);
  assert.deepEqual(ai.map((m) => m.persona), ['gremlin', 'boomer']);
  const rivalCall = s.writer.calls.at(-1)!;
  assert.equal(rivalCall.settings.persona, 'boomer');
  assert.equal(rivalCall.rivalOf?.label, 'Gen Z Gremlin');
  assert.equal(rivalCall.rivalOf?.line, 'LLM LINE');

  s.room.messages.length = 0;
  s.writer.calls.length = 0;
  await say(s, a, '67');
  const ai2 = s.room.messages.filter((m) => m.kind === 'ai');
  assert.equal(ai2.length, 2);
  assert.equal(ai2[1]!.persona, 'boomer');
  assert.equal(s.writer.calls.length, 0, 'instant triggers never wait on the LLM, even for the rival');
  assert.ok(['Is that a wifi thing?', 'In my day we just called people.', 'Back in my day "cooked" meant dinner.'].includes(ai2[1]!.text));
});

test('rival: same persona or null means a single voice; messages carry their persona', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  s.engine.setSettings(s.room, { persona: 'nature', rival: 'nature' });
  await say(s, a, 'k');
  assert.equal(s.room.messages.filter((m) => m.kind === 'ai').length, 1);
  assert.equal(s.room.messages.find((m) => m.kind === 'ai')!.persona, 'nature');
});

// ------------------------------------------------------------------ translators
test('translate: dry meanings, brainrot/plain via the LLM with rule fallbacks, cached, throttled, guarded', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const b = s.add('b', 'Riya');
  const k = await say(s, a, 'k');
  const hungry = await say(s, a, "I'm hungry");
  const m = s.engine.memory;
  assert.deepEqual(await m.translate(s.room, b, k.id, 'dry'), { ok: true, text: 'I am deeply wounded', via: 'rules' });
  assert.deepEqual(await m.translate(s.room, b, hungry.id, 'dry'), { ok: false, error: "that's not a dry text" });
  assert.equal((await m.translate(s.room, b, 'missing', 'brainrot')).ok, false);
  assert.equal((await m.translate(s.room, 'ghost', k.id, 'brainrot')).ok, false);
  assert.equal((await m.translate(s.room, b, k.id, 'nonsense' as any)).ok, false);

  s.writer.generateReply = 'bro is NOT fanum taxing me rn 💀';
  const t1 = await m.translate(s.room, b, hungry.id, 'brainrot');
  assert.deepEqual(t1, { ok: true, text: 'bro is NOT fanum taxing me rn 💀', via: 'ai' });
  await m.translate(s.room, b, hungry.id, 'brainrot');
  assert.equal(s.writer.generated.length, 1, 'second identical request came from the cache');
  assert.match(s.writer.generated[0]!.system, /Gen Alpha brainrot/);

  s.writer.generateReply = null;
  const plain = await m.translate(s.room, b, hungry.id, 'plain');
  assert.equal(plain.ok && plain.via, 'rules');
  s.writer.generateReply = 'you are so ugly lol';
  const guarded = await m.translate(s.room, b, hungry.id, 'brainrot');
  assert.equal(guarded.ok && guarded.via, 'ai', 'cached from before');
  const fresh = await say(s, a, 'see you tomorrow');
  const safe = await m.translate(s.room, b, fresh.id, 'brainrot');
  assert.equal(safe.ok && safe.via, 'rules', 'off-limits model output is dropped for the rule-based version');
  const limited = await m.translate(s.room, b, fresh.id, 'plain');
  assert.deepEqual(limited, { ok: false, error: 'slow down, translator is tired' });

  s.engine.delete(s.room, a, fresh.id);
  assert.equal((await m.translate(s.room, a, fresh.id, 'plain')).ok, false, 'deleted messages cannot be translated');
});

// ------------------------------------------------------------------ memes
test('meme: LLM captions when well-formed, templates otherwise, rate limited, off-limits dropped', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const r = await say(s, a, 'wait I will reply later');
  s.writer.generateReply = 'WHEN YOU SAY LATER | AND LATER IS NEVER';
  assert.deepEqual(await s.engine.memory.makeMeme(s.room, a, r.id), { ok: true });
  const meme = cards(s, 'meme').at(-1)!.card as any;
  assert.deepEqual([meme.top, meme.bottom], ['WHEN YOU SAY LATER', 'AND LATER IS NEVER']);
  assert.ok(meme.emoji && meme.messageId === r.id);
  assert.deepEqual(await s.engine.memory.makeMeme(s.room, a, r.id), { ok: false, error: 'the meme printer is warming up (8s)' });

  s.room.lastMemeAt = 0;
  s.writer.generateReply = 'no pipe here';
  await s.engine.memory.makeMeme(s.room, a, r.id);
  const fb = cards(s, 'meme').at(-1)!.card as any;
  assert.equal(fb.bottom, 'WAIT I WILL REPLY LATER');
  assert.ok(/AMAN/.test(fb.top), fb.top);

  s.room.lastMemeAt = 0;
  s.writer.generateReply = 'SO UGLY | LOL';
  await s.engine.memory.makeMeme(s.room, a, r.id);
  assert.ok(!/UGLY/.test((cards(s, 'meme').at(-1)!.card as any).top));
  assert.equal((await s.engine.memory.makeMeme(s.room, a, 'nope')).ok, false);
});

// ------------------------------------------------------------------ recap / awards / wrapped
test('recap: builds a season card from the chat; the LLM only rewrites the final cliffhanger; rate limited', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const b = s.add('b', 'Riya');
  await say(s, a, 'wait I will reply later');
  await say(s, b, 'bro');
  s.engine.warp(s.room, 26 * 3_600_000);
  await say(s, a, '67');
  s.writer.generateReply = 'And then the chat fell silent.';
  assert.deepEqual(await s.engine.memory.recap(s.room), { ok: true });
  const r = cards(s, 'recap')[0]!.card as any;
  assert.match(r.title, /Previously on this group chat… \(Season 1\)/);
  assert.equal(r.episodes.length, 2);
  assert.match(r.episodes[0].title, /^Ep 1: The One Where Aman Promised to Reply Later/);
  assert.equal(r.episodes.at(-1).cliffhanger, 'And then the chat fell silent.');
  assert.notEqual(r.episodes[0].cliffhanger, 'And then the chat fell silent.');
  assert.deepEqual(await s.engine.memory.recap(s.room), { ok: false, error: 'the writers room is on break (30s)' });
});

test('recap with no LLM still works', async () => {
  const s = setup();
  s.add('a', 'Aman');
  assert.deepEqual(await s.engine.memory.recap(s.room), { ok: true });
  assert.match((cards(s, 'recap')[0]!.card as any).episodes[0].title, /The Pilot/);
});

test('awards: needs real activity; names winners with reasons; rate limited', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const b = s.add('b', 'Riya');
  assert.deepEqual(s.engine.memory.awards(s.room), { ok: false, error: 'not enough activity for awards yet' });
  await say(s, a, '67');
  await say(s, b, 'pizza tonight?');
  await say(s, b, "wait I'll reply later");
  assert.deepEqual(s.engine.memory.awards(s.room), { ok: true });
  const awards = (cards(s, 'awards')[0]!.card as any).awards as { title: string; name: string }[];
  const by = Object.fromEntries(awards.map((x) => [x.title, x.name]));
  assert.equal(by['Main Character'], 'Aman');
  assert.equal(by['NPC Energy'], 'Riya');
  assert.equal(by['Fanum Tax Collector'], 'Riya');
  assert.equal(s.engine.memory.awards(s.room).ok, false);
});

test('wrapped: needs a message, percentages sum to 100, final form is the creature, rate limited per requester', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const b = s.add('b', 'Riya');
  assert.match((s.engine.memory.wrapped(s.room, a) as any).error, /nothing to wrap/);
  await say(s, a, OHIO);
  assert.deepEqual(s.engine.memory.wrapped(s.room, a), { ok: true });
  const w = cards(s, 'wrapped')[0]!.card as any;
  assert.equal(w.name, 'Aman');
  assert.equal(w.breakdown.reduce((t: number, x: any) => t + x.pct, 0), 100);
  assert.ok(w.finalForm.length > 3);
  assert.equal(s.engine.memory.wrapped(s.room, a, b).ok, false, 'rate limited');
  assert.deepEqual(s.engine.memory.wrapped(s.room, b, a), { ok: true }, "b has not requested one yet, so b is not rate limited");
  assert.equal(s.engine.memory.wrapped(s.room, b, 'ghost').ok, false);
});

test('admin force for recap, awards, wrapped, meme and lore never throws', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  s.add('b', 'Riya');
  await say(s, a, OHIO);
  for (const k of ['recap', 'awards', 'wrapped', 'meme', 'lore'] as const) {
    s.room.lastRecapAt = s.room.lastAwardsAt = s.room.lastMemeAt = 0;
    s.room.lastWrappedAt.clear();
    await s.engine.force(s.room, k, a);
    await tick();
  }
  for (const t of ['recap', 'awards', 'wrapped', 'meme']) assert.ok(cards(s, t).length >= 1, t);
});
