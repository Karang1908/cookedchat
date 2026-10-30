import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDry, findFood, findUnc, is67, isReplyLater, capsRatio, normalize, decayCooked, pushCooked, shouldMeltdown, fryStage, cannedLine, CANNED, isOffLimits, FX_KINDS,
  BATTLE_SCENARIOS, COPYPASTAS, DARES, DEAD_CHAT_PROMPTS, DUEL_CLOSERS, DUEL_OPENERS, DUEL_REPLIES, HOT_TAKE_PROMPTS, PERSONAS, PLOT_TWISTS, RIVAL_RETORTS, gifQuery, ohioScore,
} from './index.js';

test('isDry matches dry replies incl. punctuation and case', () => {
  for (const t of ['k', 'OK.', 'ok!!', 'Hmm', 'fine…', 'sure']) assert.equal(isDry(t), true, t);
  for (const t of ['okay but why did you do that', 'ok so what now', '', 'kitchen']) assert.equal(isDry(t), false, t);
  for (const t of ['acha', 'Accha.', 'thik h', 'haan', 'ji']) assert.equal(isDry(t), true, t);
  for (const t of ['acha suno ek baat', 'jiska bhi ho']) assert.equal(isDry(t), false, t);
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
  for (const t of ['baad mein reply karta hu', 'baad me baat karte hai', 'reply baad mein', 'thodi der mein batata hu']) assert.equal(isReplyLater(t), true, t);
  for (const t of ['baad mein milte hai', 'reply kar na', 'kal milte']) assert.equal(isReplyLater(t), false, t);
});

test('findUnc: expired slang, whole words, desi classics included', () => {
  assert.equal(findUnc('bro just got Fanum Taxed lol'), 'fanum taxed');
  assert.equal(findUnc('moye moye ho gaya'), 'moye moye');
  assert.equal(findUnc('SKIBIDI'), 'skibidi');
  for (const t of ['he is so swaggy', 'my uncle said hi', 'aura farming rn', '6 7', 'crashing out']) assert.equal(findUnc(t), null, t);
});

test('ohioScore: slang counts as whole words only', () => {
  assert.ok(ohioScore('great, see you later at the function with my uncle') < 15);
  assert.ok(ohioScore('aura farming, crash out, glazing, unc') >= 35);
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
  s = decayCooked(s, 10_000); // -10 -> 90, still hot
  assert.equal(s.armed, false);
  s = decayCooked(s, 35_000); // -35 -> 55, cooled
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

test('off-limits filter: Hinglish and Devanagari, whole words for short slurs, punctuation-proof', () => {
  for (const t of ['he is gay lol', 'the race thing', 'abe chutiya', 'TERI MAA ko bolunga', 'ye toh gandu hai', 'bsdk reply kar', 'motu bhai', 'चूतिया है', 'you are so ugly.', 'gandu!']) assert.equal(isOffLimits(t), true, t);
  for (const t of ['what a blunder', 'sab ho gaya', 'gayab ho gaye', 'usne sikhaya', 'such grace', 'chakka maara bhai', 'meri kutti dost', 'andhaadhun dekhi?', 'bhai ka aura', 'kaala chashma', 'ek cup chai']) assert.equal(isOffLimits(t), false, t);
});

test('every shipped line passes the off-limits filter, and every persona has a rival retort', () => {
  const pools = [...Object.values(CANNED).flat(), ...DEAD_CHAT_PROMPTS, ...DARES, ...PLOT_TWISTS, ...COPYPASTAS, ...BATTLE_SCENARIOS, ...HOT_TAKE_PROMPTS,
    ...Object.values(RIVAL_RETORTS).flat(), ...DUEL_OPENERS, ...DUEL_REPLIES, ...DUEL_CLOSERS, ...Object.values(PERSONAS).map((p) => p.example)];
  for (const line of pools) assert.equal(isOffLimits(line), false, line);
  for (const p of Object.keys(PERSONAS)) assert.ok(RIVAL_RETORTS[p as keyof typeof RIVAL_RETORTS].length, p);
});

test('gifQuery: model-picked GIF searches are cleaned or dropped', () => {
  assert.equal(gifQuery('  Hera Pheri <b>Baburao</b>!! '), 'hera pheri b baburao b');
  assert.equal(gifQuery('mic drop 🎤'), 'mic drop');
  assert.equal(gifQuery('🎤'), null);
  assert.equal(gifQuery(undefined), null);
  assert.equal(gifQuery('x'.repeat(100))!.length, 40);
});
