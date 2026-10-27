import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.test-util.js';

type S = ReturnType<typeof setup>;
const CLAIM = 'i swear i can literally run a marathon without even trying';
async function say(s: S, id: string, text: string) {
  const r = s.engine.send(s.room, id, text);
  assert.ok(r.ok, JSON.stringify(r));
  await r.done;
  return r;
}
const cards = (s: S, type: string) => s.room.messages.filter((m) => m.card?.type === type);
const lastCard = (s: S, type: string) => cards(s, type).at(-1)!;
const room4 = () => {
  const s = setup();
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((id, i) => s.add(id, ['Aman', 'Riya', 'Dev', 'Kay'][i]!));
  return { s, a: a!, b: b!, c: c!, d: d! };
};

// ------------------------------------------------------------------ votes
test('"is this real?" opens on a big claim; cap wins -> -200 aura; subject cannot vote; everyone voting settles early', async () => {
  const { s, a, b, c, d } = room4();
  await say(s, a, CLAIM);
  const vote = lastCard(s, 'vote');
  assert.equal((vote.card as any).style, 'real');
  assert.equal((vote.card as any).subjectId, a);
  assert.deepEqual(s.engine.games.castVote(s.room, a, vote.id, 'real'), { ok: false, error: "you can't vote on yourself" });
  assert.deepEqual(s.engine.games.castVote(s.room, b, vote.id, 'nonsense'), { ok: false, error: 'bad option' });
  assert.equal(s.engine.games.castVote(s.room, b, vote.id, 'cap').ok, true);
  assert.equal(s.engine.games.castVote(s.room, c, vote.id, 'cap').ok, true);
  assert.equal((vote.card as any).settled, undefined, 'still waiting for Kay');
  assert.equal(s.engine.games.castVote(s.room, d, vote.id, 'real').ok, true);
  assert.equal((vote.card as any).settled.winner, 'cap');
  const entry = s.room.ledger.find((e) => e.reason === 'cap')!;
  assert.equal(entry.delta, -200);
  assert.equal(entry.memberId, a);
  assert.ok(s.bus.ai().some((t) => /CAP/.test(t) && /2 🧢 vs 1 🗿|1 🗿 vs 2 🧢/.test(t)), s.bus.ai().join('|'));
  assert.equal(s.engine.games.castVote(s.room, b, vote.id, 'real').ok, false, 'closed');
});

test('vote: real wins -> +100; tie -> no aura; under 2 votes -> void; expiry settles on tick; only one vote per minute opens', async () => {
  const { s, a, b, c, d } = room4();
  await say(s, a, CLAIM);
  let v = lastCard(s, 'vote');
  for (const [m, o] of [[b, 'real'], [c, 'real'], [d, 'cap']] as const) s.engine.games.castVote(s.room, m, v.id, o);
  assert.equal((v.card as any).settled.winner, 'real');
  assert.equal(s.room.members.get(a)!.aura, 100 - 0 + (s.room.members.get(a)!.aura - 100));
  assert.ok(s.room.ledger.some((e) => e.reason === 'claim_real' && e.delta === 100));

  await say(s, b, CLAIM); // within a minute: no second vote
  assert.equal(cards(s, 'vote').length, 1);
  s.room.lastVoteAt = 0;
  await say(s, b, CLAIM + ' again');
  v = lastCard(s, 'vote');
  s.engine.games.castVote(s.room, a, v.id, 'real');
  s.engine.games.castVote(s.room, c, v.id, 'cap');
  assert.equal((v.card as any).settled, undefined);
  (v.card as any).closesAt = Date.now() - 1;
  s.engine.tick(s.room);
  assert.equal((v.card as any).settled.winner, 'tie');
  assert.ok(!s.room.ledger.some((e) => e.memberId === b && ['cap', 'claim_real'].includes(e.reason)));

  s.room.lastVoteAt = 0;
  await say(s, c, CLAIM + ' third');
  v = lastCard(s, 'vote');
  (v.card as any).closesAt = Date.now() - 1;
  s.engine.tick(s.room);
  assert.equal((v.card as any).settled.winner, 'void');
  s.engine.tick(s.room);
  assert.equal(cards(s, 'vote').filter((m) => (m.card as any).settled).length, 3);
  void d;
});

test('commentary off: no vote opens', async () => {
  const { s, a } = room4();
  s.engine.setSettings(s.room, { commentary: false });
  await say(s, a, CLAIM);
  assert.equal(cards(s, 'vote').length, 0);
});

