'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { BorderBeam } from 'border-beam';
import { Crown, Download, Share2 } from 'lucide-react';
import type { Card, ChatMessage } from '@cooked/shared';
import { useRoomActions } from '@/lib/room-actions';
import { renderAwards, renderMeme, renderWrapped, shareOrDownload } from '@/lib/share-card';
import { Avatar } from '../avatar';

type Of<T extends Card['type']> = Extract<Card, { type: T }>;

/** Renders the rich, server-driven chat items. New card types are added to the switch. */
export function CardView({ m }: { m: ChatMessage }) {
  const card = m.card;
  if (!card) return null;
  switch (card.type) {
    case 'poster': return <Poster card={card} />;
    case 'vote': return <VoteCard m={m} card={card} />;
    case 'bet': return <BetCard m={m} card={card} />;
    case 'battle': return <BattleCard m={m} card={card} />;
    case 'confession': return <ConfessionCard card={card} />;
    case 'replay': return <ReplayCard card={card} />;
    case 'weather': return <WeatherCard card={card} />;
    case 'dare': return <DareCard card={card} />;
    case 'recap': return <RecapCard card={card} />;
    case 'awards': return <AwardsCard card={card} />;
    case 'wrapped': return <WrappedCard card={card} />;
    case 'meme': return <MemeCard card={card} />;
    default: {
      // exhaustive: adding a Card type without a renderer is now a compile error here
      const unhandled: never = card;
      return <Shell label="card"><p className="text-sm text-mute">{m.text || String((unhandled as { type?: string }).type)}</p></Shell>;
    }
  }
}

function Shell({ label, tone = 'magenta', children, glow }: { label: string; tone?: 'magenta' | 'sun' | 'mint' | 'blurple'; children: React.ReactNode; glow?: boolean }) {
  const toneCls = { magenta: 'text-magenta', sun: 'text-sun', mint: 'text-mint', blurple: 'text-blurple-soft' }[tone];
  const body = (
    <div className="rounded-2xl border border-white/10 bg-ink-800/95 px-4 py-3" style={{ borderRadius: 16 }}>
      <div className={clsx('mb-1.5 font-mono text-[10px] uppercase tracking-[0.22em]', toneCls)}>{label}</div>
      {children}
    </div>
  );
  return (
    <div className="pop-in mx-auto my-2 w-full max-w-xl">
      {glow ? <BorderBeam size="md" colorVariant="ocean" strength={0.8} duration={3.6}>{body}</BorderBeam> : body}
    </div>
  );
}

function useCountdown(closesAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (closesAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [closesAt]);
  return closesAt === null ? 0 : Math.max(0, Math.ceil((closesAt - now) / 1000));
}

function useAct() {
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!err) return;
    const t = setTimeout(() => setErr(null), 3000);
    return () => clearTimeout(t);
  }, [err]);
  return { err, run: async (p: Promise<string | null>) => setErr(await p) };
}

// ---------------------------------------------------------------- vote (is this real? + hot take arena)

