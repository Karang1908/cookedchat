export type BrainrotLevel = 0 | 1 | 2 | 3;
export type RoastIntensity = 1 | 2 | 3;
export type PersonaId = 'gremlin' | 'sports' | 'nature' | 'reality' | 'mom' | 'boomer' | 'desi' | 'aunty';

export const AVATARS = ['clover', 'flower', 'triangle', 'square', 'blob', 'ghost', 'circle', 'drop', 'star', 'droid', 'mech', 'alien', 'hexagon', 'cat', 'cloud', 'pill', 'pebble', 'puddle'] as const;
export type AvatarType = (typeof AVATARS)[number];

export type TriggerKind =
  | 'ohio_high'
  | 'cap'
  | 'tone_shift'
  | 'derail'
  | 'crash_out'
  | 'simp_radar'
  | 'missing'
  | 'owl'
  | 'betrayal'
  | 'class_change'
  | 'scouter'
  | 'mog'
  | 'lore'
  | 'tiers'
  | 'duel'
  | 'recap'
  | 'awards'
  | 'wrapped'
  | 'meme'
  | 'chaos'
  | 'weather'
  | 'replay'
  | 'copypasta'
  | 'vote_result'
  | 'battle_result'
  | 'bet_result'
  | 'six_seven'
  | 'unc'
  | 'mention'
  | 'chime'
  | 'joined'
  | 'roast_me'
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

export type AuraReason = 'ohio' | 'cap' | 'claim_real' | 'hot_take' | 'unc' | 'reply_later' | 'quick_reply' | 'typing_drama' | 'slow_reply' | 'six_seven' | 'mog' | 'big_play' | 'manual';

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
  /** silent this long: missing-person poster */
  missingMs: number;
  /** silent this long after 9pm: the Duolingo owl */
  owlMs: number;
  /** minimum room-clock gap before an old inside joke is brought back */
  loreGapMs: number;
  /** how long a vote / battle stays open (real ms) */
  voteWindowMs: number;
  /** in duel rooms: this much silence (room clock) and the two AIs start roasting each other */
  duelLullMs: number;
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
  missingMs: 6 * 60 * 60_000,
  owlMs: 4 * 60 * 60_000,
  loreGapMs: 6 * 60 * 60_000,
  voteWindowMs: 30_000,
  duelLullMs: 45_000,
};

export interface RoomSettings {
  brainrot: BrainrotLevel;
  persona: PersonaId;
  intensity: RoastIntensity;
  /** master switch for the commentator */
  commentary: boolean;
  /** bots post canned chatter on their own */
  autopilotBots: boolean;
  /** random dares and plot twists every few minutes */
  chaos: boolean;
  /** random full-screen jumpscares */
  jumpscare: boolean;
  /** a second persona that argues with the first on every comment */
  rival: PersonaId | null;
  /** Groq vs Ollama Cloud: the main persona runs on Groq, the rival on Ollama, and they roast each other in lulls */
  duel: boolean;
  /**
   * The AI's speaking budget: human messages needed since the last AI turn before an ordinary trigger may speak.
   * Core jokes need half, big moments one. Two AI turns in a row never happen. 0 = only that last rule.
   */
  aiEvery: number;
  /** the AI may swear and trash-talk (hard limits on identity still apply). Admin switch: flip off before judges walk up. */
  explicit: boolean;
  /** the AI joins ordinary conversation (chime-ins), not only roast-worthy moments */
  chime: boolean;
  timings: RoomTimings;
}

export const DEFAULT_SETTINGS: RoomSettings = {
  brainrot: 2,
  persona: 'gremlin',
  intensity: 2,
  commentary: true,
  autopilotBots: false,
  chaos: false,
  jumpscare: false,
  rival: null,
  duel: false,
  aiEvery: 4,
  explicit: true,
  chime: true,
  timings: DEFAULT_TIMINGS,
};

export type RpgClass = 'lurker' | 'instigator' | 'healer' | 'final_boss';
export type CreatureId = 'tung' | 'bombardiro' | 'ballerina' | 'patapim' | 'trippi' | 'cappuccino' | 'lirili';
export type Tier = 'sigma' | 'alpha' | 'beta' | 'npc';

