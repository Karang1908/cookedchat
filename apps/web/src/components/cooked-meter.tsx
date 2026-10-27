'use client';

import clsx from 'clsx';
import { fryStage } from '@cooked/shared';

const STAGE_NAMES = ['chilling', 'warming up', 'getting fried', 'DEEP FRIED', "IT'S OVER"];

export function CookedMeter({ value, compact = false }: { value: number; compact?: boolean }) {
  const stage = fryStage(value);
  const hot = value >= 90;
  return (
    <div className={clsx('w-full', hot && 'animate-pulse')} role="meter" aria-label="Cooked-o-meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      {!compact && (
        <div className="mb-1 flex items-baseline justify-between font-mono text-[11px] uppercase tracking-widest text-mute">
          <span>cooked-o-meter</span>
          <span className={clsx(stage >= 3 ? 'text-ember' : stage >= 2 ? 'text-sun' : 'text-mint')}>
            {value}% · {STAGE_NAMES[stage]}
          </span>
        </div>
      )}
      <div className={clsx('relative overflow-hidden rounded-full bg-ink-700', compact ? 'h-1.5' : 'h-3')}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-mint via-sun to-ember transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(2, value)}%`, boxShadow: value > 50 ? '0 0 18px rgb(255 90 77 / 0.55)' : undefined }}
        />
      </div>
    </div>
  );
}