function VoteCard({ m, card }: { m: ChatMessage; card: Of<'vote'> }) {
  const a = useRoomActions();
  const { err, run } = useAct();
  const left = useCountdown(card.settled ? null : card.closesAt);
  const closed = !!card.settled || left <= 0;
  const subject = a.members.find((x) => x.id === card.subjectId);
  const isSubject = a.meId === card.subjectId;
  const mine = a.meId ? card.votes[a.meId] : undefined;
  const total = Object.keys(card.votes).length;
  const real = card.style === 'real';
  const question = real ? card.question.replace(/^Chat, is this real\? /, '') : card.question;
  return (
    <Shell label={real ? 'Chat, is this real?' : 'Hot take arena'} tone={real ? 'sun' : 'magenta'} glow={!closed}>
      <p className="break-words text-base font-medium leading-snug">{question}</p>
      <p className="mt-0.5 text-xs text-mute">— {subject?.name ?? 'someone'}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {card.options.map((o) => {
          const n = Object.values(card.votes).filter((v) => v === o.id).length;
          const won = card.settled?.winner === o.id;
          return (
            <button key={o.id} disabled={closed || isSubject} onClick={() => void run(a.vote(m.id, o.id))} aria-pressed={mine === o.id} aria-label={`Vote ${o.label}`}
              className={clsx('relative overflow-hidden rounded-xl border px-3 py-2.5 text-left transition enabled:hover:border-blurple/70 enabled:active:scale-[0.98] disabled:opacity-70', mine === o.id ? 'border-blurple bg-blurple/25' : 'border-white/10 bg-ink-700', won && 'border-mint ring-2 ring-mint/50')}>
              <span className="absolute inset-y-0 left-0 bg-white/5 transition-all" style={{ width: total ? `${(n / total) * 100}%` : 0 }} />
              <span className="relative flex items-center justify-between gap-2">
                <span className="text-lg font-bold">{o.emoji} {o.label}</span>
                <span className="font-mono text-sm tabular-nums text-mute">{n}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-mute">
        <span>{card.settled ? <b className="text-text">Result: {card.settled.note}</b> : isSubject ? "you can't vote on your own" : mine ? 'vote locked in' : 'cast your vote'}</span>
        {!card.settled && <span className="font-mono">{left > 0 ? `${left}s left · ${total} votes` : 'counting…'}</span>}
      </div>
      {err && <p role="alert" className="mt-1 text-xs text-ember">{err}</p>}
    </Shell>
  );
}

// ---------------------------------------------------------------- prediction market

const CHIPS = [25, 50, 100, 250];

function BetCard({ m, card }: { m: ChatMessage; card: Of<'bet'> }) {
  const a = useRoomActions();
  const { err, run } = useAct();
  const [amount, setAmount] = useState(50);
  const me = a.members.find((x) => x.id === a.meId);
  const subject = a.members.find((x) => x.id === card.subjectId);
  const myBet = a.meId ? card.bets[a.meId] : undefined;
  const pool = (side: 'yes' | 'no') => Object.values(card.bets).filter((b) => b.side === side).reduce((t, b) => t + b.amount, 0);
  const canBet = !card.settled && !myBet && a.meId !== card.subjectId;
  return (
    <Shell label="Prediction market 💰" tone="mint" glow={!card.settled}>
      <p className="text-base font-medium leading-snug">{card.question}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        {(['yes', 'no'] as const).map((side) => (
          <div key={side} className={clsx('rounded-xl border px-3 py-2', card.settled?.outcome === side ? 'border-mint bg-mint/10' : 'border-white/10 bg-ink-700')}>
            <div className="font-display text-xl uppercase">{side}</div>
            <div className="font-mono text-sm text-mute">{pool(side)} 🪙 pooled</div>
            {canBet && <button onClick={() => void run(a.placeBet(m.id, side, amount))} className="mt-1.5 w-full rounded-lg bg-blurple py-1.5 text-xs font-bold transition hover:bg-blurple-soft active:scale-95" aria-label={`Bet ${amount} on ${side}`}>bet {amount} on {side}</button>}
          </div>
        ))}
      </div>
      {canBet && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {CHIPS.map((c) => <button key={c} onClick={() => setAmount(c)} aria-pressed={amount === c} className={clsx('rounded-full border px-2.5 py-1 font-mono', amount === c ? 'border-blurple bg-blurple/25' : 'border-white/10 text-mute')}>{c}</button>)}
          <span className="ml-auto text-mute">you have {me?.coins ?? 0} 🪙</span>
        </div>
      )}
      <p className="mt-2 text-xs text-mute">
        {card.settled
          ? `Settled: ${card.settled.outcome.toUpperCase()}. ${Object.entries(card.settled.payouts).map(([id, p]) => `${a.members.find((x) => x.id === id)?.name ?? '?'} got ${p} 🪙`).join(', ') || 'nobody bet'}`
          : myBet ? `you bet ${myBet.amount} 🪙 on ${myBet.side.toUpperCase()}` : a.meId === card.subjectId ? `people are betting on you, ${subject?.name}` : `${Object.keys(card.bets).length} bets so far`}
      </p>
      {err && <p role="alert" className="mt-1 text-xs text-ember">{err}</p>}
    </Shell>
  );
}

// ---------------------------------------------------------------- rizz battle

function BattleCard({ m, card }: { m: ChatMessage; card: Of<'battle'> }) {
  const a = useRoomActions();
  const { err, run } = useAct();
  const [text, setText] = useState('');
  const left = useCountdown(card.settled ? null : card.closesAt);
  const [x, y] = card.contenders;
  const name = (id: string) => a.members.find((q) => q.id === id)?.name ?? '?';
  const meIn = !!a.meId && card.contenders.includes(a.meId);
  const submitted = !!a.meId && !!card.entries[a.meId];
  return (
    <Shell label="Rizz battle ⚔️" tone="magenta" glow={!card.settled}>
      <p className="text-base font-medium leading-snug">{card.scenario}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[x, y].map((id) => (
          <div key={id} className={clsx('rounded-xl border px-3 py-2', card.settled?.winnerId === id ? 'border-sun bg-sun/10' : 'border-white/10 bg-ink-700')}>
            <div className="flex items-center gap-1.5 font-display text-lg uppercase">{card.settled?.winnerId === id && <Crown size={16} className="text-sun" />}{name(id)}</div>
            {card.settled ? <p className="mt-1 break-words text-sm">{card.entries[id] ? `“${card.entries[id]}”` : <i className="text-mute">froze up</i>}</p>
              : <p className="mt-1 text-xs text-mute">{card.entries[id] ? '✅ locked in' : '⏳ thinking…'}</p>}
          </div>
        ))}
      </div>
      {!card.settled && meIn && !submitted && (
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const t = text.trim(); if (t) { void run(a.battleSubmit(m.id, t)); setText(''); } }}>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder="your best line…" aria-label="Your rizz line" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-ink-850 px-3 py-2 text-sm outline-none focus:border-blurple" />
          <button className="rounded-lg bg-blurple px-3 text-sm font-bold">send</button>
        </form>
      )}
      <p className="mt-2 text-xs text-mute">{card.settled ? <b className="text-text">{card.settled.winnerId ? `${name(card.settled.winnerId)}: ${card.settled.verdict}` : card.settled.verdict}</b> : `${left}s left`}{!card.settled && !meIn && ' · spectating'}</p>
      {err && <p role="alert" className="mt-1 text-xs text-ember">{err}</p>}
    </Shell>
  );
}

