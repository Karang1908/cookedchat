import { fmtDuration } from '@cooked/shared';
import type { Engine } from '../engine.js';
import type { Room } from '../room.js';

/**
 * Timer-driven behavior: the Duolingo owl, missing-person posters, random jumpscares, and member-list flushing.
 * At most ONE announcement per tick, so a big time-warp trickles out instead of dumping ten roasts at once.
 */
export function tickBehavior(e: Engine, room: Room): void {
  if (room.membersDirty) e.flushMembers(room);
  if (!room.settings.commentary) return;

  const now = room.now();
  const t = room.settings.timings;
  const hour = room.localHour();
  const day = room.localDayKey();

  for (const m of room.members.values()) {
    const last = room.stats.get(m.id)?.lastMessageAt;
    if (!last) continue;
    const silent = now - last;

    if (silent >= t.missingMs && !room.posterFired.has(m.id)) {
      room.posterFired.add(m.id);
      e.postCard(room, { type: 'poster', memberId: m.id, name: m.name, avatar: m.avatar, lastSeenAt: last, ago: fmtDuration(silent) }, `MISSING: ${m.name}`, 'missing');
      return;
    }
    const owlKey = `${m.id}:${day}`;
    if (hour >= 21 && silent >= t.owlMs && !room.owlFired.has(owlKey)) {
      room.owlFired.add(owlKey);
      const time = new Date(now + room.tzOffsetMin * 60_000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
      void e.comment(room, { kind: 'owl', member: m, text: '', fact: `has not replied in ${fmtDuration(silent)}`, vars: { time, ago: fmtDuration(silent) } }, true).catch(() => {});
      return;
    }
  }

  if (room.settings.jumpscare && Date.now() - room.lastJumpscareAt > 45_000 + e.rng() * 75_000) {
    room.lastJumpscareAt = Date.now();
    e.fx(room, 'jumpscare');
    e.sound(room, 'scream');
  }
}
