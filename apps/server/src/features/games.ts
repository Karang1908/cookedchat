import { randomUUID } from 'node:crypto';
import { BATTLE_SCENARIOS, COPYPASTAS, DARES, HOT_TAKE_PROMPTS, PLOT_TWISTS, buildForecast, findFood, isDry, isOffLimits, ohioScore } from '@cooked/shared';
import type { Ack, Card, ChatMessage, Member } from '@cooked/shared';
import type { Engine } from '../engine.js';
import type { Room } from '../room.js';

type Vote = Extract<Card, { type: 'vote' }>;
type Bet = Extract<Card, { type: 'bet' }>;
type Battle = Extract<Card, { type: 'battle' }>;

const ok = (): Ack => ({ ok: true });
const fail = (error: string): Ack => ({ ok: false, error });

const BOT_RIZZ = [
  'are you a parking ticket? because you have "fine" written all over you',
  'i would say "k" but you deserve proper punctuation',
  'roses are red, violets are blue, i reply in 4 seconds, and only to you',
  'is your name wifi? because i am feeling a strong connection and zero buffering',
  'i was going to leave you on read but my thumbs refused',
  'tum Panchayat ki chai ho, simple ho par roz chahiye 🫖',
  'mere reply time pe mat jao, tumhare liye toh main Sharma ji ka beta ban jaunga',
];
const BOT_TAKES = ['pineapple belongs on pizza and that is a hill', 'sending voice notes is a form of violence', 'reading a message and replying later is fine actually', 'maggi at 2am beats any 5 star dinner', 'Hera Pheri is better than every superhero movie'];
const CONFESSIONS = ['i have been pretending to read this group chat for weeks', 'i typed a 500 word reply once and sent "lol"', 'i muted this chat and unmuted it just to leave someone on read', 'maine "baad mein reply karta hu" bola tha. 3 hafte ho gaye'];

const MIN_VOTE_GAP_MS = 60_000;
const BET_MIN = 10;

/** Everything interactive: votes, hot takes, the coin market, rizz battles, confessions, forecast, replay, chaos. */
export class Games {
  private readonly settling = new Set<string>();

  constructor(private readonly e: Engine) {}

  private find<T extends Card['type']>(room: Room, id: string, type: T): { msg: ChatMessage; card: Extract<Card, { type: T }> } | null {
    const msg = room.messages.find((m) => m.id === id && m.card?.type === type);
    return msg ? { msg, card: msg.card as Extract<Card, { type: T }> } : null;
  }

  private later(immediate: boolean, fn: () => void): void {
    if (immediate) fn();
    else setTimeout(fn, 1500 + this.e.rng() * 3500).unref();
  }

  // ------------------------------------------------------------------ "Chat, is this real?"

  openRealVote(room: Room, subject: Member, msg: ChatMessage): ChatMessage | null {
    if (Date.now() - room.lastVoteAt < MIN_VOTE_GAP_MS) return null;
    room.lastVoteAt = Date.now();
    const card: Vote = {
      type: 'vote', id: randomUUID(), style: 'real', question: `Chat, is this real? "${msg.text.slice(0, 140)}"`, subjectId: subject.id,
      options: [{ id: 'real', label: 'Real', emoji: '🗿' }, { id: 'cap', label: 'Cap', emoji: '🧢' }], votes: {}, closesAt: Date.now() + room.settings.timings.voteWindowMs,
    };
    const m = this.e.postCard(room, card, card.question);
    if (room.settings.autopilotBots) this.botsAct(room, m, false);
    return m;
  }

  castVote(room: Room, memberId: string, id: string, option: string): Ack {
    const f = this.find(room, id, 'vote');
    if (!f) return fail('vote not found');
    const c = f.card;
    if (c.settled) return fail('that vote is closed');
    if (Date.now() > c.closesAt) return fail('voting just closed');
    if (!room.members.has(memberId)) return fail('not in room');
    if (memberId === c.subjectId) return fail("you can't vote on yourself");
    if (!c.options.some((o) => o.id === option)) return fail('bad option');
    c.votes[memberId] = option;
    this.e.update(room, f.msg);
    const eligible = [...room.members.values()].filter((m) => m.id !== c.subjectId && (m.online || m.isBot));
    if (eligible.length >= 2 && eligible.every((m) => c.votes[m.id])) this.settleVote(room, f.msg);
    return ok();
  }

