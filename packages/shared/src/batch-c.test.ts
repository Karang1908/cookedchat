import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAwards, computeWrapped, buildRecap, computePublicStats, emptyStats, CANNED, RIVAL_RETORTS, PERSONAS } from './index.js';
import type { AwardInput, Member } from './index.js';

const pub = (over: Partial<ReturnType<typeof base>> = {}) => ({ ...base(), ...over });
function base() {
  return { messages: 5, avgReplyMs: 20_000 as number | null, rizz: 50, rizzTitle: 'Mid Rizz', ohioAvg: 5, ohioPeak: 10, mogs: 0, dry: 0, ghosts: 0, klass: 'lurker' as const, creature: 'lirili' as const, tier: 'beta' as const, power: 500 };
}
const mem = (id: string, name: string, aura: number, p = {}, extra: Partial<AwardInput> = {}): AwardInput => ({ id, name, aura, stats: pub(p), typingDramas: 0, uncMoments: 0, diabolical: 0, ...extra });

test('awards: each category goes to the right person and only when earned', () => {
  const awards = computeAwards([
    mem('a', 'Aman', 900, { rizz: 85, rizzTitle: 'Rizzler' }),
    mem('b', 'Riya', -400, { dry: 5, ghosts: 3, avgReplyMs: 7_200_000 }, { typingDramas: 2, uncMoments: 3 }),
    mem('c', 'Dev', 50, { ohioAvg: 60, ohioPeak: 95, avgReplyMs: 2_000 }, { diabolical: 80 }),
  ]);
  const by = Object.fromEntries(awards.map((x) => [x.title, x.name]));
  assert.equal(by['Main Character'], 'Aman');
  assert.equal(by['NPC Energy'], 'Riya');
  assert.equal(by['Ghost of the Week'], 'Riya');
  assert.equal(by['Fastest Fingers'], 'Dev');
  assert.equal(by['Most Diabolical'], 'Dev');
  assert.equal(by['Typing Drama Queen'], 'Riya');
  assert.equal(by['Ohio Resident'], 'Dev');
  assert.equal(by['Certified Unc'], 'Riya');
  assert.equal(by['Rizzler'], 'Aman');
});

test('awards: nothing to give to a quiet room, nobody wins what they did not earn', () => {
  assert.deepEqual(computeAwards([mem('a', 'Solo', 100)]), []);
  const flat = computeAwards([mem('a', 'A', 0), mem('b', 'B', 0)]);
  const titles = flat.map((x) => x.title);
  for (const t of ['Most Diabolical', 'Typing Drama Queen', 'Ohio Resident', 'Certified Unc', 'Rizzler', 'Main Character']) assert.ok(!titles.includes(t), t);
});

test('wrapped: percentages always sum to 100, sorted, final form is the creature', () => {
  for (const [ohio, dry, rizz] of [[80, 0, 30], [0, 8, 20], [5, 1, 90], [0, 0, 50]] as const) {
    const m: Member = { id: 'x', name: 'Aman', avatar: 'cat', isBot: false, online: true, aura: 0, coins: 1000, elsewhere: false, stats: { ...pub({ ohioAvg: ohio, dry, rizz }), creature: 'cappuccino' } };
    const raw = { ...emptyStats(), bursts: 1 };
    const w = computeWrapped(m, raw);
    assert.equal(w.breakdown.reduce((t, b) => t + b.pct, 0), 100, JSON.stringify(w.breakdown));
    assert.deepEqual(w.breakdown.map((b) => b.pct), [...w.breakdown.map((b) => b.pct)].sort((a, b) => b - a));
    assert.equal(w.finalForm, 'Cappuccino Assassino');
  }
  const chaos = computeWrapped({ id: 'x', name: 'A', avatar: 'cat', isBot: false, online: true, aura: 0, coins: 0, elsewhere: false, stats: pub({ ohioAvg: 90, rizz: 20 }) }, emptyStats());
  assert.equal(chaos.breakdown[0]!.label, 'Skibidi');
  void computePublicStats;
});

test('recap: episodes from days, a single long day splits into thirds, biggest swing becomes the title', () => {
  const t0 = Date.UTC(2026, 9, 1, 12);
  const names = { a: 'Aman', b: 'Riya' };
  const msg = (at: number, who: string | null, text: string, kind = 'user', trigger?: string) => ({ at, authorId: who, kind, text, trigger });
  const two = buildRecap({
    names, tzOffsetMin: 0,
    messages: [msg(t0, 'a', 'hello'), msg(t0 + 1000, 'b', 'yo'), msg(t0 + 2000, null, 'roast', 'ai', 'dry_reply'), msg(t0 + 86_400_000, 'a', '67'), msg(t0 + 86_401_000, 'b', 'what')],
    ledger: [{ at: t0 + 86_400_500, memberId: 'a', delta: 67, reason: 'six_seven', receipt: '67' }, { at: t0 + 1500, memberId: 'b', delta: -500, reason: 'reply_later', receipt: 'later' }],
  });
  assert.equal(two.episodes.length, 2);
  assert.match(two.episodes[0]!.title, /Ep 1: The One Where Riya Promised to Reply Later/);
  assert.match(two.episodes[1]!.title, /Ep 2: The One Where Aman Said 67/);
  assert.match(two.episodes[1]!.cliffhanger, /Riya had just said: “what”/);
  assert.match(two.episodes[0]!.summary, /2 messages, 1 AI interruption over/);
  assert.match(two.episodes[1]!.summary, /2 messages, 0 AI interruptions over/);
  const one = buildRecap({ names, tzOffsetMin: 0, ledger: [], messages: [msg(t0, 'a', 'hi'), msg(t0 + 1000, 'a', 'hello')] });
  assert.match(one.episodes[0]!.summary, /^2 messages/);
  const single = buildRecap({ names, tzOffsetMin: 0, ledger: [], messages: [msg(t0, 'a', 'hi'), msg(t0 + 86_400_000, 'b', 'yo')] });
  assert.match(single.episodes[0]!.summary, /^1 message, 0 AI interruptions/);
  assert.match(two.title, /Season 1/);

  const long = buildRecap({ names, tzOffsetMin: 0, ledger: [], messages: Array.from({ length: 9 }, (_, i) => msg(t0 + i * 60_000, i % 2 ? 'b' : 'a', `message ${i}`)) });
  assert.equal(long.episodes.length, 3);
  assert.equal(buildRecap({ names, tzOffsetMin: 0, ledger: [], messages: [] }).episodes[0]!.title, 'Ep 1: The Pilot');
  const many = buildRecap({ names, tzOffsetMin: 0, ledger: [], messages: Array.from({ length: 12 }, (_, i) => msg(t0 + i * 86_400_000, 'a', `day ${i}`)) });
  assert.equal(many.episodes.length, 5, 'capped to the last five');
  assert.match(many.title, /Season 2/);
});

test('every trigger has canned lines and every persona has rival retorts', () => {
  for (const [k, v] of Object.entries(CANNED)) assert.ok(v.length, k);
  for (const p of Object.keys(PERSONAS)) assert.ok((RIVAL_RETORTS as Record<string, string[]>)[p]?.length, p);
});
