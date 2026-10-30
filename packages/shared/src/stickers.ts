import type { TriggerKind } from './types.js';

/** the big emoji "sticker" the AI drops next to a moment (always available, unlike GIFs) */
export const STICKER: Partial<Record<TriggerKind, string>> = {
  six_seven: '🗿', mog: '👑', ohio_high: '🌽', cap: '🧢', scouter: '⚡', cooked_max: '🔥', owl: '🦉', class_change: '✨', betrayal: '🗡️',
  typing_drama: '👁️', slow_reply: '🕳️', reply_later: '🥀', crash_out: '🤫', simp_radar: '💘', tiers: '🏅', unc: '👴',
};

/** which moments get "BREAKING NEWS" treatment in the UI */
export const BREAKING: ReadonlySet<TriggerKind> = new Set<TriggerKind>(['mog', 'cooked_max', 'six_seven', 'class_change', 'scouter', 'betrayal', 'battle_result', 'vote_result', 'bet_result', 'tiers']);

/** GIPHY search terms for the moments that get a GIF when a key is configured */
export const GIF_QUERY: Partial<Record<TriggerKind, string>> = {
  mog: 'mogged', six_seven: 'six seven', cooked_max: 'its over', class_change: 'evolution', betrayal: 'betrayed', ohio_high: 'ohio', scouter: 'over 9000', owl: 'owl staring',
  crash_out: 'crash out', unc: 'old man confused',
};

/** cleans a model-picked GIF search ("[gif: ...]") into something safe to send to GIPHY, or null */
export function gifQuery(raw: string | undefined | null): string | null {
  const q = (raw ?? '').toLowerCase().replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40).trim();
  return q.length >= 2 ? q : null;
}
