import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ohioScore, capScore, isBigClaim, isDerail, isToneShift, toneHeat, emptyStats, computePublicStats, rizzScore, rizzTitle, tierFor, powerLevel, toBrainrot, toPlain, dryMeaning, cannedLine, CANNED, CREATURES } from './index.js';

test('ohioScore: calm text is low, chaos is high, deterministic', () => {
  assert.ok(ohioScore('see you at 5 for dinner') < 15);
  assert.ok(ohioScore('SKIBIDI OHIO SIGMA RIZZ FANUM TAX!!!! 💀💀💀💀') >= 85);
  assert.ok(ohioScore('aaaaaaaa bro what') >= 20);
  assert.ok(ohioScore('qwrtpsdfghjk') >= 15);
  assert.equal(ohioScore(''), 0);
  assert.equal(ohioScore('same input'), ohioScore('same input'));
  assert.ok(ohioScore('x'.repeat(5000)) <= 100);
});

test('capScore: needs a real sentence and claim markers', () => {
  assert.equal(capScore('i swear'), 0);
  assert.ok(capScore('i swear i can literally run a marathon without even trying') >= 50);
  assert.ok(isBigClaim('no cap i once ate 100 nuggets, trust me on this one'));
  assert.equal(isBigClaim('want to get pizza after class today'), false);
  assert.ok(capScore('trust me i swear literally 100% i promise everyone knows it') <= 95);
});

test('isDerail: zero overlap with enough words only', () => {
  const dinner = ['what should we eat for dinner tonight', 'pizza or burgers for dinner', 'i want pizza honestly'];
  assert.equal(isDerail(dinner, ['wait is cereal actually soup', 'cereal milk soup argument']), true);
  assert.equal(isDerail(dinner, ['pizza sounds great for dinner', 'ok pizza']), false);
  assert.equal(isDerail(['hi', 'yo'], ['cereal soup question']), false);
});

test('tone shift: ok -> ok. -> OKAY gets colder, same dry word only', () => {
  assert.equal(isToneShift('ok', 'ok.'), true);
  assert.equal(isToneShift('ok', 'OKAY'), true);
  assert.equal(isToneShift('ok.', 'ok'), false);
  assert.equal(isToneShift('ok', 'sure.'), false);
  assert.equal(isToneShift(null, 'ok.'), false);
  assert.ok(toneHeat('OK!!') > toneHeat('ok'));
});

test('stats: rizz moves the right way and titles map', () => {
  const base = emptyStats();
  const good = { ...base, quick: 4, mogs: 2, questions: 3 };
  const bad = { ...base, dry: 6, ohioHigh: 3, slow: 3 };
  assert.ok(rizzScore(good, 500) > rizzScore(base, 0));
  assert.ok(rizzScore(bad, -500) < rizzScore(base, 0));
  assert.ok(rizzScore(bad, -5000) >= 0 && rizzScore(good, 5000) <= 100);
  assert.deepEqual([90, 60, 40, 10].map(rizzTitle), ['Rizzler', 'Unspoken Rizz', 'Mid Rizz', 'Negative Rizz']);
  assert.deepEqual([0, 1, 2, 3].map((i) => tierFor(i, 4)), ['sigma', 'alpha', 'beta', 'npc']);
  assert.ok(powerLevel(base, 5000, 90) > 9000);
});

test('computePublicStats: final boss, creatures, tiers are relative to the room', () => {
  const boss = { ...emptyStats(), messages: 10, quick: 5, mogs: 3, questions: 4, replySum: 50_000, replyCount: 5 };
  const essay = { ...emptyStats(), messages: 6, essays: 3 };
  const ghost = { ...emptyStats(), messages: 2, ghosts: 3 };
  const dry = { ...emptyStats(), messages: 5, dry: 5 };
  const stats = computePublicStats([
    { id: 'boss', aura: 900, stats: boss }, { id: 'essay', aura: 0, stats: essay }, { id: 'ghost', aura: -400, stats: ghost }, { id: 'dry', aura: -50, stats: dry },
  ]);
  assert.equal(stats.get('boss')!.klass, 'final_boss');
  assert.equal(stats.get('boss')!.creature, 'cappuccino');
  assert.equal(stats.get('boss')!.tier, 'sigma');
  assert.equal(stats.get('essay')!.creature, 'ballerina');
  assert.equal(stats.get('ghost')!.creature, 'bombardiro');
  assert.equal(stats.get('dry')!.creature, 'patapim');
  assert.equal(stats.get('dry')!.tier, 'npc', 'dry texting costs the most rizz');
  assert.equal(stats.get('ghost')!.tier, 'beta');
  assert.equal(stats.get('boss')!.avgReplyMs, 10_000);
  assert.equal(computePublicStats([]).size, 0);
  const solo = computePublicStats([{ id: 'a', aura: 5000, stats: boss }]);
  assert.notEqual(solo.get('a')!.klass, 'final_boss', 'a room of one has no final boss');
  assert.ok(Object.keys(CREATURES).length === 7);
});

test('translators: brainrot, plain, dry meanings', () => {
  assert.match(toBrainrot("I'm hungry"), /fanum taxing me rn/);
  assert.match(toBrainrot('see you tomorrow', () => 0), /no cap$/);
  assert.match(toPlain('bro is cooked no cap', () => 0), /^So what you are saying is: my friend is in trouble honestly$/);
  assert.equal(dryMeaning('k'), 'I am deeply wounded');
  assert.equal(dryMeaning('FINE.'), 'I am absolutely not fine');
  assert.equal(dryMeaning('a full sentence here'), null);
});

test('cannedLine fills new placeholders and keeps unknown ones visible', () => {
  assert.equal(cannedLine('ohio_high', { name: 'Aman', ohio: 94 }, () => 0), 'Ohio level 94%. aura -500 🥀');
  assert.match(cannedLine('simp_radar', { name: 'Riya', other: 'Karan', fast: '4s', slow: '4h' }, () => 0), /Riya replies to Karan in 4s and to everyone else in 4h/);
  assert.match(cannedLine('scouter', { name: 'X' }, () => 0), /\{power\}/);
  for (const [k, v] of Object.entries(CANNED)) assert.ok(v.length > 0, k);
});

import { buildForecast } from './index.js';
test('forecast: ranks real chat signals and writes a headline', () => {
  const dry = buildForecast({ messages: 10, dry: 8, lol: 1, food: 0, ohioAvg: 5, ghosts: 0, cooked: 0, quietMs: 0, hour: 20 });
  assert.match(dry.headline, /chance of passive-aggression tonight/);
  assert.equal(dry.forecast.length, 3);
  assert.ok(dry.forecast[0]!.pct >= dry.forecast[1]!.pct && dry.forecast.every((f) => f.pct >= 3 && f.pct <= 97));
  assert.match(dry.headline, /by 11pm/);
  const chaos = buildForecast({ messages: 10, dry: 0, lol: 0, food: 0, ohioAvg: 80, ghosts: 0, cooked: 90, quietMs: 0, hour: 22 });
  assert.match(chaos.headline, /unhinged chaos/);
  assert.match(chaos.headline, /by 1am/);
  assert.match(buildForecast({ messages: 0, dry: 0, lol: 0, food: 0, ohioAvg: 0, ghosts: 0, cooked: 0, quietMs: 0, hour: 1 }).headline, /clear skies/);
});
