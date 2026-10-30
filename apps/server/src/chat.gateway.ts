import { Inject, Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Socket } from 'socket.io';
import { FX_KINDS, SOUND_NAMES } from '@cooked/shared';
import type { Ack, BrainrotLevel, ClientToServerEvents, FxKind, JoinPayload, PersonaId, RoastIntensity, RoomSnapshot, ServerToClientEvents, SimulateKind, SoundName, TriggerKind, TypingPayload } from '@cooked/shared';
import { loadConfig } from './config.js';
import type { Config } from './config.js';
import { Engine } from './engine.js';
import type { Room } from './room.js';
import { RoomsService, normalizeCode } from './rooms.service.js';
import { SocketBus } from './socket-bus.js';
import type { IoServer } from './socket-bus.js';
import { CONFIG } from './tokens.js';
import type { SettingsPatch } from './settings.js';

interface SocketData {
  code?: string;
  memberId?: string;
  isAdmin?: boolean;
}
type Sock = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const SIMULATE_KINDS: SimulateKind[] = ['typing_drama', 'slow_reply', 'burst', 'dead_chat', 'left_on_read', 'simp', 'argument', 'derail', 'tone', 'claim', 'hottake', 'bet', 'battle', 'confession'];
const FORCE_KINDS: TriggerKind[] = ['six_seven', 'unc', 'reply_later', 'typing_drama', 'typed_deleted', 'slow_reply', 'burst', 'dry_reply', 'edited', 'deleted', 'left_on_read', 'dead_chat', 'tung_tung', 'cooked_max', 'ohio_high', 'cap', 'tone_shift', 'derail', 'crash_out', 'simp_radar', 'missing', 'owl', 'betrayal', 'class_change', 'scouter', 'mog', 'lore', 'chaos', 'weather', 'replay', 'copypasta', 'recap', 'awards', 'wrapped', 'meme', 'duel'];

const str = (v: unknown, max = 500): string => (typeof v === 'string' ? v.slice(0, max) : '');
const digest = (s: string) => createHash('sha256').update(s).digest();

@WebSocketGateway({ cors: { origin: loadConfig().corsOrigins } })
export class ChatGateway implements OnGatewayInit, OnGatewayDisconnect {
  private readonly log = new Logger('ChatGateway');
  @WebSocketServer() server!: IoServer;

  constructor(
    @Inject(SocketBus) private readonly bus: SocketBus,
    @Inject(RoomsService) private readonly rooms: RoomsService,
    @Inject(Engine) private readonly engine: Engine,
    @Inject(CONFIG) private readonly config: Config,
  ) {}

  afterInit(server: IoServer) {
    this.bus.server = server;
    if (!this.config.adminKey) this.log.warn('ADMIN_KEY is not set: the admin panel is disabled');
  }

  async handleDisconnect(socket: Sock) {
    const { code, memberId, isAdmin } = socket.data;
    if (isAdmin) this.rooms.all().find((r) => r.code === code)?.adminSockets.delete(socket.id);
    if (!code || !memberId || isAdmin) return;
    const room = await this.rooms.ensure(code);
    if (room) this.engine.leave(room, memberId, socket.id);
  }

  // ------------------------------------------------------------- room

  @SubscribeMessage('room:create')
  async create(@MessageBody() p: { tzOffsetMin?: number }): Promise<Ack<{ code: string }>> {
    const room = await this.rooms.create(Number(p?.tzOffsetMin));
    return { ok: true, code: room.code };
  }

  @SubscribeMessage('room:join')
  async join(@ConnectedSocket() socket: Sock, @MessageBody() p: JoinPayload): Promise<Ack<{ snapshot: RoomSnapshot }>> {
    const code = normalizeCode(p?.code);
    if (!code) return { ok: false, error: 'bad room code' };
    const room = await this.rooms.ensure(code);
    if (!room) return { ok: false, error: 'room not found' };
    const r = this.engine.join(room, { code, memberId: str(p.memberId, 64), name: str(p.name, 40), avatar: p.avatar }, socket.id);
    if (!r.ok) return r;
    socket.data = { code, memberId: r.member.id };
    await socket.join(code);
    return { ok: true, snapshot: room.snapshot() };
  }

