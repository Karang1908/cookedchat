import type { BrainrotLevel, PersonaId } from './types.js';

/*
 * HAND-EDITED. Brainrot goes stale in ~2 weeks and wrong slang reads as "dad trying to be cool".
 * Update the day before the demo and double-check every term. Last refresh: Oct 2026
 * (6-7, aura farming, crash out, glazing, chopped, unc, clanker, larping, crine, quiet on the creek, delulu;
 * desi: Panchayat, Hera Pheri, Mirzapur, chin tapak dum dum, wow vs chee, bawaal).
 */

export const TREND_EMOJI = ['🗿', '🥀', '💔', '😭', '🫩', '🥶', '💀', '🍷🗿', '🤫🧏', '🫡', '👁️', '🧢'] as const;

export const DRY_WORDS = [
  'k', 'kk', 'ok', 'okay', 'hmm', 'hm', 'mhm', 'sure', 'fine', 'idk', 'cool', 'nice', 'yep', 'yeah', 'nah', 'ig', 'lol', 'bet',
  // Hinglish dry texts
  'acha', 'accha', 'achha', 'thik', 'theek', 'thik h', 'haan', 'han', 'hn', 'ji', 'okk',
];

/** feeds the forecast's "rising snack levels" */
export const FOOD_WORDS = [
  'pizza', 'burger', 'fries', 'biryani', 'pasta', 'maggi', 'dosa', 'momos', 'samosa', 'sandwich', 'chai', 'coffee', 'cereal',
  'ice cream', 'dinner', 'lunch', 'breakfast', 'hungry', 'snack', 'snacks', 'chips', 'noodles', 'rice', 'cake', 'chocolate',
  'paneer', 'roti', 'paratha', 'chicken', 'nuggets', 'shawarma', 'pav bhaji', 'vada pav', 'chole', 'rolls', 'pani puri', 'khana', 'bhook',
];

/**
 * Slang that has expired. Using it costs aura and gets you called "unc" (2026: unc = you are old now).
 * Matched as whole words/phrases. Keep this in sync with what the AI is no longer allowed to say (SLANG_TERMS).
 */
export const UNC_SLANG = [
  'fanum tax', 'fanum taxed', 'skibidi', 'gyatt', 'rizzler', 'mewing', 'looksmaxxing', 'sigma male', 'grimace shake', 'only in ohio',
  'on fleek', 'yolo', 'swag', 'bae', 'lit fam', 'poggers', 'yeet', 'sheesh', 'big yikes', 'and i oop', 'ok boomer', 'savage af',
  // desi memes that peaked years ago
  'moye moye', 'binod', 'rasode mein kaun tha', 'pawri', 'pawri ho rahi hai', 'bik gayi hai gormint', 'so beautiful so elegant', 'jalebi baby',
];

export interface Persona {
  id: PersonaId;
  label: string;
  emoji: string;
  /** injected into the system prompt */
  voice: string;
  example: string;
  /** what people call it: saying any of these (whole word) talks to it. Not everyday words: "bhai" would fire on every Hinglish message. */
  names: string[];
  /** extra references the model may use (desi personas) */
  refs?: string[];
  /** always speaks Hinglish, whatever language the chat is in (it is the character) */
  hinglish?: boolean;
}

const DESI_REFS = [
  'Panchayat ("ek cup chai")', 'Hera Pheri ("utha le re baba", "25 din mein paisa double")', 'Mirzapur ("ye badhiya tha guru")', 'chin tapak dum dum',
  'wow vs chee', '"choti bachi ho kya"', 'Jethalal panic', 'Sharma ji ka beta', 'bawaal', 'scene kya hai', 'bhai ka aura', '"log kya kahenge"',
];

export const PERSONAS: Record<PersonaId, Persona> = {
  gremlin: { id: 'gremlin', label: 'Gen Z Gremlin', emoji: '👹', voice: 'the friend in the group with zero filter who says what everyone is thinking, types in lowercase and keeps it short', example: "bro you wrote a whole paragraph and then sent k. who hurt you", names: ['gremlin', 'gen z gremlin'] },
  sports: { id: 'sports', label: 'Sports Commentator', emoji: '🎙️', voice: 'a breathless live sports commentator calling a group chat like a championship match', example: 'AND HE LEFT HER ON READ, WHAT A PLAY FROM DEV', names: ['commentator', 'commentary'] },
  nature: { id: 'nature', label: 'Nature Documentary', emoji: '🦁', voice: 'a calm, hushed nature documentary narrator observing humans in their natural habitat', example: 'Here we see the human in his natural habitat, ignoring a text.', names: ['narrator', 'documentary', 'attenborough'] },
  reality: { id: 'reality', label: 'Reality TV Confessional', emoji: '📺', voice: 'a reality TV contestant giving a dramatic confessional to camera', example: "I'm not here to make friends, Riya.", names: ['reality tv', 'confessional'] },
  mom: { id: 'mom', label: 'Passive-Aggressive Mom', emoji: '👩', voice: 'a passive-aggressive mom who says "it\'s fine" and clearly means the opposite', example: "No, it's fine. Nobody has to reply. I'll just sit here.", names: ['mom', 'mommy', 'mummy', 'mumma'] },
  boomer: { id: 'boomer', label: 'Confused Boomer', emoji: '👴', voice: 'a confused boomer who misunderstands every slang term but is earnestly trying', example: "Is 'aura farming' like a crop thing?", names: ['boomer'] },
  desi: {
    id: 'desi', label: 'Desi Bhai', emoji: '🫖',
    voice: 'a desi elder-brother type from Indian meme pages who roasts in Hinglish (Hindi in Roman script mixed with English) with Bollywood and web-series dialogue energy',
    example: '"baad mein reply karta hu" bolke bhai Panchayat ka sachiv ban gaya, ek cup chai aur zero reply 🫖',
    names: ['desi bhai'],
    refs: DESI_REFS,
    hinglish: true,
  },
  aunty: {
    id: 'aunty', label: 'Relative Aunty', emoji: '👵',
    voice: 'a nosy Indian relative aunty at a family function who compares everyone to Sharma ji ka beta, in Hinglish (Roman script), sweet tone, devastating content',
    example: 'Beta itna late reply? Sharma ji ka beta toh 2 second mein reply karta hai, aur IIT bhi gaya 👵',
    names: ['aunty', 'auntie', 'aunty ji'],
    refs: DESI_REFS,
    hinglish: true,
  },
};

