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
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <Wordmark className="mb-8" />
      <form onSubmit={(e) => { e.preventDefault(); enter(); }} className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6">
        <p className="text-sm text-muted">You&apos;re joining</p>
        <h1 className="font-mono text-3xl font-bold tracking-[0.25em]">{code}</h1>

        <label className="mt-6 block text-[13px] font-semibold text-muted" htmlFor="name">your name</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoComplete="nickname" placeholder="aman" className={clsx(fieldCls, 'mt-1.5 h-11 w-full text-base')} />

        <div className="mt-5 text-[13px] font-semibold text-muted">pick your creature</div>
        <div className="mt-2 grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Avatar">
          {PICKABLE.map((a) => (
            <button type="button" key={a} role="radio" aria-checked={a === avatar} aria-label={a} onClick={() => setAvatar(a)} className={clsx('grid aspect-square place-items-center rounded-xl transition-colors', a === avatar ? 'bg-accent/15 ring-2 ring-accent' : 'bg-surface ring-1 ring-line hover:ring-line-strong')}>
              <Avatar type={a} size={36} paused={a !== avatar} state={a === avatar ? 'working' : 'default'} />
            </button>
          ))}
        </div>

        <p className="mt-5 flex gap-2 rounded-xl bg-surface p-3 text-xs leading-relaxed text-muted ring-1 ring-line" role="note">
          <ShieldCheck size={15} className="mt-px shrink-0 text-accent" />
          An AI lives in this chat and roasts behavior (reply speed, dry texts, typing drama), never identity. Entering means you&apos;re in on the joke.
        </p>

        <Button type="submit" variant="primary" size="lg" className="mt-5 w-full" disabled={!valid}>
          {saved && name === saved.name ? `Continue as ${saved.name}` : 'Tap to enter'}
        </Button>
      </form>
    </main>
  );
}
