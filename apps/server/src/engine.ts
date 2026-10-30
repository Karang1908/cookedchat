import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import {
  AURA_RULES, AVATARS, CLASSES, DUEL_CLOSERS, DUEL_OPENERS, DUEL_REPLIES, GIF_QUERY, PERSONAS, RIVAL_RETORTS, SIDE_LABEL, TIERS, COOKED_CAPS_BONUS, COOKED_PER_MESSAGE, COOKED_PUSH, DEAD_CHAT_PROMPTS, QUICK_REPLY_FARM_GUARD_MS, TREND_EMOJI,
  cannedLine, capsRatio, decayCooked, findUnc, fmtDuration, is67, isDry, isReplyLater, ohioScore, pushCooked, shouldMeltdown,
} from '@cooked/shared';
import type {
  Ack, AuraEntry, AuraReason, Card, ChatMessage, FxKind, JoinPayload, Member, PersonaId, SimulateKind, SoundName, TriggerKind, TypingPayload,
} from '@cooked/shared';
import type { RoomBus } from './bus.js';
import { analyze } from './features/behavior.js';
import { Games } from './features/games.js';
import { Memory } from './features/memory.js';
import type { GifFinder } from './features/gif.js';
import { tickBehavior } from './features/ticks.js';
import type { CommentContext } from './llm/prompt.js';
import { GIF_RULE, sanitizeLine } from './llm/prompt.js';
import { Room } from './room.js';
import { applySettingsPatch } from './settings.js';
import type { SettingsPatch } from './settings.js';
import type { Store } from './store.js';
import { EFFECTS, INSTANT, PRIORITY, REACTION } from './tables.js';
import type { Hit } from './tables.js';

/** a line the AI will post, and which provider wrote it */
export interface Line {
  text: string;
  model: string;
  /** GIPHY search the model asked for ("[gif: ...]"), already cleaned */
  gif?: string;
}

export interface CommentWriter {
  /** one safe chat line, or null to fall back to a canned one */
  write(ctx: CommentContext): Promise<Line | null>;
  /** one safe line from a free-form prompt (duel banter); null = canned */
  say?(p: { system: string; user: string; prefer?: 'groq' | 'ollama' }): Promise<Line | null>;
  /** free-form text for judges, translators, captions, recaps; null = use the rule-based fallback */
  generate?(p: { system: string; user: string }): Promise<string | null>;
}

const MAX_TEXT = 500;
const MAX_NAME = 20;
const MAX_MESSAGES_KEPT = 500;
const SEND_LIMIT = { count: 6, windowMs: 5000 };
const TYPING_STALE_MS = 8000;
const USER_EMOJI = new Set<string>([...TREND_EMOJI, '😂', '🔥', '👍', '❤️']);
const BOT_CHATTER = ['lol', 'wait what', 'k', 'pizza tonight?', 'bro', 'no way', 'ok', '67', 'i am so hungry', 'hmm', 'sure', 'i will reply later guys', 'WHAT IS HAPPENING', 'fine.', 'acha', 'baad mein reply karta hu', 'bhai scene kya hai', 'chai peeni hai'];
/** model-picked GIFs per side: GIPHY's free key allows ~100 searches an hour */
const MODEL_GIF_GAP_MS = 20_000;
const BOTS: { name: string; avatar: Member['avatar'] }[] = [
  { name: 'Aman', avatar: 'cat' }, { name: 'Riya', avatar: 'ghost' }, { name: 'Dev', avatar: 'droid' },
];

export interface CommentRequest {
  kind: TriggerKind;
  member?: Member;
  text: string;
  fact: string;
  targetId?: string;
  vars?: Record<string, string | number>;
}

export type SendResult = { ok: true; id: string; done: Promise<void> } | { ok: false; error: string };

export class Engine {
  private readonly log = new Logger('Engine');

  readonly games: Games = new Games(this);
  readonly memory: Memory = new Memory(this);

  constructor(readonly d: { bus: RoomBus; store: Store; writer: CommentWriter; rng?: () => number; gifs?: GifFinder }) {}

  rng = () => (this.d.rng ?? Math.random)();

  /** >0 while an admin-staged moment runs: staged moments always get their roast (no cooldown, no dice) */
  private staging = 0;

  // ---------------------------------------------------------------- members

  join(room: Room, p: JoinPayload, socketId: string): Ack<{ member: Member }> {
    const name = p.name?.trim().slice(0, MAX_NAME);
    if (!p.memberId || p.memberId.length > 64) return { ok: false, error: 'bad member id' };
    if (!name) return { ok: false, error: 'name required' };
    if (!(AVATARS as readonly string[]).includes(p.avatar)) return { ok: false, error: 'bad avatar' };
    let m = room.members.get(p.memberId);
    if (m?.isBot) return { ok: false, error: 'bad member id' };
    if (!m) m = room.addMember(p.memberId, name, p.avatar, false);
    else Object.assign(m, { name, avatar: p.avatar });
    m.online = true;
    if (!room.sockets.has(m.id)) room.sockets.set(m.id, new Set());
    room.sockets.get(m.id)!.add(socketId);
    this.d.store.saveMember(room.code, m);
    this.flushMembers(room);
    return { ok: true, member: m };
  }

  leave(room: Room, memberId: string, socketId: string): void {
    const set = room.sockets.get(memberId);
    set?.delete(socketId);
    const m = room.members.get(memberId);
    if (m && !set?.size) {
      m.online = false;
      room.typing.delete(memberId);
      this.emitTyping(room);
      this.emitMembers(room);
    }
  }

