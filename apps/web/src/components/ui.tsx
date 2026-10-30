'use client';

import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'brut-sm press bg-accent text-accent-ink hover:bg-accent-hover',
  secondary: 'brut-sm press bg-surface text-fg hover:bg-raised',
  ghost: 'text-muted hover:bg-raised hover:text-fg',
  danger: 'brut-sm press bg-bad text-white',
};
const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-5 text-base rounded-xl gap-2',
};

export function Button({ variant = 'secondary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...p}
      className={clsx(
        'inline-flex select-none items-center justify-center font-bold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
    />
  );
}

/** a titled block inside a panel: the title is a highlighter-marked label */
export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-extrabold tracking-tight text-fg [background:linear-gradient(transparent_58%,var(--color-acid)_58%)]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange, label, size = 'md' }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-0.5 rounded-xl border-2 border-line bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'flex-1 rounded-[9px] font-bold transition-colors',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-[13px]',
            o.value === value ? 'bg-acid text-fg shadow-[inset_0_0_0_2px_var(--color-line)]' : 'text-muted hover:bg-raised hover:text-fg',
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
        <span className="block text-sm font-semibold text-fg">{label}</span>
        {hint && <span className="block text-xs text-faint">{hint}</span>}
      </span>
      <span className={clsx('relative h-6 w-11 shrink-0 rounded-full border-2 border-line transition-colors', checked ? 'bg-acid' : 'bg-surface')}>
        <span className={clsx('absolute top-0.5 size-4 rounded-full border-2 border-line transition-transform', checked ? 'translate-x-[20px] bg-fg' : 'translate-x-0.5 bg-surface')} />
      </span>
    </button>
  );
}

export function Chip({ tone = 'neutral', children, className }: { tone?: 'neutral' | 'accent' | 'good' | 'bad' | 'warn' | 'groq' | 'ollama'; children: ReactNode; className?: string }) {
  const t = {
    neutral: 'bg-surface text-fg',
    accent: 'bg-accent text-accent-ink',
    good: 'bg-mint text-fg',
    bad: 'bg-bad text-white',
    warn: 'bg-lemon text-fg',
    groq: 'bg-groq text-fg',
    ollama: 'bg-ollama text-white',
  }[tone];
  return <span className={clsx('inline-flex items-center gap-1 rounded-md border-[1.5px] border-line px-1.5 py-px text-[11px] font-bold', t, className)}>{children}</span>;
}

/** no width/height here: two size utilities on one element resolve by stylesheet order, not by position in the class list */
export const fieldCls = 'rounded-xl border-2 border-line bg-surface px-3 text-sm font-medium text-fg placeholder:text-faint outline-none transition-shadow focus:shadow-[3px_3px_0_var(--color-line)] focus-visible:outline-none';

/** bubble colours for people, stable per member id */
const TONES = ['bg-pink', 'bg-sky', 'bg-grape', 'bg-mint', 'bg-peach', 'bg-lemon'] as const;
export function toneFor(id: string | null | undefined): (typeof TONES)[number] {
  let h = 0;
  for (const c of id ?? '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length]!;
}

/** brand mark: a tilted sticker */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex -rotate-2 items-center gap-1 rounded-lg border-2 border-line bg-accent px-2 py-0.5 font-display text-[19px] uppercase leading-none tracking-wide text-fg shadow-[3px_3px_0_var(--color-line)]', className)}>
      cooked<span className="text-[15px]" aria-hidden>💀</span>
    </span>
  );
}
