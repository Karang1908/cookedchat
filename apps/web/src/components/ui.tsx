'use client';

import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-hover',
  secondary: 'bg-raised text-fg border border-line hover:border-line-strong hover:bg-[#24242b]',
  ghost: 'text-muted hover:text-fg hover:bg-surface',
  danger: 'bg-bad/10 text-bad border border-bad/30 hover:bg-bad/15',
};
const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-5 text-[15px] rounded-xl gap-2',
};

export function Button({ variant = 'secondary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...p}
      className={clsx(
        'inline-flex select-none items-center justify-center font-semibold transition-colors duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-40',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
    />
  );
}

/** a titled block inside a panel */
export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-muted">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange, label, size = 'md' }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-surface p-0.5 ring-1 ring-line">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'flex-1 rounded-[10px] font-semibold transition-colors',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-[13px]',
            o.value === value ? 'bg-raised text-fg shadow-sm ring-1 ring-line-strong' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-left">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{label}</span>
        {hint && <span className="block text-xs text-faint">{hint}</span>}
      </span>
      <span className={clsx('relative h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-line-strong')}>
        <span className={clsx('absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
      </span>
    </button>
  );
}

export function Chip({ tone = 'neutral', children, className }: { tone?: 'neutral' | 'accent' | 'good' | 'bad' | 'warn' | 'groq' | 'ollama'; children: ReactNode; className?: string }) {
  const t = {
    neutral: 'bg-surface text-muted ring-line',
    accent: 'bg-accent/12 text-accent ring-accent/25',
    good: 'bg-good/10 text-good ring-good/25',
    bad: 'bg-bad/10 text-bad ring-bad/25',
    warn: 'bg-warn/10 text-warn ring-warn/25',
    groq: 'bg-groq/12 text-groq ring-groq/30',
    ollama: 'bg-ollama/12 text-ollama ring-ollama/30',
  }[tone];
  return <span className={clsx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1', t, className)}>{children}</span>;
}

/** no width/height here: two size utilities on one element resolve by stylesheet order, not by position in the class list */
export const fieldCls = 'rounded-xl border border-line bg-surface px-3 text-sm text-fg placeholder:text-faint outline-none transition-colors focus:border-accent/70 focus-visible:outline-none';

/** brand mark: lowercase wordmark + the ember dot */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-[17px] font-bold tracking-tight text-fg', className)}>
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-40 motion-reduce:hidden" />
        <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
      </span>
      cooked
    </span>
  );
}