  emitMembers(room: Room): void {
    this.d.bus.emit(room.code, 'room:members', [...room.members.values()]);
  }

  /** re-derive stats (tiers are relative), announce evolutions, push the list to everyone */
  flushMembers(room: Room): void {
    room.recompute();
    for (const m of room.members.values()) {
      const prev = room.lastClass.get(m.id);
      room.lastClass.set(m.id, m.stats.klass);
      if (prev && prev !== m.stats.klass && m.stats.messages >= 3) {
        void this.comment(room, {
          kind: 'class_change', member: m, text: '', fact: `evolved from ${CLASSES[prev].name} to ${CLASSES[m.stats.klass].name}`,
          vars: { from: CLASSES[prev].name, to: CLASSES[m.stats.klass].name, emoji: CLASSES[m.stats.klass].emoji },
        }).catch((e) => this.log.error(e));
      }
      if (m.stats.power >= 9000 && !room.scouterFired.has(m.id)) {
        room.scouterFired.add(m.id);
        void this.comment(room, { kind: 'scouter', member: m, text: '', fact: `power level hit ${m.stats.power}`, vars: { power: m.stats.power.toLocaleString() } }, true).catch((e) => this.log.error(e));
      }
    }
    this.emitMembers(room);
  }

  // ---------------------------------------------------------------- chat

  send(room: Room, memberId: string, rawText: string, replyToId?: string): SendResult {
    const member = room.members.get(memberId);
    if (!member) return { ok: false, error: 'not in room' };
    const text = rawText?.trim().slice(0, MAX_TEXT);
    if (!text) return { ok: false, error: 'empty message' };
    if (!member.isBot && this.rateLimited(room, memberId)) return { ok: false, error: 'slow down' };

    const t = room.settings.timings;
    const now = room.now();
    const prev = room.userMessages().at(-1);
    const typed = room.typing.get(memberId);
    const typingMs = typed ? Date.now() - typed.startedAt : 0;
    room.typing.delete(memberId);
    this.emitTyping(room);

    const replyTo = replyToId ? room.messages.find((m) => m.id === replyToId && m.kind === 'user' && !m.deleted) : undefined;
    const msg: ChatMessage = {
      id: randomUUID(), authorId: memberId, kind: 'user', text, at: now, edited: false, deleted: false, aiReactions: [], reactions: {},
      ohio: ohioScore(text), replyToId: replyTo?.id,
    };
    this.push(room, msg);
    room.deadChatFired = false;
    room.humanSinceAi++;
    room.duelLullFired = false;

    const burst = room.userMessages().filter((m) => m.authorId === memberId && now - m.at <= t.burstWindowMs).length;
    const live = room.userMessages().filter((m) => now - m.at <= 120_000).length >= 3;
    const gap = prev ? now - prev.at : null;
    const replyingToOther = !!prev && prev.authorId !== memberId;
    const hits = this.detect(room, member, text, { prev, now, typingMs, burst, live });
    hits.push(...analyze(room, member, msg, { prev, gap, replyingToOther, burst, now }));
    return { ok: true, id: msg.id, done: this.react(room, member, msg, hits, burst) };
  }

  private detect(room: Room, member: Member, text: string, f: { prev?: ChatMessage; now: number; typingMs: number; burst: number; live: boolean }): Hit[] {
    const t = room.settings.timings;
    const hits: Hit[] = [];
    const gap = f.prev ? f.now - f.prev.at : null;
    const replyingToOther = !!f.prev && f.prev.authorId !== member.id;

    if (is67(text)) hits.push({ kind: 'six_seven', aura: 'six_seven', fact: 'sent 67' });
    if (isReplyLater(text)) hits.push({ kind: 'reply_later', aura: 'reply_later', fact: 'said they would reply later' });
    const tiny = text.length <= 3 || isDry(text);
    if (f.typingMs >= t.typingDramaMs && tiny) {
      hits.push({ kind: 'typing_drama', aura: 'typing_drama', fact: `typed for ${Math.round(f.typingMs / 1000)} seconds, then sent only "${text}"` });
    }
    if (replyingToOther && gap !== null && gap >= t.slowReplyMs) {
      hits.push({ kind: 'slow_reply', aura: 'slow_reply', fact: `took ${(gap / 3_600_000).toFixed(1)} hours to reply` });
    } else if (replyingToOther && gap !== null && gap <= t.quickReplyMs && f.live) {
      const last = room.lastQuickReplyAt.get(member.id) ?? 0;
      if (Date.now() - last >= QUICK_REPLY_FARM_GUARD_MS) {
        room.lastQuickReplyAt.set(member.id, Date.now());
        hits.push({ kind: 'quick_reply', aura: 'quick_reply', fact: `replied in ${Math.round(gap / 1000)} seconds in a live conversation` });
      }
    }
    const unc = findUnc(text);
    if (unc) hits.push({ kind: 'unc', aura: 'unc', fact: `used expired slang ("${unc}"), like an old person`, vars: { term: unc } });
    if (f.burst === t.burstCount) hits.push({ kind: 'burst', fact: `sent ${f.burst} messages in a row` });
    if (isDry(text) && !hits.some((h) => h.kind === 'typing_drama')) hits.push({ kind: 'dry_reply', fact: `sent a dry reply: "${text}"` });
    return hits;
  }