  settleVote(room: Room, msg: ChatMessage): void {
    const c = msg.card as Vote;
    if (c.settled) return;
    const counts = c.options.map((o) => ({ o, n: Object.values(c.votes).filter((v) => v === o.id).length }));
    const total = counts.reduce((t, x) => t + x.n, 0);
    const subject = c.subjectId ? room.members.get(c.subjectId) : undefined;
    const [a, b] = [...counts].sort((x, y) => y.n - x.n);
    const score = counts.map((x) => `${x.n} ${x.o.emoji}`).join(' vs ');
    let line: string;

    if (total < 2) {
      c.settled = { winner: 'void', note: 'not enough votes' };
      line = `Nobody voted, so the verdict is "unknown". The ${c.style === 'real' ? 'claim' : 'take'} lives on, unjudged 🗿`;
    } else if (a!.n === b!.n) {
      c.settled = { winner: 'tie', note: score };
      line = `Hung jury: ${score}. Chat cannot decide. Everybody is wrong 🫡`;
    } else {
      c.settled = { winner: a!.o.id, note: score };
      const name = subject?.name ?? 'someone';
      if (c.style === 'real') {
        if (a!.o.id === 'cap') {
          if (subject) this.e.aura(room, subject.id, 'cap', c.question.replace(/^Chat, is this real\? /, ''), msg.id);
          line = `Verdict: ${score}. ${name}'s claim is CAP 🧢 -200 aura.`;
        } else {
          if (subject) this.e.aura(room, subject.id, 'claim_real', c.question.replace(/^Chat, is this real\? /, ''), msg.id);
          line = `Verdict: ${score}. ${name}'s claim is certified REAL 🗿 +100 aura.`;
        }
      } else if (a!.o.id === 'disagree') {
        const pct = Math.round((a!.n / total) * 100);
        if (subject) {
          this.e.aura(room, subject.id, 'hot_take', c.question, msg.id);
          room.hotTakes.push({ authorId: subject.id, text: c.question, diabolical: pct, at: room.now() });
          room.extrasDirty = true;
        }
        line = `Verdict: ${score}. ${name}'s hot take is DIABOLICAL (${pct}% disagree) 🔥 +300 aura.`;
      } else {
        line = `Verdict: ${score}. Chat agrees with ${name}. Disappointingly reasonable 🫡`;
      }
    }
    this.e.update(room, msg);
    this.e.postAi(room, line, { replyTo: msg.id, trigger: 'vote_result' });
    this.e.playEffects(room, 'vote_result');
  }

  // ------------------------------------------------------------------ hot take arena

  submitHotTake(room: Room, memberId: string, rawText: string): Ack {
    const m = room.members.get(memberId);
    const text = rawText?.trim().slice(0, 200);
    if (!m) return fail('not in room');
    if (!text || text.length < 5) return fail('make it a real take (5+ characters)');
    if (isOffLimits(text)) return fail('keep it about the take, not identity');
    if (Date.now() - (room.lastHotTakeAt.get(memberId) ?? 0) < 20_000) return fail('one hot take per 20 seconds');
    room.lastHotTakeAt.set(memberId, Date.now());
    const card: Vote = {
      type: 'vote', id: randomUUID(), style: 'hottake', question: text, subjectId: memberId,
      options: [{ id: 'agree', label: 'Based', emoji: '🔥' }, { id: 'disagree', label: 'Trash', emoji: '🗑️' }], votes: {}, closesAt: Date.now() + room.settings.timings.voteWindowMs,
    };
    const msg = this.e.postCard(room, card, `Hot take from ${m.name}: ${text}`);
    if (room.settings.autopilotBots) this.botsAct(room, msg, false);
    return ok();
  }

  suggestHotTake(): string {
    return HOT_TAKE_PROMPTS[Math.floor(this.e.rng() * HOT_TAKE_PROMPTS.length)]!;
  }

  // ------------------------------------------------------------------ prediction market

