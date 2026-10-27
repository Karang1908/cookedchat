import { DEFAULT_SETTINGS } from '@cooked/shared';
import type { AuraEntry, ChatMessage, CookedState, Member, RoomSettings, RoomSnapshot } from '@cooked/shared';

export interface TypingState {
  startedAt: number; // real time
  /** last tick, real time. Stale entries (closed tab) get pruned. */
  lastAt: number;
  len: number;
  peak: number;
}

export class Room {
  readonly members = new Map<string, Member>();
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