  private async react(room: Room, member: Member, msg: ChatMessage, hits: Hit[], burst: number): Promise<void> {
    for (const h of hits) if (h.aura) this.aura(room, member.id, h.aura, msg.text, msg.id);

    let heat = COOKED_PER_MESSAGE + (capsRatio(msg.text) > 0.6 ? COOKED_CAPS_BONUS : 0) + (burst > 3 ? (burst - 3) * 1.5 : 0);
    for (const h of hits) heat += COOKED_PUSH[h.kind] ?? 0;
    this.heat(room, heat);

    if (hits.some((h) => h.kind === 'cap') && room.settings.commentary) this.games.openRealVote(room, member, msg);
    this.memory.maybeLore(room);

    const top = hits.filter((h) => PRIORITY[h.kind]).sort((a, b) => PRIORITY[b.kind]! - PRIORITY[a.kind]!)[0];
    // nobody awaits this promise (the sender already got their ack), so an escape here would crash the process
    try {
      if (top) await this.comment(room, { kind: top.kind, member, text: msg.text, fact: top.fact, targetId: msg.id, vars: top.vars });
    } catch (e) {
      this.log.error(`comment failed: ${(e as Error).stack}`);
    }
  }

  edit(room: Room, memberId: string, id: string, rawText: string): string | null {
    const msg = room.messages.find((m) => m.id === id);
    const text = rawText?.trim().slice(0, MAX_TEXT);
    if (!msg || msg.authorId !== memberId || msg.deleted || msg.kind !== 'user') return 'cannot edit that';
    if (!text) return 'empty message';
    if (text === msg.text) return null;
    room.originals.set(msg.id, msg.text);
    this.memory.forget(room, memberId, msg.text);
    this.d.store.saveEdit(msg.id, msg.text, room.now());
    msg.text = text;
    msg.edited = true;
    msg.ohio = ohioScore(text);
    this.update(room, msg);
    const member = room.members.get(memberId)!;
    this.heat(room, COOKED_PUSH.edited ?? 0);
    void this.comment(room, { kind: 'edited', member, text: '', fact: 'edited a message they already sent', targetId: msg.id }).catch((e) => this.log.error(e));
    return null;
  }

  delete(room: Room, memberId: string, id: string): string | null {
    const msg = room.messages.find((m) => m.id === id);
    if (!msg || msg.authorId !== memberId || msg.deleted || msg.kind !== 'user') return 'cannot delete that';
    room.originals.set(msg.id, msg.text);
    this.memory.forget(room, memberId, msg.text);
    this.d.store.saveEdit(msg.id, msg.text, room.now());
    msg.deleted = true;
    msg.text = '';
    this.update(room, msg);
    const member = room.members.get(memberId)!;
    this.heat(room, COOKED_PUSH.deleted ?? 0);
    void this.comment(room, { kind: 'deleted', member, text: '', fact: 'deleted a message after sending it', targetId: msg.id }).catch((e) => this.log.error(e));
    return null;
  }

  seen(room: Room, memberId: string, id: string): void {
    const msg = room.messages.find((m) => m.id === id);
    if (!msg || msg.kind !== 'user' || msg.authorId === memberId || !room.members.has(memberId)) return;
    if (!room.seen.has(id)) room.seen.set(id, new Set());
    room.seen.get(id)!.add(memberId);
  }

  /** member reaction toggle. A reply that earns 2+ reactions from others is a comeback: the replier mogs the person they answered. */
  reactTo(room: Room, memberId: string, id: string, emoji: string): void {
    const msg = room.messages.find((m) => m.id === id);
    if (!msg || msg.deleted || !room.members.has(memberId) || !USER_EMOJI.has(emoji) || !['user', 'ai'].includes(msg.kind)) return;
    if (this.rateLimited(room, memberId)) return;
    const list = msg.reactions[emoji] ?? [];
    const added = !list.includes(memberId);
    if (added) msg.reactions[emoji] = [...list, memberId];
    else {
      msg.reactions[emoji] = list.filter((x) => x !== memberId);
      if (!msg.reactions[emoji]!.length) delete msg.reactions[emoji];
    }
    this.update(room, msg);
    if (!added || msg.kind !== 'user' || !msg.replyToId || room.mogged.has(msg.id)) return;
    const reactors = new Set(Object.values(msg.reactions).flat().filter((x) => x !== msg.authorId));
    const target = room.messages.find((m) => m.id === msg.replyToId);
    if (reactors.size >= 2 && target?.authorId && msg.authorId && target.authorId !== msg.authorId) {
      room.mogged.add(msg.id);
      this.mog(room, msg.authorId, target.authorId, `reply "${msg.text.slice(0, 60)}" landed`, msg.id);
    }
  }

  /** winner +1000 aura, loser gets a roast. Used by comebacks, votes and rizz battles. */
  mog(room: Room, winnerId: string, loserId: string, why: string, targetId?: string): void {
    const winner = room.members.get(winnerId);
    const loser = room.members.get(loserId);
    if (!winner || !loser || winnerId === loserId) return;
    room.getStats(winnerId).mogs++;
    room.extrasDirty = true;
    this.aura(room, winnerId, 'mog', why, targetId);
    void this.comment(room, { kind: 'mog', member: winner, text: '', fact: `mogged ${loser.name}`, targetId, vars: { name: winner.name, other: loser.name } }, true).catch((e) => this.log.error(e));
  }

