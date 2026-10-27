import { DRY_WORDS, FOOD_WORDS } from './slang.js';

const DRY = new Set(DRY_WORDS);
const FOOD_RE = new RegExp(`\\b(${[...FOOD_WORDS].sort((a, b) => b.length - a.length).map(escape).join('|')})\\b`, 'i');

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** lowercase, strip trailing punctuation/emoji noise so "OK." and "ok!!" match "ok" */
export function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/[\s.!?…,]+$/g, '').replace(/^[\s.]+/, '');
}

export function isDry(text: string): boolean {
  const n = normalize(text);
  return n.length > 0 && n.length <= 6 && DRY.has(n);
}

/** returns the matched food word, or null */
export function findFood(text: string): string | null {
  const m = FOOD_RE.exec(text);
  return m ? m[1]!.toLowerCase() : null;
}

/** "67", "6 7", "six seven" but not "167" or "6.7" */
export function is67(text: string): boolean {
  return /(?<![\d.])6\s?7(?![\d.])/.test(text) || /\bsix\s?seven\b/i.test(text);
}

export function isReplyLater(text: string): boolean {
  return /\b(reply|respond|text|get back)\b.{0,20}\blater\b/i.test(text) || /\blater\b.{0,10}\b(reply|respond)\b/i.test(text);
}

/** share of letters that are uppercase; 0 when there are fewer than 5 letters */
export function capsRatio(text: string): number {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 5) return 0;
  return letters.replace(/[^A-Z]/g, '').length / letters.length;
}