  // ------------------------------------------------------------- chat

  private ctx(socket: Sock): { room: Room; memberId: string } | null {
    const { code, memberId, isAdmin } = socket.data;
    if (!code || !memberId || isAdmin) return null;
    const room = this.rooms.all().find((r) => r.code === code);
    return room ? { room, memberId } : null;
  }

  @SubscribeMessage('chat:send')
  send(@ConnectedSocket() socket: Sock, @MessageBody() p: { text: string; replyToId?: string }): Ack<{ id: string }> {
    const c = this.ctx(socket);
    if (!c) return { ok: false, error: 'join a room first' };
    const r = this.engine.send(c.room, c.memberId, str(p?.text), p?.replyToId ? str(p.replyToId, 64) : undefined);
    if (!r.ok) return r;
    r.done.catch((e) => this.log.error(e)); // fire and forget: the ack must not wait on the AI
    return { ok: true, id: r.id };
  }

  @SubscribeMessage('chat:edit')
  edit(@ConnectedSocket() socket: Sock, @MessageBody() p: { id: string; text: string }) {
    const c = this.ctx(socket);
    if (c) this.engine.edit(c.room, c.memberId, str(p?.id, 64), str(p?.text));
  }

  @SubscribeMessage('chat:delete')
  remove(@ConnectedSocket() socket: Sock, @MessageBody() p: { id: string }) {
    const c = this.ctx(socket);
    if (c) this.engine.delete(c.room, c.memberId, str(p?.id, 64));
  }

  @SubscribeMessage('chat:react')
  react(@ConnectedSocket() socket: Sock, @MessageBody() p: { id: string; emoji: string }) {
    const c = this.ctx(socket);
    if (c) this.engine.reactTo(c.room, c.memberId, str(p?.id, 64), str(p?.emoji, 16));
  }

  // ------------------------------------------------------------- games (every handler returns an Ack with the reason on failure)

  @SubscribeMessage('vote:cast')
  vote(@ConnectedSocket() socket: Sock, @MessageBody() p: { id: string; option: string }): Ack {
    const c = this.ctx(socket);
    return c ? c.room && this.engine.games.castVote(c.room, c.memberId, str(p?.id, 64), str(p?.option, 32)) : { ok: false, error: 'join a room first' };
  }

  @SubscribeMessage('hottake:submit')
  hotTake(@ConnectedSocket() socket: Sock, @MessageBody() p: { text: string }): Ack {
    const c = this.ctx(socket);
    return c ? this.engine.games.submitHotTake(c.room, c.memberId, str(p?.text, 300)) : { ok: false, error: 'join a room first' };
  }

  @SubscribeMessage('bet:create')
  betCreate(@ConnectedSocket() socket: Sock, @MessageBody() p: { subjectId: string; minutes?: number }): Ack {
    const c = this.ctx(socket);
    return c ? this.engine.games.createBet(c.room, c.memberId, str(p?.subjectId, 64), Number(p?.minutes)) : { ok: false, error: 'join a room first' };
  }

  @SubscribeMessage('bet:place')
  betPlace(@ConnectedSocket() socket: Sock, @MessageBody() p: { id: string; side: 'yes' | 'no'; amount: number }): Ack {
    const c = this.ctx(socket);
    return c ? this.engine.games.placeBet(c.room, c.memberId, str(p?.id, 64), p?.side, Number(p?.amount)) : { ok: false, error: 'join a room first' };
  }

  @SubscribeMessage('battle:start')
  battleStart(@ConnectedSocket() socket: Sock, @MessageBody() p: { opponentId: string }): Ack {
    const c = this.ctx(socket);
    return c ? this.engine.games.startBattle(c.room, c.memberId, str(p?.opponentId, 64)) : { ok: false, error: 'join a room first' };
  }

  @SubscribeMessage('battle:submit')
  battleSubmit(@ConnectedSocket() socket: Sock, @MessageBody() p: { id: string; text: string }): Ack {
    const c = this.ctx(socket);
    return c ? this.engine.games.submitBattle(c.room, c.memberId, str(p?.id, 64), str(p?.text, 300)) : { ok: false, error: 'join a room first' };
  }

