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

export type SimulateKind = 'typing_drama' | 'slow_reply' | 'burst' | 'dead_chat' | 'left_on_read' | 'simp' | 'argument' | 'derail' | 'tone';

export interface ClientToServerEvents {
  'room:create': (p: CreatePayload, ack: (a: Ack<{ code: string }>) => void) => void;
  'room:join': (p: JoinPayload, ack: (a: Ack<{ snapshot: RoomSnapshot }>) => void) => void;
  'chat:send': (p: { text: string; replyToId?: string }, ack?: (a: Ack<{ id: string }>) => void) => void;
  'chat:react': (p: { id: string; emoji: string }) => void;
  'room:vibe': (p: { persona?: PersonaId; brainrot?: BrainrotLevel; intensity?: RoastIntensity }) => void;
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
