'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { LayoutGroup, motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { PERSONAS, SIDE_LABEL, fryStage } from '@cooked/shared';
import type { ChatMessage, Member } from '@cooked/shared';
import { fmtAura } from '@/lib/format';
import { unlockAudio } from '@/lib/sounds';
import { useLiveRoom } from '@/lib/use-live-room';
import { Avatar } from '../avatar';
import { CookedMeter } from '../cooked-meter';
import { FxLayer } from '../fx-layer';
import { useRoomUrl } from '../qr-dialog';
import { BreakingBanner } from '../room/breaking-banner';
import { toneFor, Wordmark } from '../ui';

const FEED = 7;

/** The projector view: a read-only spectator. Big QR, the chat in big type, the scoreboard, and every effect and sound. */
export function StageView({ code }: { code: string }) {
  const mode = useMemo(() => ({ kind: 'watch' as const }), []);
  const { state } = useLiveRoom(code, mode);
  const url = useRoomUrl(code);
  const [started, setStarted] = useState(false);
  const byId = new Map(state.members.map((m) => [m.id, m]));
  const feed = state.messages.filter((m) => (m.kind === 'user' && !m.deleted) || m.kind === 'ai' || m.kind === 'card').slice(-FEED);
  const ranked = [...state.members].sort((a, b) => b.aura - a.aura).slice(0, 6);
  const live = state.status === 'ready';

  if (state.status === 'error') {
    return <main className="grid min-h-dvh place-items-center font-display text-5xl uppercase">{state.error === 'room not found' ? `Room ${code} doesn't exist` : state.error}</main>;
  }

  return (
    <>
      <div id="stage" data-fry={Math.min(3, fryStage(state.cooked))} className="flex h-dvh flex-col gap-5 overflow-hidden p-6">
        <header className="flex items-center gap-6">
          <Wordmark className="text-[34px]" />
          <div className="font-display text-4xl uppercase">Room {code}</div>
          <div className="ml-auto w-[38%]"><CookedMeter value={state.cooked} /></div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,0.9fr)_minmax(0,2.1fr)] gap-6">
          <aside className="flex min-h-0 flex-col gap-5">
            <div className="brut-lg -rotate-1 rounded-3xl bg-surface p-5 text-center">
              <div className="font-display text-4xl uppercase leading-none">Scan to get roasted</div>
              <div className="mx-auto mt-4 w-fit rounded-2xl border-[3px] border-line bg-white p-3">
                {url ? <QRCodeSVG value={url} size={230} level="M" bgColor="#ffffff" fgColor="#16130f" /> : <div className="size-[230px]" />}
              </div>
              <div className="mt-3 inline-block -rotate-2 rounded-xl border-[2.5px] border-line bg-acid px-3 font-display text-5xl uppercase tracking-[0.12em]">{code}</div>
              <div className="mt-2 truncate font-mono text-sm font-bold">{url.replace(/^https?:\/\//, '')}</div>
            </div>
            <div className="brut min-h-0 flex-1 overflow-hidden rounded-3xl bg-surface p-4">
              <div className="mb-3 font-display text-3xl uppercase">Aura board</div>
              <LayoutGroup>
                <ol className="space-y-2">
                  {ranked.map((m, i) => <ScoreRow key={m.id} m={m} rank={i + 1} leader={i === 0 && ranked.length > 1} />)}
                  {!ranked.length && <li className="text-lg font-bold text-muted">Nobody yet. Scan the code.</li>}
                </ol>
              </LayoutGroup>
            </div>
          </aside>

          <main className="brut relative flex min-h-0 flex-col justify-end gap-4 overflow-hidden rounded-3xl bg-panel p-6" aria-live="polite">
            {feed.length === 0 && <div className="m-auto text-center font-display text-6xl uppercase leading-tight">The AI is watching.<br />Scan in and say something.</div>}
            {feed.map((m) => <FeedItem key={m.id} m={m} author={m.authorId ? byId.get(m.authorId) : undefined} />)}
            {state.thinking && (
              <div className="flex items-center gap-3 text-2xl font-bold text-muted">
                <span className="inline-flex gap-1">{[0, 1, 2].map((d) => <span key={d} className="size-3 animate-bounce rounded-full bg-fg" style={{ animationDelay: `${d * 120}ms` }} />)}</span>
                {PERSONAS[state.settings.persona].label} is typing…
              </div>
            )}
          </main>
        </div>
      </div>
      <div className={clsx('fry-noise', fryStage(state.cooked) >= 3 && 'on')} aria-hidden />
      <FxLayer />
      <BreakingBanner messages={state.messages} ready={live && started} />
      {!started && (
        <button onClick={() => { unlockAudio(); setStarted(true); }} className="fixed inset-0 z-[80] grid place-items-center bg-fg/80">
          <span className="brut-lg -rotate-2 rounded-3xl bg-acid px-10 py-8 text-center">
            <span className="block font-display text-6xl uppercase">Click to start the show</span>
            <span className="mt-2 block text-lg font-bold">turns the sound on (browsers block it until a click)</span>
          </span>
        </button>
      )}
    </>
  );
}

