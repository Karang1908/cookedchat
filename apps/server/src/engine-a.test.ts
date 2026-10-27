import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.test-util.js';

type S = ReturnType<typeof setup>;
async function say(s: S, id: string, text: string, replyToId?: string) {
  const r = s.engine.send(s.room, id, text, replyToId);
  assert.ok(r.ok, JSON.stringify(r));
  await r.done;
  return r;
}
const tick = () => new Promise((r) => setImmediate(r));
const cards = (s: S, type: string) => s.room.messages.filter((m) => m.card?.type === type);

test('Ohio: scored on every message, 85%+ costs 500 aura with an instant line', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const calm = await say(s, a, 'see you at five');
  assert.ok(s.room.messages.find((m) => m.id === calm.id)!.ohio! < 20);
  s.bus.clear();
  const r = await say(s, a, 'SKIBIDI OHIO SIGMA RIZZ FANUM TAX!!!! 💀💀💀💀');
  assert.ok(s.room.messages.find((m) => m.id === r.id)!.ohio! >= 85);
  assert.equal(s.room.members.get(a)!.aura, -500 + (s.room.members.get(a)!.aura + 500)); // -500 plus fanum tax below
  assert.ok(s.room.ledger.some((e) => e.reason === 'ohio' && e.delta === -500));
  assert.ok(s.bus.ai().some((t) => /Ohio/.test(t)));
});

test('cap: a big claim gets the cap detector line with its percentage', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  await say(s, a, 'i swear i can literally run a marathon without even trying');
  const call = s.writer.calls.find((c) => c.kind === 'cap');
  assert.ok(call, 'LLM asked about the cap');
  assert.match(call!.fact, /cap score \d+%/);
});

test('tone shift: ok then ok. is noticed; same tone is not', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  await s.engine.simulate(s.room, 'tone', a);
  assert.ok(s.writer.calls.some((c) => c.kind === 'tone_shift'));
  s.writer.calls.length = 0;
  await say(s, a, 'ok');
  await say(s, a, 'ok');
  assert.equal(s.writer.calls.filter((c) => c.kind === 'tone_shift').length, 0);
});

test('topic derail and mewing reminder fire from staged moments', async () => {
  const s = setup();
  await s.engine.simulate(s.room, 'derail');
  assert.ok(s.writer.calls.some((c) => c.kind === 'derail'));
  const s2 = setup();
  await s2.engine.simulate(s2.room, 'argument');
  assert.ok(s2.bus.ai().some((t) => /mew/i.test(t)));
});

test('simp radar: fast to one person, slow to everyone else, once per pair', async () => {
  const s = setup();
  s.engine.addBots(s.room);
  await s.engine.simulate(s.room, 'simp', 'bot-aman');
  const calls = () => s.writer.calls.filter((c) => c.kind === 'simp_radar');
  assert.equal(calls().length, 1);
  assert.match(calls()[0]!.fact, /replies to .+ in .+ on average but to everyone else in/);
  await s.engine.simulate(s.room, 'simp', 'bot-aman');
  assert.equal(calls().length, 1, 'fires once per pair');
});

test('Duolingo owl: after 9pm, 4h of silence, once per day', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  s.room.tzOffsetMin = ((17 - new Date().getUTCHours() + 24) % 24) * 60; // 5pm now, so +5h is 10pm
  await say(s, a, 'hello');
  s.engine.warp(s.room, 5 * 3_600_000);
  assert.ok(s.room.localHour() >= 21);
  await tick();
  const owls = () => s.bus.ai().filter((t) => t.includes('🦉'));
  assert.equal(owls().length, 1);
  assert.match(owls()[0]!, /Aman has not replied in 5\.0h/);
  s.engine.tick(s.room);
  assert.equal(owls().length, 1);
});

test('missing-person poster: card after 6h of silence, re-armed when they speak', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  await say(s, a, 'hello');
  s.engine.warp(s.room, 7 * 3_600_000);
  const posters = cards(s, 'poster');
  assert.equal(posters.length, 1);
  assert.equal((posters[0]!.card as any).name, 'Aman');
  s.engine.tick(s.room);
  assert.equal(cards(s, 'poster').length, 1);
  await say(s, a, 'back');
  s.engine.warp(s.room, 7 * 3_600_000);
  assert.equal(cards(s, 'poster').length, 2);
});

test('betrayal: left on read by someone marked online elsewhere', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const b = s.add('b', 'Riya');
  s.engine.setElsewhere(s.room, b, true);
  const r = await say(s, a, 'did you see this');
  s.engine.seen(s.room, b, r.id);
  s.engine.warp(s.room, 31 * 60_000);
  await tick();
  assert.ok(s.writer.calls.some((c) => c.kind === 'betrayal' && c.name === 'Riya'));
  assert.ok(!s.writer.calls.some((c) => c.kind === 'left_on_read'));
  assert.equal(s.room.getStats(b).ghosts, 1);
});

test('scouter: crossing 9000 power announces once; admin aura moves the ledger', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  s.engine.adminAura(s.room, a, 10_000);
  s.engine.tick(s.room);
  await tick();
  assert.ok(s.room.members.get(a)!.stats.power >= 9000);
  const scouts = () => s.bus.ai().filter((t) => /Power level|scouter/.test(t));
  assert.equal(scouts().length, 1);
  s.engine.tick(s.room);
  assert.equal(scouts().length, 1);
  assert.equal(s.room.ledger.at(-1)!.reason, 'manual');
  s.engine.adminAura(s.room, a, 99_999_999);
  assert.equal(s.room.ledger.at(-1)!.delta, 10_000, 'clamped');
});

