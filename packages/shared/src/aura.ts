import type { AuraReason } from './types.js';

/** Aura rules from the spec, section 7. One place so server, admin UI and tests agree. */
export const AURA_RULES: Record<Exclude<AuraReason, 'manual'>, { delta: number; label: string }> = {
  fanum_tax: { delta: -50, label: 'Fanum tax' },
  reply_later: { delta: -500, label: '"I\'ll reply later"' },
  quick_reply: { delta: 100, label: 'Quick reply in a live convo' },
  typing_drama: { delta: -300, label: 'Typed an essay, sent a crumb' },
  slow_reply: { delta: -400, label: 'Took 3h+ to reply' },
  six_seven: { delta: 67, label: '67' },
  mog: { delta: 1000, label: 'Mogged someone' },
  ohio: { delta: -500, label: 'Ohio level 85%+' },
  cap: { delta: -200, label: 'Caught in 4K cap' },
  hot_take: { delta: 300, label: 'Diabolical hot take' },
  big_play: { delta: 10000, label: 'Big play' },
};

/** A member can farm quick-reply aura at most once per this many ms (real time). */
export const QUICK_REPLY_FARM_GUARD_MS = 60_000;
