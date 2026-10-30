'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BREAKING } from '@cooked/shared';
import type { ChatMessage } from '@cooked/shared';

/**
 * "BREAKING NEWS" strip for the big moments (mog, meltdown, 67, evolution, verdicts...).
 * Only messages that arrive after the room view was ready count, so joining a busy room never replays old headlines.
 */
export function BreakingBanner({ messages, ready }: { messages: ChatMessage[]; ready: boolean }) {
  const baseline = useRef<number | null>(null);
  const lastShown = useRef<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [headline, setHeadline] = useState<string | null>(null);
  if (ready && baseline.current === null) baseline.current = messages.length;

  // The hide timer lives in a ref, not in this effect's cleanup: the messages array changes constantly (GIFs attaching,
  // reactions), and a cleanup would cancel the timer while the early return below prevented re-arming it.
  useEffect(() => {
    if (baseline.current === null || messages.length <= baseline.current) return;
    const m = messages.at(-1);
    if (!m || m.kind !== 'ai' || !m.trigger || !BREAKING.has(m.trigger) || lastShown.current === m.id) return;
    lastShown.current = m.id;
    setHeadline(m.text);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHeadline(null), 6000);
  }, [messages]);
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  return (
    <AnimatePresence>
      {headline && (
        <motion.div key={lastShown.current} role="status" initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="pointer-events-none fixed inset-x-0 top-0 z-[75] flex items-stretch overflow-hidden bg-bad pt-[env(safe-area-inset-top)] shadow-2xl">
          <span className="flex shrink-0 items-center gap-1.5 bg-black px-3 font-display text-lg uppercase tracking-wider text-white sm:text-xl">🚨 Breaking</span>
          <span className="min-w-0 flex-1 truncate px-3 py-2.5 text-sm font-bold text-white sm:text-base">{headline}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
