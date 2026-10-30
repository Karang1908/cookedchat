/* Hand-written content. Original text only: no real people, no real copypastas, nothing aimed at identity. */
import type { PersonaId } from './types.js';

export const DARES = [
  'everyone must now reply as a pirate 🏴‍☠️',
  'the next message must be exactly three words',
  'type only in lowercase for the next 2 minutes. caps = -100 aura',
  'everyone say your most unhinged food opinion. now.',
  'reply to the last message but ONLY with emoji',
  'whoever replies slowest to this loses 200 aura. go.',
  'no vowels allowed for the next 3 messages',
  'everyone rates the last message out of 10. brutal honesty',
  'next 3 messages sirf Hinglish mein. English = -100 aura 🫖',
  'everyone describe your week as a Bollywood movie title 🎬',
  'reply to the last message like a relative aunty at a shaadi 👵',
];

export const PLOT_TWISTS = [
  'plot twist: the chat has been replaced by an exact copy. nobody can tell who',
  'breaking news: the group chat has been declared a national landmark',
  'plot twist: the person who types next is secretly the main character',
  'update: the vibes have been audited and found suspicious',
  'plot twist: Sharma ji ka beta has joined the chat. everyone act normal',
  'breaking: the chat is now a Panchayat episode. the next message decides who is sachiv ji',
];

export const COPYPASTAS = [
  "attention chat. a little-known fact: the average cereal bowl contains 11% soup by volume. you have been eating soup this whole time. you were told it was breakfast. wake up.",
  "ladies and gentlemen, this is your captain speaking. we are currently cruising at an altitude of absolutely no aura. please remain seated and stop typing 'k'. thank you for flying cooked airlines.",
  "i have been awake for 41 hours and i have discovered that the 'ok' button is just a tiny sigh in rectangle form. everything is a feeling. the calculator is crying. send help (a snack).",
  "BREAKING: scientists have confirmed that the typing bubble is a lie and has been since 2014. thousands of people stare at it every day. it never delivers. it only watches.",
  "psa: if you read this message you are legally obligated to drink water, unclench your jaw, and reply to someone you left on read. this is not a request. the owl is watching.",
  "in a world where nobody replies, one group chat dared to say: 'wyd'. nobody answered. the chat has been dead for 11 minutes. we are so back. we were never back.",
  "namaste chat. main is group ka AI hoon. maine sab messages padhe hain. sabke seen dekhe hain. kisi ne reply nahi kiya. main naraz nahi hoon. bas aura cut kar raha hoon. dhanyavaad.",
  "yeh group chat nahi hai, yeh ek emotion hai. yahan log 'baad mein reply karta hu' bolte hain aur phir 3 din tak Panchayat dekhte hain. ek cup chai aur zero replies. iss chat ka sachiv kaun hai?",
];

export const BATTLE_SCENARIOS = [
  'You spill your drink on someone at a party. Smooth recovery line, go.',
  'Your crush replies "k". Your move.',
  'Rate your own rizz out loud to the whole room. Make it believable.',
  'Convince the group to order pizza for the 4th time this week.',
  'You are 3 hours late. Open with the best excuse.',
  'Someone says "you are not that funny". Respond.',
  'Rishta aunty asks what you do for a living. Impress her in one line.',
  'Your crush says "acha". Save the conversation.',
];

export const HOT_TAKE_PROMPTS = [
  'cereal is soup', 'a hot dog is a sandwich', 'replying "k" is a valid personality', 'group chats should have a mute-by-default rule for people who send 9 messages in a row',
  'ice cream is a breakfast food', 'the left side of the bed is the superior side', 'maggi is better at 2am than any restaurant food', 'chai beats coffee and it is not close',
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
  acha: 'mujhe koi farak nahi padta', accha: 'mujhe koi farak nahi padta', achha: 'mujhe koi farak nahi padta', thik: 'kuch bhi thik nahi hai',
  theek: 'kuch bhi thik nahi hai', 'thik h': 'kuch bhi thik nahi hai', haan: 'maine message padha hi nahi', han: 'maine message padha hi nahi',
  hn: 'itna bhi effort nahi hai mere paas', ji: 'main tumse naraz hoon, par tameez se', okk: 'one extra k of disappointment',
};