test('class evolution is announced once a member has some history', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  s.add('b', 'Riya');
  for (let i = 0; i < 3; i++) await say(s, a, `message ${i} about stuff`);
  s.engine.tick(s.room);
  const st = s.room.getStats(a);
  Object.assign(st, { bursts: 3, ohioHigh: 2 });
  s.room.membersDirty = true;
  s.engine.tick(s.room);
  await tick();
  assert.equal(s.room.members.get(a)!.stats.klass, 'instigator');
  assert.ok(s.bus.ai().some((t) => /evolved|class change/.test(t) && /Instigator/.test(t)));
});

test('comeback: a reply that earns two reactions mogs the person it answered', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const b = s.add('b', 'Riya');
  const c = s.add('c', 'Dev');
  const d = s.add('d', 'Kay');
  const first = await say(s, a, 'my aura is unmatched');
  const reply = await say(s, b, 'your aura is a rumor', first.id);
  s.engine.reactTo(s.room, c, reply.id, '💀');
  assert.equal(s.room.members.get(b)!.aura, 0, 'one reaction is not enough');
  s.engine.reactTo(s.room, d, reply.id, '😭');
  assert.equal(s.room.members.get(b)!.aura, 1000);
  assert.equal(s.room.getStats(b).mogs, 1);
  assert.ok(s.bus.ai().some((t) => /mogged/.test(t)));
  s.engine.reactTo(s.room, c, reply.id, '🗿');
  assert.equal(s.room.members.get(b)!.aura, 1000, 'only mogs once per message');
});

test('reactions: toggle, allowed emoji only, members only, author does not count toward a mog', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const b = s.add('b', 'Riya');
  const r = await say(s, a, 'hello');
  s.engine.reactTo(s.room, b, r.id, '💀');
  assert.deepEqual(s.room.messages.find((m) => m.id === r.id)!.reactions, { '💀': [b] });
  s.engine.reactTo(s.room, b, r.id, '💀');
  assert.deepEqual(s.room.messages.find((m) => m.id === r.id)!.reactions, {});
  s.engine.reactTo(s.room, b, r.id, '<script>');
  s.engine.reactTo(s.room, 'ghost', r.id, '💀');
  assert.deepEqual(s.room.messages.find((m) => m.id === r.id)!.reactions, {});
});

test('replyToId only links to a real user message', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const first = await say(s, a, 'one');
  const ok = await say(s, a, 'two', first.id);
  const bad = await say(s, a, 'three', 'does-not-exist');
  assert.equal(s.room.messages.find((m) => m.id === ok.id)!.replyToId, first.id);
  assert.equal(s.room.messages.find((m) => m.id === bad.id)!.replyToId, undefined);
});

test('vibe: any member can switch persona; throttled; junk ignored', () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  s.engine.setVibe(s.room, a, { persona: 'nature', brainrot: 3 });
  assert.equal(s.room.settings.persona, 'nature');
  assert.equal(s.room.settings.brainrot, 3);
  s.engine.setVibe(s.room, a, { persona: 'mom' });
  assert.equal(s.room.settings.persona, 'nature', 'throttled');
  s.engine.setVibe(s.room, 'ghost', { persona: 'mom' });
  assert.equal(s.room.settings.persona, 'nature');
});

test('jumpscare: off by default, fires on the tick once enabled and due', () => {
  const s = setup();
  s.add('a', 'Aman');
  s.engine.tick(s.room);
  assert.equal(s.bus.of('fx').filter(([f]) => f.kind === 'jumpscare').length, 0);
  s.engine.setSettings(s.room, { jumpscare: true });
  s.engine.tick(s.room);
  assert.equal(s.bus.of('fx').filter(([f]) => f.kind === 'jumpscare').length, 0, 'not immediately');
  s.room.lastJumpscareAt = Date.now() - 200_000;
  s.engine.tick(s.room);
  assert.equal(s.bus.of('fx').filter(([f]) => f.kind === 'jumpscare').length, 1);
});

test('members carry coins, stats and a creature; forced canned lines never leak raw placeholders', async () => {
  const s = setup();
  s.add('a', 'Aman');
  s.engine.addBots(s.room);
  const m = s.room.members.get('bot-riya')!;
  assert.equal(m.coins, 1000);
  assert.ok(m.stats.creature && m.stats.tier);
  for (const k of ['ohio_high', 'cap', 'simp_radar', 'owl', 'class_change', 'scouter', 'tone_shift', 'betrayal', 'missing', 'mog', 'lore'] as const) {
    s.bus.clear();
    s.writer.reply = null;
    await s.engine.force(s.room, k, 'a');
    assert.ok(!/\{\w+\}/.test(s.bus.ai().at(-1) ?? ''), `${k}: ${s.bus.ai().at(-1)}`);
  }
});

test('staged moments never post as real players', async () => {
  const s = setup();
  s.add('h1', 'Human One');
  s.add('h2', 'Human Two');
  const before = s.room.messages.length;
  for (const k of ['simp', 'argument', 'derail', 'slow_reply', 'left_on_read', 'dead_chat'] as const) await s.engine.simulate(s.room, k);
  const authors = new Set(s.room.messages.filter((m) => m.kind === 'user').map((m) => m.authorId));
  assert.ok(s.room.messages.length > before);
  assert.ok(![...authors].some((a) => a === 'h1' || a === 'h2'), `authors: ${[...authors]}`);
});
