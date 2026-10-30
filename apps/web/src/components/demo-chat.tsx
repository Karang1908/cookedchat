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
  { k: 'msg', who: 'Aman', text: 'pizza or biryani', react: '🍟' },
  { k: 'msg', who: 'Riya', text: '67' },
  { k: 'ai', label: '67', text: 'SIX SEVEN. the prophecy is fulfilled 🗿', aura: 'Riya +67 aura' },
];

const AVATAR: Record<string, string> = { Aman: 'bg-[#5b8def]', Riya: 'bg-[#d0679a]', Dev: 'bg-[#4fb38a]' };

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
    <div aria-hidden className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-[22px] border border-line bg-panel shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)]">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <div className="text-sm font-semibold">the group chat</div>
          <div className="text-xs text-faint">4 people · 1 AI</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface"><span className="block h-full w-2/5 rounded-full bg-accent" /></span>
          cooked 38%
        </div>
      </div>
      <div className="flex h-[360px] flex-col sm:h-[440px] justify-end gap-2 overflow-hidden px-4 py-4">
        <AnimatePresence initial={false}>
          {shown.map((e, i) =>
            e.k === 'ai' ? (
              <motion.div key={i} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="my-1 border-l-2 border-accent py-0.5 pl-3">
                <div className="text-[11px] font-semibold text-accent">👹 Gen Z Gremlin <span className="font-normal text-faint">· {e.label}</span></div>
                <div className="text-[14px] font-medium leading-snug">{e.text}</div>
                {e.aura && <div className="mt-1 inline-block rounded-md bg-surface px-1.5 py-0.5 font-mono text-[11px] text-muted">{e.aura}</div>}
              </motion.div>
            ) : (
              e.k === 'msg' && (
                <motion.div key={i} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={clsx('flex items-end gap-2', e.mine && 'flex-row-reverse')}>
                  {!e.mine && <span className={clsx('grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white', AVATAR[e.who])}>{e.who[0]}</span>}
                  <div className={clsx('relative max-w-[75%] rounded-2xl px-3 py-1.5 text-[14px] leading-snug', e.mine ? 'rounded-br-md bg-[#ececf1] text-[#111]' : 'rounded-bl-md bg-surface')}>
                    {!e.mine && <div className="text-[11px] font-semibold text-muted">{e.who}</div>}
                    {e.text}
                    {e.react && <span className="absolute -bottom-2.5 -right-2 rounded-full border border-line bg-raised px-1 text-xs">{e.react}</span>}
                  </div>
                </motion.div>
              )
            ),
          )}
        </AnimatePresence>
        <div className="h-5 text-xs text-faint">{typing && `${typing} is typing…`}</div>
      </div>
      <div className="border-t border-line p-3">
        <div className="flex h-10 items-center rounded-xl bg-surface px-3 text-sm text-faint">say something…</div>
      </div>
    </div>
  );
}
