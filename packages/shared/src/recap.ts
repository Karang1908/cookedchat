import { fmtDuration } from './format.js';

export interface RecapMessage {
  at: number;
  authorId: string | null;
  kind: string;
  text: string;
  trigger?: string;
}
export interface RecapEntry {
  at: number;
  memberId: string;
  delta: number;
  reason: string;
  receipt: string;
}
export interface RecapInput {
  messages: RecapMessage[];
  ledger: RecapEntry[];
  names: Record<string, string>;
  tzOffsetMin: number;
}
export interface Recap {
  title: string;
  episodes: { title: string; summary: string; cliffhanger: string }[];
}

const PHRASE: Record<string, string> = {
  slow_reply: 'Vanished for Hours', typing_drama: "Wrote a Novel and Sent 'ok'", six_seven: 'Said 67', fanum: 'Got Fanum Taxed', reply_later: 'Promised to Reply Later',
  mog: 'Got Mogged', ohio: 'Went Full Ohio', cap: 'Lied (Allegedly)', claim_real: 'Told the Truth (Shockingly)', hot_take: 'Said the Unsayable', quick_reply: 'Replied Instantly',
  manual: 'Had a Big Play',
};
const REASON_LABEL: Record<string, string> = {
  slow_reply: 'slow reply', typing_drama: 'typing drama', six_seven: '67', fanum_tax: 'fanum tax', reply_later: 'reply later', mog: 'mog', ohio: 'Ohio', cap: 'cap', claim_real: 'real claim',
  hot_take: 'hot take', quick_reply: 'quick reply', manual: 'admin',
};
const REASON_TO_KEY: Record<string, string> = { fanum_tax: 'fanum' };

const dayKey = (ms: number, tz: number) => new Date(ms + tz * 60_000).toISOString().slice(0, 10);

function chunk(messages: RecapMessage[], tz: number): RecapMessage[][] {
  const byDay = new Map<string, RecapMessage[]>();
  for (const m of messages) {
    const k = dayKey(m.at, tz);
    byDay.set(k, [...(byDay.get(k) ?? []), m]);
  }
  const days = [...byDay.values()];
  if (days.length > 1) return days;
  // one long day: split into thirds by time so a single session still reads like a season
  const only = days[0] ?? [];
  if (only.length < 6) return [only];
  const third = Math.ceil(only.length / 3);
  return [only.slice(0, third), only.slice(third, third * 2), only.slice(third * 2)].filter((c) => c.length);
}

export function buildRecap(i: RecapInput): Recap {
  const user = i.messages.filter((m) => m.kind === 'user' && m.text);
  if (user.length < 2) return { title: 'Previously on this group chat…', episodes: [{ title: 'Ep 1: The Pilot', summary: 'Nothing has happened yet. The AI is watching. Everyone is nervous.', cliffhanger: 'Next time: someone, anyone, says something.' }] };
  const all = chunk(i.messages, i.tzOffsetMin);
  // the season counts the whole history, even though only the last five episodes are shown
  const season = Math.floor((all.at(-1)!.at(-1)!.at - all[0]![0]!.at) / (7 * 86_400_000)) + 1;
  const chunks = all.slice(-5);
  const episodes = chunks.map((c, idx) => {
    const from = c[0]!.at;
    const to = c.at(-1)!.at;
    const entries = i.ledger.filter((e) => e.at >= from && e.at <= to);
    const swing = [...entries].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
    const who = (id: string) => i.names[id] ?? 'Someone';
    const userMsgs = c.filter((m) => m.kind === 'user');
    const roasts = c.filter((m) => m.kind === 'ai').length;
    const trig = c.filter((m) => m.trigger).reduce<Record<string, number>>((a, m) => ((a[m.trigger!] = (a[m.trigger!] ?? 0) + 1), a), {});
    const topTrig = Object.entries(trig).sort((a, b) => b[1] - a[1])[0]?.[0];
    const phrase = swing ? (PHRASE[REASON_TO_KEY[swing.reason] ?? swing.reason] ?? 'Was Involved') : (topTrig && PHRASE[topTrig]) || 'Just Vibes';
    const star = swing ? who(swing.memberId) : (userMsgs[0]?.authorId ? who(userMsgs[0].authorId) : 'The Group Chat');
    const lastUser = userMsgs.at(-1);
    return {
      title: `Ep ${idx + 1}: The One Where ${star} ${phrase}`,
      summary: `${userMsgs.length} ${userMsgs.length === 1 ? 'message' : 'messages'}, ${roasts} AI ${roasts === 1 ? 'interruption' : 'interruptions'} over ${fmtDuration(Math.max(60_000, to - from))}.${swing ? ` Biggest swing: ${who(swing.memberId)} ${swing.delta > 0 ? '+' : ''}${swing.delta.toLocaleString()} aura (${REASON_LABEL[swing.reason] ?? swing.reason}).` : ''}`,
      cliffhanger: lastUser ? `To be continued… ${lastUser.authorId ? who(lastUser.authorId) : 'someone'} had just said: “${lastUser.text.slice(0, 80)}”` : 'To be continued…',
    };
  });
  return { title: `Previously on this group chat… (Season ${season})`, episodes };
}
