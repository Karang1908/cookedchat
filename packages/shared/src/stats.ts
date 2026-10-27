import type { CreatureId, PublicStats, RpgClass, Tier } from './types.js';

/** Raw per-member counters. The server keeps these and derives PublicStats from them. */
export interface MemberStats {
  messages: number;
  chars: number;
  dry: number;
  essays: number;
  questions: number;
  caps: number;
  ohioSum: number;
  ohioPeak: number;
  ohioHigh: number;
  replySum: number;
  replyCount: number;
  quick: number;
  slow: number;
  bursts: number;
  ghosts: number;
  soothes: number;
  derails: number;
  mogs: number;
  lastMessageAt: number | null;
  lastDryRaw: string | null;
}

export function emptyStats(): MemberStats {
  return {
    messages: 0, chars: 0, dry: 0, essays: 0, questions: 0, caps: 0, ohioSum: 0, ohioPeak: 0, ohioHigh: 0, replySum: 0, replyCount: 0,
    quick: 0, slow: 0, bursts: 0, ghosts: 0, soothes: 0, derails: 0, mogs: 0, lastMessageAt: null, lastDryRaw: null,
  };
}

export const CREATURES: Record<CreatureId, { name: string; emoji: string; blurb: string }> = {
  tung: { name: 'Tung Tung Sahur', emoji: '🪵', blurb: 'replies before you finish typing' },
  bombardiro: { name: 'Bombardiro Crocodilo', emoji: '🐊', blurb: 'drops in, ghosts, leaves craters' },
  ballerina: { name: 'Ballerina Cappuccina', emoji: '💃', blurb: 'writes essays, spins gracefully' },
  patapim: { name: 'Brr Brr Patapim', emoji: '🌳', blurb: 'says "k" and means a forest' },
  trippi: { name: 'Trippi Troppi', emoji: '🦐', blurb: 'nine messages where one would do' },
  cappuccino: { name: 'Cappuccino Assassino', emoji: '☕', blurb: 'final form. nobody saw it coming' },
  lirili: { name: 'Lirili Larila', emoji: '🐘', blurb: 'still hatching, behavior pending' },
};

export const CLASSES: Record<RpgClass, { name: string; emoji: string; blurb: string }> = {
  lurker: { name: 'Lurker', emoji: '👀', blurb: 'reads everything, says little' },
  instigator: { name: 'Instigator', emoji: '🔥', blurb: 'starts it, loves it' },
  healer: { name: 'Healer', emoji: '🩹', blurb: 'de-escalates the chaos' },
  final_boss: { name: 'Final Boss', emoji: '👑', blurb: 'the room orbits them' },
};

export const TIERS: Record<Tier, { name: string; emoji: string }> = {
  sigma: { name: 'Sigma', emoji: '🗿' },
  alpha: { name: 'Alpha', emoji: '🦁' },
  beta: { name: 'Beta', emoji: '🐑' },
  npc: { name: 'NPC', emoji: '🤖' },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function rizzScore(s: MemberStats, aura: number): number {
  const r =
    50 +
    Math.min(25, s.quick * 5) +
    Math.min(20, s.mogs * 10) +
    clamp(aura / 200, -20, 20) -
    Math.min(20, s.dry * 3) -
    Math.min(15, s.ohioHigh * 5) -
    Math.min(15, s.slow * 5) +
    Math.min(10, s.questions * 2);
  return Math.round(clamp(r, 0, 100));
}

export function rizzTitle(r: number): string {
  return r >= 80 ? 'Rizzler' : r >= 55 ? 'Unspoken Rizz' : r >= 35 ? 'Mid Rizz' : 'Negative Rizz';
}

export function powerLevel(s: MemberStats, aura: number, rizz: number): number {
  return Math.max(1, Math.round(100 + 3 * Math.max(0, aura) + 20 * rizz + 5 * s.messages));
}

export function tierFor(rank: number, total: number): Tier {
  if (total <= 1) return 'beta';
  const q = rank / total; // 0 = best
  return q < 0.25 ? 'sigma' : q < 0.5 ? 'alpha' : q < 0.75 ? 'beta' : 'npc';
}

function pickClass(s: MemberStats, avgMessages: number, isFinalBoss: boolean): RpgClass {
  if (isFinalBoss) return 'final_boss';
  const instigator = s.bursts * 3 + s.ohioHigh * 2 + s.caps + s.derails * 2;
  const healer = s.soothes * 3;
  const lurker = s.messages < Math.max(2, avgMessages * 0.5) ? 3 : 0;
  const best = Math.max(instigator, healer, lurker);
  if (best < 3) return 'lurker';
  return instigator === best ? 'instigator' : healer === best ? 'healer' : 'lurker';
}

function pickCreature(s: MemberStats, topRizz: boolean): CreatureId {
  const avgReply = s.replyCount ? s.replySum / s.replyCount : null;
  if (topRizz && s.messages >= 3) return 'cappuccino';
  if (s.essays >= 2) return 'ballerina';
  if (s.ghosts >= 2 || (avgReply !== null && avgReply > 3_600_000)) return 'bombardiro';
  if (avgReply !== null && avgReply <= 20_000 && s.quick >= 2) return 'tung';
  if (s.dry >= 3) return 'patapim';
  if (s.bursts >= 1) return 'trippi';
  return 'lirili';
}

export interface StatsInput {
  id: string;
  aura: number;
  stats: MemberStats;
}

/** Ranks the whole room so tiers, the Final Boss and the top-rizz creature are relative to who else is here. */
export function computePublicStats(entries: StatsInput[]): Map<string, PublicStats> {
  const out = new Map<string, PublicStats>();
  if (!entries.length) return out;
  const rizz = new Map(entries.map((e) => [e.id, rizzScore(e.stats, e.aura)]));
  const composite = (e: StatsInput) => e.aura / 100 + rizz.get(e.id)!;
  const ranked = [...entries].sort((a, b) => composite(b) - composite(a));
  const avgMessages = entries.reduce((t, e) => t + e.stats.messages, 0) / entries.length;
  const topId = ranked[0]!.id;
  const topRizzId = [...entries].sort((a, b) => rizz.get(b.id)! - rizz.get(a.id)!)[0]!.id;
  ranked.forEach((e, i) => {
    const s = e.stats;
    const r = rizz.get(e.id)!;
    const isBoss = e.id === topId && entries.length > 1 && e.aura > 200 && r >= 60;
    out.set(e.id, {
      messages: s.messages,
      avgReplyMs: s.replyCount ? Math.round(s.replySum / s.replyCount) : null,
      rizz: r,
      rizzTitle: rizzTitle(r),
      ohioAvg: s.messages ? Math.round(s.ohioSum / s.messages) : 0,
      ohioPeak: s.ohioPeak,
      mogs: s.mogs,
      dry: s.dry,
      ghosts: s.ghosts,
      klass: pickClass(s, avgMessages, isBoss),
      creature: pickCreature(s, e.id === topRizzId && r >= 70),
      tier: tierFor(i, entries.length),
      power: powerLevel(s, e.aura, r),
    });
  });
  return out;
}