// ------------------------------------------------------------------ hot takes
test('hot take: validated, rate limited, diabolical wins aura and the crown record', async () => {
  const { s, a, b, c, d } = room4();
  const g = s.engine.games;
  assert.equal(g.submitHotTake(s.room, a, 'no').ok, false);
  assert.deepEqual(g.submitHotTake(s.room, a, 'you are so ugly lol nobody agrees'), { ok: false, error: 'keep it about the take, not identity' });
  assert.equal(g.submitHotTake(s.room, 'ghost', 'cereal is soup obviously').ok, false);
  assert.equal(g.submitHotTake(s.room, a, 'cereal is soup obviously').ok, true);
  assert.deepEqual(g.submitHotTake(s.room, a, 'another take right away'), { ok: false, error: 'one hot take per 20 seconds' });
  const v = lastCard(s, 'vote');
  assert.equal((v.card as any).style, 'hottake');
  g.castVote(s.room, b, v.id, 'disagree');
  g.castVote(s.room, c, v.id, 'disagree');
  g.castVote(s.room, d, v.id, 'agree');
  assert.equal((v.card as any).settled.winner, 'disagree');
  assert.ok(s.room.ledger.some((e) => e.reason === 'hot_take' && e.delta === 300 && e.memberId === a));
  assert.equal(s.room.hotTakes.length, 1);
  assert.equal(s.room.hotTakes[0]!.diabolical, 67);
});

test('hot take: chat agrees -> no aura', async () => {
  const { s, a, b, c } = room4();
  s.engine.games.submitHotTake(s.room, a, 'pineapple on pizza is fine');
  const v = lastCard(s, 'vote');
  s.engine.games.castVote(s.room, b, v.id, 'agree');
  s.engine.games.castVote(s.room, c, v.id, 'agree');
  (v.card as any).closesAt = Date.now() - 1;
  s.engine.tick(s.room);
  assert.equal((v.card as any).settled.winner, 'agree');
  assert.equal(s.room.hotTakes.length, 0);
  assert.ok(!s.room.ledger.some((e) => e.reason === 'hot_take'));
});

// ------------------------------------------------------------------ market
test('market: validation, parimutuel payout on yes, and coins are conserved', async () => {
  const { s, a, b, c, d } = room4();
  const g = s.engine.games;
  const total = () => [...s.room.members.values()].reduce((t, m) => t + m.coins, 0);
  const before = total();
  assert.deepEqual(g.createBet(s.room, a, a), { ok: false, error: "you can't open a market on yourself" });
  assert.equal(g.createBet(s.room, b, a, 10).ok, true);
  assert.equal(g.createBet(s.room, c, a, 10).ok, false, 'one open market per person');
  const m = lastCard(s, 'bet');
  assert.match((m.card as any).question, /Will Aman reply in under 10 min\?/);
  assert.equal(g.placeBet(s.room, a, m.id, 'yes', 100).ok, false, 'subject cannot bet');
  assert.equal(g.placeBet(s.room, b, m.id, 'yes', 5).ok, false, 'minimum');
  assert.equal(g.placeBet(s.room, b, m.id, 'yes', 99999).ok, false, 'balance');
  assert.equal(g.placeBet(s.room, b, m.id, 'maybe' as any, 100).ok, false);
  assert.equal(g.placeBet(s.room, b, m.id, 'yes', 100).ok, true);
  assert.equal(g.placeBet(s.room, b, m.id, 'no', 100).ok, false, 'one bet each');
  g.placeBet(s.room, c, m.id, 'yes', 100);
  g.placeBet(s.room, d, m.id, 'no', 200);
  assert.equal(s.room.members.get(d)!.coins, 800);
  s.engine.warp(s.room, 2 * 60_000);
  await say(s, a, 'ok i replied');
  s.engine.tick(s.room);
  const settled = (m.card as any).settled;
  assert.equal(settled.outcome, 'yes');
  assert.deepEqual(settled.payouts, { [b]: 200, [c]: 200 });
  assert.equal(s.room.members.get(b)!.coins, 1100);
  assert.equal(s.room.members.get(d)!.coins, 800);
  assert.equal(total(), before, 'no coins created or destroyed');
  assert.ok(s.bus.ai().some((t) => /Market closed: Aman replied in/.test(t) && /YES wins/.test(t)));
});

test('market: no reply in time settles NO; nobody on the winning side refunds everyone', async () => {
  const { s, a, b, c } = room4();
  const g = s.engine.games;
  g.createBet(s.room, b, a, 5);
  const m = lastCard(s, 'bet');
  g.placeBet(s.room, b, m.id, 'yes', 100);
  g.placeBet(s.room, c, m.id, 'yes', 50);
  s.engine.warp(s.room, 6 * 60_000);
  assert.equal((m.card as any).settled.outcome, 'no');
  assert.deepEqual((m.card as any).settled.payouts, { [b]: 100, [c]: 50 }, 'refunded');
  assert.equal(s.room.members.get(b)!.coins, 1000);
  g.createBet(s.room, b, a, 5);
  s.engine.warp(s.room, 6 * 60_000);
  assert.match(s.bus.ai().at(-1)!, /Nobody bet/);
  assert.equal(g.placeBet(s.room, b, m.id, 'yes', 50).ok, false, 'closed');
});

