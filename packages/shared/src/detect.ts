import { DRY_WORDS, FOOD_WORDS, UNC_SLANG } from './slang.js';

const DRY = new Set(DRY_WORDS);
const wordsRe = (words: string[]) => new RegExp(`\\b(${[...words].sort((a, b) => b.length - a.length).map(escape).join('|')})\\b`, 'i');
const FOOD_RE = wordsRe(FOOD_WORDS);
const UNC_RE = wordsRe(UNC_SLANG);

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

/** returns the expired slang term ("fanum tax", "moye moye"...), or null */
export function findUnc(text: string): string | null {
  const m = UNC_RE.exec(text);
  return m ? m[1]!.toLowerCase() : null;
}

/** "67", "6 7", "six seven" but not "167" or "6.7" */
export function is67(text: string): boolean {
  return /(?<![\d.])6\s?7(?![\d.])/.test(text) || /\bsix\s?seven\b/i.test(text);
}

const LATER_HI = String.raw`\b(baad|thodi der)\s?(me|mein|mai|m)\b`;
const REPLY_HI = String.raw`\b(reply|respond|baat|batata|batati|bataunga|bataungi|msg|message|text|call)`;

/** English, plus Hinglish: "baad mein reply karta hu", "reply baad me", "thodi der mein batata" */
export function isReplyLater(text: string): boolean {
  return (
    /\b(reply|respond|text|get back)\b.{0,20}\blater\b/i.test(text) ||
    /\blater\b.{0,10}\b(reply|respond)\b/i.test(text) ||
    new RegExp(`${LATER_HI}.{0,25}${REPLY_HI}`, 'i').test(text) ||
    new RegExp(`${REPLY_HI}\\w*\\b.{0,15}${LATER_HI}`, 'i').test(text)
  );
}

/** share of letters that are uppercase; 0 when there are fewer than 5 letters */
export function capsRatio(text: string): number {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 5) return 0;
  return letters.replace(/[^A-Z]/g, '').length / letters.length;
}
