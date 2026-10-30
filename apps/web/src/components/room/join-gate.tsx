'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { ShieldCheck } from 'lucide-react';
import type { AvatarType } from '@cooked/shared';
import { newMemberId } from '@/lib/identity';
import type { Identity } from '@/lib/identity';
import { unlockAudio } from '@/lib/sounds';
import { Avatar } from '../avatar';
import { Button, Wordmark, fieldCls } from '../ui';

/** 12 of the 18 creatures keeps the picker light on phones; the default must be in the list */
const PICKABLE: AvatarType[] = ['cat', 'ghost', 'droid', 'alien', 'star', 'blob', 'clover', 'flower', 'triangle', 'drop', 'circle', 'mech'];

export function JoinGate({ code, saved, onEnter }: { code: string; saved: Identity | null; onEnter: (i: Identity) => void }) {
  const [name, setName] = useState(saved?.name ?? '');
  const [avatar, setAvatar] = useState<AvatarType>(saved?.avatar ?? 'cat');
  const valid = name.trim().length > 0;
  const enter = () => {
    if (!valid) return;
    unlockAudio(); // phones only allow sound after a tap, so this tap is the unlock
    onEnter({ memberId: newMemberId(), name: name.trim(), avatar });
  };

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-10">
      <span className="wiggle pointer-events-none absolute left-[8%] top-[12%] text-6xl drop-shadow-[3px_3px_0_var(--color-line)] [--r:-14deg]" aria-hidden>💀</span>
      <span className="wiggle pointer-events-none absolute bottom-[10%] right-[8%] text-6xl drop-shadow-[3px_3px_0_var(--color-line)] [--r:12deg]" aria-hidden>🗿</span>
      <Wordmark className="mb-8 text-[24px]" />
      <form onSubmit={(e) => { e.preventDefault(); enter(); }} className="brut-lg relative w-full max-w-sm rounded-3xl bg-surface p-6">
        <p className="text-sm font-bold text-muted">You&apos;re joining</p>
        <h1 className="mt-1 inline-block -rotate-2 rounded-xl border-[2.5px] border-line bg-acid px-3 py-1 font-display text-5xl uppercase leading-none tracking-[0.12em] shadow-[4px_4px_0_var(--color-line)]">{code}</h1>

        <label className="mt-6 block text-[13px] font-extrabold" htmlFor="name">your name</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoComplete="nickname" placeholder="aman" className={clsx(fieldCls, 'mt-1.5 h-11 w-full text-base')} />

        <div className="mt-5 text-[13px] font-extrabold">pick your creature</div>
        <div className="mt-2 grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Avatar">
          {PICKABLE.map((a) => (
            <button type="button" key={a} role="radio" aria-checked={a === avatar} aria-label={a} onClick={() => setAvatar(a)} className={clsx('grid aspect-square place-items-center rounded-xl border-2 border-line transition', a === avatar ? 'scale-105 bg-acid shadow-[3px_3px_0_var(--color-line)]' : 'bg-panel hover:bg-raised')}>
              <Avatar type={a} size={36} paused={a !== avatar} state={a === avatar ? 'working' : 'default'} />
            </button>
          ))}
        </div>

        <p className="mt-5 flex gap-2 rounded-xl border-2 border-dashed border-line bg-lemon p-3 text-xs font-medium leading-relaxed" role="note">
          <ShieldCheck size={15} className="mt-px shrink-0" />
          An AI lives in this chat and roasts behavior (reply speed, dry texts, typing drama), never identity. Entering means you&apos;re in on the joke.
        </p>

        <Button type="submit" variant="primary" size="lg" className="mt-5 h-14 w-full text-lg" disabled={!valid}>
          {saved && name === saved.name ? `Continue as ${saved.name}` : 'Tap to enter'}
        </Button>
      </form>
    </main>
  );
}