test('market: a reply after the window still settles NO', async () => {
  const { s, a, b, c } = room4();
  s.engine.games.createBet(s.room, b, a, 1);
  const m = lastCard(s, 'bet');
  s.engine.games.placeBet(s.room, c, m.id, 'no', 100);
  s.engine.warp(s.room, 3 * 60_000 + 5_000);
  await say(s, a, 'sorry i was away');
  assert.equal((m.card as any).settled.outcome, 'no');
  assert.equal(s.room.members.get(c)!.coins, 1000, 'won back own stake as the only winner');
});

// ------------------------------------------------------------------ rizz battle
test('battle: validation, both entries judged by the heuristic, winner mogged +1000', async () => {
  const { s, a, b, c } = room4();
  const g = s.engine.games;
  assert.equal(g.startBattle(s.room, a, a).ok, false);
  assert.equal(g.startBattle(s.room, a, 'ghost').ok, false);
  assert.equal(g.startBattle(s.room, a, b).ok, true);
  assert.equal(g.startBattle(s.room, c, b).ok, false, 'already in a battle');
  const m = lastCard(s, 'battle');
  assert.equal(g.submitBattle(s.room, c, m.id, 'i am not even in this').ok, false);
  assert.equal(g.submitBattle(s.room, a, m.id, 'k').ok, false, 'too short');
  assert.equal(g.submitBattle(s.room, a, m.id, 'you are so ugly it hurts').ok, false, 'identity rizz refused');
  assert.equal(g.submitBattle(s.room, a, m.id, 'k. ok.').ok, true);
  assert.equal(g.submitBattle(s.room, a, m.id, 'twice').ok, false);
  g.submitBattle(s.room, b, m.id, 'you are genuinely funny and i am lucky to know you, want to get food? 😊');
  await new Promise((r) => setImmediate(r));
  assert.equal((m.card as any).settled.winnerId, b, 'sincere beats dry');
  assert.equal(s.room.members.get(b)!.aura, 1000);
  assert.equal(s.room.getStats(b).mogs, 1);
  assert.ok(s.bus.ai().some((t) => /wins the rizz battle/.test(t)));
});

test('battle: the LLM judge decides when it answers; garbage falls back to the heuristic', async () => {
  const { s, a, b } = room4();
  s.writer.generateReply = 'A: the confidence was unreal';
  s.engine.games.startBattle(s.room, a, b);
  let m = lastCard(s, 'battle');
  s.engine.games.submitBattle(s.room, a, m.id, 'k. ok.');
  s.engine.games.submitBattle(s.room, b, m.id, 'you are genuinely funny and i am lucky to know you');
  await new Promise((r) => setImmediate(r));
  assert.equal((m.card as any).settled.winnerId, a, 'LLM said A even though B looked better');
  assert.equal((m.card as any).settled.verdict, 'the confidence was unreal');
  assert.match(s.writer.generated[0]!.user, /Scenario: .+\nA \(Aman\): k\. ok\.\nB \(Riya\):/);

  const t = setup();
  const [x, y] = [t.add('x', 'Xan'), t.add('y', 'Yus')];
  t.writer.generateReply = 'lol idk both were fine';
  t.engine.games.startBattle(t.room, x, y);
  m = t.room.messages.findLast((q) => q.card?.type === 'battle')!;
  t.engine.games.submitBattle(t.room, x, m.id, 'you are genuinely funny and i am lucky to know you');
  t.engine.games.submitBattle(t.room, y, m.id, 'k. ok.');
  await new Promise((r) => setImmediate(r));
  assert.equal((m.card as any).settled.winnerId, x);
});

test('battle: forfeit wins, nobody-showed-up cancels, timeout settles on tick, bots submit for themselves', async () => {
  const { s, a, b } = room4();
  s.engine.games.startBattle(s.room, a, b);
  const m = lastCard(s, 'battle');
  s.engine.games.submitBattle(s.room, a, m.id, 'hello there, do you come here often?');
  (m.card as any).closesAt = Date.now() - 1;
  s.engine.tick(s.room);
  await new Promise((r) => setImmediate(r));
  assert.equal((m.card as any).settled.winnerId, a);
  assert.match((m.card as any).settled.verdict, /forfeit/);

  const t = room4();
  t.s.engine.games.startBattle(t.s.room, t.c, t.d);
  const m2 = lastCard(t.s, 'battle');
  (m2.card as any).closesAt = Date.now() - 1;
  t.s.engine.tick(t.s.room);
  await new Promise((r) => setImmediate(r));
  assert.equal((m2.card as any).settled.winnerId, null);
  assert.match(t.s.bus.ai().at(-1)!, /cancelled/);

  const u = setup();
  u.engine.addBots(u.room);
  u.engine.games.startBattle(u.room, 'bot-aman', 'bot-riya');
  await new Promise((r) => setImmediate(r));
  const m3 = lastCard(u, 'battle');
  assert.ok((m3.card as any).settled.winnerId, 'two bots battled to a result with no humans');
});

