import { BRAINROT_MAP, BRAINROT_SUFFIX, DRY_MEANINGS, PLAIN_MAP, PLAIN_PREFIX } from './content.js';
import { normalize } from './detect.js';

function pick<T>(a: T[], rng: () => number): T {
  return a[Math.min(a.length - 1, Math.floor(rng() * a.length))]!;
}

/** rule-based fallback for the brainrot translator (the LLM does it when it can) */
export function toBrainrot(text: string, rng: () => number = Math.random): string {
  let out = text;
  let changed = false;
  for (const [re, rep] of BRAINROT_MAP) {
    const next = out.replace(re, rep);
    if (next !== out) changed = true;
    out = next;
  }
  return changed ? out : `${out.replace(/[.!?]+$/, '')}${pick(BRAINROT_SUFFIX, rng)}`;
}

export function toPlain(text: string, rng: () => number = Math.random): string {
  let out = text;
  for (const [re, rep] of PLAIN_MAP) out = out.replace(re, rep);
  return `${pick(PLAIN_PREFIX, rng)}${out}`;
}

/** what a dry text really means, or null if it is not a known dry word */
export function dryMeaning(text: string): string | null {
  return DRY_MEANINGS[normalize(text)] ?? null;
}
