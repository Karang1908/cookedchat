import { DEFAULT_SETTINGS, computePublicStats, emptyStats } from '@cooked/shared';
import type { AuraEntry, AvatarType, ChatMessage, CookedState, MemberStats, Member, RoomSettings, RoomSnapshot, RpgClass } from '@cooked/shared';

export interface TypingState {
  startedAt: number; // real time
  /** last tick, real time. Stale entries (closed tab) get pruned. */
  lastAt: number;
  len: number;
  peak: number;
}

/** What survives a restart besides messages and the aura ledger. */
export interface RoomExtras {
  stats: [string, MemberStats][];
  latency: [string, { sum: number; count: number }][];
  coins: [string, number][];
  lore: LoreItem[];
  lastLoreAt: number;
  hotTakes: HotTake[];
}

export interface HotTake {
  authorId: string;
  text: string;
  /** share of voters who disagreed, 0-100 */
  diabolical: number;
  at: number;
}

export interface LoreItem {
  text: string;
  authorId: string;
  at: number;
  why: string;
}

export const STARTING_COINS = 1000;

export class Room {
  readonly members = new Map<string, Member>();
  readonly stats = new Map<string, MemberStats>();
  /** `${from}>${to}`: how fast `from` answers `to` */
  readonly latency = new Map<string, { sum: number; count: number }>();
  readonly simpFired = new Set<string>();
  readonly owlFired = new Set<string>();
  readonly posterFired = new Set<string>();
  readonly scouterFired = new Set<string>();
  readonly lastClass = new Map<string, RpgClass>();
  readonly mogged = new Set<string>();
  lore: LoreItem[] = [];
  hotTakes: HotTake[] = [];
  lastLoreAt = 0; // room clock
  lastVoteAt = 0; // real
  lastForecastAt = 0;
  lastReplayAt = 0;
  readonly lastHotTakeAt = new Map<string, number>();
  readonly lastConfessAt = new Map<string, number>();
  membersDirty = false;
  extrasDirty = false;
  lastExtrasSaveAt = 0;
  lastDerailAt = 0;
  lastMewingAt = 0;
  lastChaosAt = 0;
  lastJumpscareAt = 0;
  lastDayKey: string | null = null;
  messages: ChatMessage[] = [];
  ledger: AuraEntry[] = [];
  settings: RoomSettings;
  cooked: CookedState = { value: 0, armed: true };
  clockOffsetMs = 0;

  readonly typing = new Map<string, TypingState>();
  /** messageId -> members who have seen it (not the author) */
  readonly seen = new Map<string, Set<string>>();
  readonly leftOnReadFired = new Set<string>();
  /** original text of edited/deleted messages. Server only, never broadcast. */
  readonly originals = new Map<string, string>();
  readonly sockets = new Map<string, Set<string>>();
  /** token buckets: memberId -> recent send times (real ms) */
  readonly sendTimes = new Map<string, number[]>();
  readonly lastQuickReplyAt = new Map<string, number>();
  readonly lastVibeAt = new Map<string, number>();

  cookedSent = 0;
  lastCommentAt = 0; // real
  lastTickAt = Date.now(); // real
  lastActiveAt = Date.now(); // real, for GC
  lastBotChatterAt = 0; // real
  deadChatFired = false;
  tungKey: string | null = null;

  constructor(
    readonly code: string,
    public tzOffsetMin: number,
    settings: RoomSettings = structuredClone(DEFAULT_SETTINGS),
  ) {
    this.settings = settings;
  }

  getStats(memberId: string): MemberStats {
    let st = this.stats.get(memberId);
    if (!st) this.stats.set(memberId, (st = emptyStats()));
    return st;
  }

  /** The only way members are created, so every member always has coins, stats and a creature. */
  addMember(id: string, name: string, avatar: AvatarType, isBot: boolean): Member {
    const m: Member = {
      id, name, avatar, isBot, online: true, aura: 0, coins: STARTING_COINS, elsewhere: false,
      stats: computePublicStats([{ id, aura: 0, stats: this.getStats(id) }]).get(id)!,
    };
    this.members.set(id, m);
    this.membersDirty = true;
    return m;
  }

  /** Re-derives every member's public stats (tiers and the Final Boss are relative to the room). */
  recompute(): void {
    const all = computePublicStats([...this.members.values()].map((m) => ({ id: m.id, aura: m.aura, stats: this.getStats(m.id) })));
    for (const m of this.members.values()) m.stats = all.get(m.id)!;
    this.membersDirty = false;
  }

  extras(): RoomExtras {
    return {
      stats: [...this.stats],
      latency: [...this.latency],
      coins: [...this.members.values()].map((m) => [m.id, m.coins]),
      lore: this.lore,
      lastLoreAt: this.lastLoreAt,
      hotTakes: this.hotTakes,
    };
  }

  /** the room clock: real time plus whatever the admin has warped */
  now(): number {
    return Date.now() + this.clockOffsetMs;
  }

  /** 0-23 on the room's wall clock */
  localHour(): number {
    return new Date(this.now() + this.tzOffsetMin * 60_000).getUTCHours();
  }

  localDayKey(): string {
    return new Date(this.now() + this.tzOffsetMin * 60_000).toISOString().slice(0, 10);
  }

  userMessages(): ChatMessage[] {
    return this.messages.filter((m) => m.kind === 'user' && !m.deleted);
  }

  snapshot(): RoomSnapshot {
    return {
      code: this.code,
      members: [...this.members.values()],
      messages: this.messages.slice(-100),
      ledger: this.ledger.slice(-50),
      settings: this.settings,
      cooked: Math.round(this.cooked.value),
      clockOffsetMs: this.clockOffsetMs,
      tzOffsetMin: this.tzOffsetMin,
    };
  }
}
