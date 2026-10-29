'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { fxBus } from '@/lib/fx-bus';
import { runDomFx } from '@/lib/fx';
import { playSound } from '@/lib/sounds';
import { Goblin3D } from './goblin3d';

type Overlay = 'meltdown' | 'jumpscare' | null;

/** Lives OUTSIDE #stage: a CSS filter on an ancestor would turn these fixed overlays into stage-relative boxes. */
export function FxLayer() {
  const [overlay, setOverlay] = useState<Overlay>(null);

  useEffect(() => {
    let timer: number | undefined;
    const off = fxBus.subscribe(({ kind, emoji }) => {
      if (kind === 'meltdown' || kind === 'jumpscare') {
        setOverlay(kind);
        if (kind === 'jumpscare') playSound('scream');
        window.clearTimeout(timer);
        timer = window.setTimeout(() => setOverlay(null), kind === 'meltdown' ? 6500 : 1200);
        if (kind === 'meltdown') runDomFx('shake');
        return;
      }
      runDomFx(kind, emoji);
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {overlay === 'meltdown' && (
        <motion.div key="melt" role="alert" onClick={() => setOverlay(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex cursor-pointer flex-col items-center justify-center bg-black/85 px-6 text-center backdrop-blur-sm">
          <Goblin3D heat={1} className="h-[42vh] w-full max-w-md" />
          <h2 className="meltdown-text font-display text-6xl uppercase leading-none tracking-wide text-white sm:text-8xl">IT&apos;S OVER 🥀</h2>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.3em] text-white/60">the chat is 100% cooked · tap to dismiss</p>
        </motion.div>
      )}
      {overlay === 'jumpscare' && (
        <motion.div key="scare" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1.15 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="pointer-events-none fixed inset-0 z-[90] grid place-items-center bg-black text-[min(70vw,70vh)] leading-none">
          💀
        </motion.div>
      )}
    </AnimatePresence>
  );
}
