const STOP = new Set('a an the and or but if so to of in on at for with is are was were be been it its this that these those i you he she we they me my your his her our their do does did not no yes ok okay lol just like get got go going have has had will would can could should what when where who why how there here then than too very really about from up out as by am im ill dont cant wont u ur'.split(' '));

export function contentWords(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

/**
 * Dinner plans -> "is cereal soup". Compares the words of the older messages with the newest ones.
 * Needs enough words on both sides, and zero overlap, so ordinary drift does not trigger it.
 */
export function isDerail(older: string[], newer: string[]): boolean {
  const a = new Set<string>();
  for (const m of older) for (const w of contentWords(m)) a.add(w);
  const b = new Set<string>();
  for (const m of newer) for (const w of contentWords(m)) b.add(w);
  if (a.size < 4 || b.size < 3) return false;
  for (const w of b) if (a.has(w)) return false;
  return true;
}

/** "ok" -> "ok." -> "OKAY": 0 neutral, higher is colder */
export function toneHeat(raw: string): number {
  const t = raw.trim();
  let h = 0;
  if (/[.]$/.test(t)) h += 1;
  if (/\.{2,}|…$/.test(t)) h += 1;
  if (t.length >= 2 && t === t.toUpperCase() && /[A-Z]/.test(t)) h += 2;
  if (/!{2,}/.test(t)) h += 1;
  return h;
}

/** true when `now` is a colder version of the same dry word as `before` */
export function isToneShift(before: string | null, now: string): boolean {
  if (!before) return false;
  const base = (s: string) => s.trim().toLowerCase().replace(/[^a-z]/g, '');
  const a = base(before);
  const b = base(now);
  const same = a === b || (a === 'ok' && b === 'okay') || (a === 'okay' && b === 'ok') || (a === 'k' && b === 'kk');
  return same && toneHeat(now) > toneHeat(before);
}
