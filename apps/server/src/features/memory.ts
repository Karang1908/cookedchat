import {
  MEME_EMOJI, MEME_TOP, buildRecap, computeAwards, computeWrapped, dryMeaning, isOffLimits, toBrainrot, toPlain,
} from '@cooked/shared';
import type { Ack, Member } from '@cooked/shared';
import type { Engine } from '../engine.js';
import type { Room } from '../room.js';

type Translation = { text: string; via: 'ai' | 'rules' };
const ok = <T extends object>(extra: T): Ack<T> => ({ ok: true, ...extra });
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

const clean = (t: string, max: number) => t.trim().replace(/^["'“”]+|["'“”]+$/g, '').split('\n').filter(Boolean).slice(0, 2).join(' ').slice(0, max);

/** Everything that remembers or repackages the chat: lore, translators, memes, recaps, awards, Wrapped. */
export class Memory {
  private readonly cache = new Map<string, Translation>();

  constructor(private readonly e: Engine) {}

  // ------------------------------------------------------------------ lore keeper

  /** "Remember when Rahul said cereal is soup? Anyway." Only for jokes older than loreGapMs on the room clock. */
  maybeLore(room: Room): void {
    if (!room.settings.commentary || !room.lore.length) return;
    const now = room.now();
    const gap = room.settings.timings.loreGapMs;
    if (now - room.lastLoreAt < gap) return;
    const eligible = room.lore.filter((l) => now - l.at >= gap);
    if (!eligible.length || this.e.rng() >= 0.5) return;
    const l = eligible[Math.floor(this.e.rng() * eligible.length)]!;
    room.lastLoreAt = now;
    room.extrasDirty = true;
    const author = room.members.get(l.authorId);
    void this.e.comment(room, {
      kind: 'lore', member: author, text: l.text, fact: `once said "${l.text}" (${l.why}). Bring it back as a days-old inside joke`,
      vars: { name: author?.name ?? 'someone', text: l.text },
    }).catch(() => {});
  }

  /** deleting or editing a message takes its lore with it: a deleted message must never resurface as an inside joke */
  forget(room: Room, authorId: string, originalText: string): void {
    const before = room.lore.length;
    room.lore = room.lore.filter((l) => !(l.authorId === authorId && l.text === originalText.slice(0, 120)));
    if (room.lore.length !== before) room.extrasDirty = true;
  }

  // ------------------------------------------------------------------ translators

  private throttled(room: Room, memberId: string): boolean {
    const now = Date.now();
    const recent = (room.translateTimes.get(memberId) ?? []).filter((t) => now - t < 10_000);
    if (recent.length >= 3) {
      room.translateTimes.set(memberId, recent);
      return true;
    }
    recent.push(now);
    room.translateTimes.set(memberId, recent);
    return false;
  }

  async translate(room: Room, memberId: string, id: string, mode: 'brainrot' | 'plain' | 'dry'): Promise<Ack<Translation>> {
    if (!room.members.has(memberId)) return fail('not in room');
    if (!['brainrot', 'plain', 'dry'].includes(mode)) return fail('bad mode');
    const msg = room.messages.find((m) => m.id === id && m.kind === 'user' && !m.deleted);
    if (!msg) return fail('that message cannot be translated');
    if (mode === 'dry') {
      const meaning = dryMeaning(msg.text);
      return meaning ? ok({ text: meaning, via: 'rules' as const }) : fail("that's not a dry text");
    }
    const key = `${msg.id}:${mode}:${msg.text}`;
    const hit = this.cache.get(key);
    if (hit) return ok(hit);
    if (this.throttled(room, memberId)) return fail('slow down, translator is tired');

    const system = mode === 'brainrot'
      ? 'Rewrite the message in exaggerated 2026 brainrot slang (6 7, aura farming, crash out, glazing, chopped, unc, clanker, delulu, no cap, cooked, lock in). If it is in Hinglish, keep it Hinglish. Keep the meaning. One or two short lines. Nothing about anyone\'s identity. Output only the rewrite.'
      : 'You are a confused but kind dad translating internet slang (and Hinglish) into plain, slightly baffled English. One or two short sentences. Output only the translation.';
    const gen = await this.e.d.writer.generate?.({ system, user: msg.text });
    const text = gen ? clean(gen, 280) : '';
    const result: Translation = text && !isOffLimits(text) ? { text, via: 'ai' } : { text: mode === 'brainrot' ? toBrainrot(msg.text, () => this.e.rng()) : toPlain(msg.text, () => this.e.rng()), via: 'rules' };
    this.cache.set(key, result);
    if (this.cache.size > 300) this.cache.delete(this.cache.keys().next().value!);
    return ok(result);
  }

  // ------------------------------------------------------------------ memes

  async makeMeme(room: Room, memberId: string, id: string): Promise<Ack> {
    if (!room.members.has(memberId)) return fail('not in room');
    const msg = room.messages.find((m) => m.id === id && m.kind === 'user' && !m.deleted);
    if (!msg) return fail('that message cannot become a meme');
    if (Date.now() - room.lastMemeAt < 8000) return fail('the meme printer is warming up (8s)');
    room.lastMemeAt = Date.now();
    const author = room.members.get(msg.authorId ?? '');
    const gen = await this.e.d.writer.generate?.({
      system: 'You write two-line meme captions. Reply with exactly: TOP | BOTTOM. Uppercase, each part at most 36 characters, funny, about the behavior not the person\'s identity.',
      user: `${author?.name ?? 'Someone'} said in the group chat: "${msg.text.slice(0, 160)}"`,
    });
    let top: string;
    let bottom: string;
    const parts = gen?.includes('|') ? gen.split('|').map((p) => clean(p, 40).toUpperCase()) : [];
    if (parts.length >= 2 && parts[0] && parts[1] && !isOffLimits(parts.join(' '))) [top, bottom] = [parts[0], parts[1]];
    else {
      const idx = [...msg.id].reduce((t, c) => t + c.charCodeAt(0), 0);
      top = MEME_TOP[idx % MEME_TOP.length]!.replace('{name}', (author?.name ?? 'SOMEONE').toUpperCase());
      bottom = msg.text.toUpperCase().slice(0, 40);
    }
    const emoji = MEME_EMOJI[[...msg.id].reduce((t, c) => t + c.charCodeAt(0), 7) % MEME_EMOJI.length]!;
    this.e.postCard(room, { type: 'meme', top, bottom, emoji, messageId: msg.id }, 'meme', 'meme');
    return { ok: true };
  }

  // ------------------------------------------------------------------ recap, awards, wrapped

  async recap(room: Room): Promise<Ack> {
    if (Date.now() - room.lastRecapAt < 30_000) return fail('the writers room is on break (30s)');
    room.lastRecapAt = Date.now();
    const names = Object.fromEntries([...room.members.values()].map((m) => [m.id, m.name]));
    const r = buildRecap({
      messages: room.messages.filter((m) => m.kind === 'user' || m.kind === 'ai').map((m) => ({ at: m.at, authorId: m.authorId, kind: m.kind, text: m.text, trigger: m.trigger })),
      ledger: room.ledger, names, tzOffsetMin: room.tzOffsetMin,
    });
    const lastEp = r.episodes.at(-1)!;
    const gen = await this.e.d.writer.generate?.({
      system: 'Write ONE line (max 110 characters): the dramatic cliffhanger that ends a TV episode about a group chat. Nothing about anyone\'s identity.',
      user: `Episode: ${lastEp.title}. ${lastEp.summary} ${lastEp.cliffhanger}`,
    });
    const line = gen ? clean(gen, 110) : '';
    if (line && !isOffLimits(line)) lastEp.cliffhanger = line;
    this.e.postCard(room, { type: 'recap', ...r }, r.title, 'recap');
    return { ok: true };
  }

  awards(room: Room): Ack {
    if (Date.now() - room.lastAwardsAt < 15_000) return fail('the trophy engraver is on break (15s)');
    room.recompute();
    const count = (id: string, reason: string) => room.ledger.filter((l) => l.memberId === id && l.reason === reason).length;
    const list = computeAwards([...room.members.values()].map((m) => ({
      id: m.id, name: m.name, aura: m.aura, stats: m.stats, typingDramas: count(m.id, 'typing_drama'), uncMoments: count(m.id, 'unc'),
      diabolical: Math.max(0, ...room.hotTakes.filter((h) => h.authorId === m.id).map((h) => h.diabolical)),
    })));
    if (!list.length) return fail('not enough activity for awards yet');
    room.lastAwardsAt = Date.now();
    this.e.postCard(room, { type: 'awards', awards: list }, 'Chat awards', 'awards');
    return { ok: true };
  }

  wrapped(room: Room, requesterId: string, targetId?: string): Ack {
    const target: Member | undefined = room.members.get(targetId || requesterId);
    if (!room.members.has(requesterId) || !target) return fail('unknown member');
    if (Date.now() - (room.lastWrappedAt.get(requesterId) ?? 0) < 10_000) return fail('one Wrapped at a time (10s)');
    const raw = room.getStats(target.id);
    if (raw.messages < 1) return fail(`${target.name} has not said anything yet. nothing to wrap`);
    room.lastWrappedAt.set(requesterId, Date.now());
    room.recompute();
    this.e.postCard(room, computeWrapped(target, raw), `${target.name}'s Brainrot Wrapped`, 'wrapped');
    return { ok: true };
  }
}