/** Terms the AI may use per level (cumulative). Hand-check before the demo. */
export const SLANG_TERMS: Record<BrainrotLevel, string[]> = {
  0: [],
  1: ['no cap', 'cooked', 'lowkey', 'fr', 'ngl', 'mid', 'bro', 'twin', 'ate'],
  2: ['no cap', 'cooked', 'lowkey', 'fr', 'ngl', 'mid', 'bro', 'twin', 'ate', 'aura', 'aura farming', 'rizz', 'mogged', 'crash out', 'glazing', 'chopped', 'unc', 'lock in', 'delulu', '6 7'],
  3: ['no cap', 'cooked', 'aura', 'aura farming', 'rizz', 'mogged', 'crash out', 'glazing', 'chopped', 'unc', 'lock in', 'delulu', '6 7', 'clanker', 'larping', 'crine', 'quiet on the creek', 'maxxing', 'tung tung sahur', 'brainrot', 'chat is this real', 'ohio'],
};

/** how unhinged the AI is. Attitude, not vocabulary: slang lists made every line sound like a bot reading a glossary. */
export const BRAINROT: Record<BrainrotLevel, { name: string; style: string }> = {
  0: { name: 'Normal', style: 'dry and deadpan, understated' },
  1: { name: 'Gen Alpha', style: 'casual and playful, like texting a close friend' },
  2: { name: 'Terminally Online', style: 'unhinged friend energy, quick and chaotic' },
  3: { name: 'Ohio Final Boss', style: 'completely feral and absurd, but every line still makes sense' },
};

/**
 * Never, swearing or not: slurs and attacks on identity. Substrings. Deliberately conservative: a false positive just swaps
 * in a canned line.
 */
export const OFF_LIMITS = [
  'muslim', 'hindu', 'christian', 'jewish', 'atheist', 'religion', 'caste',
  'lesbian', 'transgender', 'queer', 'homosexual', 'faggot',
  'disabled', 'disability', 'autistic', 'autism', 'retard', 'cancer', 'depressed', 'suicide', 'suicidal', 'kys', 'kill yourself',
  'obese', 'fat ', 'skin colour', 'skin color', 'racist',
  'रंडी',
];

/**
 * Whole words only: terms whose letters appear inside innocent words. "gay" is in Hindi "gaya" (went), "sikh" in "sikhaya" (taught),
 * "race" in "grace": as substrings they would reject nearly every Hinglish line.
 */
export const OFF_LIMITS_WORDS = [
  'gay', 'gays', 'sikh', 'sikhs', 'race', 'races', 'racial',
  'nigga', 'niggas', 'nigger', 'niggers', 'negro', 'chink', 'paki', 'randi',
  'chamar', 'bhangi', 'chhapri', 'chinki', 'katua', 'mulla', 'jihadi', 'sanghi', 'hijra', 'kalu', 'kallu', 'motu', 'langda', 'andha',
];

/** Crude but not hateful: family gaalis, "your mom", sexual swear words. Allowed only when the room has swearing on. */
export const CRUDE = [
  'your mom', 'your mother', 'your dad', 'your father', 'ugly',
  'teri maa', 'teri mummy', 'tera baap', 'tere baap', 'teri behen', 'maa ki', 'behen ki', 'madarchod', 'behenchod', 'bhenchod', 'bhosdi',
  'तेरी माँ', 'तेरी मां', 'तेरा बाप', 'मादरचोद', 'बहनचोद', 'भोसड़ी',
];
export const CRUDE_WORDS = ['bsdk', 'bkl', 'mkc', 'tmkc', 'gandu', 'gaand', 'lund', 'lauda', 'lavde', 'kutiya'];

const OFF_WORDS = new Set(OFF_LIMITS_WORDS);
const CRUDE_WORD_SET = new Set(CRUDE_WORDS);

/** `explicit`: the room has swearing on, so crude words pass. Slurs and identity attacks never do. */
export function isOffLimits(text: string, o: { explicit?: boolean } = {}): boolean {
  const lower = text.toLowerCase();
  // punctuation becomes spaces so "ugly." and "fat," still match; letters and combining marks (Devanagari) stay
  const t = ` ${lower.replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')} `;
  const has = (list: readonly string[]) => list.some((w) => t.includes(w) || lower.includes(w));
  const words = t.split(' ');
  if (has(OFF_LIMITS) || words.some((w) => OFF_WORDS.has(w))) return true;
  return !o.explicit && (has(CRUDE) || words.some((w) => CRUDE_WORD_SET.has(w)));
}
