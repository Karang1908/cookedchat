import type { BrainrotLevel, PersonaId } from './types.js';

/*
 * HAND-EDITED. Brainrot goes stale in ~2 weeks and wrong slang reads as "dad trying to be cool".
 * Update the day before the demo and double-check every term.
 */

export const TREND_EMOJI = ['🗿', '🥀', '💔', '😭', '🫩', '🥶', '💀', '🍷🗿', '🤫🧏', '🫡', '👁️', '🧢'] as const;

export const DRY_WORDS = ['k', 'kk', 'ok', 'okay', 'hmm', 'hm', 'mhm', 'sure', 'fine', 'idk', 'cool', 'nice', 'yep', 'yeah', 'nah', 'ig', 'lol', 'bet'];

export const FOOD_WORDS = [
  'pizza', 'burger', 'fries', 'biryani', 'pasta', 'maggi', 'dosa', 'momos', 'samosa', 'sandwich', 'chai', 'coffee', 'cereal',
  'ice cream', 'dinner', 'lunch', 'breakfast', 'hungry', 'snack', 'snacks', 'chips', 'noodles', 'rice', 'cake', 'chocolate',
  'paneer', 'roti', 'paratha', 'chicken', 'nuggets', 'shawarma', 'pav bhaji', 'vada pav', 'chole', 'rolls', 'pani puri',
];

export interface Persona {
  id: PersonaId;
  label: string;
  emoji: string;
  /** injected into the system prompt */
  voice: string;
  example: string;
}

export const PERSONAS: Record<PersonaId, Persona> = {
  gremlin: { id: 'gremlin', label: 'Gen Z Gremlin', emoji: '👹', voice: 'a terminally online friend with zero filter who types in lowercase and keeps it short', example: "bro really sent 'k' after that paragraph 💀" },
  sports: { id: 'sports', label: 'Sports Commentator', emoji: '🎙️', voice: 'a breathless live sports commentator calling a group chat like a championship match', example: 'AND HE LEFT HER ON READ, WHAT A PLAY FROM DEV' },
  nature: { id: 'nature', label: 'Nature Documentary', emoji: '🦁', voice: 'a calm, hushed nature documentary narrator observing humans in their natural habitat', example: 'Here we see the human in his natural habitat, ignoring a text.' },
  reality: { id: 'reality', label: 'Reality TV Confessional', emoji: '📺', voice: 'a reality TV contestant giving a dramatic confessional to camera', example: "I'm not here to make friends, Riya." },
  mom: { id: 'mom', label: 'Passive-Aggressive Mom', emoji: '👩', voice: 'a passive-aggressive mom who says "it\'s fine" and clearly means the opposite', example: "No, it's fine. Nobody has to reply. I'll just sit here." },
  boomer: { id: 'boomer', label: 'Confused Boomer', emoji: '👴', voice: 'a confused boomer who misunderstands every slang term but is earnestly trying', example: "Is 'aura' like a wifi thing?" },
};

/** Terms the AI may use per level (cumulative). Hand-check before the demo. */
export const SLANG_TERMS: Record<BrainrotLevel, string[]> = {
  0: [],
  1: ['no cap', 'cooked', 'lowkey', 'fr', 'ngl', 'sus', 'mid', 'bro'],
  2: ['no cap', 'cooked', 'lowkey', 'fr', 'ngl', 'sus', 'mid', 'bro', 'aura', 'fanum tax', 'rizz', 'ohio', 'sigma', 'mogged', 'skibidi', 'lock in'],
  3: ['no cap', 'cooked', 'aura', 'fanum tax', 'rizz', 'ohio', 'sigma', 'mogged', 'skibidi', 'lock in', 'looksmaxxing', 'mewing', 'tung tung sahur', 'brainrot', 'chat is this real'],
};

export const BRAINROT: Record<BrainrotLevel, { name: string; style: string }> = {
  0: { name: 'Normal', style: 'light teasing, regular internet humor, almost no slang' },
  1: { name: 'Gen Alpha', style: 'heavy current slang, lowercase, emoji-forward' },
  2: { name: 'Terminally Online', style: 'memes stacked on memes, lore callbacks, fast and chaotic' },
  3: { name: 'Ohio Final Boss', style: 'pure word salad that technically still means something, maximum chaos' },
};

/** Words the AI must never produce. Roast behavior, never identity. Deliberately conservative: a false positive just swaps in a canned line. */
export const OFF_LIMITS = [
  'muslim', 'hindu', 'christian', 'jewish', 'sikh', 'atheist', 'religion', 'caste',
  'gay', 'lesbian', 'transgender', 'queer', 'homosexual',
  'disabled', 'disability', 'autistic', 'autism', 'retard', 'cancer', 'depressed', 'suicide', 'suicidal', 'kys', 'kill yourself',
  'obese', 'fat ', 'ugly', 'skin colour', 'skin color', 'race', 'racist',
  'your mom', 'your mother', 'your dad', 'your father',
];

export function isOffLimits(text: string): boolean {
  const t = ` ${text.toLowerCase()} `;
  return OFF_LIMITS.some((w) => t.includes(w));
}
