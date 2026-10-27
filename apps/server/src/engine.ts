import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import {
  AURA_RULES, AVATARS, COOKED_CAPS_BONUS, COOKED_PER_MESSAGE, COOKED_PUSH, DEAD_CHAT_PROMPTS, QUICK_REPLY_FARM_GUARD_MS,
  cannedLine, capsRatio, decayCooked, findFood, is67, isDry, isReplyLater, pushCooked, shouldMeltdown,
} from '@cooked/shared';
import type {
  Ack, AuraEntry, AuraReason, ChatMessage, FxKind, JoinPayload, Member, SimulateKind, SoundName, TriggerKind, TypingPayload,
} from '@cooked/shared';
import type { RoomBus } from './bus.js';
import type { CommentContext } from './llm/prompt.js';
import { Room } from './room.js';
import { applySettingsPatch } from './settings.js';
import type { SettingsPatch } from './settings.js';
import type { Store } from './store.js';

export interface CommentWriter {
  /** one safe chat line, or null to fall back to a canned one */
  write(ctx: CommentContext): Promise<string | null>;
}

const MAX_TEXT = 500;
const MAX_NAME = 20;
const MAX_MESSAGES_KEPT = 500;
const SEND_LIMIT = { count: 6, windowMs: 5000 };
const TYPING_STALE_MS = 8000;

const PRIORITY: Partial<Record<TriggerKind, number>> = {
  six_seven: 10, cooked_max: 10, tung_tung: 9, typing_drama: 8, slow_reply: 8, reply_later: 8,
  left_on_read: 7, burst: 6, typed_deleted: 6, edited: 5, deleted: 5, fanum: 5, dead_chat: 4, dry_reply: 3,
};
/** cheap, funny, and must never wait on an LLM */
const INSTANT = new Set<TriggerKind>(['six_seven', 'fanum', 'tung_tung', 'cooked_max']);
const REACTION: Partial<Record<TriggerKind, string>> = {
  six_seven: '🗿', fanum: '🍟', typing_drama: '👁️', slow_reply: '💀', reply_later: '🥀', burst: '😭', dry_reply: '💀', edited: '🧐', deleted: '🫡', left_on_read: '👁️',
};
const EFFECTS: Partial<Record<TriggerKind, { fx?: { kind: FxKind; emoji?: string }[]; sound?: SoundName }>> = {
  six_seven: { fx: [{ kind: 'shake' }, { kind: 'emojiRain', emoji: '🗿' }], sound: 'vineBoom' },
  fanum: { fx: [{ kind: 'emojiRain', emoji: '🍟' }] },
  typing_drama: { sound: 'bruh' },
  slow_reply: { sound: 'crickets' },
  reply_later: { sound: 'sadViolin' },
  burst: { sound: 'airhorn' },
  tung_tung: { fx: [{ kind: 'shake' }, { kind: 'flash' }], sound: 'tungTung' },
  dead_chat: { sound: 'crickets' },
  cooked_max: { fx: [{ kind: 'meltdown' }], sound: 'winError' },
};
const BOT_CHATTER = ['lol', 'wait what', 'k', 'pizza tonight?', 'bro', 'no way', 'ok', '67', 'i am so hungry', 'hmm', 'sure', 'i will reply later guys', 'WHAT IS HAPPENING', 'fine.'];
const BOTS: { name: string; avatar: Member['avatar'] }[] = [
  { name: 'Aman', avatar: 'cat' }, { name: 'Riya', avatar: 'ghost' }, { name: 'Dev', avatar: 'droid' },
];

interface Hit {
  kind: TriggerKind;
  aura?: Exclude<AuraReason, 'manual'>;
  fact: string;
}

export type SendResult = { ok: true; id: string; done: Promise<void> } | { ok: false; error: string };

export class Engine {
  private readonly log = new Logger('Engine');

  constructor(
    private readonly d: { bus: RoomBus; store: Store; writer: CommentWriter; rng?: () => number },
  ) {}

  private rng = () => (this.d.rng ?? Math.random)();

  // ---------------------------------------------------------------- members