  createBet(room: Room, creatorId: string, subjectId: string, minutes?: number): Ack {
    const subject = room.members.get(subjectId);
    if (!room.members.has(creatorId)) return fail('not in room');
    if (!subject) return fail('unknown member');
    if (creatorId === subjectId) return fail("you can't open a market on yourself");
    if (room.messages.some((m) => m.card?.type === 'bet' && !m.card.settled && m.card.subjectId === subjectId)) return fail(`there is already an open market on ${subject.name}`);
    const mins = Math.max(1, Math.min(120, Math.round(Number(minutes) || 10)));
    const card: Bet = { type: 'bet', question: `Will ${subject.name} reply in under ${mins} min?`, subjectId, windowMs: mins * 60_000, openedAt: room.now(), bets: {} };
    const msg = this.e.postCard(room, card, card.question);
    if (room.settings.autopilotBots) this.botsAct(room, msg, false);
    return ok();
  }

  placeBet(room: Room, memberId: string, id: string, side: 'yes' | 'no', amount: number): Ack {
    const f = this.find(room, id, 'bet');
    const m = room.members.get(memberId);
    if (!f || !m) return fail('market not found');
    const c = f.card;
    if (c.settled) return fail('that market is closed');
    if (memberId === c.subjectId) return fail("you can't bet on yourself");
    if (c.bets[memberId]) return fail('you already placed a bet');
    if (side !== 'yes' && side !== 'no') return fail('bad side');
    const amt = Math.floor(Number(amount));
    if (!Number.isFinite(amt) || amt < BET_MIN) return fail(`minimum bet is ${BET_MIN} 🪙`);
    if (amt > m.coins) return fail('not enough coins');
    m.coins -= amt;
    c.bets[memberId] = { side, amount: amt };
    room.extrasDirty = true;
    this.e.update(room, f.msg);
    this.e.emitMembers(room);
    return ok();
  }

  private checkBet(room: Room, msg: ChatMessage): void {
    const c = msg.card as Bet;
    const reply = room.userMessages().find((m) => m.authorId === c.subjectId && m.at >= c.openedAt);
    if (reply && reply.at - c.openedAt <= c.windowMs) this.settleBet(room, msg, 'yes', `replied in ${Math.max(1, Math.round((reply.at - c.openedAt) / 60_000))}m`);
    else if (room.now() >= c.openedAt + c.windowMs) this.settleBet(room, msg, 'no', 'did not reply in time');
  }

  settleBet(room: Room, msg: ChatMessage, outcome: 'yes' | 'no', why: string): void {
    const c = msg.card as Bet;
    if (c.settled) return;
    const entries = Object.entries(c.bets);
    const pool = entries.reduce((t, [, b]) => t + b.amount, 0);
    const winners = entries.filter(([, b]) => b.side === outcome);
    const winPool = winners.reduce((t, [, b]) => t + b.amount, 0);
    const payouts: Record<string, number> = {};
    // parimutuel: winners split the whole pool by stake; nobody on the winning side = everyone is refunded
    if (winPool === 0) for (const [id, b] of entries) payouts[id] = b.amount;
    else for (const [id, b] of winners) payouts[id] = Math.floor((b.amount / winPool) * pool);
    for (const [id, p] of Object.entries(payouts)) {
      const m = room.members.get(id);
      if (m) m.coins += p;
    }
    c.settled = { outcome, payouts };
    room.extrasDirty = true;
    const subject = room.members.get(c.subjectId)?.name ?? 'they';
    const board = Object.entries(payouts).map(([id, p]) => `${room.members.get(id)?.name ?? '?'} ${p >= (c.bets[id]?.amount ?? 0) ? '+' : ''}${p - (c.bets[id]?.amount ?? 0)} 🪙`).join(', ');
    this.e.update(room, msg);
    this.e.emitMembers(room);
    this.e.postAi(room, `Market closed: ${subject} ${why}. ${outcome.toUpperCase()} wins.${board ? ` ${board}` : ' Nobody bet. Capitalism has failed.'}`, { replyTo: msg.id, trigger: 'bet_result' });
    this.e.playEffects(room, 'bet_result');
  }

  // ------------------------------------------------------------------ rizz battle