  typing(room: Room, memberId: string, p: TypingPayload): void {
    const member = room.members.get(memberId);
    if (!member) return;
    const now = Date.now();
    const len = Math.max(0, Math.min(10_000, Math.floor(Number(p.len) || 0)));
    const cur = room.typing.get(memberId);
    if (p.state === 'stop') {
      room.typing.delete(memberId);
      this.emitTyping(room);
      const t = room.settings.timings;
      if (p.cleared && cur && cur.peak >= 25 && now - cur.startedAt >= t.typedDeletedMs) {
        this.heat(room, COOKED_PUSH.typed_deleted ?? 0);
        void this.comment(room, { kind: 'typed_deleted', member, text: '', fact: `typed for ${Math.round((now - cur.startedAt) / 1000)} seconds (${cur.peak} characters) and then deleted it all` }).catch((e) => this.log.error(e));
      }
      return;
    }
    room.typing.set(memberId, { startedAt: cur?.startedAt ?? now, lastAt: now, len, peak: Math.max(cur?.peak ?? 0, len) });
    if (!cur) this.emitTyping(room);
  }

  private emitTyping(room: Room): void {
    this.d.bus.emit(room.code, 'typing:update', [...room.typing.keys()]);
  }

  playSound(room: Room, memberId: string, name: SoundName): void {
    if (!room.members.has(memberId) || this.rateLimited(room, memberId)) return;
    this.d.bus.emit(room.code, 'sound', { name });
  }

  /** any member can change the voice of the room; throttled so it cannot be spammed */
  setVibe(room: Room, memberId: string, patch: { persona?: PersonaId; brainrot?: number; intensity?: number }): void {
    if (!room.members.has(memberId)) return;
    const last = room.lastVibeAt.get(memberId) ?? 0;
    if (Date.now() - last < 2000) return;
    room.lastVibeAt.set(memberId, Date.now());
    this.setSettings(room, { persona: patch.persona, brainrot: patch.brainrot as 0 | 1 | 2 | 3, intensity: patch.intensity as 1 | 2 | 3 });
  }

  private rateLimited(room: Room, memberId: string): boolean {
    const now = Date.now();
    const recent = (room.sendTimes.get(memberId) ?? []).filter((t) => now - t < SEND_LIMIT.windowMs);
    if (recent.length >= SEND_LIMIT.count) {
      room.sendTimes.set(memberId, recent);
      return true;
    }
    recent.push(now);
    room.sendTimes.set(memberId, recent);
    return false;
  }

  // ---------------------------------------------------------------- aura + cooked

  aura(room: Room, memberId: string, reason: AuraReason, receipt: string, messageId?: string, deltaOverride?: number): void {
    const member = room.members.get(memberId);
    if (!member) return;
    const delta = deltaOverride ?? (reason === 'manual' ? 0 : AURA_RULES[reason].delta);
    member.aura += delta;
    const entry: AuraEntry = { id: randomUUID(), memberId, delta, reason, messageId, receipt: receipt.slice(0, 200), at: room.now() };
    room.ledger.push(entry);
    if (room.ledger.length > 200) room.ledger.shift();
    room.membersDirty = true;
    this.d.store.saveAura(room.code, entry);
    this.d.bus.emit(room.code, 'aura:change', entry, member.aura);
  }

  adminAura(room: Room, memberId: string, delta: number): void {
    if (!Number.isFinite(delta)) return;
    this.aura(room, memberId, 'manual', 'admin adjustment', undefined, Math.max(-10_000, Math.min(10_000, Math.round(delta))));
  }

  heat(room: Room, amount: number): void {
    if (amount <= 0) return;
    room.cooked = pushCooked(room.cooked, amount);
    this.afterCookedChange(room);
  }

  setCooked(room: Room, value: number): void {
    room.cooked = { ...room.cooked, value: Math.min(100, Math.max(0, value)) };
    this.afterCookedChange(room);
  }

  private afterCookedChange(room: Room): void {
    const v = Math.round(room.cooked.value);
    if (v !== room.cookedSent) {
      room.cookedSent = v;
      this.d.bus.emit(room.code, 'cooked:update', v);
    }
    if (shouldMeltdown(room.cooked)) {
      room.cooked = { ...room.cooked, armed: false };
      this.playEffects(room, 'cooked_max');
      void this.comment(room, { kind: 'cooked_max', text: '', fact: 'the chat hit 100% cooked' }, true).catch((e) => this.log.error(e));
    }
  }

  // ---------------------------------------------------------------- commentary

  private chance(prio: number): number {
    return prio >= 8 ? 1 : prio >= 6 ? 0.9 : prio >= 5 ? 0.8 : 0.35;
  }

  /**
   * The AI's speaking budget. Ordinary triggers need `aiEvery` user messages since the AI last spoke, core jokes
   * (priority 8) half that, big moments (9+) one. System events (`force`) skip the dice and the cooldown but still never
   * make two AI turns in a row. Admin-staged moments skip everything.
   */
  mayTakeTurn(room: Room, prio: number, force: boolean): boolean {
    if (this.staging > 0) return true;
    if (force || prio >= 9) return room.humanSinceAi >= 1;
    const n = room.settings.aiEvery;
    return room.humanSinceAi >= Math.max(1, prio >= 8 ? Math.ceil(n / 2) : n);
  }

  /** the AI noticed but is not taking a turn: an emoji on the message instead of another chat line */
  private quietReact(room: Room, c: CommentRequest): void {
    const emoji = REACTION[c.kind];
    const target = c.targetId ? room.messages.find((m) => m.id === c.targetId) : undefined;
    if (emoji && target && !target.aiReactions.includes(emoji)) {
      target.aiReactions.push(emoji);
      this.update(room, target);
    }
  }

