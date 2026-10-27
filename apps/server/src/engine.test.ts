import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.test-util.js';
import { applySettingsPatch } from './settings.js';
import { DEFAULT_SETTINGS } from '@cooked/shared';

async function say(s: ReturnType<typeof setup>, id: string, text: string) {
  const r = s.engine.send(s.room, id, text);
  assert.ok(r.ok, JSON.stringify(r));
  await r.done;
  return r;
}

test('67: +67 aura, shake + emoji rain + vine boom, instant canned line (LLM not called), 🗿 reaction', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  await say(s, a, '67');
  assert.equal(s.room.members.get(a)!.aura, 67);
  assert.deepEqual(s.bus.of('fx').map(([f]) => f.kind), ['shake', 'emojiRain']);
  assert.deepEqual(s.bus.of('sound'), [[{ name: 'vineBoom' }]]);
  assert.equal(s.writer.calls.length, 0);
  assert.equal(s.bus.ai().length, 1);
  assert.deepEqual(s.room.messages.find((m) => m.kind === 'user')!.aiReactions, ['🗿']);
  assert.equal(s.room.ledger[0]!.receipt, '67');
});

test('food mention: -50 fanum tax, canned line, no LLM call', async () => {
  const s = setup();
  const a = s.add('a', 'Riya');
  await say(s, a, 'lets get pizza tonight');
  assert.equal(s.room.members.get(a)!.aura, -50);
  assert.equal(s.writer.calls.length, 0);
  assert.equal(s.bus.ai().length, 1);
});

test('dry reply: LLM line posted, no aura change', async () => {
  const s = setup();
  const a = s.add('a', 'Dev');
  await say(s, a, 'k');
  assert.equal(s.room.members.get(a)!.aura, 0);
  assert.equal(s.writer.calls.length, 1);
  assert.match(s.writer.calls[0]!.fact, /dry reply/);
  assert.deepEqual(s.bus.ai(), ['LLM LINE']);
});

test('writer returns null -> canned fallback still posts a line', async () => {
  const s = setup();
  s.writer.reply = null;
  const a = s.add('a', 'Dev');
  await say(s, a, 'k');
  assert.equal(s.bus.ai().length, 1);
  assert.notEqual(s.bus.ai()[0], 'LLM LINE');
});

test('typing drama: -300 when typing >= threshold then sending a crumb', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  s.engine.typing(s.room, a, { state: 'start', len: 1 });
  s.room.typing.get(a)!.startedAt = Date.now() - 31_000;
  await say(s, a, 'ok');
  assert.equal(s.room.members.get(a)!.aura, -300);
  assert.match(s.writer.calls[0]!.fact, /typed for 3\d seconds/);
});

test('typing a long time then sending a real sentence is NOT typing drama', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  s.engine.typing(s.room, a, { state: 'start', len: 1 });
  s.room.typing.get(a)!.startedAt = Date.now() - 60_000;
  await say(s, a, 'here is a proper thoughtful reply');
  assert.equal(s.room.members.get(a)!.aura, 0);
});

test('typed then deleted: comment only after the threshold and with enough characters', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  s.engine.typing(s.room, a, { state: 'start', len: 5 });
  s.engine.typing(s.room, a, { state: 'tick', len: 40 });
  s.engine.typing(s.room, a, { state: 'stop', len: 0, cleared: true }); // too quick
  assert.equal(s.writer.calls.length, 0);
  s.engine.typing(s.room, a, { state: 'start', len: 5 });
  s.engine.typing(s.room, a, { state: 'tick', len: 40 });
  s.room.typing.get(a)!.startedAt = Date.now() - 12_000;
  s.engine.typing(s.room, a, { state: 'stop', len: 0, cleared: true });
  await new Promise((r) => setImmediate(r));
  assert.equal(s.writer.calls.length, 1);
  assert.match(s.writer.calls[0]!.fact, /deleted it all/);
});

test('slow reply: -400 after a 4h warp, applied to the replier only', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const b = s.add('b', 'Riya');
  await say(s, a, 'are you coming tomorrow?');
  s.engine.warp(s.room, 4 * 3_600_000);
  await say(s, b, 'yes');
  assert.equal(s.room.members.get(b)!.aura, -400);
  assert.equal(s.room.members.get(a)!.aura, 0);
});

test('replying to yourself after a long gap is not a slow reply', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  await say(s, a, 'hello');
  s.engine.warp(s.room, 4 * 3_600_000);
  await say(s, a, 'anyone');
  assert.equal(s.room.members.get(a)!.aura, 0);
});

