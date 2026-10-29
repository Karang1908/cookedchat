'use client';

import clsx from 'clsx';
import { fryStage } from '@cooked/shared';

const STAGE = ['chill', 'warming up', 'getting fried', 'deep fried', "it's over"];

/** compact: a pill for headers. The bar's colour only heats up when it means something. */
export function CookedMeter({ value, compact = false }: { value: number; compact?: boolean }) {
  const stage = fryStage(value);
  const bar = stage >= 3 ? 'bg-bad' : stage >= 2 ? 'bg-warn' : 'bg-accent';
  return (
    <div className={clsx('flex items-center gap-2.5', !compact && 'w-full')} role="meter" aria-label="Cooked-o-meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className={clsx('relative h-1.5 overflow-hidden rounded-full bg-surface ring-1 ring-line', compact ? 'w-20 sm:w-28' : 'flex-1')}>
        <div className={clsx('h-full rounded-full transition-[width,background-color] duration-500 ease-out', bar, value >= 90 && 'animate-pulse')} style={{ width: `${Math.max(3, value)}%` }} />
      </div>
      <span className={clsx('shrink-0 whitespace-nowrap font-mono text-[11px] tabular-nums', stage >= 3 ? 'text-bad' : 'text-muted')}>
        {value}%<span className="hidden sm:inline"> · {STAGE[stage]}</span>
      </span>
    </div>
  );
}