  /** `sameTurn`: this line belongs to an AI turn that just started (e.g. the roast under an instant-replay card) */
  async comment(room: Room, c: CommentRequest, force = false, sameTurn = false): Promise<void> {
    const { settings } = room;
    if (!settings.commentary) return;
    const prio = PRIORITY[c.kind] ?? 3;
    const staged = this.staging > 0;
    const gated =
      (!sameTurn && !this.mayTakeTurn(room, prio, force)) ||
      (!force && !staged && prio < 10 && Date.now() - room.lastCommentAt < settings.timings.commentCooldownMs) ||
      (!force && !staged && this.rng() >= this.chance(prio));
    if (gated) return this.quietReact(room, c);
    room.lastCommentAt = Date.now(); // claim the slot before awaiting so concurrent triggers back off
    room.humanSinceAi = 0;

    const name = c.member?.name ?? 'chat';
    const duel = settings.duel;
    let line: Line | null = null;
    if (!INSTANT.has(c.kind)) {
      this.d.bus.emit(room.code, 'ai:thinking', true);
      try {
        line = await this.d.writer.write({
          kind: c.kind, name, text: c.text, fact: c.fact, settings,
          recent: room.userMessages().slice(-6).map((m) => ({ name: room.members.get(m.authorId!)?.name ?? '?', text: m.text })),
          midnight: this.isMidnight(room), prefer: duel ? 'groq' : undefined,
        });
      } finally {
        this.d.bus.emit(room.code, 'ai:thinking', false);
      }
    }
    const text = line?.text ?? cannedLine(c.kind, { name, text: c.text, ...c.vars }, () => this.rng());

    const posted = this.postAi(room, text, { replyTo: c.targetId, trigger: c.kind, model: line?.model ?? 'canned', side: duel ? 'groq' : undefined });
    this.attachGif(room, posted, GIF_QUERY[c.kind], line?.gif);
    const rival = this.rivalOf(settings);
    if (rival) await this.rivalReply(room, c, name, text, INSTANT.has(c.kind), rival);
    this.quietReact(room, c);
    if (c.kind !== 'cooked_max') this.playEffects(room, c.kind);
  }

  /** the second voice: the configured rival, or in a duel a contrasting persona so Groq and Ollama never sound alike */
  rivalOf(settings: Room['settings']): PersonaId | null {
    if (settings.rival && settings.rival !== settings.persona) return settings.rival;
    if (settings.duel) return settings.persona === 'boomer' ? 'gremlin' : 'boomer';
    return null;
  }

  /**
   * Fire-and-forget: the line is already on screen, the GIF is attached when (if) it arrives. `table` is the trigger's
   * fixed search (big moments); `picked` is what the model asked for, rationed per side, falling back to the table one.
   */
  private attachGif(room: Room, msg: ChatMessage, table?: string, picked?: string): void {
    if (!this.d.gifs) return;
    let q = table;
    const side = msg.side ?? 'main';
    if (picked && Date.now() - (room.lastGifAt.get(side) ?? 0) >= MODEL_GIF_GAP_MS) {
      room.lastGifAt.set(side, Date.now());
      q = picked;
    }
    if (!q) return;
    this.d.gifs.find(q).then((url) => {
      if (!url) return;
      msg.gif = url;
      this.update(room, msg);
    }).catch(() => {});
  }

  /** the second persona answers the first. LLM when it can, canned retort otherwise. In a duel it runs on Ollama. */
  private async rivalReply(room: Room, c: CommentRequest, name: string, firstLine: string, instant: boolean, rival: PersonaId): Promise<void> {
    const duel = room.settings.duel;
    let line: Line | null = null;
    if (!instant) {
      this.d.bus.emit(room.code, 'ai:thinking', true);
      try {
        line = await this.d.writer.write({
          kind: c.kind, name, text: c.text, fact: c.fact, settings: { ...room.settings, persona: rival },
          recent: room.userMessages().slice(-4).map((m) => ({ name: room.members.get(m.authorId!)?.name ?? '?', text: m.text })),
          midnight: this.isMidnight(room), rivalOf: { label: PERSONAS[room.settings.persona].label, line: firstLine }, prefer: duel ? 'ollama' : undefined,
        });
      } finally {
        this.d.bus.emit(room.code, 'ai:thinking', false);
      }
    }
    const pool = RIVAL_RETORTS[rival];
    const posted = this.postAi(room, line?.text ?? pool[Math.floor(this.rng() * pool.length)]!, { replyTo: c.targetId, trigger: c.kind, persona: rival, model: line?.model ?? 'canned', side: duel ? 'ollama' : undefined });
    this.attachGif(room, posted, undefined, line?.gif);
  }

