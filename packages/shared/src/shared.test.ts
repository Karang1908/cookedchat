import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDry, isAiMention, isHinglish, findFood, findUnc, is67, isReplyLater, capsRatio, normalize, decayCooked, pushCooked, shouldMeltdown, fryStage, cannedLine, CANNED, isOffLimits, FX_KINDS,
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
  for (const t of ['he is gay lol', 'the race thing', 'TERI MAA ko bolunga', 'madarchod', 'ye toh gandu hai', 'bsdk reply kar', 'motu bhai', 'तेरी माँ', 'you are so ugly.', 'gandu!']) assert.equal(isOffLimits(t), true, t);
  for (const t of ['abe chutiya reply kar', 'harami kahin ka', 'you bald ass mf', 'what the fuck bro', 'goofy ass clown']) assert.equal(isOffLimits(t), false, `swearing is allowed: ${t}`);
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

test('isAiMention: saying its name anywhere talks to it; possessives and lookalikes do not', () => {
  const names = ['gremlin', 'gen z gremlin', 'mom', 'aunty'];
  for (const t of ['gremlin you seeing this?', 'yo GREMLIN', 'the ai is cooked lol', '@ai what do you think', 'right clanker', 'mom what do you think', 'aunty ji chai?']) assert.equal(isAiMention(t, names), true, t);
  for (const t of ['my mom said no', 'meri aunty aayi', 'gremlins are cute', 'said what', 'Thai food tonight', 'my chatbot app crashed today', 'aim higher']) assert.equal(isAiMention(t, names), false, t);
  assert.equal(isAiMention('gremlin you up?'), false, 'persona names only count for the active personas');
});

test('swearing on: every gaali and crude insult passes; slurs and identity attacks never do', () => {
  for (const t of ['teri maa ki bc', 'madarchod reply kar', 'bsdk kahan tha', 'your mom would leave you on read', 'you ugly ass motherfucker'])
    assert.equal(isOffLimits(t, { explicit: true }), false, `crude passes with swearing on: ${t}`);
  for (const t of ['teri maa ki bc', 'madarchod reply kar', 'bsdk kahan tha', 'your mom would leave you on read'])
    assert.equal(isOffLimits(t), true, `blocked with swearing off: ${t}`);
  for (const t of ['fuck you nigga', 'NIGGA what', 'stupid chamar', 'you faggot', 'go back to your religion', 'you autistic fuck'])
    assert.equal(isOffLimits(t, { explicit: true }), true, `never: ${t}`);
});

test('isHinglish: Romanized Hindi is detected, English is not', () => {
  for (const t of ['gremlin bhai mera exam kal hai aur maine kuch nahi padha', 'kya scene hai aaj', 'haan', 'acha bhai', 'bhai tu pagal hai kya', 'yaar ye toh galat hai', 'baad mein reply karta hu'])
    assert.equal(isHinglish(t), true, t);
  for (const t of ['gremlin is karan always this annoying', 'yo what are we doing tonight', 'the one with 200 rs lattes lmao', 'k', 'hi guys', 'main character energy', 'tell me to go'])
    assert.equal(isHinglish(t), false, t);
});