  @SubscribeMessage('confession:post')
  confess(@ConnectedSocket() socket: Sock, @MessageBody() p: { text: string }): Ack {
    const c = this.ctx(socket);
    return c ? this.engine.games.postConfession(c.room, c.memberId, str(p?.text, 400)) : { ok: false, error: 'join a room first' };
  }

  @SubscribeMessage('weather:get')
  weather(@ConnectedSocket() socket: Sock): Ack {
    const c = this.ctx(socket);
    return c ? this.engine.games.forecast(c.room) : { ok: false, error: 'join a room first' };
  }

  @SubscribeMessage('replay:request')
  replay(@ConnectedSocket() socket: Sock): Ack {
    const c = this.ctx(socket);
    return c ? this.engine.games.replay(c.room) : { ok: false, error: 'join a room first' };
  }

  @SubscribeMessage('translate:request')
  async translate(@ConnectedSocket() socket: Sock, @MessageBody() p: { id: string; mode: 'brainrot' | 'plain' | 'dry' }): Promise<Ack<{ text: string; via: 'ai' | 'rules' }>> {
    const c = this.ctx(socket);
    return c ? this.engine.memory.translate(c.room, c.memberId, str(p?.id, 64), p?.mode) : { ok: false, error: 'join a room first' };
  }

  @SubscribeMessage('meme:make')
  async meme(@ConnectedSocket() socket: Sock, @MessageBody() p: { id: string }): Promise<Ack> {
    const c = this.ctx(socket);
    return c ? this.engine.memory.makeMeme(c.room, c.memberId, str(p?.id, 64)) : { ok: false, error: 'join a room first' };
  }

  @SubscribeMessage('recap:generate')
  async recap(@ConnectedSocket() socket: Sock): Promise<Ack> {
    const c = this.ctx(socket);
    return c ? this.engine.memory.recap(c.room) : { ok: false, error: 'join a room first' };
  }

  @SubscribeMessage('awards:get')
  awards(@ConnectedSocket() socket: Sock): Ack {
    const c = this.ctx(socket);
    return c ? this.engine.memory.awards(c.room) : { ok: false, error: 'join a room first' };
  }

  @SubscribeMessage('wrapped:get')
  wrapped(@ConnectedSocket() socket: Sock, @MessageBody() p: { memberId?: string }): Ack {
    const c = this.ctx(socket);
    return c ? this.engine.memory.wrapped(c.room, c.memberId, p?.memberId ? str(p.memberId, 64) : undefined) : { ok: false, error: 'join a room first' };
  }

  @SubscribeMessage('room:vibe')
  vibe(@ConnectedSocket() socket: Sock, @MessageBody() p: { persona?: PersonaId; brainrot?: BrainrotLevel; intensity?: RoastIntensity }) {
    const c = this.ctx(socket);
    if (c && p && typeof p === 'object') this.engine.setVibe(c.room, c.memberId, p);
  }

  @SubscribeMessage('chat:seen')
  seen(@ConnectedSocket() socket: Sock, @MessageBody() p: { id: string }) {
    const c = this.ctx(socket);
    if (c) this.engine.seen(c.room, c.memberId, str(p?.id, 64));
  }

  @SubscribeMessage('typing')
  typing(@ConnectedSocket() socket: Sock, @MessageBody() p: TypingPayload) {
    const c = this.ctx(socket);
    if (c && ['start', 'tick', 'stop'].includes(p?.state)) this.engine.typing(c.room, c.memberId, p);
  }

  @SubscribeMessage('sound:play')
  sound(@ConnectedSocket() socket: Sock, @MessageBody() p: { name: SoundName }) {
    const c = this.ctx(socket);
    if (c && SOUND_NAMES.includes(p?.name)) this.engine.playSound(c.room, c.memberId, p.name);
  }

  // ------------------------------------------------------------- admin