function ScoreRow({ m, rank, leader }: { m: Member; rank: number; leader: boolean }) {
  return (
    <motion.li layout className={clsx('brut-sm flex items-center gap-3 rounded-2xl px-3 py-2', leader ? 'bg-acid' : 'bg-surface')}>
      <span className="w-8 text-center font-display text-4xl leading-none">{rank}</span>
      <Avatar type={m.avatar} size={40} />
      <span className="min-w-0 flex-1 truncate text-2xl font-extrabold">{m.name}{leader && ' 👑'}</span>
      <motion.span key={m.aura} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className={clsx('rounded-lg border-2 border-line px-2 font-mono text-2xl font-extrabold tabular-nums', m.aura > 0 ? 'bg-mint' : m.aura < 0 ? 'bg-bad text-white' : 'bg-surface')}>{fmtAura(m.aura)}</motion.span>
    </motion.li>
  );
}

function FeedItem({ m, author }: { m: ChatMessage; author?: Member }) {
  if (m.kind === 'ai') {
    const persona = PERSONAS[m.persona ?? 'gremlin'];
    return (
      <motion.div layout initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex items-start gap-4">
        <span className={clsx('grid size-16 shrink-0 place-items-center rounded-2xl border-[3px] border-line text-4xl shadow-[3px_3px_0_var(--color-line)]', m.side === 'ollama' ? 'bg-sky' : 'bg-acid')}>{persona.emoji}</span>
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-xl font-extrabold">{persona.label}{m.side && <span className="rounded-md border-2 border-line bg-surface px-2 text-base">{SIDE_LABEL[m.side]}</span>}</div>
          <div className={clsx('brut break-words rounded-3xl rounded-tl-md px-6 py-4 text-[2.6rem] font-extrabold leading-[1.1]', m.side === 'ollama' ? 'bg-sky' : 'bg-acid')}>
            {m.text}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {m.gif && <img src={m.gif} alt="reaction gif" referrerPolicy="no-referrer" className="mt-3 max-h-56 rounded-2xl border-[3px] border-line" />}
          </div>
        </div>
      </motion.div>
    );
  }
  if (m.kind === 'card') {
    return <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="brut-sm self-center rounded-2xl bg-lemon px-5 py-2 text-2xl font-extrabold">🃏 {m.text || 'a game started on the phones'}</motion.div>;
  }
  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-3">
      {author && <Avatar type={author.avatar} size={48} />}
      <div className="min-w-0">
        <div className="text-lg font-extrabold">{author?.name ?? '?'}</div>
        <div className={clsx('brut-sm break-words rounded-3xl rounded-bl-md px-5 py-2.5 text-3xl font-semibold', toneFor(m.authorId))}>{m.text}</div>
      </div>
    </motion.div>
  );
}
