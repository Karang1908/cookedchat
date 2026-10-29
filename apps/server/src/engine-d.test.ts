import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GiphyFinder, isGiphyUrl } from './features/gif.js';
import { FakeBus, FakeWriter } from './helpers.test-util.js';
import { Engine } from './engine.js';
import { Room } from './room.js';
import { NullStore } from './store.js';
import { DEFAULT_TIMINGS, STICKER, BREAKING, GIF_QUERY } from '@cooked/shared';

const json = (body: unknown, ok = true, status = 200) => (async () => ({ ok, status, json: async () => body })) as unknown as typeof fetch;

test('giphy: builds a safe query, only returns https giphy.com urls, and never throws', async () => {
  let seen = '';
  const f = new GiphyFinder('KEY', (async (url: string) => { seen = url; return { ok: true, status: 200, json: async () => ({ data: [
    { images: { fixed_height: { url: 'https://media1.giphy.com/media/a/200.gif' } } },
    { images: { fixed_height: { url: 'https://evil.example/x.gif' } } },
    { images: { fixed_height: { url: 'http://media.giphy.com/insecure.gif' } } },
    { images: {} },
  ] }) }; }) as unknown as typeof fetch);
  const url = await f.find('mogged');
  assert.equal(url, 'https://media1.giphy.com/media/a/200.gif');
  assert.match(seen, /^https:\/\/api\.giphy\.com\/v1\/gifs\/search\?/);
  assert.match(seen, /api_key=KEY/);
  assert.match(seen, /q=mogged/);
  assert.match(seen, /rating=pg-13/);

  assert.equal(await new GiphyFinder('K', json({ data: [{ images: { fixed_height: { url: 'https://evil.example/x.gif' } } }] })).find('x'), null, 'foreign hosts are dropped');
  assert.equal(await new GiphyFinder('K', json({ data: [] })).find('x'), null);
  assert.equal(await new GiphyFinder('K', json({}, false, 429)).find('x'), null);
  assert.equal(await new GiphyFinder('K', (async () => { throw new Error('network down'); }) as unknown as typeof fetch).find('x'), null);
  for (const [u, ok] of [['https://giphy.com/a.gif', true], ['https://media.giphy.com/a.gif', true], ['https://notgiphy.com/a.gif', false], ['https://giphy.com.evil.io/a.gif', false], ['javascript:alert(1)', false], ['nonsense', false]] as const) assert.equal(isGiphyUrl(u), ok, u);
});

function build(gifs?: { find(q: string): Promise<string | null> }) {
  const bus = new FakeBus();
  const writer = new FakeWriter();
  const engine = new Engine({ bus, store: new NullStore(), writer, rng: () => 0, gifs });
  const room = new Room('TEST', 0);
  room.settings.timings = { ...DEFAULT_TIMINGS, commentCooldownMs: 0 };
  room.settings.aiEvery = 0;
  const add = (id: string, name: string) => (engine.join(room, { code: 'TEST', memberId: id, name, avatar: 'cat' }, `s-${id}`), id);
  return { bus, writer, engine, room, add };
}
const settle = () => new Promise((r) => setTimeout(r, 5));

test('gif: attached after the roast is already posted, only for moments that have a query, and only when a finder exists', async () => {
  const calls: string[] = [];
  const s = build({ find: async (q) => (calls.push(q), await new Promise((r) => setTimeout(r, 30)), 'https://media.giphy.com/media/z/200.gif') });
  const a = s.add('a', 'Aman');
  const r = s.engine.send(s.room, a, '67');
  assert.ok(r.ok);
  await r.done;
  const ai = s.room.messages.find((m) => m.kind === 'ai')!;
  assert.equal(ai.gif, undefined, 'the line is posted first; the GIF arrives later');
  assert.equal(s.room.messages.filter((m) => m.kind === 'ai').length, 1, 'the roast did not wait for the slow GIF lookup');
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(ai.gif, 'https://media.giphy.com/media/z/200.gif');
  assert.deepEqual(calls, [GIF_QUERY.six_seven]);
  assert.ok(s.bus.of('chat:update').some(([m]: any) => m.id === ai.id && m.gif), 'clients are told');

  calls.length = 0;
  const r2 = s.engine.send(s.room, a, 'k');
  assert.ok(r2.ok);
  await r2.done;
  await settle();
  assert.equal(calls.length, 0, 'dry_reply has no GIF query');

  const plain = build();
  const b = plain.add('b', 'Riya');
  const r3 = plain.engine.send(plain.room, b, '67');
  assert.ok(r3.ok);
  await r3.done;
  await settle();
  assert.equal(plain.room.messages.find((m) => m.kind === 'ai')!.gif, undefined);

  const broken = build({ find: async () => { throw new Error('boom'); } });
  const c = broken.add('c', 'Dev');
  const r4 = broken.engine.send(broken.room, c, '67');
  assert.ok(r4.ok);
  await r4.done;
  await settle();
  assert.ok(broken.room.messages.some((m) => m.kind === 'ai'), 'a failing GIF lookup never breaks the roast');
});

