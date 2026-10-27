import { Logger } from '@nestjs/common';
import pg from 'pg';
import { DEFAULT_SETTINGS, DEFAULT_TIMINGS } from '@cooked/shared';
import type { AuraEntry, AvatarType, ChatMessage, Member, RoomSettings } from '@cooked/shared';
import { Room } from './room.js';
import type { RoomExtras } from './room.js';

/** Persistence port. The engine never awaits it: a DB outage must not stop the chat. */
export interface Store {
  saveRoom(room: Room): void;
  saveMember(code: string, m: Member): void;
  saveMessage(code: string, m: ChatMessage): void;
  saveEdit(messageId: string, oldText: string, at: number): void;
  saveAura(code: string, e: AuraEntry): void;
  saveExtras(room: Room): void;
  loadRoom(code: string): Promise<Room | null>;
  close(): Promise<void>;
}

export class NullStore implements Store {
  saveRoom() {}
  saveMember() {}
  saveMessage() {}
  saveEdit() {}
  saveAura() {}
  saveExtras() {}
  async loadRoom() {
    return null;
  }
  async close() {}
}

export class PgStore implements Store {
  private readonly log = new Logger('PgStore');
  private readonly pool: pg.Pool;
  /** writes run strictly in order so a row never lands before the room it points at */
  private chain: Promise<unknown> = Promise.resolve();

  constructor(url: string, ssl: boolean) {
    this.pool = new pg.Pool({ connectionString: url, max: 4, ssl: ssl ? { rejectUnauthorized: false } : false });
    this.pool.on('error', (e) => this.log.warn(`pool error: ${e.message}`));
  }

  private enqueue(sql: string, params: unknown[]): void {
    this.chain = this.chain.then(() => this.pool.query(sql, params)).catch((e: Error) => this.log.warn(`write failed: ${e.message}`));
  }

  saveRoom(r: Room) {
    this.enqueue(
      `insert into rooms (code, tz_offset_min, clock_offset_ms, settings) values ($1,$2,$3,$4)
       on conflict (code) do update set tz_offset_min=excluded.tz_offset_min, clock_offset_ms=excluded.clock_offset_ms, settings=excluded.settings`,
      [r.code, r.tzOffsetMin, r.clockOffsetMs, JSON.stringify(r.settings)],
    );
  }

  saveMember(code: string, m: Member) {
    this.enqueue(
      `insert into members (room_code, id, name, avatar, is_bot) values ($1,$2,$3,$4,$5)
       on conflict (room_code, id) do update set name=excluded.name, avatar=excluded.avatar`,
      [code, m.id, m.name, m.avatar, m.isBot],
    );
  }

  saveMessage(code: string, m: ChatMessage) {
    const extra = { reactions: m.reactions, ohio: m.ohio, persona: m.persona, replyToId: m.replyToId, card: m.card };
    this.enqueue(
      `insert into messages (id, room_code, author_id, kind, text, at, edited, deleted, ai_reactions, reply_to, trigger, extra)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       on conflict (id) do update set text=excluded.text, edited=excluded.edited, deleted=excluded.deleted, ai_reactions=excluded.ai_reactions, extra=excluded.extra`,
      [m.id, code, m.authorId, m.kind, m.text, m.at, m.edited, m.deleted, m.aiReactions, m.replyTo ?? null, m.trigger ?? null, JSON.stringify(extra)],
    );
  }

  saveExtras(r: Room) {
    this.enqueue(`update rooms set extras=$2 where code=$1`, [r.code, JSON.stringify(r.extras())]);
  }

  saveEdit(messageId: string, oldText: string, at: number) {
    this.enqueue(`insert into message_edits (message_id, old_text, at) values ($1,$2,$3)`, [messageId, oldText, at]);
  }

  saveAura(code: string, e: AuraEntry) {
    this.enqueue(`insert into aura_ledger (id, room_code, member_id, delta, reason, message_id, receipt, at) values ($1,$2,$3,$4,$5,$6,$7,$8)`, [
      e.id, code, e.memberId, e.delta, e.reason, e.messageId ?? null, e.receipt, e.at,
    ]);
  }

  /** Rebuild a room after a restart. Cooked and typing state are ephemeral and start fresh. */
  async loadRoom(code: string): Promise<Room | null> {
    try {
      await this.chain; // flush pending writes first
      const r = await this.pool.query('select tz_offset_min, clock_offset_ms, settings, extras from rooms where code=$1', [code]);
      if (!r.rowCount) return null;
      const row = r.rows[0];
      const stored = row.settings as Partial<RoomSettings>;
      const settings: RoomSettings = { ...DEFAULT_SETTINGS, ...stored, timings: { ...DEFAULT_TIMINGS, ...stored.timings } };
      const room = new Room(code, row.tz_offset_min, settings);
      room.clockOffsetMs = Number(row.clock_offset_ms);

      const sums = new Map<string, number>();
      for (const a of (await this.pool.query('select member_id, sum(delta)::int as aura from aura_ledger where room_code=$1 group by member_id', [code])).rows) sums.set(a.member_id, a.aura);
      const extras = (row.extras ?? {}) as Partial<RoomExtras>;
      for (const [id, st] of extras.stats ?? []) room.stats.set(id, st);
      for (const [k, v] of extras.latency ?? []) room.latency.set(k, v);
      room.lore = extras.lore ?? [];
      room.lastLoreAt = extras.lastLoreAt ?? 0;
      room.hotTakes = extras.hotTakes ?? [];
      const coins = new Map(extras.coins ?? []);
      for (const m of (await this.pool.query('select id, name, avatar, is_bot from members where room_code=$1', [code])).rows) {
        const member = room.addMember(m.id, m.name, m.avatar as AvatarType, m.is_bot);
        member.online = false;
        member.aura = sums.get(m.id) ?? 0;
        member.coins = coins.get(m.id) ?? member.coins;
      }
      room.recompute();
      const msgs = await this.pool.query('select * from messages where room_code=$1 order by at desc limit 100', [code]);
      room.messages = msgs.rows.reverse().map((m) => ({
        id: m.id, authorId: m.author_id, kind: m.kind, text: m.text, at: Number(m.at), edited: m.edited, deleted: m.deleted,
        aiReactions: m.ai_reactions, replyTo: m.reply_to ?? undefined, trigger: m.trigger ?? undefined,
        reactions: m.extra?.reactions ?? {}, ohio: m.extra?.ohio, persona: m.extra?.persona, replyToId: m.extra?.replyToId, card: m.extra?.card,
      }));
      const led = await this.pool.query('select * from aura_ledger where room_code=$1 order by at desc limit 50', [code]);
      room.ledger = led.rows.reverse().map((e) => ({ id: e.id, memberId: e.member_id, delta: e.delta, reason: e.reason, messageId: e.message_id ?? undefined, receipt: e.receipt, at: Number(e.at) }));
      return room;
    } catch (e) {
      this.log.warn(`loadRoom failed: ${(e as Error).message}`);
      return null;
    }
  }

  async close() {
    await this.chain;
    await this.pool.end();
  }
}
