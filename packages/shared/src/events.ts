import type { AuraEntry, AvatarType, BrainrotLevel, ChatMessage, FxKind, Member, PersonaId, RoastIntensity, RoomSettings, RoomSnapshot, SoundName, TriggerKind } from './types.js';

export type Ack<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export interface JoinPayload {
  code: string;
  memberId: string;
  name: string;
  avatar: AvatarType;
}

export interface CreatePayload {
  tzOffsetMin: number;
}

export type TypingPayload = { state: 'start' | 'tick' | 'stop'; len: number; cleared?: boolean };

export type SimulateKind = 'typing_drama' | 'slow_reply' | 'burst' | 'dead_chat' | 'left_on_read' | 'simp' | 'argument' | 'derail' | 'tone' | 'claim' | 'hottake' | 'bet' | 'battle' | 'confession';

export interface ClientToServerEvents {
  'room:create': (p: CreatePayload, ack: (a: Ack<{ code: string }>) => void) => void;
  'room:join': (p: JoinPayload, ack: (a: Ack<{ snapshot: RoomSnapshot }>) => void) => void;
  'chat:send': (p: { text: string; replyToId?: string }, ack?: (a: Ack<{ id: string }>) => void) => void;
  'chat:react': (p: { id: string; emoji: string }) => void;
  'vote:cast': (p: { id: string; option: string }, ack?: (a: Ack) => void) => void;
  'hottake:submit': (p: { text: string }, ack?: (a: Ack) => void) => void;
  'bet:create': (p: { subjectId: string; minutes?: number }, ack?: (a: Ack) => void) => void;
  'bet:place': (p: { id: string; side: 'yes' | 'no'; amount: number }, ack?: (a: Ack) => void) => void;
  'battle:start': (p: { opponentId: string }, ack?: (a: Ack) => void) => void;
  'battle:submit': (p: { id: string; text: string }, ack?: (a: Ack) => void) => void;
  'confession:post': (p: { text: string }, ack?: (a: Ack) => void) => void;
  'weather:get': (ack?: (a: Ack) => void) => void;
  'translate:request': (p: { id: string; mode: 'brainrot' | 'plain' | 'dry' }, ack: (a: Ack<{ text: string; via: 'ai' | 'rules' }>) => void) => void;
  'meme:make': (p: { id: string }, ack?: (a: Ack) => void) => void;
  'recap:generate': (ack?: (a: Ack) => void) => void;
  'awards:get': (ack?: (a: Ack) => void) => void;
  'wrapped:get': (p: { memberId?: string }, ack?: (a: Ack) => void) => void;
  'replay:request': (ack?: (a: Ack) => void) => void;
  'room:vibe': (p: { persona?: PersonaId; brainrot?: BrainrotLevel; intensity?: RoastIntensity; duel?: boolean }) => void;
  /** anyone can make the two AIs (Groq vs Ollama) roast each other right now; turns the duel on */
  'duel:start': (ack?: (a: Ack) => void) => void;
  /** "🔥 Roast me": a personal roast built from your own messages and stats */
  'roast:me': (ack?: (a: Ack) => void) => void;
  /** "🎤 Roast everyone": a comedy-roast round, one line per person */
  'roast:room': (ack?: (a: Ack) => void) => void;
  /** read-only spectator (the stage screen on a projector): events and a snapshot, no member, cannot act */
  'room:watch': (p: { code: string }, ack: (a: Ack<{ snapshot: RoomSnapshot }>) => void) => void;
  /** one click: a scripted 60-90s escalation with the bots, for demos */
  'admin:showtime': () => void;
  'admin:roastRoom': () => void;
  'chat:edit': (p: { id: string; text: string }) => void;
  'chat:delete': (p: { id: string }) => void;
  'chat:seen': (p: { id: string }) => void;
  typing: (p: TypingPayload) => void;
  'sound:play': (p: { name: SoundName }) => void;
  'admin:auth': (p: { key: string; code: string }, ack: (a: Ack<{ snapshot: RoomSnapshot }>) => void) => void;
  'admin:settings': (p: Partial<Omit<RoomSettings, 'timings'>> & { timings?: Partial<RoomSettings['timings']> }) => void;
  'admin:warp': (p: { ms: number }) => void;
  'admin:setCooked': (p: { value: number }) => void;
  'admin:fx': (p: { kind: FxKind }) => void;
  'admin:sound': (p: { name: SoundName }) => void;
  'admin:addBots': () => void;
  'admin:elsewhere': (p: { memberId: string; on: boolean }) => void;
  'admin:aura': (p: { memberId: string; delta: number }) => void;
  'admin:botSay': (p: { memberId: string; text: string }) => void;
  'admin:simulate': (p: { kind: SimulateKind; memberId?: string }) => void;
  'admin:force': (p: { kind: TriggerKind; memberId?: string }) => void;
}

export interface ServerToClientEvents {
  'room:members': (m: Member[]) => void;
  'room:settings': (s: RoomSettings, clockOffsetMs: number) => void;
  'chat:message': (m: ChatMessage) => void;
  'chat:update': (m: ChatMessage) => void;
  'typing:update': (ids: string[]) => void;
  'ai:thinking': (on: boolean) => void;
  'aura:change': (e: AuraEntry, newTotal: number) => void;
  'cooked:update': (value: number) => void;
  fx: (p: { kind: FxKind; emoji?: string }) => void;
  sound: (p: { name: SoundName }) => void;
}