  startBattle(room: Room, initiatorId: string, opponentId: string): Ack {
    const a = room.members.get(initiatorId);
    const b = room.members.get(opponentId);
    if (!a) return fail('not in room');
    if (!b) return fail('unknown opponent');
    if (a.id === b.id) return fail('you cannot battle yourself (you would win and lose)');
    const open = room.messages.some((m) => m.card?.type === 'battle' && !m.card.settled && (m.card.contenders.includes(a.id) || m.card.contenders.includes(b.id)));
    if (open) return fail('one of you is already in a battle');
    const scenario = BATTLE_SCENARIOS[Math.floor(this.e.rng() * BATTLE_SCENARIOS.length)]!;
    const card: Battle = { type: 'battle', scenario, contenders: [a.id, b.id], entries: {}, closesAt: Date.now() + Math.max(room.settings.timings.voteWindowMs * 2, 20_000) };
    const msg = this.e.postCard(room, card, `Rizz battle: ${a.name} vs ${b.name}`);
    // bots never freeze up
    for (const c of [a, b]) if (c.isBot) this.later(true, () => void this.submitBattle(room, c.id, msg.id, BOT_RIZZ[Math.floor(this.e.rng() * BOT_RIZZ.length)]!));
    return ok();
  }

  submitBattle(room: Room, memberId: string, id: string, rawText: string): Ack {
    const f = this.find(room, id, 'battle');
    if (!f) return fail('battle not found');
    const c = f.card;
    const text = rawText?.trim().slice(0, 200);
    if (c.settled) return fail('that battle is over');
    if (!c.contenders.includes(memberId)) return fail('you are not in this battle');
    if (c.entries[memberId]) return fail('you already submitted');
    if (!text || text.length < 3) return fail('say something');
    if (isOffLimits(text)) return fail('rizz the situation, not the identity');
    c.entries[memberId] = text;
    this.e.update(room, f.msg);
    if (Object.keys(c.entries).length === 2) void this.settleBattle(room, f.msg).catch(() => {});
    return ok();
  }

  /** LLM judge with a rule-based fallback, so the battle always ends */
  private async judge(room: Room, scenario: string, a: { name: string; text: string }, b: { name: string; text: string }): Promise<{ winner: 'A' | 'B'; verdict: string }> {
    const gen = await this.e.d.writer.generate?.({
      system: 'You judge a rizz battle in a group chat: fair, funny, ruthless. Reply with exactly one letter, A or B, then a colon, then a verdict of at most 90 characters. Roast the delivery, never the person\'s identity.',
      user: `Scenario: ${scenario}\nA (${a.name}): ${a.text}\nB (${b.name}): ${b.text}`,
    });
    const m = gen && /^\s*([AB])\b\s*[:\-–]?\s*(.*)$/s.exec(gen);
    if (m) return { winner: m[1] as 'A' | 'B', verdict: m[2]!.trim().split('\n')[0]!.slice(0, 120) || 'the judges were moved' };
    const sa = this.rizzScore(a.text) + (this.e.rng() - 0.5) * 6;
    const sb = this.rizzScore(b.text) + (this.e.rng() - 0.5) * 6;
    return { winner: sa >= sb ? 'A' : 'B', verdict: sa >= sb ? 'cleaner delivery, better timing' : 'more confidence, fewer red flags' };
  }

  rizzScore(text: string): number {
    let s = 0;
    if (text.length >= 30 && text.length <= 120) s += 30;
    else if (text.length > 12) s += 15;
    if (/\?/.test(text)) s += 5;
    const emoji = (text.match(/\p{Extended_Pictographic}/gu) ?? []).length;
    if (emoji >= 1 && emoji <= 3) s += 8;
    if (/\b(beautiful|gorgeous|smart|funny|sweet|cute|amazing|special|lucky)\b/i.test(text)) s += 10;
    if (isDry(text)) s -= 20;
    s -= ohioScore(text) / 4;
    return s;
  }

