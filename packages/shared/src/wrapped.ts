import { CREATURES } from './stats.js';
import type { MemberStats } from './stats.js';
import type { Card, Member } from './types.js';

type WrappedCard = Extract<Card, { type: 'wrapped' }>;

/** integers that sum to exactly 100 (largest-remainder), so "63 + 22 + 15" never reads "99%" */
function toPercents(weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (w / total) * 100);
  const floors = raw.map(Math.floor);
  let rest = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, f: r - Math.floor(r) })).sort((a, b) => b.f - a.f);
  for (const { i } of order) if (rest-- > 0) floors[i]! += 1;
  return floors;
}

/** "You are 63% Skibidi, 22% Sigma, 15% NPC. Your final form is Cappuccino Assassino." */
export function computeWrapped(m: Member, raw: MemberStats): WrappedCard {
  const s = m.stats;
  const skibidi = 10 + s.ohioAvg + raw.bursts * 12 + raw.caps * 6 + raw.derails * 8;
  const sigma = 10 + s.rizz + s.mogs * 15 + Math.max(0, m.aura) / 50 - Math.min(20, s.messages);
  const npc = 10 + s.dry * 12 + Math.max(0, 60 - s.rizz) + raw.slow * 8;
  const [a, b, c] = toPercents([skibidi, Math.max(1, sigma), npc]);
  return {
    type: 'wrapped', memberId: m.id, name: m.name, avatar: m.avatar,
    breakdown: [{ label: 'Skibidi', pct: a! }, { label: 'Sigma', pct: b! }, { label: 'NPC', pct: c! }].sort((x, y) => y.pct - x.pct),
    finalForm: CREATURES[s.creature].name, creature: s.creature,
    stats: { aura: m.aura, rizz: s.rizz, ohio: s.ohioAvg, messages: s.messages, power: s.power },
  };
}