  join(room: Room, p: JoinPayload, socketId: string): Ack<{ member: Member }> {
    const name = p.name?.trim().slice(0, MAX_NAME);
    if (!p.memberId || p.memberId.length > 64) return { ok: false, error: 'bad member id' };
    if (!name) return { ok: false, error: 'name required' };
    if (!(AVATARS as readonly string[]).includes(p.avatar)) return { ok: false, error: 'bad avatar' };
    let m = room.members.get(p.memberId);
    if (m?.isBot) return { ok: false, error: 'bad member id' };
    if (!m) m = { id: p.memberId, name, avatar: p.avatar, isBot: false, online: true, aura: 0 };
    else Object.assign(m, { name, avatar: p.avatar });
    m.online = true;
    room.members.set(m.id, m);
    if (!room.sockets.has(m.id)) room.sockets.set(m.id, new Set());
    room.sockets.get(m.id)!.add(socketId);
    this.d.store.saveMember(room.code, m);
    this.d.bus.emit(room.code, 'room:members', [...room.members.values()]);
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
      this.d.bus.emit(room.code, 'room:members', [...room.members.values()]);
    }
  }

  // ---------------------------------------------------------------- chat

  send(room: Room, memberId: string, rawText: string): SendResult {
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

    const msg: ChatMessage = { id: randomUUID(), authorId: memberId, kind: 'user', text, at: now, edited: false, deleted: false, aiReactions: [] };
    this.push(room, msg);
    room.deadChatFired = false;

    const burst = room.userMessages().filter((m) => m.authorId === memberId && now - m.at <= t.burstWindowMs).length;
    const live = room.userMessages().filter((m) => now - m.at <= 120_000).length >= 3;
    const hits = this.detect(room, member, text, { prev, now, typingMs, burst, live });
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
    const food = findFood(text);
    if (food) hits.push({ kind: 'fanum', aura: 'fanum_tax', fact: `mentioned food (${food})` });
    if (f.burst === t.burstCount) hits.push({ kind: 'burst', fact: `sent ${f.burst} messages in a row` });
    if (isDry(text) && !hits.some((h) => h.kind === 'typing_drama')) hits.push({ kind: 'dry_reply', fact: `sent a dry reply: "${text}"` });
    return hits;
  }

  private async react(room: Room, member: Member, msg: ChatMessage, hits: Hit[], burst: number): Promise<void> {
    for (const h of hits) if (h.aura) this.aura(room, member.id, h.aura, msg.text, msg.id);

    let heat = COOKED_PER_MESSAGE + (capsRatio(msg.text) > 0.6 ? COOKED_CAPS_BONUS : 0) + (burst > 3 ? (burst - 3) * 1.5 : 0);
    for (const h of hits) heat += COOKED_PUSH[h.kind] ?? 0;
    this.heat(room, heat);

    const top = hits.filter((h) => PRIORITY[h.kind]).sort((a, b) => PRIORITY[b.kind]! - PRIORITY[a.kind]!)[0];
    // nobody awaits this promise (the sender already got their ack), so an escape here would crash the process
    try {
      if (top) await this.comment(room, { kind: top.kind, member, text: msg.text, fact: top.fact, targetId: msg.id });
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
    this.d.store.saveEdit(msg.id, msg.text, room.now());
    msg.text = text;
    msg.edited = true;
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
    this.d.store.saveAura(room.code, entry);
    this.d.bus.emit(room.code, 'aura:change', entry, member.aura);
  }

  private heat(room: Room, amount: number): void {
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

  private async comment(room: Room, c: { kind: TriggerKind; member?: Member; text: string; fact: string; targetId?: string }, force = false): Promise<void> {
    const { settings } = room;
    if (!settings.commentary) return;
    const prio = PRIORITY[c.kind] ?? 3;
    if (!force && prio < 10 && Date.now() - room.lastCommentAt < settings.timings.commentCooldownMs) return;
    if (!force && this.rng() >= this.chance(prio)) return;
    room.lastCommentAt = Date.now(); // claim the slot before awaiting so concurrent triggers back off

    const name = c.member?.name ?? 'chat';
    let line: string | null = null;
    if (!INSTANT.has(c.kind)) {
      this.d.bus.emit(room.code, 'ai:thinking', true);
      try {
        line = await this.d.writer.write({
          kind: c.kind, name, text: c.text, fact: c.fact, settings,
          recent: room.userMessages().slice(-6).map((m) => ({ name: room.members.get(m.authorId!)?.name ?? '?', text: m.text })),
          midnight: this.isMidnight(room),
        });
      } finally {
        this.d.bus.emit(room.code, 'ai:thinking', false);
      }
    }
    line ??= cannedLine(c.kind, { name, text: c.text }, () => this.rng());

    this.push(room, { id: randomUUID(), authorId: null, kind: 'ai', text: line, at: room.now(), edited: false, deleted: false, aiReactions: [], replyTo: c.targetId, trigger: c.kind });
    const emoji = REACTION[c.kind];
    const target = c.targetId ? room.messages.find((m) => m.id === c.targetId) : undefined;
    if (emoji && target && !target.aiReactions.includes(emoji)) {
      target.aiReactions.push(emoji);
      this.update(room, target);
    }
    if (c.kind !== 'cooked_max') this.playEffects(room, c.kind);
  }

  private playEffects(room: Room, kind: TriggerKind): void {
    const e = EFFECTS[kind];
    for (const fx of e?.fx ?? []) this.d.bus.emit(room.code, 'fx', fx);
    if (e?.sound) this.d.bus.emit(room.code, 'sound', { name: e.sound });
  }

  private isMidnight(room: Room): boolean {
    const h = room.localHour();
    return h >= 1 && h < 5;
  }

  private push(room: Room, msg: ChatMessage): void {
    room.messages.push(msg);
    if (room.messages.length > MAX_MESSAGES_KEPT) room.messages.splice(0, room.messages.length - MAX_MESSAGES_KEPT);
    room.lastActiveAt = Date.now();
    this.d.store.saveMessage(room.code, msg);
    this.d.bus.emit(room.code, 'chat:message', msg);
  }

  private update(room: Room, msg: ChatMessage): void {
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
    if (last && !room.deadChatFired && now - last.at >= t.deadChatMs) {
      room.deadChatFired = true;
      if (room.settings.commentary) {
        const prompt = DEAD_CHAT_PROMPTS[Math.floor(this.rng() * DEAD_CHAT_PROMPTS.length)]!;
        this.push(room, { id: randomUUID(), authorId: null, kind: 'ai', text: prompt, at: now, edited: false, deleted: false, aiReactions: [], trigger: 'dead_chat' });
        this.playEffects(room, 'dead_chat');
      }
    }

    for (const [i, msg] of users.entries()) {
      if (i < users.length - 40 || room.leftOnReadFired.has(msg.id) || now - msg.at < t.leftOnReadMs) continue;
      for (const viewerId of room.seen.get(msg.id) ?? []) {
        // "after" means later in the chat, not a later timestamp: the admin can warp the clock backwards
        if (users.slice(i + 1).some((m) => m.authorId === viewerId)) continue;
        const viewer = room.members.get(viewerId);
        const author = room.members.get(msg.authorId!);
        if (!viewer || !author) continue;
        room.leftOnReadFired.add(msg.id);
        void this.comment(room, { kind: 'left_on_read', member: viewer, text: msg.text, fact: `saw ${author.name}'s message ("${msg.text.slice(0, 80)}") ${Math.round((now - msg.at) / 60_000)} minutes ago and never replied`, targetId: msg.id }).catch((e) => this.log.error(e));
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
  }

  // ---------------------------------------------------------------- admin

  setSettings(room: Room, patch: SettingsPatch): void {
    room.settings = applySettingsPatch(room.settings, patch);
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
      const m: Member = { id, name: b.name, avatar: b.avatar, isBot: true, online: true, aura: 0 };
      room.members.set(id, m);
      this.d.store.saveMember(room.code, m);
    }
    this.d.bus.emit(room.code, 'room:members', [...room.members.values()]);
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
    const member = (memberId && room.members.get(memberId)) || [...room.members.values()][0];
    this.playEffects(room, kind);
    return this.comment(room, { kind, member, text: kind === 'dry_reply' ? 'k' : '', fact: `admin forced a ${kind} moment` }, true);
  }

  /** Stage a moment on cue by faking the inputs the detectors read. Returns when the AI has finished reacting. */
  async simulate(room: Room, kind: SimulateKind, memberId?: string): Promise<string | null> {
    this.addBots(room);
    const members = [...room.members.values()];
    const actor = (memberId && room.members.get(memberId)) || members.find((m) => m.isBot)!;
    const other = members.find((m) => m.id !== actor.id);
    const t = room.settings.timings;
    const run = async (r: SendResult) => (r.ok ? r.done : undefined);

    switch (kind) {
      case 'typing_drama':
        room.typing.set(actor.id, { startedAt: Date.now() - t.typingDramaMs - 1000, lastAt: Date.now(), len: 0, peak: 0 });
        await run(this.send(room, actor.id, 'ok'));
        return null;
      case 'slow_reply': {
        if (!room.userMessages().length && other) await run(this.send(room, other.id, 'hey u there?'));
        this.warp(room, t.slowReplyMs + 60_000);
        await run(this.send(room, actor.id, 'lol'));
        return null;
      }
      case 'burst':
        for (let i = 0; i < t.burstCount; i++) await run(this.send(room, actor.id, ['wait', 'wait wait', 'one more thing', 'actually', 'ok so'][i % 5]!));
        return null;
      case 'dead_chat':
        if (!room.userMessages().length && other) await run(this.send(room, other.id, 'anyone here?'));
        this.warp(room, t.deadChatMs + 1000);
        return null;
      case 'left_on_read': {
        const target = room.userMessages().at(-1);
        if (!target || target.authorId === actor.id) {
          const author = other && other.id !== actor.id ? other : members.find((m) => m.id !== actor.id);
          if (!author) return 'need at least two members';
          await run(this.send(room, author.id, 'did you see my message?'));
        }
        const msg = room.userMessages().at(-1)!;
        this.seen(room, actor.id, msg.id);
        this.warp(room, t.leftOnReadMs + 1000);
        return null;
      }
    }
  }
}
