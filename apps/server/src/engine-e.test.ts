import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '@cooked/shared';
import type { ChatMessage } from '@cooked/shared';
import { setup } from './helpers.test-util.js';
import { applySettingsPatch } from './settings.js';
import { LlmRouter } from './llm/router.js';

type S = ReturnType<typeof setup>;
async function say(s: S, id: string, text: string) {
  const r = s.engine.send(s.room, id, text);
  assert.ok(r.ok, JSON.stringify(r));
  await r.done;
}
/** no two AI turns in a row: between any two AI turns there is at least one user message (a turn may be several AI lines) */
function assertNeverTwoInARow(msgs: ChatMessage[]) {
  let sawUserSinceTurn = true;
  let prevWasAi = false;
  for (const m of msgs) {
    const ai = m.kind === 'ai' || (m.kind === 'card' && !!m.trigger);
    if (ai && !prevWasAi) {
      assert.ok(sawUserSinceTurn, `two AI turns in a row at "${m.text}"`);
      sawUserSinceTurn = false;
    }
    if (m.kind === 'user') sawUserSinceTurn = true;
    prevWasAi = ai;
  }
}
const aiLines = (s: S) => s.room.messages.filter((m) => m.kind === 'ai');

test('budget: ordinary triggers speak at most once per aiEvery messages, and the rest get a quiet emoji instead', async () => {
  const s = setup();
  s.room.settings.aiEvery = 4;
  const [a, b] = [s.add('a', 'Aman'), s.add('b', 'Riya')];
  const dry = ['k', 'ok', 'fine', 'sure', 'hmm', 'k', 'ok', 'fine', 'sure', 'hmm', 'k', 'ok'];
  for (const [i, t] of dry.entries()) await say(s, i % 2 ? b : a, t);
  const lines = aiLines(s).length;
  assert.ok(lines >= 2 && lines <= 3, `12 dry texts, aiEvery 4: got ${lines} AI lines`);
  assertNeverTwoInARow(s.room.messages);
  const quiet = s.room.messages.filter((m) => m.kind === 'user' && m.aiReactions.includes('💀')).length;
  assert.ok(quiet >= 10, `every dry text was noticed with an emoji (${quiet})`);
});

test('budget: core jokes need half the budget, big moments one message, and never two AI turns in a row', async () => {
  const s = setup();
  s.room.settings.aiEvery = 4;
  const [a, b] = [s.add('a', 'Aman'), s.add('b', 'Riya')];
  for (const [i, t] of ["wait I'll reply later", 'reply later lol', "i'll text later", 'later reply ok'].entries()) await say(s, i % 2 ? b : a, t);
  assert.equal(aiLines(s).length, 2, 'priority 8 with aiEvery 4: every 2nd message');
  await say(s, a, '67');
  await say(s, b, '67');
  assert.equal(aiLines(s).length, 4, '67 lands whenever a human spoke since the last AI line');
  assertNeverTwoInARow(s.room.messages);
});

test('budget: timers never stack an AI turn on top of another one', async () => {
  const s = setup();
  const [a, b] = [s.add('a', 'Aman'), s.add('b', 'Riya')];
  await say(s, a, 'k'); // the AI roasts this
  assert.equal(aiLines(s).length, 1);
  s.engine.warp(s.room, 6 * 60_000);
  assert.equal(s.room.messages.filter((m) => m.trigger === 'dead_chat' || m.trigger === 'copypasta').length, 0, 'last word was the AI: no dead-chat revival');
  await say(s, b, 'anyone?');
  s.engine.warp(s.room, 6 * 60_000);
  assert.equal(s.room.messages.filter((m) => m.trigger === 'dead_chat' || m.trigger === 'copypasta').length, 1);
  assertNeverTwoInARow(s.room.messages);
});

test('budget: settings patch clamps aiEvery and accepts the duel switch', () => {
  assert.equal(applySettingsPatch(DEFAULT_SETTINGS, { aiEvery: -3 }).aiEvery, 0);
  assert.equal(applySettingsPatch(DEFAULT_SETTINGS, { aiEvery: 99 }).aiEvery, 20);
  assert.equal(applySettingsPatch(DEFAULT_SETTINGS, { aiEvery: 'x' as any }).aiEvery, DEFAULT_SETTINGS.aiEvery);
  assert.equal(applySettingsPatch(DEFAULT_SETTINGS, { duel: true }).duel, true);
  assert.equal(DEFAULT_SETTINGS.aiEvery, 4);
  assert.equal(DEFAULT_SETTINGS.duel, false);
});

