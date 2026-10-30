import type { PublicStats } from './types.js';

export interface AwardInput {
  id: string;
  name: string;
  aura: number;
  stats: PublicStats;
  /** ledger counts */
  typingDramas: number;
  /** times they used expired slang */
  uncMoments: number;
  /** best diabolical score from the hot take arena, 0 if none */
  diabolical: number;
}

export interface Award {
  title: string;
  emoji: string;
  memberId: string;
  name: string;
  why: string;
}

function best<T>(xs: T[], score: (x: T) => number, min: number): T | undefined {
  let top: T | undefined;
  let topScore = -Infinity;
  for (const x of xs) {
    const s = score(x);
    if (s > topScore) { top = x; topScore = s; }
  }
  return top && topScore >= min ? top : undefined;
}

/** "Ghost of the Week", "Main Character", "NPC Energy"... only awarded when someone actually earned it. */
export function computeAwards(members: AwardInput[]): Award[] {
  if (members.length < 2) return [];
  const out: Award[] = [];
  const add = (title: string, emoji: string, m: AwardInput | undefined, why: string) => m && out.push({ title, emoji, memberId: m.id, name: m.name, why });

  const main = best(members, (m) => m.aura, 1);
  add('Main Character', '👑', main, `${main?.aura.toLocaleString()} aura. The room orbits them.`);
  const npc = best(members, (m) => -m.aura + m.stats.dry * 20, 1);
  if (npc && npc.id !== main?.id) add('NPC Energy', '🤖', npc, `${npc.stats.dry} dry texts and ${npc.aura.toLocaleString()} aura. Scripted behavior.`);
  const ghost = best(members, (m) => m.stats.ghosts * 1_000_000 + (m.stats.avgReplyMs ?? 0) / 1000, 1);
  add('Ghost of the Week', '👻', ghost, ghost && ghost.stats.ghosts ? `left people on read ${ghost.stats.ghosts}x.` : 'slowest to reply in the room.');
  const fast = best(members.filter((m) => m.stats.avgReplyMs !== null), (m) => -(m.stats.avgReplyMs ?? Infinity), -Infinity);
  add('Fastest Fingers', '⚡', fast, `replies in ${Math.max(1, Math.round((fast?.stats.avgReplyMs ?? 0) / 1000))}s on average.`);
  const dia = best(members, (m) => m.diabolical, 1);
  add('Most Diabolical', '😈', dia, `a hot take that ${dia?.diabolical}% of chat disagreed with.`);
  const drama = best(members, (m) => m.typingDramas, 1);
  add('Typing Drama Queen', '🎭', drama, `typed an essay and sent a crumb ${drama?.typingDramas}x.`);
  const ohio = best(members, (m) => m.stats.ohioAvg, 25);
  add('Ohio Resident', '🌽', ohio, `${ohio?.stats.ohioAvg}% Ohio on average, peaking at ${ohio?.stats.ohioPeak}%.`);
  const unc = best(members, (m) => m.uncMoments, 1);
  add('Certified Unc', '👴', unc, `used expired slang ${unc?.uncMoments}x. the group chat called the retirement home.`);
  const rizz = best(members, (m) => m.stats.rizz, 70);
  add('Rizzler', '😎', rizz, `${rizz?.stats.rizz} rizz (${rizz?.stats.rizzTitle}).`);
  return out;
}

