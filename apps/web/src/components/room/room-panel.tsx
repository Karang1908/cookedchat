'use client';

import clsx from 'clsx';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { BRAINROT, PERSONAS } from '@cooked/shared';
import type { Member, RoomSettings } from '@cooked/shared';
import { Avatar } from '../avatar';
import { QrCard } from '../qr-dialog';

interface Props {
  code: string;
  members: Member[];
  meId?: string;
  settings: RoomSettings;
  muted: boolean;
  voice: boolean;
  onToggleMute: () => void;
  onToggleVoice: () => void;
}

export function RoomPanel({ code, members, meId, settings, muted, voice, onToggleMute, onToggleVoice }: Props) {
  const persona = PERSONAS[settings.persona];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto scroll-thin">
      <section className="flex flex-col items-center gap-3">
        <h3 className="self-start font-display text-lg uppercase tracking-wide text-mute">Invite</h3>
        <QrCard code={code} />
      </section>

      <section>
        <h3 className="mb-2 font-display text-lg uppercase tracking-wide text-mute">Vibe</h3>
        <dl className="space-y-1.5 text-sm">
          <Row k="commentator" v={`${persona.emoji} ${persona.label}`} />
          <Row k="brainrot" v={BRAINROT[settings.brainrot].name} />
          <Row k="roast intensity" v={['', 'light', 'medium', 'emotional damage'][settings.intensity]!} />
          <Row k="commentary" v={settings.commentary ? 'on' : 'muted'} />
        </dl>
        <div className="mt-3 flex gap-2">
          <Toggle on={!muted} onClick={onToggleMute} label={muted ? 'sound off' : 'sound on'} icon={muted ? <VolumeX size={16} /> : <Volume2 size={16} />} />
          <Toggle on={voice} onClick={onToggleVoice} label="robot voice" icon={voice ? <Mic size={16} /> : <MicOff size={16} />} />
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-display text-lg uppercase tracking-wide text-mute">In the chat · {members.filter((m) => m.online).length}</h3>
        <ul className="space-y-1.5">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl bg-ink-800/60 px-3 py-2">
              <span className="relative">
                <Avatar type={m.avatar} size={30} paused={!m.online} state={m.online ? 'default' : 'sleeping'} />
                <span className={clsx('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-ink-900', m.online ? 'bg-mint' : 'bg-mute/50')} />
              </span>
              <span className="truncate text-sm font-medium">{m.name}{m.id === meId && <span className="text-mute"> (you)</span>}</span>
              {m.isBot && <span className="ml-auto rounded bg-ink-600 px-1 py-px font-mono text-[9px] uppercase text-mute">bot</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-mute">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

function Toggle({ on, onClick, label, icon }: { on: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={clsx('flex flex-1 items-center justify-center gap-2 rounded-xl border px-2 py-2 text-xs font-semibold transition', on ? 'border-blurple/60 bg-blurple/15 text-white' : 'border-white/10 bg-ink-800 text-mute')}>
      {icon}
      {label}
    </button>
  );
}