test('quick reply in a live convo: +100, but only once per farm-guard window', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const b = s.add('b', 'Riya');
  await say(s, a, 'hey');
  await say(s, a, 'whats up');
  await say(s, b, 'yo what is up'); // 3 msgs in the last 2 min, gap < 20s
  assert.equal(s.room.members.get(b)!.aura, 100);
  await say(s, a, 'nm');
  await say(s, b, 'cool cool');
  assert.equal(s.room.members.get(b)!.aura, 100);
});

test('"reply later": -500', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  await say(s, a, "wait I'll reply later");
  assert.equal(s.room.members.get(a)!.aura, -500);
});

test('burst fires exactly once, on the Nth message', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  for (let i = 0; i < 6; i++) await say(s, a, `message number ${i} here`);
  assert.equal(s.writer.calls.filter((c) => c.kind === 'burst').length, 1);
});

test('cooldown suppresses a second non-67 comment, but 67 always lands', async () => {
  const s = setup();
  s.room.settings.timings.commentCooldownMs = 60_000;
  const a = s.add('a', 'Aman');
  await say(s, a, 'k');
  await say(s, a, 'ok');
  assert.equal(s.bus.ai().length, 1);
  await say(s, a, '67');
  assert.equal(s.bus.ai().length, 2);
});

test('commentary off: no AI lines, fx or sounds, but aura and cooked still update', async () => {
  const s = setup();
  s.engine.setSettings(s.room, { commentary: false });
  const a = s.add('a', 'Aman');
  await say(s, a, '67');
  assert.equal(s.bus.ai().length, 0);
  assert.equal(s.bus.of('fx').length, 0);
  assert.equal(s.room.members.get(a)!.aura, 67);
  assert.ok(s.room.cooked.value > 0);
});

test('edit/delete: author only; deleted text is never broadcast; original kept server-side', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const b = s.add('b', 'Riya');
  const r = await say(s, a, 'secret plan');
  assert.equal(s.engine.edit(s.room, b, r.id, 'hacked'), 'cannot edit that');
  assert.equal(s.engine.edit(s.room, a, r.id, 'public plan'), null);
  assert.equal(s.room.originals.get(r.id), 'secret plan');
  assert.equal(s.engine.delete(s.room, b, r.id), 'cannot delete that');
  assert.equal(s.engine.delete(s.room, a, r.id), null);
  const updates = s.bus.of('chat:update').map(([m]) => m);
  assert.ok(updates.every((m: any) => !JSON.stringify(m).includes('secret plan')));
  assert.equal(updates.at(-1).text, '');
  assert.equal(updates.at(-1).deleted, true);
});

test('meltdown fires once at 100%, again only after the room cools', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  s.engine.setCooked(s.room, 99);
  await say(s, a, '67');
  assert.equal(s.bus.of('fx').filter(([f]) => f.kind === 'meltdown').length, 1);
  assert.ok(s.bus.ai().some((t) => t.includes('OVER')));
  s.engine.setCooked(s.room, 100);
  assert.equal(s.bus.of('fx').filter(([f]) => f.kind === 'meltdown').length, 1);
  s.room.cooked = { value: 30, armed: false };
  s.room.lastTickAt = Date.now() - 1000;
  s.engine.tick(s.room);
  assert.equal(s.room.cooked.armed, true);
  s.engine.setCooked(s.room, 100);
  assert.equal(s.bus.of('fx').filter(([f]) => f.kind === 'meltdown').length, 2);
});

test('tick: dead chat prompt after the configured silence, once', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  await say(s, a, 'hello there');
  s.bus.clear();
  s.engine.warp(s.room, 6 * 60_000);
  s.engine.tick(s.room);
  assert.equal(s.bus.ai().length, 1);
  s.engine.warp(s.room, 60_000);
  assert.equal(s.bus.ai().length, 1);
});

test('tick: left on read fires for a viewer who saw it and stayed silent', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const b = s.add('b', 'Riya');
  const r = await say(s, a, 'did you get my message');
  s.engine.seen(s.room, b, r.id);
  s.engine.warp(s.room, 31 * 60_000);
  await new Promise((r2) => setImmediate(r2));
  assert.equal(s.writer.calls.filter((c) => c.kind === 'left_on_read').length, 1);
  assert.equal(s.writer.calls.find((c) => c.kind === 'left_on_read')!.name, 'Riya');
  s.engine.tick(s.room);
  await new Promise((r2) => setImmediate(r2));
  assert.equal(s.writer.calls.filter((c) => c.kind === 'left_on_read').length, 1);
});

test('tick: not left-on-read if the viewer replied', async () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const b = s.add('b', 'Riya');
  const r = await say(s, a, 'did you get my message');
  s.engine.seen(s.room, b, r.id);
  await say(s, b, 'yes got it');
  s.engine.warp(s.room, 31 * 60_000);
  await new Promise((r2) => setImmediate(r2));
  assert.equal(s.writer.calls.filter((c) => c.kind === 'left_on_read').length, 0);
});