  @SubscribeMessage('admin:auth')
  async adminAuth(@ConnectedSocket() socket: Sock, @MessageBody() p: { key: string; code: string }): Promise<Ack<{ snapshot: RoomSnapshot }>> {
    const key = this.config.adminKey;
    if (!key) return { ok: false, error: 'admin disabled' };
    if (!timingSafeEqual(digest(str(p?.key, 200)), digest(key))) return { ok: false, error: 'wrong key' };
    const code = normalizeCode(p?.code);
    const room = code ? await this.rooms.ensure(code) : null;
    if (!room) return { ok: false, error: 'room not found' };
    if (socket.data.isAdmin) this.rooms.all().find((r) => r.code === socket.data.code)?.adminSockets.delete(socket.id);
    socket.data = { code: room.code, memberId: undefined, isAdmin: true };
    room.adminSockets.add(socket.id);
    await socket.join(room.code);
    return { ok: true, snapshot: room.snapshot() };
  }

  private admin(socket: Sock): Room | null {
    if (!socket.data.isAdmin || !socket.data.code) return null;
    return this.rooms.all().find((r) => r.code === socket.data.code) ?? null;
  }

  @SubscribeMessage('admin:settings')
  adminSettings(@ConnectedSocket() s: Sock, @MessageBody() p: SettingsPatch) {
    const room = this.admin(s);
    if (room && p && typeof p === 'object') this.engine.setSettings(room, p);
  }

  @SubscribeMessage('admin:warp')
  adminWarp(@ConnectedSocket() s: Sock, @MessageBody() p: { ms: number }) {
    const room = this.admin(s);
    if (room) this.engine.warp(room, Number(p?.ms));
  }

  @SubscribeMessage('admin:setCooked')
  adminCooked(@ConnectedSocket() s: Sock, @MessageBody() p: { value: number }) {
    const room = this.admin(s);
    if (room && Number.isFinite(Number(p?.value))) this.engine.setCooked(room, Number(p.value));
  }

  @SubscribeMessage('admin:fx')
  adminFx(@ConnectedSocket() s: Sock, @MessageBody() p: { kind: FxKind }) {
    const room = this.admin(s);
    if (room && FX_KINDS.includes(p?.kind)) this.engine.fx(room, p.kind);
  }

  @SubscribeMessage('admin:sound')
  adminSound(@ConnectedSocket() s: Sock, @MessageBody() p: { name: SoundName }) {
    const room = this.admin(s);
    if (room && SOUND_NAMES.includes(p?.name)) this.engine.sound(room, p.name);
  }

  @SubscribeMessage('admin:addBots')
  adminAddBots(@ConnectedSocket() s: Sock) {
    const room = this.admin(s);
    if (room) this.engine.addBots(room);
  }

  @SubscribeMessage('admin:elsewhere')
  adminElsewhere(@ConnectedSocket() s: Sock, @MessageBody() p: { memberId: string; on: boolean }) {
    const room = this.admin(s);
    if (room) this.engine.setElsewhere(room, str(p?.memberId, 64), !!p?.on);
  }

  @SubscribeMessage('admin:aura')
  adminAura(@ConnectedSocket() s: Sock, @MessageBody() p: { memberId: string; delta: number }) {
    const room = this.admin(s);
    if (room) this.engine.adminAura(room, str(p?.memberId, 64), Number(p?.delta));
  }

  @SubscribeMessage('admin:botSay')
  adminBotSay(@ConnectedSocket() s: Sock, @MessageBody() p: { memberId: string; text: string }) {
    const room = this.admin(s);
    if (!room) return;
    const r = this.engine.botSay(room, str(p?.memberId, 64), str(p?.text));
    if (r.ok) r.done.catch((e) => this.log.error(e));
  }

  @SubscribeMessage('admin:simulate')
  adminSimulate(@ConnectedSocket() s: Sock, @MessageBody() p: { kind: SimulateKind; memberId?: string }) {
    const room = this.admin(s);
    if (room && SIMULATE_KINDS.includes(p?.kind)) this.engine.simulate(room, p.kind, p.memberId ? str(p.memberId, 64) : undefined).catch((e) => this.log.error(e));
  }

  @SubscribeMessage('admin:force')
  adminForce(@ConnectedSocket() s: Sock, @MessageBody() p: { kind: TriggerKind; memberId?: string }) {
    const room = this.admin(s);
    if (room && FORCE_KINDS.includes(p?.kind)) this.engine.force(room, p.kind, p.memberId ? str(p.memberId, 64) : undefined).catch((e) => this.log.error(e));
  }
}
