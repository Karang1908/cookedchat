import { SLANG_TERMS } from './slang.js';

const BRAINROT = new Set(SLANG_TERMS[3].concat(SLANG_TERMS[2]).map((t) => t.toLowerCase()));
const EMOJI = /\p{Extended_Pictographic}/gu;

/**
 * "This message is 94% Ohio." Deterministic and cheap so every message can have a score.
 * Signals: brainrot vocabulary, shouting, keyboard mashing, punctuation storms, emoji spam, word salad.
 */
export function ohioScore(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  const lower = t.toLowerCase();
  let score = 5;

  let terms = 0;
  for (const term of BRAINROT) if (lower.includes(term)) terms++;
  score += Math.min(30, terms * 12);
  if (/\bohio\b/.test(lower)) score += 25;

  const letters = t.replace(/[^a-zA-Z]/g, '');
  if (letters.length >= 6 && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.7) score += 15;
  if (/(.)\1{3,}/.test(t)) score += 15;
  if (/[?!]{3,}/.test(t)) score += 10;
  if (/[^aeiou\s\d\p{P}]{6,}/iu.test(t)) score += 12; // keyboard mashing

  const emoji = (t.match(EMOJI) ?? []).length;
  if (emoji >= 4 || (t.length > 0 && emoji / t.length > 0.3)) score += 15;
  if (t.length > 240) score += 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}
