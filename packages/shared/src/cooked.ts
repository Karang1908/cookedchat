import type { TriggerKind } from './types.js';

/** how much each trigger heats the room */
export const COOKED_PUSH: Partial<Record<TriggerKind, number>> = {
  six_seven: 25,
  typing_drama: 6,
  typed_deleted: 4,
  slow_reply: 5,
  reply_later: 6,
  fanum: 4,
  burst: 8,
  edited: 5,
  deleted: 5,
  left_on_read: 4,
};

export const COOKED_PER_MESSAGE = 3;
export const COOKED_CAPS_BONUS = 4;
/** per second of real time */
export const COOKED_DECAY_PER_SEC = 0.8;
export const COOKED_REARM_BELOW = 60;

export interface CookedState {
  value: number;
  /** false after a meltdown until the room cools below COOKED_REARM_BELOW */
  armed: boolean;
}

export function clamp(v: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, v));
}

export function pushCooked(s: CookedState, amount: number): CookedState {
  return { ...s, value: clamp(s.value + amount) };
}

/** Decay over dtMs; re-arms the meltdown once cool. Pure so it tests without a clock. */
export function decayCooked(s: CookedState, dtMs: number): CookedState {
  const value = clamp(s.value - (COOKED_DECAY_PER_SEC * dtMs) / 1000);
  return { value, armed: s.armed || value < COOKED_REARM_BELOW };
}

/** true exactly once per heat-up: value is maxed and armed */
export function shouldMeltdown(s: CookedState): boolean {
  return s.armed && s.value >= 100;
}

/** UI deep-fry stage from the spec, section 8 */
export function fryStage(value: number): 0 | 1 | 2 | 3 | 4 {
  if (value >= 100) return 4;
  if (value > 75) return 3;
  if (value > 50) return 2;
  if (value > 25) return 1;
  return 0;
}