  async settleBattle(room: Room, msg: ChatMessage): Promise<void> {
    const c = msg.card as Battle;
    if (c.settled || this.settling.has(msg.id)) return;
    this.settling.add(msg.id);
    try {
      const [aId, bId] = c.contenders;
      const a = room.members.get(aId);
      const b = room.members.get(bId);
      const ea = c.entries[aId];
      const eb = c.entries[bId];
      if (!a || !b) return;
      if (!ea && !eb) {
        c.settled = { winnerId: null, verdict: 'nobody showed up' };
        this.e.update(room, msg);
        this.e.postAi(room, `Rizz battle cancelled: ${a.name} and ${b.name} both froze. Zero rizz detected on either side 🥶`, { replyTo: msg.id, trigger: 'battle_result' });
        return;
      }
      let winnerId: string;
      let verdict: string;
      if (!ea || !eb) {
        winnerId = ea ? aId : bId;
        verdict = 'won by forfeit. the other one left them on read';
      } else {
        const j = await this.judge(room, c.scenario, { name: a.name, text: ea }, { name: b.name, text: eb });
        winnerId = j.winner === 'A' ? aId : bId;
        verdict = j.verdict;
      }
      const loserId = winnerId === aId ? bId : aId;
      c.settled = { winnerId, verdict };
      this.e.update(room, msg);
      this.e.postAi(room, `${room.members.get(winnerId)!.name} wins the rizz battle: ${verdict} 🎙️`, { replyTo: msg.id, trigger: 'battle_result' });
      this.e.playEffects(room, 'battle_result');
      this.e.mog(room, winnerId, loserId, `won the rizz battle: "${c.scenario.slice(0, 60)}"`, msg.id);
    } finally {
      this.settling.delete(msg.id);
    }
  }

  // ------------------------------------------------------------------ anonymous confessions

  /** The author is not stored anywhere: not on the message, not in the room, not in the database. */
  postConfession(room: Room, memberId: string, rawText: string): Ack {
    const text = rawText?.trim().slice(0, 280);
    if (!room.members.has(memberId)) return fail('not in room');
    if (!text || text.length < 5) return fail('confess something real (5+ characters)');
    if (isOffLimits(text)) return fail('keep confessions about behavior, not identity');
    if (Date.now() - (room.lastConfessAt.get(memberId) ?? 0) < 30_000) return fail('one confession per 30 seconds');
    room.lastConfessAt.set(memberId, Date.now());
    const pool = [...room.members.values()];
    const guess = pool[Math.floor(this.e.rng() * pool.length)]!;
    const confidence = 35 + Math.floor(this.e.rng() * 55);
    this.e.postCard(room, { type: 'confession', text, guessId: guess.id, guessName: guess.name, confidence }, 'Anonymous confession');
    this.e.sound(room, 'dunDunDun');
    return ok();
  }

  // ------------------------------------------------------------------ forecast, replay, chaos, copypasta

  forecast(room: Room): Ack {
    if (Date.now() - room.lastForecastAt < 15_000) return fail('the meteorologist is on break (15s)');
    room.lastForecastAt = Date.now();
    const recent = room.userMessages().slice(-30);
    const ids = new Set(recent.map((m) => m.authorId));
    const ghosts = [...ids].reduce((t, id) => t + (room.stats.get(id!)?.ghosts ?? 0), 0);
    const f = buildForecast({
      messages: recent.length, dry: recent.filter((m) => isDry(m.text)).length, lol: recent.filter((m) => /\b(lol|lmao|haha|bruh)\b/i.test(m.text)).length,
      food: recent.filter((m) => findFood(m.text)).length, ohioAvg: recent.length ? recent.reduce((t, m) => t + (m.ohio ?? 0), 0) / recent.length : 0,
      ghosts, cooked: room.cooked.value, quietMs: recent.length ? room.now() - recent.at(-1)!.at : 0, hour: room.localHour(),
    });
    this.e.postCard(room, { type: 'weather', headline: f.headline, forecast: f.forecast }, f.headline, 'weather');
    return ok();
  }

  replay(room: Room): Ack {
    if (Date.now() - room.lastReplayAt < 15_000) return fail('the tape is rewinding (15s)');
    const now = room.now();
    const pool = room.userMessages().filter((m) => now - m.at > 60_000 && m.text.length > 2);
    if (!pool.length) return fail('nothing old enough to replay yet');
    room.lastReplayAt = Date.now();
    const score = (m: ChatMessage) => (m.ohio ?? 0) + (m.edited ? 30 : 0) + Object.values(m.reactions).flat().length * 10 + this.e.rng() * 5;
    const pick = [...pool].sort((a, b) => score(b) - score(a))[0]!;
    const author = room.members.get(pick.authorId!);
    this.e.postCard(room, { type: 'replay', messageId: pick.id, authorName: author?.name ?? 'someone', text: pick.text }, "Let's go to the tape 🎬", 'replay');
    void this.e.comment(room, { kind: 'replay', member: author, text: pick.text, fact: `is being replayed from the archive: they said "${pick.text.slice(0, 120)}"`, targetId: pick.id }, true, true).catch(() => {});
    return ok();
  }