  /**
   * Duel rooms, during a lull: the two AIs roast EACH OTHER (opener on Groq, comeback on Ollama, closer on Groq).
   * Once per lull, and only after a human spoke, so it never loops by itself.
   */
  async duelBanter(room: Room, forced = false): Promise<void> {
    const s = room.settings;
    // a forced exchange (admin click) works even with the duel off, using the duel's default rival
    const rival = this.rivalOf(forced ? { ...s, duel: true } : s);
    if (!s.commentary || !rival || (!forced && (!s.duel || room.duelLullFired || !this.mayTakeTurn(room, 9, true)))) return;
    room.duelLullFired = true;
    room.humanSinceAi = 0;
    room.lastCommentAt = Date.now();
    const seats = [
      { persona: s.persona, side: 'groq' as const, other: rival, otherSide: 'ollama' as const, pool: DUEL_OPENERS },
      { persona: rival, side: 'ollama' as const, other: s.persona, otherSide: 'groq' as const, pool: DUEL_REPLIES },
      { persona: s.persona, side: 'groq' as const, other: rival, otherSide: 'ollama' as const, pool: DUEL_CLOSERS },
    ];
    const recent = room.userMessages().slice(-4).map((m) => `${room.members.get(m.authorId!)?.name ?? '?'}: ${m.text.slice(0, 100)}`).join('\n');
    let last = '';
    for (const [i, seat] of seats.entries()) {
      const me = PERSONAS[seat.persona];
      const them = PERSONAS[seat.other];
      let line: Line | null = null;
      if (this.d.writer.say) {
        this.d.bus.emit(room.code, 'ai:thinking', true);
        try {
          line = await this.d.writer.say({
            prefer: seat.side,
            system: [
              `You are ${me.label} (${me.voice}), an AI running on ${SIDE_LABEL[seat.side]}, inside a group chat.`,
              `You are in a roast battle with the OTHER AI in this chat: ${them.label}, running on ${SIDE_LABEL[seat.otherSide]}.`,
              'Roast the other AI (its model, its speed, its takes, its vibe), never the humans and never anyone\'s identity.',
              'Write exactly ONE line, at most 140 characters, plain text, at most 2 emoji.',
              'If the chat is in Hinglish, roast in Hinglish (Roman script).',
              GIF_RULE,
            ].join('\n'),
            user: i === 0 ? `The humans went quiet. Open the roast battle.${recent ? `\nRecent chat:\n${recent}` : ''}` : `The other AI just said: "${last}". ${i === 2 ? 'Finish it.' : 'Clap back.'}`,
          });
        } finally {
          this.d.bus.emit(room.code, 'ai:thinking', false);
        }
      }
      const canned = seat.pool[Math.floor(this.rng() * seat.pool.length)]!
        .replaceAll('{them}', SIDE_LABEL[seat.otherSide]).replaceAll('{me}', SIDE_LABEL[seat.side]).replaceAll('{other}', them.label);
      last = (line && sanitizeLine(line.text)) || canned;
      const posted = this.postAi(room, last, { trigger: 'duel', persona: seat.persona, model: line?.model ?? 'canned', side: seat.side });
      if (line && last === line.text) this.attachGif(room, posted, undefined, line.gif);
    }
    this.playEffects(room, 'duel');
  }

  postAi(room: Room, text: string, o: { replyTo?: string; trigger?: TriggerKind; persona?: PersonaId; model?: string; side?: 'groq' | 'ollama' } = {}): ChatMessage {
    const m: ChatMessage = {
      id: randomUUID(), authorId: null, kind: 'ai', text, at: room.now(), edited: false, deleted: false, aiReactions: [], reactions: {},
      replyTo: o.replyTo, trigger: o.trigger, persona: o.persona ?? room.settings.persona, model: o.model, side: o.side,
    };
    this.push(room, m);
    room.humanSinceAi = 0; // every AI line spends the budget, whoever posted it
    return m;
  }

  postCard(room: Room, card: Card, text = '', trigger?: TriggerKind): ChatMessage {
    const m: ChatMessage = { id: randomUUID(), authorId: null, kind: 'card', card, text, at: room.now(), edited: false, deleted: false, aiReactions: [], reactions: {}, trigger };
    this.push(room, m);
    if (trigger) room.humanSinceAi = 0; // cards the AI chose to post count as its turn; player-started games do not
    return m;
  }

  playEffects(room: Room, kind: TriggerKind): void {
    const e = EFFECTS[kind];
    for (const fx of e?.fx ?? []) this.d.bus.emit(room.code, 'fx', fx);
    if (e?.sound) this.d.bus.emit(room.code, 'sound', { name: e.sound });
  }

  isMidnight(room: Room): boolean {
    const h = room.localHour();
    return h >= 1 && h < 5;
  }

  push(room: Room, msg: ChatMessage): void {
    room.messages.push(msg);
    if (room.messages.length > MAX_MESSAGES_KEPT) room.messages.splice(0, room.messages.length - MAX_MESSAGES_KEPT);
    room.lastActiveAt = Date.now();
    this.d.store.saveMessage(room.code, msg);
    this.d.bus.emit(room.code, 'chat:message', msg);
  }

  update(room: Room, msg: ChatMessage): void {
    this.d.store.saveMessage(room.code, msg);
    this.d.bus.emit(room.code, 'chat:update', msg);
  }

  // ---------------------------------------------------------------- game loop (called every ~1s per room)

