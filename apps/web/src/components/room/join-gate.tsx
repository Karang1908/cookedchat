'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { BorderBeam } from 'border-beam';
import { BRAINROT } from '@cooked/shared';
import type { AvatarType } from '@cooked/shared';
import { newMemberId } from '@/lib/identity';
import type { Identity } from '@/lib/identity';
import { unlockAudio } from '@/lib/sounds';
import { Avatar } from '../avatar';
import { Goblin3D } from '../goblin3d';

/** 12 of the 18 creatures keeps the picker light on phones; the default must be in the list */
const PICKABLE: AvatarType[] = ['cat', 'ghost', 'droid', 'alien', 'star', 'blob', 'clover', 'flower', 'triangle', 'drop', 'circle', 'mech'];

export function JoinGate({ code, saved, onEnter }: { code: string; saved: Identity | null; onEnter: (i: Identity) => void }) {
  const [name, setName] = useState(saved?.name ?? '');
  const [avatar, setAvatar] = useState<AvatarType>(saved?.avatar ?? 'cat');
  const valid = name.trim().length > 0;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-8">
      <Goblin3D heat={0.1} className="mx-auto -mb-2 h-44 w-full" />
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-mute">room</p>
        <h1 className="font-display text-7xl uppercase leading-none tracking-wider text-white">{code}</h1>
      </div>

      <div className="glass mt-6 rounded-2xl p-4 text-sm text-mute" role="note">
        <span className="font-semibold text-sun">Heads up:</span> an AI lives in this chat and roasts <em>behavior</em> (reply speed, dry texts, typing drama). Never identity. By entering you&apos;re in on the joke.
      </div>

      <label className="mt-5 block text-xs font-semibold uppercase tracking-widest text-mute" htmlFor="name">
        your name
      </label>
      <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoComplete="nickname" placeholder="aman" className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-lg outline-none transition focus:border-blurple" />

      <div className="mt-5 text-xs font-semibold uppercase tracking-widest text-mute">pick your creature</div>
      <div className="mt-2 grid grid-cols-6 gap-2" role="radiogroup" aria-label="Avatar">
        {PICKABLE.map((a) => (
          <button key={a} role="radio" aria-checked={a === avatar} aria-label={a} onClick={() => setAvatar(a)} className={clsx('grid aspect-square place-items-center rounded-xl border transition', a === avatar ? 'border-blurple bg-blurple/20' : 'border-white/5 bg-ink-800 hover:border-white/20')}>
            <Avatar type={a} size={40} paused={a !== avatar} state={a === avatar ? 'working' : 'default'} />
          </button>
        ))}
      </div>

      <div className="mt-7">
        <BorderBeam size="md" colorVariant="colorful" active={valid} strength={0.9}>
          <button
            disabled={!valid}
            onClick={() => {
              unlockAudio(); // phones only allow sound after a tap, so this tap is the unlock
              onEnter({ memberId: newMemberId(), name: name.trim(), avatar });
            }}
            className="w-full rounded-2xl bg-ink-800 px-6 py-4 font-display text-3xl uppercase tracking-wider text-white transition enabled:hover:bg-ink-700 enabled:active:scale-[0.98] disabled:opacity-50"
            style={{ borderRadius: 16 }}
          >
            {saved && name === saved.name ? `Welcome back, ${saved.name}` : 'Tap to enter'} 💀
          </button>
        </BorderBeam>
      </div>
      <p className="mt-3 text-center text-xs text-mute">brainrot level: {BRAINROT[2].name} · the room admin can change it</p>
    </main>
  );
}
