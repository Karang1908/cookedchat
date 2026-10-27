import type { FxKind, SoundName, TriggerKind } from '@cooked/shared';

export interface Hit {
  kind: TriggerKind;
  aura?: 'fanum_tax' | 'reply_later' | 'quick_reply' | 'typing_drama' | 'slow_reply' | 'six_seven' | 'ohio';
  fact: string;
  /** placeholders for the canned fallback line */
  vars?: Record<string, string | number>;
}

export const PRIORITY: Partial<Record<TriggerKind, number>> = {
  six_seven: 10, cooked_max: 10, mog: 9, tung_tung: 9, betrayal: 8, typing_drama: 8, slow_reply: 8, reply_later: 8, vote_result: 8, battle_result: 8, bet_result: 8,
  left_on_read: 7, ohio_high: 7, mewing: 7, owl: 7, missing: 7, burst: 6, typed_deleted: 6, cap: 6, tone_shift: 6, simp_radar: 6, scouter: 6,
  edited: 5, deleted: 5, fanum: 5, derail: 6, class_change: 5, chaos: 5, dead_chat: 4, lore: 7, weather: 4, replay: 4, copypasta: 4, dry_reply: 3,
};

/** cheap, funny, and must never wait on an LLM (also keeps the free-tier token budget for the moments that need wit) */
export const INSTANT = new Set<TriggerKind>([
  'six_seven', 'fanum', 'tung_tung', 'cooked_max', 'mewing', 'mog', 'scouter', 'class_change', 'owl', 'missing', 'chaos', 'weather', 'copypasta',
  'vote_result', 'battle_result', 'bet_result', 'ohio_high',
]);

export const REACTION: Partial<Record<TriggerKind, string>> = {
  six_seven: '🗿', fanum: '🍟', typing_drama: '👁️', slow_reply: '💀', reply_later: '🥀', burst: '😭', dry_reply: '💀', edited: '🧐', deleted: '🫡',
  left_on_read: '👁️', ohio_high: '🫩', cap: '🧢', tone_shift: '🥶', derail: '🗿',
};

export const EFFECTS: Partial<Record<TriggerKind, { fx?: { kind: FxKind; emoji?: string }[]; sound?: SoundName }>> = {
  six_seven: { fx: [{ kind: 'shake' }, { kind: 'emojiRain', emoji: '🗿' }], sound: 'vineBoom' },
  fanum: { fx: [{ kind: 'emojiRain', emoji: '🍟' }] },
  typing_drama: { sound: 'bruh' },
  slow_reply: { sound: 'crickets' },
  reply_later: { sound: 'sadViolin' },
  burst: { sound: 'airhorn' },
  tung_tung: { fx: [{ kind: 'shake' }, { kind: 'flash' }], sound: 'tungTung' },
  dead_chat: { sound: 'crickets' },
  cooked_max: { fx: [{ kind: 'meltdown' }], sound: 'winError' },
  ohio_high: { fx: [{ kind: 'glitch' }], sound: 'fahhh' },
  cap: { sound: 'bruh' },
  owl: { sound: 'dunDunDun' },
  betrayal: { fx: [{ kind: 'flash' }], sound: 'dunDunDun' },
  mog: { fx: [{ kind: 'confetti' }], sound: 'airhorn' },
  scouter: { sound: 'pipe' },
  class_change: { fx: [{ kind: 'confetti' }] },
  chaos: { fx: [{ kind: 'shake' }], sound: 'airhorn' },
  copypasta: { sound: 'crickets' },
  vote_result: { sound: 'dunDunDun' },
  battle_result: { fx: [{ kind: 'confetti' }], sound: 'airhorn' },
  bet_result: { sound: 'pipe' },
};