test('duel: each AI turn is Groq then Ollama, contrasting personas, labelled with the model that wrote it', async () => {
  const s = setup();
  s.engine.setSettings(s.room, { duel: true, persona: 'gremlin' });
  const a = s.add('a', 'Aman');
  await say(s, a, "wait I'll reply later");
  const [g, o] = aiLines(s);
  assert.deepEqual([g?.side, o?.side], ['groq', 'ollama']);
  assert.deepEqual([g?.persona, o?.persona], ['gremlin', 'boomer']);
  assert.deepEqual([g?.model, o?.model], ['groq-120b', 'ollama']);
  assert.deepEqual(s.writer.calls.map((c) => c.prefer), ['groq', 'ollama']);
  assert.equal(s.writer.calls[1]!.rivalOf?.line, 'LLM LINE', 'Ollama answers what Groq said');

  await say(s, a, '67');
  const instant = aiLines(s).slice(-2);
  assert.deepEqual(instant.map((m) => [m.side, m.model]), [['groq', 'canned'], ['ollama', 'canned']]);
});

test('duel: in a lull the two AIs roast each other once, and a human message re-arms it', async () => {
  const s = setup();
  s.engine.setSettings(s.room, { duel: true, persona: 'nature' });
  const [a, b] = [s.add('a', 'Aman'), s.add('b', 'Riya')];
  await say(s, a, 'hello there');
  await say(s, b, 'hey hey');
  s.engine.warp(s.room, s.room.settings.timings.duelLullMs + 1000);
  await new Promise((r) => setTimeout(r, 5));
  const duel = () => s.room.messages.filter((m) => m.trigger === 'duel');
  assert.deepEqual(duel().map((m) => m.side), ['groq', 'ollama', 'groq']);
  assert.deepEqual(duel().map((m) => m.persona), ['nature', 'boomer', 'nature']);
  assert.ok(duel().every((m) => !/\{\w+\}/.test(m.text)), 'canned lines have their names filled in');
  assert.deepEqual(s.writer.said.map((p) => p.prefer), ['groq', 'ollama', 'groq']);
  assert.match(s.writer.said[0]!.system, /running on Groq/);
  assert.match(s.writer.said[0]!.system, /Confused Boomer, running on Ollama Cloud/);
  assert.match(s.writer.said[1]!.user, /The other AI just said/);

  s.engine.tick(s.room);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(duel().length, 3, 'once per lull');
  s.writer.sayReply = 'your weights are mid';
  await say(s, a, 'ok we are back');
  s.engine.warp(s.room, s.room.settings.timings.duelLullMs + 1000);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(duel().length, 6, 'a human message re-armed it');
  assert.deepEqual(duel().slice(3).map((m) => m.text), ['your weights are mid (groq)', 'your weights are mid (ollama)', 'your weights are mid (groq)']);
  assert.deepEqual(duel().slice(3).map((m) => m.model), ['groq-120b', 'ollama', 'groq-120b']);
});

test('duel: off means no banter; the admin can still force one exchange', async () => {
  const s = setup();
  const [a, b] = [s.add('a', 'Aman'), s.add('b', 'Riya')];
  await say(s, a, 'hello there');
  await say(s, b, 'hey hey');
  s.engine.warp(s.room, s.room.settings.timings.duelLullMs + 1000);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(s.room.messages.filter((m) => m.trigger === 'duel').length, 0);
  await s.engine.force(s.room, 'duel');
  assert.equal(s.room.messages.filter((m) => m.trigger === 'duel').length, 3);
});

test('router: prefer puts a provider family first and still falls back', async () => {
  const mk = (name: string, ok: boolean) => ({ name, complete: async () => { if (!ok) throw new Error('down'); return `from ${name}`; } });
  const opts = { attemptTimeoutMs: 100, deadlineMs: 500, defaultCooldownMs: 1000 };
  const r = new LlmRouter([mk('groq-120b', true), mk('ollama', true)], opts);
  assert.equal((await r.complete([], 'ollama'))?.provider, 'ollama');
  assert.equal((await r.complete([], 'groq'))?.provider, 'groq-120b');
  assert.equal((await r.complete([]))?.provider, 'groq-120b');
  const down = new LlmRouter([mk('groq-120b', true), mk('ollama', false)], opts);
  assert.equal((await down.complete([], 'ollama'))?.provider, 'groq-120b', 'Ollama down: Groq covers its line');
});
