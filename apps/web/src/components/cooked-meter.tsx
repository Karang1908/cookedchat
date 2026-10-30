'use client';

import clsx from 'clsx';
import { fryStage } from '@cooked/shared';

const STAGE = ['chill', 'warming up', 'getting fried', 'deep fried', "it's over"];

/** compact: for headers. A chunky striped bar that heats from orange to yellow to red. */
export function CookedMeter({ value, compact = false }: { value: number; compact?: boolean }) {
  const stage = fryStage(value);
  const bar = stage >= 3 ? 'bg-bad' : stage >= 2 ? 'bg-warn' : 'bg-accent';
  return (
    <div className={clsx('flex items-center gap-2', !compact && 'w-full')} role="meter" aria-label="Cooked-o-meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <span className="hidden text-base sm:inline" aria-hidden>{stage >= 3 ? '🔥' : stage >= 2 ? '🥵' : '🍳'}</span>
      <div className={clsx('relative h-4 overflow-hidden rounded-full border-2 border-line bg-surface', compact ? 'w-20 sm:w-32' : 'flex-1')}>
        <div className={clsx('stripes h-full border-r-2 border-line transition-[width,background-color] duration-500 ease-out', bar, value >= 90 && 'animate-pulse')} style={{ width: `${Math.max(4, value)}%` }} />
      </div>
      <span className={clsx('shrink-0 whitespace-nowrap font-mono text-[11px] font-bold tabular-nums', stage >= 3 && 'text-bad')}>
        {value}%<span className="hidden uppercase sm:inline"> · {STAGE[stage]}</span>
      </span>
    </div>
  );
}
