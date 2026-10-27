import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDry, findFood, is67, isReplyLater, capsRatio, normalize, decayCooked, pushCooked, shouldMeltdown, fryStage, cannedLine, CANNED, isOffLimits, FX_KINDS } from './index.js';

test('isDry matches dry replies incl. punctuation and case', () => {
  for (const t of ['k', 'OK.', 'ok!!', 'Hmm', 'fine…', 'sure']) assert.equal(isDry(t), true, t);
  for (const t of ['okay but why did you do that', 'ok so what now', '', 'kitchen']) assert.equal(isDry(t), false, t);
});

test('findFood finds whole words only', () => {
  assert.equal(findFood('lets get Pizza tonight'), 'pizza');
  assert.equal(findFood('vada pav after class'), 'vada pav');
  assert.equal(findFood('i love ricecooker'), null);
  assert.equal(findFood('no snacks here'), 'snacks');
  assert.equal(findFood('nothing edible'), null);
});

test('is67 matches 67 / 6 7 / six seven but not nearby numbers', () => {
  for (const t of ['67', 'bro 67 lol', '6 7', 'six seven', 'SIX SEVEN']) assert.equal(is67(t), true, t);
  for (const t of ['167', '6.7', '1967', '670', 'sixty seven']) assert.equal(is67(t), false, t);
});

test('isReplyLater', () => {
  assert.equal(isReplyLater("wait I'll reply later"), true);
  assert.equal(isReplyLater('will respond later ok'), true);
  assert.equal(isReplyLater('see you later'), false);
});

test('capsRatio ignores short text', () => {
  assert.equal(capsRatio('OK'), 0);
  assert.equal(capsRatio('WHAT IS HAPPENING'), 1);
  assert.ok(capsRatio('What is Happening') < 0.3);
});

test('normalize', () => assert.equal(normalize('  OK... '), 'ok'));

test('cooked meter: decays toward 0, meltdown fires once until re-armed', () => {
  let s = { value: 99, armed: true };
  s = pushCooked(s, 5);
  assert.equal(s.value, 100);
  assert.equal(shouldMeltdown(s), true);
  s = { ...s, armed: false };
  assert.equal(shouldMeltdown(s), false);
  s = decayCooked(s, 10_000); // -8 -> 92, still hot
  assert.equal(s.armed, false);
  s = decayCooked(s, 50_000); // -40 -> 52, cooled
  assert.equal(s.armed, true);
  assert.equal(decayCooked({ value: 1, armed: true }, 60_000).value, 0);
});

test('fryStage boundaries match spec table', () => {
  assert.deepEqual([0, 25, 26, 50, 51, 75, 76, 99, 100].map(fryStage), [0, 0, 1, 1, 2, 2, 3, 3, 4]);
});

test('cannedLine fills placeholders and every kind has lines', () => {
  assert.equal(cannedLine('dry_reply', { name: 'Aman', text: 'k' }, () => 0), 'bro sent "k" 💀');
  for (const [k, v] of Object.entries(CANNED)) assert.ok(v.length > 0, k);
  assert.ok(!cannedLine('slow_reply', {}, () => 0.99).includes('{name}'));
});

test('off-limits filter', () => {
  assert.equal(isOffLimits('bro is so ugly'), true);
  assert.equal(isOffLimits('bro took 4 hours to say k'), false);
  assert.equal(FX_KINDS.length, 11);
});