  chaos(room: Room): void {
    room.lastChaosAt = Date.now();
    const twist = this.e.rng() < 0.4;
    const pool = twist ? PLOT_TWISTS : DARES;
    const text = pool[Math.floor(this.e.rng() * pool.length)]!;
    this.e.postCard(room, { type: 'dare', text, style: twist ? 'twist' : 'dare' }, text, 'chaos');
    this.e.playEffects(room, 'chaos');
  }

  copypasta(room: Room): void {
    const text = COPYPASTAS[Math.floor(this.e.rng() * COPYPASTAS.length)]!;
    this.e.postCard(room, { type: 'dare', text, style: 'copypasta' }, text, 'copypasta');
    this.e.playEffects(room, 'copypasta');
  }

  // ------------------------------------------------------------------ bots + timers

  /** bots join in on a vote / market / battle, either on a delay (autopilot) or at once (staged demos) */
  botsAct(room: Room, msg: ChatMessage, immediate: boolean): void {
    const c = msg.card;
    if (!c) return;
    for (const bot of [...room.members.values()].filter((m) => m.isBot)) {
      if (c.type === 'vote' && bot.id !== c.subjectId) {
        const opt = c.options[Math.floor(this.e.rng() * c.options.length)]!.id;
        this.later(immediate, () => void this.castVote(room, bot.id, msg.id, opt));
      } else if (c.type === 'bet' && bot.id !== c.subjectId) {
        const side = this.e.rng() < 0.5 ? 'yes' : 'no';
        this.later(immediate, () => void this.placeBet(room, bot.id, msg.id, side, 50 + Math.floor(this.e.rng() * 100)));
      }
    }
  }

  tick(room: Room): void {
    const now = Date.now();
    for (const msg of room.messages.slice(-60)) {
      const c = msg.card;
      if (!c) continue;
      if (c.type === 'vote' && !c.settled && now >= c.closesAt) this.settleVote(room, msg);
      else if (c.type === 'battle' && !c.settled && now >= c.closesAt) void this.settleBattle(room, msg).catch(() => {});
      else if (c.type === 'bet' && !c.settled) this.checkBet(room, msg);
    }
    if (room.settings.chaos && now - room.lastChaosAt > 120_000 + this.e.rng() * 120_000) this.chaos(room);
  }

  // ------------------------------------------------------------------ staged demos (admin)

  async stage(room: Room, kind: 'claim' | 'hottake' | 'bet' | 'battle' | 'confession', bots: Member[]): Promise<string | null> {
    const [a, b, c] = bots;
    if (!a || !b) return 'need at least two bots';
    if (kind === 'claim') {
      const r = this.e.send(room, a.id, 'i swear i can literally run a marathon without even trying');
      if (r.ok) await r.done;
      room.lastVoteAt = 0;
      let card = room.messages.findLast((m) => m.card?.type === 'vote' && !m.card.settled);
      if (!card) { this.openRealVote(room, a, room.messages.findLast((m) => m.kind === 'user')!); card = room.messages.findLast((m) => m.card?.type === 'vote'); }
      if (card) this.botsAct(room, card, true);
    } else if (kind === 'hottake') {
      room.lastHotTakeAt.delete(a.id);
      this.submitHotTake(room, a.id, BOT_TAKES[Math.floor(this.e.rng() * BOT_TAKES.length)]!);
      const card = room.messages.findLast((m) => m.card?.type === 'vote' && !m.card.settled);
      if (card) this.botsAct(room, card, true);
    } else if (kind === 'bet') {
      this.createBet(room, b.id, a.id, 10);
      const card = room.messages.findLast((m) => m.card?.type === 'bet' && !m.card.settled);
      if (card) this.botsAct(room, card, true);
    } else if (kind === 'battle') {
      this.startBattle(room, a.id, (c ?? b).id);
    } else {
      room.lastConfessAt.delete(a.id);
      this.postConfession(room, a.id, CONFESSIONS[Math.floor(this.e.rng() * CONFESSIONS.length)]!);
    }
    return null;
  }
}