  tick(room: Room): void {
    const realNow = Date.now();
    const dt = realNow - room.lastTickAt;
    room.lastTickAt = realNow;
    const now = room.now();
    const t = room.settings.timings;

    room.cooked = decayCooked(room.cooked, dt);
    this.afterCookedChange(room);

    let typingChanged = false;
    for (const [id, s] of room.typing) if (realNow - s.lastAt > TYPING_STALE_MS) { room.typing.delete(id); typingChanged = true; }
    if (typingChanged) this.emitTyping(room);

    const users = room.userMessages();
    const last = users.at(-1);
    for (const [i, msg] of users.entries()) {
      if (i < users.length - 40 || room.leftOnReadFired.has(msg.id) || now - msg.at < t.leftOnReadMs) continue;
      for (const viewerId of room.seen.get(msg.id) ?? []) {
        // "after" means later in the chat, not a later timestamp: the admin can warp the clock backwards
        if (users.slice(i + 1).some((m) => m.authorId === viewerId)) continue;
        const viewer = room.members.get(viewerId);
        const author = room.members.get(msg.authorId!);
        if (!viewer || !author) continue;
        room.leftOnReadFired.add(msg.id);
        room.getStats(viewerId).ghosts++;
        room.membersDirty = true;
        const ago = fmtDuration(now - msg.at);
        const betrayal = viewer.elsewhere;
        void this.comment(room, betrayal
          ? { kind: 'betrayal', member: viewer, text: msg.text, fact: `is active in another app right now but has left ${author.name}'s message ("${msg.text.slice(0, 80)}") on read for ${ago}`, targetId: msg.id, vars: { other: author.name } }
          : { kind: 'left_on_read', member: viewer, text: msg.text, fact: `saw ${author.name}'s message ("${msg.text.slice(0, 80)}") ${ago} ago and never replied`, targetId: msg.id },
        ).catch((e) => this.log.error(e));
        break;
      }
    }

    if (room.localHour() === 3 && room.tungKey !== room.localDayKey()) {
      room.tungKey = room.localDayKey();
      void this.comment(room, { kind: 'tung_tung', text: '', fact: 'it is 3am' }, true).catch((e) => this.log.error(e));
    }

    if (room.settings.autopilotBots && realNow - room.lastBotChatterAt > 15_000 + this.rng() * 15_000) {
      room.lastBotChatterAt = realNow;
      const bots = [...room.members.values()].filter((m) => m.isBot);
      if (bots.length) {
        const bot = bots[Math.floor(this.rng() * bots.length)]!;
        void this.send(room, bot.id, BOT_CHATTER[Math.floor(this.rng() * BOT_CHATTER.length)]!);
      }
    }

    // order = priority when several are due at once (the AI only takes one turn): the specific beats the generic
    this.dailyTiers(room);
    tickBehavior(this, room);
    if (room.settings.duel && last && now - last.at >= t.duelLullMs) void this.duelBanter(room).catch((e) => this.log.error(e));
    if (last && !room.deadChatFired && now - last.at >= t.deadChatMs && room.humanSinceAi >= 1) {
      room.deadChatFired = true;
      if (room.settings.commentary) {
        if (this.rng() < 0.34) this.games.copypasta(room);
        else {
          const prompt = DEAD_CHAT_PROMPTS[Math.floor(this.rng() * DEAD_CHAT_PROMPTS.length)]!;
          this.postAi(room, prompt, { trigger: 'dead_chat' });
          this.playEffects(room, 'dead_chat');
        }
      }
    }

    this.games.tick(room);

    if (room.extrasDirty && realNow - room.lastExtrasSaveAt > 5000) {
      room.extrasDirty = false;
      room.lastExtrasSaveAt = realNow;
      this.d.store.saveExtras(room);
    }
  }

  /** "Sigma / Beta tier: daily status". Announced when the room's local day rolls over and there is something to rank. */
  private dailyTiers(room: Room): void {
    const day = room.localDayKey();
    const prev = room.lastDayKey;
    room.lastDayKey = day;
    if (!prev || prev === day || !room.settings.commentary || room.humanSinceAi < 1) return;
    const ranked = [...room.members.values()].filter((m) => m.stats.messages > 0).sort((a, b) => b.aura - a.aura);
    if (ranked.length < 2) return;
    const line = `Daily status update: ${ranked.map((m) => `${m.name} ${TIERS[m.stats.tier].emoji} ${TIERS[m.stats.tier].name}`).join(', ')}`;
    this.postAi(room, line, { trigger: 'tiers' });
    this.playEffects(room, 'class_change');
  }

  // ---------------------------------------------------------------- admin

  setSettings(room: Room, patch: SettingsPatch): void {
    const wasJumpscare = room.settings.jumpscare;
    const wasChaos = room.settings.chaos;
    room.settings = applySettingsPatch(room.settings, patch);
    if (room.settings.jumpscare && !wasJumpscare) room.lastJumpscareAt = Date.now();
    if (room.settings.chaos && !wasChaos) room.lastChaosAt = Date.now();
    this.d.store.saveRoom(room);
    this.broadcastSettings(room);
  }

  warp(room: Room, ms: number): void {
    if (!Number.isFinite(ms)) return;
    const next = room.clockOffsetMs + Math.round(ms);
    room.clockOffsetMs = Math.min(30 * 86_400_000, Math.max(-86_400_000, next));
    this.d.store.saveRoom(room);
    this.broadcastSettings(room);
    this.tick(room);
  }

  private broadcastSettings(room: Room): void {
    this.d.bus.emit(room.code, 'room:settings', room.settings, room.clockOffsetMs);
  }

  addBots(room: Room): void {
    for (const b of BOTS) {
      const id = `bot-${b.name.toLowerCase()}`;
      if (room.members.has(id)) continue;
      const m = room.addMember(id, b.name, b.avatar, true);
      this.d.store.saveMember(room.code, m);
    }
    this.flushMembers(room);
  }

  setElsewhere(room: Room, memberId: string, on: boolean): void {
    const m = room.members.get(memberId);
    if (!m) return;
    m.elsewhere = !!on;
    this.emitMembers(room);
  }

  botSay(room: Room, memberId: string, text: string): SendResult {
    const m = room.members.get(memberId);
    if (!m?.isBot) return { ok: false, error: 'not a bot' };
    return this.send(room, memberId, text);
  }

  fx(room: Room, kind: FxKind): void {
    this.d.bus.emit(room.code, 'fx', { kind });
  }

  sound(room: Room, name: SoundName): void {
    this.d.bus.emit(room.code, 'sound', { name });
  }

  force(room: Room, kind: TriggerKind, memberId?: string): Promise<void> {
    this.staging++;
    return this.forceInner(room, kind, memberId).finally(() => this.staging--);
  }