// ---------------------------------------------------------------- simple cards

function ConfessionCard({ card }: { card: Of<'confession'> }) {
  return (
    <Shell label="Anonymous confession 🤫" tone="blurple">
      <p className="break-words text-base font-medium italic leading-snug">“{card.text}”</p>
      <p className="mt-2 rounded-lg bg-ink-950/60 px-3 py-1.5 font-mono text-xs text-mute">AI guesses: <b className="text-text">{card.guessName}</b> ({card.confidence}% confident · confidence is fake)</p>
    </Shell>
  );
}

function ReplayCard({ card }: { card: Of<'replay'> }) {
  return (
    <Shell label="🎬 Let's go to the tape" tone="sun">
      <blockquote className="border-l-2 border-sun pl-3">
        <p className="break-words text-base leading-snug">{card.text}</p>
        <footer className="mt-1 text-xs text-mute">— {card.authorName}, from the archive</footer>
      </blockquote>
    </Shell>
  );
}

function WeatherCard({ card }: { card: Of<'weather'> }) {
  return (
    <Shell label="🌦️ Chat weather forecast" tone="mint">
      <p className="text-base font-medium leading-snug">{card.headline}</p>
      <ul className="mt-2 space-y-1.5">
        {card.forecast.map((f) => (
          <li key={f.label} className="text-xs">
            <div className="flex justify-between text-mute"><span>{f.label}</span><span className="font-mono">{f.pct}%</span></div>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-ink-600"><div className="h-full rounded-full bg-gradient-to-r from-mint to-sun" style={{ width: `${f.pct}%` }} /></div>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function DareCard({ card }: { card: Of<'dare'> }) {
  const label = { dare: '🎲 Chaos agent: dare', twist: '🌀 Chaos agent: plot twist', copypasta: '🥀 Cursed copypasta' }[card.style];
  return (
    <Shell label={label} tone={card.style === 'copypasta' ? 'blurple' : 'sun'} glow={card.style !== 'copypasta'}>
      <p className={clsx('break-words leading-snug', card.style === 'copypasta' ? 'text-sm text-mute' : 'text-lg font-semibold')}>{card.text}</p>
    </Shell>
  );
}

function Poster({ card }: { card: Of<'poster'> }) {
  return (
    <div className="pop-in mx-auto my-3 w-full max-w-xs -rotate-1 rounded-sm bg-[#f3ecd8] p-4 text-center text-[#241c0e] shadow-xl shadow-black/40" role="img" aria-label={`Missing person poster for ${card.name}`}>
      <div className="font-display text-5xl uppercase leading-none tracking-wider text-[#8c1c13]">Missing</div>
      <div className="mx-auto my-3 grid size-24 place-items-center rounded-full border-4 border-[#241c0e]/70 bg-[#e2d7b8]">
        <Avatar type={card.avatar} size={72} />
      </div>
      <div className="font-display text-3xl uppercase tracking-wide">{card.name}</div>
      <div className="mt-1 font-mono text-xs uppercase tracking-widest">last seen {card.ago} ago</div>
      <div className="mt-3 border-t border-[#241c0e]/30 pt-2 text-xs">If found, please reply. Do not leave on read.</div>
    </div>
  );
}

// ---------------------------------------------------------------- recap / awards / wrapped / meme

function RecapCard({ card }: { card: Of<'recap'> }) {
  return (
    <Shell label="📺 Previously on this group chat…" tone="blurple">
      <h4 className="font-display text-2xl uppercase leading-tight tracking-wide">{card.title.replace('Previously on this group chat… ', '')}</h4>
      <ol className="mt-2 space-y-3">
        {card.episodes.map((ep) => (
          <li key={ep.title} className="border-l-2 border-blurple pl-3">
            <div className="text-sm font-bold">{ep.title}</div>
            <div className="text-xs text-mute">{ep.summary}</div>
            <div className="mt-0.5 text-xs italic text-sun">{ep.cliffhanger}</div>
          </li>
        ))}
      </ol>
    </Shell>
  );
}

/** renders the shareable PNG for a card once, shows it, and offers share/download */
function useShareImage(render: () => Promise<Blob>, deps: unknown[]) {
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let revoked: string | null = null;
    let live = true;
    render().then((b) => {
      if (!live) return;
      revoked = URL.createObjectURL(b);
      setBlob(b);
      setUrl(revoked);
    }).catch(() => live && setErr('could not render the image'));
    return () => {
      live = false;
      if (revoked) URL.revokeObjectURL(revoked);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { url, blob, err };
}

function ShareBar({ blob, name, text }: { blob: Blob | null; name: string; text: string }) {
  const [state, setState] = useState<string | null>(null);
  return (
    <div className="mt-2 flex items-center gap-2">
      <button disabled={!blob} onClick={async () => blob && setState(await shareOrDownload(blob, name, text))} className="flex items-center gap-1.5 rounded-lg bg-blurple px-3 py-1.5 text-xs font-bold transition enabled:hover:bg-blurple-soft enabled:active:scale-95 disabled:opacity-40" aria-label="Share image">
        <Share2 size={14} /> share
      </button>
      {blob && <a href="#" onClick={(e) => { e.preventDefault(); const u = URL.createObjectURL(blob); const a = Object.assign(document.createElement('a'), { href: u, download: name }); a.click(); setTimeout(() => URL.revokeObjectURL(u), 3000); setState('downloaded'); }} className="flex items-center gap-1 text-xs text-blurple-soft underline"><Download size={13} /> save png</a>}
      {state && <span role="status" className="text-xs text-mint">{state}</span>}
    </div>
  );
}

function AwardsCard({ card }: { card: Of<'awards'> }) {
  const { blob } = useShareImage(() => renderAwards(card), [card]);
  return (
    <Shell label="🏆 Chat awards" tone="sun">
      <ul className="space-y-2">
        {card.awards.map((a) => (
          <li key={a.title} className="flex items-start gap-3">
            <span className="text-2xl leading-none" aria-hidden>{a.emoji}</span>
            <div className="min-w-0">
              <div className="text-sm font-bold">{a.title}: <span className="text-sun">{a.name}</span></div>
              <div className="text-xs text-mute">{a.why}</div>
            </div>
          </li>
        ))}
      </ul>
      <ShareBar blob={blob} name="chat-awards.png" text="Chat awards from Cooked Chat 🏆" />
    </Shell>
  );
}

function WrappedCard({ card }: { card: Of<'wrapped'> }) {
  const { url, blob, err } = useShareImage(() => renderWrapped(card), [card]);
  return (
    <Shell label={`🎁 ${card.name}'s Brainrot Wrapped`} tone="magenta" glow>
      <p className="text-base font-medium leading-snug">You are {card.breakdown.map((b) => `${b.pct}% ${b.label}`).join(', ')}.</p>
      <p className="mt-1 text-sm text-mute">Your final form is <b className="text-text">{card.finalForm}</b>.</p>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`${card.name}'s Brainrot Wrapped card`} className="mt-3 w-full max-w-xs rounded-xl border border-white/10" />
      ) : <div className="mt-3 aspect-[4/5] w-full max-w-xs animate-pulse rounded-xl bg-ink-700" />}
      {err && <p role="alert" className="text-xs text-ember">{err}</p>}
      <ShareBar blob={blob} name={`wrapped-${card.name.toLowerCase()}.png`} text={`${card.name}'s Brainrot Wrapped 🎁`} />
    </Shell>
  );
}

function MemeCard({ card }: { card: Of<'meme'> }) {
  const { url, blob, err } = useShareImage(() => renderMeme(card), [card]);
  return (
    <Shell label="🗿 Auto meme" tone="mint">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Meme: ${card.top} ${card.bottom}`} className="w-full max-w-sm rounded-xl border border-white/10" />
      ) : <div className="aspect-square w-full max-w-sm animate-pulse rounded-xl bg-ink-700" />}
      {err && <p role="alert" className="text-xs text-ember">{err}</p>}
      <ShareBar blob={blob} name="cooked-meme.png" text="a meme from Cooked Chat 🗿" />
    </Shell>
  );
}
