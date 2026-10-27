export type BrainrotLevel = 0 | 1 | 2 | 3;
export type RoastIntensity = 1 | 2 | 3;
export type PersonaId = 'gremlin' | 'sports' | 'nature' | 'reality' | 'mom' | 'boomer';

export const AVATARS = ['clover', 'flower', 'triangle', 'square', 'blob', 'ghost', 'circle', 'drop', 'star', 'droid', 'mech', 'alien', 'hexagon', 'cat', 'cloud', 'pill', 'pebble', 'puddle'] as const;
export type AvatarType = (typeof AVATARS)[number];

export type TriggerKind =
  | 'six_seven'
  | 'fanum'
  | 'reply_later'
  | 'typing_drama'
  | 'typed_deleted'
  | 'slow_reply'
  | 'quick_reply'
  | 'burst'
  | 'dry_reply'
  | 'edited'
  | 'deleted'
  | 'left_on_read'
  | 'dead_chat'
  | 'tung_tung'
  | 'cooked_max'
  | 'manual';

export type AuraReason = 'fanum_tax' | 'reply_later' | 'quick_reply' | 'typing_drama' | 'slow_reply' | 'six_seven' | 'mog' | 'big_play' | 'manual';

export type FxKind = 'shake' | 'flash' | 'glitch' | 'confetti' | 'emojiRain' | 'zoom' | 'deepfry' | 'jumpscare' | 'invert' | 'spin' | 'meltdown';
export const FX_KINDS: readonly FxKind[] = ['shake', 'flash', 'glitch', 'confetti', 'emojiRain', 'zoom', 'deepfry', 'jumpscare', 'invert', 'spin', 'meltdown'];

export type SoundName = 'vineBoom' | 'fahhh' | 'bruh' | 'airhorn' | 'pipe' | 'sadViolin' | 'scream' | 'tungTung' | 'winError' | 'dunDunDun' | 'crickets';
export const SOUND_NAMES: readonly SoundName[] = ['vineBoom', 'fahhh', 'bruh', 'airhorn', 'pipe', 'sadViolin', 'scream', 'tungTung', 'winError', 'dunDunDun', 'crickets'];

/** Every duration the game loop and detectors use. The admin panel edits these live. */
export interface RoomTimings {
  /** typing this long, then sending something tiny, is "typing drama" */
  typingDramaMs: number;
  /** typed this long and cleared the box without sending */
  typedDeletedMs: number;
  /** reply gap that costs aura */
  slowReplyMs: number;
  /** reply gap that counts as a quick reply in a live conversation */
  quickReplyMs: number;
  /** nobody has spoken for this long */
  deadChatMs: number;
  /** seen by someone who then stayed silent this long */
  leftOnReadMs: number;
  /** same author, this many messages within burstWindowMs */
  burstCount: number;
  burstWindowMs: number;
  /** minimum real-time gap between AI comments */
  commentCooldownMs: number;
}

export const DEFAULT_TIMINGS: RoomTimings = {
  typingDramaMs: 30_000,
  typedDeletedMs: 10_000,
  slowReplyMs: 3 * 60 * 60_000,
  quickReplyMs: 20_000,
  deadChatMs: 5 * 60_000,
  leftOnReadMs: 30 * 60_000,
  burstCount: 5,
  burstWindowMs: 60_000,
  commentCooldownMs: 6_000,
};

export interface RoomSettings {
  brainrot: BrainrotLevel;
  persona: PersonaId;
  intensity: RoastIntensity;
  /** master switch for the commentator */
  commentary: boolean;
  /** bots post canned chatter on their own */
  autopilotBots: boolean;
  timings: RoomTimings;
}

export const DEFAULT_SETTINGS: RoomSettings = {
  brainrot: 2,
  persona: 'gremlin',
  intensity: 2,
  commentary: true,
  autopilotBots: false,
  timings: DEFAULT_TIMINGS,
};

export interface Member {
  id: string;
  name: string;
  avatar: AvatarType;
  isBot: boolean;
  online: boolean;
  aura: number;
}

export interface ChatMessage {
  id: string;
  /** null for AI-authored messages */
  authorId: string | null;
  kind: 'user' | 'ai' | 'system';
  text: string;
  /** room-clock ms (real time + room offset) */
  at: number;
  edited: boolean;
  deleted: boolean;
  /** emoji reactions placed by the AI */
  aiReactions: string[];
  /** for AI comments: what it was reacting to */
  replyTo?: string;
  trigger?: TriggerKind;
}

export interface AuraEntry {
  id: string;
  memberId: string;
  delta: number;
  reason: AuraReason;
  messageId?: string;
  /** the exact text that caused it */
  receipt: string;
  at: number;
}

export interface RoomSnapshot {
  code: string;
  members: Member[];
  messages: ChatMessage[];
  ledger: AuraEntry[];
  settings: RoomSettings;
  cooked: number;
  clockOffsetMs: number;
  tzOffsetMin: number;
}
