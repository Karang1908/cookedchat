const MARKERS = [
  /\bi swear\b/i, /\bno cap\b/i, /\bliterally\b/i, /\b(never|always) (ever )?(been|did|had|lost|failed|forgot)\b/i, /\bi bet\b/i,
  /\b100\s?%/i, /\btrust me\b/i, /\bi promise\b/i, /\beveryone knows\b/i, /\bi'?m the (best|goat|fastest|smartest)\b/i,
  /\bi can (easily|literally|totally)\b/i, /\bi once\b/i, /\bmy (cousin|uncle|friend|brother|neighbou?r) (is|works|knows|has)\b/i,
  /\bwithout (even )?(trying|studying|practice)\b/i,
];

/** 0-100 "how cap is this claim". Needs a real sentence: short messages are never claims. */
export function capScore(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 6) return 0;
  let score = 0;
  for (const m of MARKERS) if (m.test(text)) score += 28;
  if (/\b\d{3,}\b/.test(text)) score += 15;
  return Math.min(95, score);
}

/** a claim big enough to open a "Chat, is this real?" vote */
export function isBigClaim(text: string): boolean {
  return capScore(text) >= 50;
}