// ------------------------------------------------------------------ confessions
test('confession: anonymous (no author anywhere), fake-confidence guess, validated and rate limited', async () => {
  const { s, a } = room4();
  const g = s.engine.games;
  assert.equal(g.postConfession(s.room, a, 'hi').ok, false);
  assert.deepEqual(g.postConfession(s.room, a, 'i think my friend is so ugly honestly'), { ok: false, error: 'keep confessions about behavior, not identity' });
  assert.equal(g.postConfession(s.room, 'ghost', 'i never read this chat at all').ok, false);
  assert.equal(g.postConfession(s.room, a, 'i left everyone on read for a whole week').ok, true);
  assert.equal(g.postConfession(s.room, a, 'and then i did it again today').ok, false, 'rate limited');
  const m = lastCard(s, 'confession');
  const c = m.card as any;
  assert.ok(c.confidence >= 35 && c.confidence <= 89);
  assert.ok(s.room.members.has(c.guessId));
  const dump = JSON.stringify({ msg: m, all: s.room.messages, originals: [...s.room.originals] });
  assert.ok(!dump.includes(`"authorId":"${a}"`) || m.authorId === null);
  assert.equal(m.authorId, null);
  assert.equal(m.kind, 'card');
});

// ------------------------------------------------------------------ forecast / replay / chaos / copypasta
test('forecast: builds a card from real chat stats; rate limited', async () => {
  const { s, a } = room4();
  for (const t of ['k', 'ok', 'fine', 'sure']) await say(s, a, t);
  assert.equal(s.engine.games.forecast(s.room).ok, true);
  const w = lastCard(s, 'weather').card as any;
  assert.match(w.headline, /chance of passive-aggression/);
  assert.equal(s.engine.games.forecast(s.room).ok, false);
});

test('replay: needs an old message, picks the most Ohio one, roasts it, rate limited', async () => {
  const { s, a, b } = room4();
  assert.deepEqual(s.engine.games.replay(s.room), { ok: false, error: 'nothing old enough to replay yet' });
  await say(s, a, 'see you at five');
  await say(s, b, 'SKIBIDI OHIO SIGMA RIZZ!!!! 💀💀💀💀');
  s.engine.warp(s.room, 2 * 60_000);
  s.writer.calls.length = 0;
  assert.equal(s.engine.games.replay(s.room).ok, true);
  const r = lastCard(s, 'replay').card as any;
  assert.equal(r.authorName, 'Riya');
  assert.match(r.text, /SKIBIDI/);
  await new Promise((x) => setImmediate(x));
  assert.ok(s.writer.calls.some((c) => c.kind === 'replay' && /SKIBIDI/.test(c.fact)));
  assert.equal(s.engine.games.replay(s.room).ok, false);
});

test('chaos agent: only when enabled and due; copypasta from dead chat or force', async () => {
  const { s } = room4();
  s.engine.tick(s.room);
  assert.equal(cards(s, 'dare').length, 0);
  s.engine.setSettings(s.room, { chaos: true });
  s.engine.tick(s.room);
  assert.equal(cards(s, 'dare').length, 0, 'not immediately');
  s.room.lastChaosAt = Date.now() - 300_000;
  s.engine.tick(s.room);
  assert.equal(cards(s, 'dare').length, 1);
  assert.ok(['dare', 'twist'].includes((cards(s, 'dare')[0]!.card as any).style));
  await s.engine.force(s.room, 'copypasta');
  assert.equal((lastCard(s, 'dare').card as any).style, 'copypasta');
  await s.engine.force(s.room, 'weather');
  assert.equal(cards(s, 'weather').length, 1);
});

// ------------------------------------------------------------------ staged demos
test('staged games only use bots and always leave a card behind', async () => {
  const s = setup();
  s.add('h1', 'Human');
  for (const k of ['claim', 'hottake', 'bet', 'battle', 'confession'] as const) {
    s.room.lastVoteAt = 0;
    const before = s.room.messages.length;
    assert.equal(await s.engine.simulate(s.room, k), null, k);
    assert.ok(s.room.messages.length > before, k);
    await new Promise((r) => setImmediate(r));
  }
  for (const t of ['vote', 'bet', 'battle', 'confession']) assert.ok(cards(s, t).length >= 1, t);
  assert.ok(!s.room.messages.some((m) => m.authorId === 'h1'));
  const battle = lastCard(s, 'battle').card as any;
  assert.ok(battle.settled, 'bots finished their own battle');
});