  private forceInner(room: Room, kind: TriggerKind, memberId?: string): Promise<void> {
    const all = [...room.members.values()];
    const member = (memberId && room.members.get(memberId)) || all[0];
    const other = all.find((m) => m.id !== member?.id)?.name ?? 'someone';
    const lore = room.lore[0];
    if (kind === 'weather') { this.games.forecast(room); return Promise.resolve(); }
    if (kind === 'replay') { this.games.replay(room); return Promise.resolve(); }
    if (kind === 'chaos') { this.games.chaos(room); return Promise.resolve(); }
    if (kind === 'copypasta') { this.games.copypasta(room); return Promise.resolve(); }
    if (kind === 'recap') return this.memory.recap(room).then(() => {});
    if (kind === 'awards') { this.memory.awards(room); return Promise.resolve(); }
    if (kind === 'wrapped') { if (member) this.memory.wrapped(room, member.id); return Promise.resolve(); }
    if (kind === 'duel') return this.duelBanter(room, true);
    if (kind === 'meme') { const last = room.userMessages().at(-1); return last && member ? this.memory.makeMeme(room, member.id, last.id).then(() => {}) : Promise.resolve(); }
    this.playEffects(room, kind);
    return this.comment(room, {
      kind, member, text: kind === 'dry_reply' ? 'k' : lore?.text ?? '', fact: `admin forced a ${kind} moment`,
      // believable placeholder values so forced canned lines never show raw {braces}
      vars: { other, pct: 77, ohio: 94, fast: '4s', slow: '4h', ago: '6h', time: '9:14 PM', power: '9,001', from: 'Lurker', to: 'Instigator', emoji: '🔥', prev: 'ok', term: 'fanum tax', text: lore?.text ?? 'cereal is soup' },
    }, true);
  }

  /** Stage a moment on cue by faking the inputs the detectors read. Returns when the AI has finished reacting. */
  async simulate(room: Room, kind: SimulateKind, memberId?: string): Promise<string | null> {
    this.staging++;
    try {
      return await this.runSimulation(room, kind, memberId);
    } finally {
      this.staging--;
    }
  }

  private async runSimulation(room: Room, kind: SimulateKind, memberId?: string): Promise<string | null> {
    this.addBots(room);
    const members = [...room.members.values()];
    const actor = (memberId && room.members.get(memberId)) || members.find((m) => m.isBot)!;
    // staged moments only ever speak as bots: never put words in a real player's mouth
    const others = members.filter((m) => m.isBot && m.id !== actor.id);
    const other = others[0];
    const t = room.settings.timings;
    const say = async (id: string, text: string) => {
      const r = this.send(room, id, text);
      if (r.ok) await r.done;
    };

    switch (kind) {
      case 'typing_drama':
        room.typing.set(actor.id, { startedAt: Date.now() - t.typingDramaMs - 1000, lastAt: Date.now(), len: 0, peak: 0 });
        await say(actor.id, 'ok');
        return null;
      case 'slow_reply': {
        if (!room.userMessages().length && other) await say(other.id, 'hey u there?');
        this.warp(room, t.slowReplyMs + 60_000);
        await say(actor.id, 'lol');
        return null;
      }
      case 'burst':
        for (let i = 0; i < t.burstCount; i++) await say(actor.id, ['wait', 'wait wait', 'one more thing', 'actually', 'ok so'][i % 5]!);
        return null;
      case 'dead_chat':
        if (!room.userMessages().length && other) await say(other.id, 'anyone here?');
        this.warp(room, t.deadChatMs + 1000);
        return null;
      case 'left_on_read': {
        const target = room.userMessages().at(-1);
        if (!target || target.authorId === actor.id) {
          const author = others[0];
          if (!author) return 'need at least two members';
          await say(author.id, 'did you see my message?');
        }
        const msg = room.userMessages().at(-1)!;
        this.seen(room, actor.id, msg.id);
        this.warp(room, t.leftOnReadMs + 1000);
        return null;
      }
      case 'simp': {
        const [fastTo, slowTo] = [others[0], others[1]];
        if (!fastTo || !slowTo) return 'need three members';
        for (let i = 0; i < 3; i++) {
          await say(slowTo.id, `hey ${i}`);
          this.warp(room, 120_000);
          await say(actor.id, 'oh hi');
        }
        for (let i = 0; i < 3; i++) {
          await say(fastTo.id, `psst ${i}`);
          await say(actor.id, 'YES HI');
        }
        return null;
      }
      case 'argument': {
        if (!other) return 'need two members';
        const lines = ['no it is NOT!!', 'yes it is!!', 'you always say that!', 'because you ALWAYS do that!!', 'unbelievable?!', 'WOW. ok.'];
        for (const [i, l] of lines.entries()) await say(i % 2 ? other.id : actor.id, l);
        return null;
      }
      case 'derail': {
        if (!other) return 'need two members';
        const dinner = ['what should we eat for dinner tonight', 'pizza or burgers for dinner', 'i want pizza honestly', 'sushi sounds good for dinner', 'maybe tacos instead of pizza', 'ok pizza it is then', 'who is ordering the pizza'];
        for (const [i, l] of dinner.entries()) await say(i % 2 ? other.id : actor.id, l);
        for (const l of ['wait is cereal actually soup', 'cereal milk is basically broth', 'soup argument about cereal']) await say(actor.id, l);
        return null;
      }
      case 'tone':
        await say(actor.id, 'ok');
        await say(actor.id, 'ok.');
        return null;
      case 'claim':
      case 'hottake':
      case 'bet':
      case 'battle':
      case 'confession':
        return this.games.stage(room, kind, [actor, ...others]);
    }
  }
}