/** Derived server-side from behavior. Re-sent with the member list as it evolves. */
export interface PublicStats {
  messages: number;
  avgReplyMs: number | null;
  rizz: number;
  rizzTitle: string;
  ohioAvg: number;
  ohioPeak: number;
  mogs: number;
  dry: number;
  ghosts: number;
  klass: RpgClass;
  creature: CreatureId;
  tier: Tier;
  power: number;
}

export interface Member {
  id: string;
  name: string;
  avatar: AvatarType;
  isBot: boolean;
  online: boolean;
  aura: number;
  /** fake currency for the prediction market */
  coins: number;
  /** demo toggle: shown as "online elsewhere" (fuels the betrayal alert) */
  elsewhere: boolean;
  stats: PublicStats;
}

/** Rich, sometimes interactive, chat items. The server mutates them and re-sends the message with chat:update. */
export type Card =
  | { type: 'poster'; memberId: string; name: string; avatar: AvatarType; lastSeenAt: number; ago: string }
  | { type: 'weather'; headline: string; forecast: { label: string; pct: number }[] }
  | {
      type: 'vote';
      id: string;
      style: 'real' | 'hottake';
      question: string;
      /** the member whose claim / take this is */
      subjectId?: string;
      options: { id: string; label: string; emoji: string }[];
      votes: Record<string, string>;
      closesAt: number;
      settled?: { winner: string; note: string };
    }
  | {
      type: 'bet';
      question: string;
      subjectId: string;
      windowMs: number;
      openedAt: number;
      bets: Record<string, { side: 'yes' | 'no'; amount: number }>;
      settled?: { outcome: 'yes' | 'no'; payouts: Record<string, number> };
    }
  | {
      type: 'battle';
      scenario: string;
      contenders: [string, string];
      entries: Record<string, string>;
      closesAt: number;
      settled?: { winnerId: string | null; verdict: string };
    }
  | { type: 'confession'; text: string; guessId: string; guessName: string; confidence: number }
  | { type: 'replay'; messageId: string; authorName: string; text: string }
  | { type: 'recap'; title: string; episodes: { title: string; summary: string; cliffhanger: string }[] }
  | { type: 'awards'; awards: { title: string; emoji: string; memberId: string; name: string; why: string }[] }
  | {
      type: 'wrapped';
      memberId: string;
      name: string;
      avatar: AvatarType;
      breakdown: { label: string; pct: number }[];
      finalForm: string;
      creature: CreatureId;
      stats: { aura: number; rizz: number; ohio: number; messages: number; power: number };
    }
  | { type: 'meme'; top: string; bottom: string; emoji: string; messageId: string }
  | { type: 'dare'; text: string; style: 'dare' | 'twist' | 'copypasta' };

export interface ChatMessage {
  id: string;
  /** null for AI-authored messages */
  authorId: string | null;
  kind: 'user' | 'ai' | 'system' | 'card';
  /** set when kind is 'card' */
  card?: Card;
  text: string;
  /** room-clock ms (real time + room offset) */
  at: number;
  edited: boolean;
  deleted: boolean;
  /** emoji reactions placed by the AI */
  aiReactions: string[];
  /** emoji -> member ids who reacted */
  reactions: Record<string, string[]>;
  /** for AI comments: what it was reacting to */
  replyTo?: string;
  /** for user messages: the message this one answers */
  replyToId?: string;
  trigger?: TriggerKind;
  /** 0-100 "Ohio level" of a user message */
  ohio?: number;
  /** which persona spoke (AI messages), so rival commentators can differ */
  persona?: PersonaId;
  /** optional trending GIF (GIPHY, only when the server has a key) attached to an AI reaction */
  gif?: string;
  /** AI messages: the provider that wrote it ('groq-120b', 'ollama', ...) or 'canned' */
  model?: string;
  /** AI messages in duel rooms: which side of the Groq vs Ollama duel spoke */
  side?: 'groq' | 'ollama';
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
