'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';

type Ev =
  | { k: 'msg'; who: string; text: string; mine?: boolean; react?: string }
  | { k: 'typing'; who: string; ms: number }
  | { k: 'ai'; text: string; label: string; aura?: string };

/** A scripted conversation for the landing page. It shows the balance: the AI mostly reacts, and speaks on the moments. */
const SCRIPT: Ev[] = [
  { k: 'msg', who: 'Aman', text: 'are we still on for tonight?' },
  { k: 'typing', who: 'Riya', ms: 2200 },
  { k: 'msg', who: 'Riya', text: 'k' },
  { k: 'ai', label: 'typing spy', text: 'Riya typed for 41 seconds and sent “k”. we all saw it 👁️', aura: 'Riya −300 aura' },
  { k: 'msg', who: 'Dev', text: "wait i'll reply later", react: '🥀' },
  { k: 'msg', who: 'You', text: 'dev you said that yesterday', mine: true },
  { k: 'msg', who: 'Aman', text: 'bro got fanum taxed lol', react: '👴' },
  { k: 'ai', label: 'unc alert', text: '"fanum tax" in 2026? ok unc 👴', aura: 'Aman −50 aura' },
  { k: 'msg', who: 'Riya', text: '67' },
  { k: 'ai', label: '67', text: 'SIX SEVEN. the prophecy is fulfilled 🗿', aura: 'Riya +67 aura' },
];

const TONE: Record<string, string> = { Aman: 'bg-sky', Riya: 'bg-pink', Dev: 'bg-mint' };

export function DemoChat() {
  const [n, setN] = useState(1);
  const [typing, setTyping] = useState<string | null>(null);

  useEffect(() => {
    if (n > SCRIPT.length) {
      const t = setTimeout(() => setN(1), 3500);
      return () => clearTimeout(t);
    }
    const next = SCRIPT[n];
    if (next?.k === 'typing') {
      setTyping(next.who);
      const t = setTimeout(() => {
        setTyping(null);
        setN((x) => x + 2);
      }, next.ms);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN((x) => x + 1), next?.k === 'ai' ? 1500 : 1100);
    return () => clearTimeout(t);
  }, [n]);

  const shown = SCRIPT.slice(0, n).filter((e) => e.k !== 'typing');
  return (
    <div aria-hidden className="brut-lg relative mx-auto w-full max-w-[420px] rotate-1 overflow-hidden rounded-[26px] bg-panel">
      <div className="flex items-center justify-between border-b-[2.5px] border-line bg-surface px-4 py-3">
        <div>
          <div className="font-display text-lg uppercase leading-none">the group chat</div>
          <div className="mt-0.5 text-xs font-semibold text-muted">4 people · 1 AI</div>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs font-bold">
          <span className="h-3.5 w-16 overflow-hidden rounded-full border-2 border-line bg-surface"><span className="stripes block h-full w-2/5 border-r-2 border-line bg-accent" /></span>
          38%
        </div>
      </div>
      <div className="flex h-[360px] flex-col sm:h-[440px] justify-end gap-2 overflow-hidden px-4 py-4">
        <AnimatePresence initial={false}>
          {shown.map((e, i) =>
            e.k === 'ai' ? (
              <motion.div key={i} layout initial={{ opacity: 0, y: 8, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: -1 }} className="brut-sm my-1.5 rounded-xl bg-acid px-3 py-2">
                <div className="text-[11px] font-extrabold uppercase tracking-wide">👹 Gen Z Gremlin <span className="ml-1 rounded bg-fg px-1 font-mono text-[9px] text-acid">{e.label}</span></div>
                <div className="mt-0.5 text-[14px] font-bold leading-snug">{e.text}</div>
                {e.aura && <div className="mt-1.5 inline-block rounded-md border-[1.5px] border-line bg-surface px-1.5 font-mono text-[11px] font-bold">{e.aura}</div>}
              </motion.div>
            ) : (
              e.k === 'msg' && (
                <motion.div key={i} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={clsx('flex items-end gap-2', e.mine && 'flex-row-reverse')}>
                  {!e.mine && <span className={clsx('grid size-7 shrink-0 place-items-center rounded-lg border-2 border-line text-[11px] font-extrabold', TONE[e.who])}>{e.who[0]}</span>}
                  <div className={clsx('brut-sm relative max-w-[75%] rounded-2xl px-3 py-1.5 text-[14px] font-medium leading-snug', e.mine ? 'rounded-br-[5px] bg-accent' : clsx('rounded-bl-[5px]', TONE[e.who]))}>
                    {!e.mine && <div className="text-[11px] font-extrabold">{e.who}</div>}
                    {e.text}
                    {e.react && <span className="absolute -bottom-3 -right-2 rounded-full border-[1.5px] border-line bg-acid px-1 text-xs">{e.react}</span>}
                  </div>
                </motion.div>
              )
            ),
          )}
        </AnimatePresence>
        <div className="h-5 text-xs font-semibold text-muted">{typing && `${typing} is typing…`}</div>
      </div>
      <div className="border-t-[2.5px] border-line bg-surface p-3">
        <div className="flex h-10 items-center rounded-xl border-2 border-line bg-surface px-3 text-sm font-medium text-faint">say something…</div>
      </div>
    </div>
  );
}