test('daily tiers: announced once when the room day rolls over, with 2+ active members only', async () => {
  const s = build();
  const a = s.add('a', 'Aman');
  const b = s.add('b', 'Riya');
  for (const id of [a, b]) { const r = s.engine.send(s.room, id, 'hello there'); assert.ok(r.ok); await r.done; }
  s.engine.tick(s.room);
  const tiers = () => s.room.messages.filter((m) => m.trigger === 'tiers');
  assert.equal(tiers().length, 0, 'the first tick only records the day');
  s.engine.warp(s.room, 25 * 3_600_000);
  assert.equal(tiers().length, 1);
  assert.match(tiers()[0]!.text, /^Daily status update: .*Aman .*(Sigma|Alpha|Beta|NPC).*Riya|^Daily status update: .*Riya .*Aman/);
  s.engine.tick(s.room);
  assert.equal(tiers().length, 1, 'once per day');
  s.engine.warp(s.room, 25 * 3_600_000);
  assert.equal(tiers().length, 1, 'nobody spoke since the last announcement: no second AI turn in a row');
  for (const [id, t] of [[a, 'morning'], [b, 'yo']] as const) {
    const back = s.engine.send(s.room, id, t); // "morning" after 50h is itself roasted (slow reply), so it takes two
    assert.ok(back.ok);
    await back.done;
  }
  assert.ok(s.room.humanSinceAi >= 1);
  s.engine.warp(s.room, 25 * 3_600_000);
  assert.equal(tiers().length, 2, 'once a human spoke, the next day gets its announcement');

  const solo = build();
  const x = solo.add('x', 'Solo');
  const rs = solo.engine.send(solo.room, x, 'hi');
  assert.ok(rs.ok);
  await rs.done;
  solo.engine.tick(solo.room);
  solo.engine.warp(solo.room, 25 * 3_600_000);
  assert.equal(solo.room.messages.filter((m) => m.trigger === 'tiers').length, 0);

  const quiet = build();
  quiet.add('p', 'Pat');
  quiet.add('q', 'Quin');
  quiet.engine.tick(quiet.room);
  quiet.engine.warp(quiet.room, 25 * 3_600_000);
  assert.equal(quiet.room.messages.filter((m) => m.trigger === 'tiers').length, 0, 'nobody has spoken, nothing to rank');
});

test('stickers and breaking-news sets only reference real trigger kinds', () => {
  for (const k of Object.keys(STICKER)) assert.ok(STICKER[k as keyof typeof STICKER]!.length > 0, k);
  assert.ok(BREAKING.has('mog') && BREAKING.has('tiers') && !BREAKING.has('dry_reply'));
});

test('staged moments always land, even when the dice and the cooldown say stay quiet; normal chat still obeys them', async () => {
  const bus = new FakeBus();
  const writer = new FakeWriter();
  const engine = new Engine({ bus, store: new NullStore(), writer, rng: () => 0.99 });
  const room = new Room('TEST', 0);
  const add = (id: string, name: string) => (engine.join(room, { code: 'TEST', memberId: id, name, avatar: 'cat' }, `s-${id}`), id);
  const a = add('a', 'Aman');
  const r = engine.send(room, a, 'k');
  assert.ok(r.ok);
  await r.done;
  assert.equal(room.messages.filter((m) => m.kind === 'ai').length, 0, 'normal chat: rng 0.99 means the AI stays quiet');
  room.lastCommentAt = Date.now();
  await engine.simulate(room, 'simp', 'bot-aman');
  assert.ok(writer.calls.some((c) => c.kind === 'simp_radar'), 'the staged simp radar still got its roast');
  const before = writer.calls.length;
  const r2 = engine.send(room, a, 'ok');
  assert.ok(r2.ok);
  await r2.done;
  assert.equal(writer.calls.length, before, 'staging is over: the dice apply again');
});
