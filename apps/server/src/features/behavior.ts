import { capScore, capsRatio, fmtDuration, is67, isDerail, isDry, isToneShift } from '@cooked/shared';
import type { ChatMessage, Member } from '@cooked/shared';
import type { Room } from '../room.js';
import type { Hit } from '../tables.js';

export interface MsgFacts {
  prev?: ChatMessage;
  gap: number | null;
  replyingToOther: boolean;
  burst: number;
  now: number;
}

const SOOTHE = /\b(chill|relax|calm|sorry|peace|it'?s fine|its fine|no worries|breathe|all good|let'?s not)\b/i;
const MAX_LORE = 30;

function addLore(room: Room, member: Member, text: string, why: string): void {
  if (room.lore.some((l) => l.text === text)) return;
  room.lore.push({ text: text.slice(0, 120), authorId: member.id, at: room.now(), why });
  if (room.lore.length > MAX_LORE) room.lore.shift();
}

/**
 * Everything that is learned from one user message: updates the sender's counters, then returns the behavior
 * triggers (Ohio, cap, tone shift, topic derail, argument, simp radar). Order matters: tone shift reads the
 * previous dry message before this one overwrites it.
 */
export function analyze(room: Room, member: Member, msg: ChatMessage, f: MsgFacts): Hit[] {
  const t = room.settings.timings;
  const s = room.getStats(member.id);
  const text = msg.text;
  const ohio = msg.ohio ?? 0;
  const hits: Hit[] = [];

  if (ohio >= 85) {
    hits.push({ kind: 'ohio_high', aura: 'ohio', fact: `sent a message that scored ${ohio}% Ohio`, vars: { ohio } });
    addLore(room, member, text, 'ohio');
  }
  const cap = capScore(text);
  if (cap >= 50) {
    hits.push({ kind: 'cap', fact: `made a big claim: "${text.slice(0, 100)}" (cap score ${cap}%)`, vars: { pct: cap } });
    addLore(room, member, text, 'claim');
  }
  if (is67(text)) addLore(room, member, text, '67');
  if (isDry(text) && isToneShift(s.lastDryRaw, text)) {
    hits.push({ kind: 'tone_shift', fact: `went from "${s.lastDryRaw}" to "${text}" (colder tone)`, vars: { prev: s.lastDryRaw!, text } });
  }
  s.lastDryRaw = isDry(text) ? text : null;

  // topic derail: the last 3 messages share no words with the 7 before them
  const users = room.userMessages();
  if (users.length >= 8 && Date.now() - room.lastDerailAt > 180_000 && isDerail(users.slice(-10, -3).map((m) => m.text), users.slice(-3).map((m) => m.text))) {
    room.lastDerailAt = Date.now();
    s.derails++;
    hits.push({ kind: 'derail', fact: 'dragged the conversation somewhere completely unrelated' });
    addLore(room, member, text, 'derail');
  }

  // heated two-person argument: 6+ alternating messages inside two minutes, mostly loud
  const recent = users.slice(-8);
  if (recent.length >= 6 && Date.now() - room.lastMewingAt > 120_000 && new Set(recent.map((m) => m.authorId)).size === 2 && f.now - recent[0]!.at <= 120_000) {
    const flips = recent.filter((m, i) => i > 0 && m.authorId !== recent[i - 1]!.authorId).length;
    const heated = recent.filter((m) => capsRatio(m.text) > 0.6 || /[!?]/.test(m.text)).length;
    if (flips >= 5 && heated >= 3) {
      room.lastMewingAt = Date.now();
      hits.push({ kind: 'crash_out', fact: 'is crashing out in a heated argument' });
    }
  }

  // ---- counters
  s.messages++;
  s.chars += text.length;
  if (isDry(text)) s.dry++;
  if (text.length >= 200) s.essays++;
  if (/\?\s*$/.test(text)) s.questions++;
  if (capsRatio(text) > 0.6) s.caps++;
  s.ohioSum += ohio;
  s.ohioPeak = Math.max(s.ohioPeak, ohio);
  if (ohio >= 85) s.ohioHigh++;
  if (f.burst === t.burstCount) s.bursts++;
  if (f.prev && f.replyingToOther && (capsRatio(f.prev.text) > 0.6 || /!{2,}/.test(f.prev.text)) && text.length < 40 && capsRatio(text) === 0 && SOOTHE.test(text)) s.soothes++;
  s.lastMessageAt = f.now;
  room.posterFired.delete(member.id);

  if (f.replyingToOther && f.gap !== null && f.prev?.authorId) {
    s.replySum += f.gap;
    s.replyCount++;
    if (f.gap <= t.quickReplyMs) s.quick++;
    if (f.gap >= t.slowReplyMs) s.slow++;
    const key = `${member.id}>${f.prev.authorId}`;
    const l = room.latency.get(key) ?? { sum: 0, count: 0 };
    l.sum += f.gap;
    l.count++;
    room.latency.set(key, l);
    const simp = simpHit(room, member, f.prev.authorId, key);
    if (simp) hits.push(simp);
  }
  room.membersDirty = true;
  room.extrasDirty = true;
  return hits;
}

/** "Riya replies to Karan in 4 seconds and to everyone else in 4 hours." */
function simpHit(room: Room, member: Member, otherId: string, key: string): Hit | null {
  const to = room.latency.get(key);
  if (!to || to.count < 3 || room.simpFired.has(key)) return null;
  let sum = 0;
  let count = 0;
  for (const [k, v] of room.latency) if (k.startsWith(`${member.id}>`) && k !== key) { sum += v.sum; count += v.count; }
  if (count < 3) return null;
  const avgTo = to.sum / to.count;
  const avgOther = sum / count;
  if (avgTo > 15_000 || avgOther < Math.max(60_000, avgTo * 8)) return null;
  room.simpFired.add(key);
  const other = room.members.get(otherId)?.name ?? 'someone';
  return {
    kind: 'simp_radar',
    fact: `replies to ${other} in ${fmtDuration(avgTo)} on average but to everyone else in ${fmtDuration(avgOther)}`,
    vars: { other, fast: fmtDuration(avgTo), slow: fmtDuration(avgOther) },
  };
}