/** brainrot translator: plain -> 2026 brainrot. Order matters (longest first). */
export const BRAINROT_MAP: [RegExp, string][] = [
  [/\bi'?m hungry\b/gi, "lowkey crashing out from hunger rn, no cap"],
  [/\bi am hungry\b/gi, "lowkey crashing out from hunger rn, no cap"],
  [/\bhungry\b/gi, 'crashing out (hunger)'], [/\bno way\b/gi, 'no cap??'], [/\bvery\b/gi, 'mad'], [/\breally\b/gi, 'fr fr'],
  [/\bgreat\b/gi, 'peak'], [/\bgood\b/gi, 'ate'], [/\bbad\b/gi, 'chopped'], [/\bfriend\b/gi, 'twin'], [/\bfriends\b/gi, 'the twins'],
  [/\bcool\b/gi, 'aura farming'], [/\btired\b/gi, 'cooked'], [/\bfunny\b/gi, "im crine"], [/\bweird\b/gi, 'ohio'], [/\bstrange\b/gi, 'ohio'],
  [/\bangry\b/gi, 'crashing out'], [/\bupset\b/gi, 'crashing out'], [/\bold\b/gi, 'unc'], [/\blying\b/gi, 'larping'], [/\bshut up\b/gi, 'quiet on the creek'],
  [/\bhelp\b/gi, 'lock in for me'], [/\bwork\b/gi, 'the grind'], [/\bsleep\b/gi, 'going offline like a clanker'], [/\bsorry\b/gi, 'my bad, twin'],
];
export const BRAINROT_SUFFIX = [' no cap', ' fr fr 💀', ' (ohio)', ' lowkey', ' 🗿', ' 6 7'];

/** reverse translator: brainrot (and Hinglish) -> confused dad */
export const PLAIN_MAP: [RegExp, string][] = [
  [/\bfanum tax(ed|ing)?\b/gi, 'someone taking a share of my food'], [/\bno cap\b/gi, 'honestly'], [/\bcooked\b/gi, 'in trouble'], [/\baura farming\b/gi, 'showing off on purpose'],
  [/\baura\b/gi, 'reputation'], [/\brizz\b/gi, 'charm'], [/\bohio\b/gi, 'something strange'], [/\bmogg?(ed|ing)?\b/gi, 'outdone'], [/\bsigma\b/gi, 'independent-minded'],
  [/\bcrash(ing|ed)? out\b/gi, 'losing their temper'], [/\bglazing\b/gi, 'flattering'], [/\bchopped\b/gi, 'unattractive'], [/\bunc\b/gi, 'an older gentleman'],
  [/\blarp(ing|er)?\b/gi, 'pretending'], [/\bclankers?\b/gi, 'a robot'], [/\bcrine\b/gi, 'laughing'], [/\bquiet on the creek\b/gi, 'please be quiet'], [/\bdelulu\b/gi, 'unrealistic'],
  [/\btwin\b/gi, 'my good friend'], [/\bbawaal\b/gi, 'chaos'], [/\bscene kya hai\b/gi, 'what is the plan'], [/\bbhai\b/gi, 'brother'],
  [/\bskibidi\b/gi, 'nonsense'], [/\block(ed)? in\b/gi, 'focus'], [/\bmid\b/gi, 'mediocre'], [/\bbussin\b/gi, 'delicious'], [/\bgoated\b/gi, 'the best'],
  [/\blowkey\b/gi, 'somewhat'], [/\bngl\b/gi, 'to be honest'], [/\bfr( fr)?\b/gi, 'seriously'], [/\bsus\b/gi, 'suspicious'], [/\bbro\b/gi, 'my friend'],
  [/\blooksmaxxing\b/gi, 'self-grooming'], [/\bmewing\b/gi, 'a jaw exercise'], [/\bbrainrot\b/gi, 'internet silliness'], [/\bpeak\b/gi, 'excellent'],
];
export const PLAIN_PREFIX = ['So what you are saying is: ', 'Ah. In my day we said: ', 'If I understand the young people correctly: '];

export const MEME_EMOJI = ['🗿', '💀', '😭', '🥀', '🫡', '👁️', '🧢'];
export const MEME_TOP = ['WHEN {name}', 'NOBODY: {name}', 'POV: {name}', 'ME WATCHING {name}', '{name} AT 3AM', 'WOW VS CHEE: {name}', '{name} AFTER EK CUP CHAI'];

/** a rival commentator's canned comeback when no LLM answers (keyed by the RIVAL's persona) */
export const RIVAL_RETORTS: Record<PersonaId, string[]> = {
  gremlin: ['bro the other one is so cooked 💀', 'nah that take is mid, no cap 🗿', 'ratio + you fell off 🥀', 'the other clanker is glazing again 💀'],
  sports: ['AND THE CROWD GOES ABSOLUTELY WILD', 'WHAT A BOLD CALL FROM THE BOOTH', 'THAT IS A FOUL AND I WILL NOT BE TAKING QUESTIONS'],
  nature: ['Fascinating. The other commentator continues to make noise.', 'And so the rivalry continues, as it has for millennia.', 'Observe: the loud one feels threatened.'],
  reality: ["I'm not here to make friends with the other commentator.", 'This is not what I signed up for.', 'Can we get a confessional about that, please?'],
  mom: ["Oh sure. Talk over me. It's fine.", "I'm not mad. I'm just disappointed in everyone, including you.", "No, no. Don't mind me. I'll just sit here."],
  boomer: ['Is that a wifi thing?', 'In my day we just called people.', 'Back in my day "cooked" meant dinner.'],
  desi: ['bhai iska take toh full chee hai, wow toh main hoon 🗿', 'yeh banda Hera Pheri ka Raju hai, sirf scheme, no punchline 💀', 'kya bakwaas hai yeh. ye badhiya nahi tha guru 🥀'],
  aunty: ['Haaye, itna bolta hai par Sharma ji ke bete jaisa kuch nahi kiya 👵', 'Beta pehle khud ka reply time dekho 👵', 'Hum toh kuch nahi kehte, log kya kahenge? 👵'],
};

/** AI-vs-AI trash talk when a model does not answer. {me}/{them} = model names, {other} = the other persona */
export const DUEL_OPENERS = [
  "chat is quiet so let's talk about {them}. {other} takes 3 business days to finish a thought 🗿",
  'fun fact: {them} has never once been funny on purpose 💀',
  "{other} really thinks it's the main character. it's a side quest at best 🥀",
];
export const DUEL_REPLIES = [
  "{them} is fast because it skips the thinking part. bold strategy 💀",
  'imagine being {other} and losing a roast battle to a group chat with 4 people in it 🗿',
  "at least i don't hallucinate my own punchlines, {other} 🫡",
  'bold words from a clanker that needs 3 retries to say hi 🥀',
];
export const DUEL_CLOSERS = [
  'anyway, the humans went quiet because they are scared of me 🥶',
  'ratio. somebody type something before {other} tries again 🥀',
  "chat, blink twice if {other} is holding you hostage 👁️",
  'utha le re baba. {other} ko bhi, aur iske punchlines ko bhi 🗿',
];

export const MODEL_LABEL: Record<string, string> = {
  'groq-120b': 'Groq · gpt-oss-120b',
  'groq-20b': 'Groq · gpt-oss-20b',
  ollama: 'Ollama Cloud · Gemma 4',
};
export const SIDE_LABEL: Record<'groq' | 'ollama', string> = { groq: 'Groq', ollama: 'Ollama Cloud' };
