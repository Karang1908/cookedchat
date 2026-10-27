/* Hand-written content. Original text only: no real people, no real copypastas, nothing aimed at identity. */

export const DARES = [
  'everyone must now reply as a pirate 🏴‍☠️',
  'the next message must be exactly three words',
  'type only in lowercase for the next 2 minutes. caps = -100 aura',
  'everyone say your most unhinged food opinion. now.',
  'reply to the last message but ONLY with emoji',
  'whoever replies slowest to this loses 200 aura. go.',
  'no vowels allowed for the next 3 messages',
  'everyone rates the last message out of 10. brutal honesty',
];

export const PLOT_TWISTS = [
  'plot twist: the chat has been replaced by an exact copy. nobody can tell who',
  'breaking news: the group chat has been declared a national landmark',
  'plot twist: the person who types next is secretly the main character',
  'update: the vibes have been audited and found suspicious',
];

export const COPYPASTAS = [
  "attention chat. a little-known fact: the average cereal bowl contains 11% soup by volume. you have been eating soup this whole time. you were told it was breakfast. wake up.",
  "ladies and gentlemen, this is your captain speaking. we are currently cruising at an altitude of absolutely no aura. please remain seated and stop typing 'k'. thank you for flying cooked airlines.",
  "i have been awake for 41 hours and i have discovered that the 'ok' button is just a tiny sigh in rectangle form. everything is a feeling. the calculator is crying. send help (a snack).",
  "BREAKING: scientists have confirmed that the typing bubble is a lie and has been since 2014. thousands of people stare at it every day. it never delivers. it only watches.",
  "psa: if you read this message you are legally obligated to drink water, unclench your jaw, and reply to someone you left on read. this is not a request. the owl is watching.",
  "in a world where nobody replies, one group chat dared to say: 'wyd'. nobody answered. the chat has been dead for 11 minutes. we are so back. we were never back.",
];

export const BATTLE_SCENARIOS = [
  'You spill your drink on someone at a party. Smooth recovery line, go.',
  'Your crush replies "k". Your move.',
  'Rate your own rizz out loud to the whole room. Make it believable.',
  'Convince the group to order pizza for the 4th time this week.',
  'You are 3 hours late. Open with the best excuse.',
  'Someone says "you are not that funny". Respond.',
];

export const HOT_TAKE_PROMPTS = [
  'cereal is soup', 'a hot dog is a sandwich', 'replying "k" is a valid personality', 'group chats should have a mute-by-default rule for people who send 9 messages in a row',
  'ice cream is a breakfast food', 'the left side of the bed is the superior side',
];

export const WEATHER_TEMPLATES = {
  passive: 'passive-aggression',
  sarcasm: 'scattered sarcasm',
  chaos: 'unhinged chaos',
  drought: 'a dry spell (of replies)',
  hunger: 'rising snack levels',
  fog: 'thick ghosting fog',
};

/** what a dry text *really* means */
export const DRY_MEANINGS: Record<string, string> = {
  k: 'I am deeply wounded', kk: 'I am deeply wounded, twice', ok: "I'm done with this conversation", okay: 'I have given up explaining myself',
  fine: 'I am absolutely not fine', sure: 'absolutely not, but I will not say so', hmm: 'I have thoughts and I am keeping them', hm: 'I have thoughts and I am keeping them',
  mhm: 'I stopped reading three messages ago', idk: 'I know exactly and I am not telling you', cool: 'this is not cool', nice: 'I feel nothing', yep: 'please let this end', yeah: 'please let this end',
  nah: 'I would rather perish', ig: 'I have been defeated', lol: 'that was not funny', bet: 'I will remember this',
};

/** brainrot translator: plain -> skibidi. Order matters (longest first). */
export const BRAINROT_MAP: [RegExp, string][] = [
  [/\bi'?m hungry\b/gi, 'bro is NOT fanum taxing me rn, i\'m cooked, no cap'],
  [/\bi am hungry\b/gi, 'bro is NOT fanum taxing me rn, i\'m cooked, no cap'],
  [/\bhungry\b/gi, 'cooked (fanum taxed)'], [/\bno way\b/gi, 'no cap??'], [/\bvery\b/gi, 'mad'], [/\breally\b/gi, 'fr fr'],
  [/\bgreat\b/gi, 'bussin'], [/\bgood\b/gi, 'goated'], [/\bbad\b/gi, 'mid'], [/\bfriend\b/gi, 'bro'], [/\bfriends\b/gi, 'the opps (affectionate)'],
  [/\bcool\b/gi, 'lowkey fire'], [/\btired\b/gi, 'cooked'], [/\bfunny\b/gi, 'peak'], [/\bweird\b/gi, 'ohio'], [/\bstrange\b/gi, 'ohio'],
  [/\bhelp\b/gi, 'lock in for me'], [/\bwork\b/gi, 'the grind (sigma)'], [/\bsleep\b/gi, 'mewing session'], [/\bsorry\b/gi, 'my bad, bro'],
];
export const BRAINROT_SUFFIX = [' no cap', ' fr fr 💀', ' (ohio)', ' lowkey', ' 🗿'];

/** reverse translator: brainrot -> confused dad */
export const PLAIN_MAP: [RegExp, string][] = [
  [/\bfanum tax(ed|ing)?\b/gi, 'someone taking a share of my food'], [/\bno cap\b/gi, 'honestly'], [/\bcooked\b/gi, 'in trouble'], [/\baura\b/gi, 'reputation'],
  [/\brizz\b/gi, 'charm'], [/\bohio\b/gi, 'something strange'], [/\bmogg?(ed|ing)?\b/gi, 'outdone'], [/\bsigma\b/gi, 'independent-minded'],
  [/\bskibidi\b/gi, 'nonsense'], [/\block(ed)? in\b/gi, 'focus'], [/\bmid\b/gi, 'mediocre'], [/\bbussin\b/gi, 'delicious'], [/\bgoated\b/gi, 'the best'],
  [/\blowkey\b/gi, 'somewhat'], [/\bngl\b/gi, 'to be honest'], [/\bfr( fr)?\b/gi, 'seriously'], [/\bsus\b/gi, 'suspicious'], [/\bbro\b/gi, 'my friend'],
  [/\blooksmaxxing\b/gi, 'self-grooming'], [/\bmewing\b/gi, 'a jaw exercise'], [/\bbrainrot\b/gi, 'internet silliness'], [/\bpeak\b/gi, 'excellent'],
];
export const PLAIN_PREFIX = ['So what you are saying is: ', 'Ah. In my day we said: ', 'If I understand the young people correctly: '];

export const MEME_EMOJI = ['🗿', '💀', '😭', '🥀', '🫡', '👁️', '🧢'];
export const MEME_TOP = ['WHEN {name}', 'NOBODY: {name}', 'POV: {name}', 'ME WATCHING {name}', '{name} AT 3AM'];