test('tick: 3am fires Tung Tung once per night', async () => {
  const s = setup();
  s.add('a', 'Aman');
  const utcHour = new Date().getUTCHours();
  s.room.tzOffsetMin = ((3 - utcHour + 24) % 24) * 60;
  assert.equal(s.room.localHour(), 3);
  s.engine.tick(s.room);
  s.engine.tick(s.room);
  await new Promise((r) => setImmediate(r));
  assert.equal(s.bus.of('sound').filter(([x]) => x.name === 'tungTung').length, 1);
});

test('rate limit: the 7th message in 5s is rejected, bots exempt', () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  const results = Array.from({ length: 7 }, (_, i) => s.engine.send(s.room, a, `m${i}`));
  assert.equal(results.filter((r) => r.ok).length, 6);
  assert.deepEqual(results[6], { ok: false, error: 'slow down' });
});

test('input validation: empty, whitespace, non-member, over-long', () => {
  const s = setup();
  const a = s.add('a', 'Aman');
  assert.deepEqual(s.engine.send(s.room, a, '   '), { ok: false, error: 'empty message' });
  assert.deepEqual(s.engine.send(s.room, 'ghost', 'hi'), { ok: false, error: 'not in room' });
  const r = s.engine.send(s.room, a, 'x'.repeat(5000));
  assert.ok(r.ok);
  assert.equal(s.room.messages.at(-1)!.text.length, 500);
});

test('join validation and reconnect keeps aura', async () => {
  const s = setup();
  assert.equal(s.engine.join(s.room, { code: 'TEST', memberId: 'x', name: '  ', avatar: 'cat' }, 's').ok, false);
  assert.equal(s.engine.join(s.room, { code: 'TEST', memberId: 'x', name: 'Zed', avatar: 'nope' as any }, 's').ok, false);
  const a = s.add('a', 'Aman');
  await say(s, a, '67');
  s.engine.leave(s.room, a, 's-a');
  assert.equal(s.room.members.get(a)!.online, false);
  s.engine.join(s.room, { code: 'TEST', memberId: a, name: 'Aman', avatar: 'cat' }, 's2');
  assert.equal(s.room.members.get(a)!.aura, 67);
  assert.equal(s.room.members.get(a)!.online, true);
});

test('simulate: typing_drama, slow_reply, burst and left_on_read stage the real detectors', async () => {
  const s = setup();
  s.engine.addBots(s.room);
  await s.engine.simulate(s.room, 'typing_drama', 'bot-aman');
  assert.equal(s.room.members.get('bot-aman')!.aura, -300);
  await s.engine.simulate(s.room, 'slow_reply', 'bot-riya');
  assert.equal(s.room.members.get('bot-riya')!.aura, -400);
  s.writer.calls.length = 0;
  await s.engine.simulate(s.room, 'burst', 'bot-dev');
  assert.equal(s.writer.calls.filter((c) => c.kind === 'burst').length, 1);
  await s.engine.simulate(s.room, 'left_on_read', 'bot-dev');
  await new Promise((r) => setImmediate(r));
  assert.equal(s.writer.calls.filter((c) => c.kind === 'left_on_read').length, 1);
});

test('settings patch: validates ranges and ignores junk', () => {
  const next = applySettingsPatch(DEFAULT_SETTINGS, { brainrot: 9 as any, intensity: 3, persona: 'nope' as any, commentary: 'yes' as any, timings: { typingDramaMs: 5, slowReplyMs: 1e12, burstCount: 1, bogus: 3 } as any });
  assert.equal(next.brainrot, DEFAULT_SETTINGS.brainrot);
  assert.equal(next.intensity, 3);
  assert.equal(next.persona, DEFAULT_SETTINGS.persona);
  assert.equal(next.commentary, true);
  assert.equal(next.timings.typingDramaMs, 200);
  assert.equal(next.timings.slowReplyMs, 7 * 24 * 60 * 60_000);
  assert.equal(next.timings.burstCount, 2);
  assert.ok(!('bogus' in next.timings));
  const more = applySettingsPatch(DEFAULT_SETTINGS, { chaos: true, jumpscare: true, rival: 'boomer', persona: 'mom' });
  assert.deepEqual([more.chaos, more.jumpscare, more.rival, more.persona], [true, true, 'boomer', 'mom']);
  assert.equal(applySettingsPatch(more, { rival: null }).rival, null);
  assert.equal(applySettingsPatch(more, { rival: 'nope' as any }).rival, 'boomer');
  assert.notEqual(next.timings, DEFAULT_SETTINGS.timings);
});
