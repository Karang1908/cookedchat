'use client';

import clsx from 'clsx';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { BRAINROT, CREATURES, PERSONAS } from '@cooked/shared';
import type { BrainrotLevel, Member, PersonaId, RoastIntensity, RoomSettings } from '@cooked/shared';
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
  onVibe: (p: { persona?: PersonaId; brainrot?: BrainrotLevel; intensity?: RoastIntensity }) => void;
  onProfile: (id: string) => void;
}

export function RoomPanel({ code, members, meId, settings, muted, voice, onToggleMute, onToggleVoice, onVibe, onProfile }: Props) {
  const persona = PERSONAS[settings.persona];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto scroll-thin">
      <section className="flex flex-col items-center gap-3">
        <h3 className="self-start font-display text-lg uppercase tracking-wide text-mute">Invite</h3>
        <QrCard code={code} />
      </section>

      <section>
        <h3 className="mb-2 font-display text-lg uppercase tracking-wide text-mute">Vibe</h3>
        <label className="block text-[11px] font-semibold uppercase tracking-widest text-mute">
          commentator
          <select value={settings.persona} onChange={(e) => onVibe({ persona: e.target.value as PersonaId })} className="mt-1 w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm normal-case tracking-normal text-text">
            {Object.values(PERSONAS).map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}
          </select>
        </label>
        <div className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-mute">brainrot: <span className="text-text">{BRAINROT[settings.brainrot].name}</span></div>
        <div className="mt-1 grid grid-cols-4 gap-1" role="group" aria-label="Brainrot level">
          {([0, 1, 2, 3] as BrainrotLevel[]).map((l) => (
            <button key={l} onClick={() => onVibe({ brainrot: l })} aria-pressed={settings.brainrot === l} className={clsx('rounded-lg border py-1.5 text-xs font-bold transition', settings.brainrot === l ? 'border-blurple bg-blurple/30' : 'border-white/10 bg-ink-800 text-mute hover:text-white')}>{l}</button>
          ))}
        </div>
        <div className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-mute">roast: <span className="text-text">{['', 'mild', 'medium', 'emotional damage'][settings.intensity]}</span></div>
        <div className="mt-1 grid grid-cols-3 gap-1" role="group" aria-label="Roast intensity">
          {([1, 2, 3] as RoastIntensity[]).map((l) => (
            <button key={l} onClick={() => onVibe({ intensity: l })} aria-pressed={settings.intensity === l} className={clsx('rounded-lg border py-1.5 text-xs font-bold transition', settings.intensity === l ? 'border-magenta bg-magenta/25' : 'border-white/10 bg-ink-800 text-mute hover:text-white')}>{l}</button>
          ))}
        </div>
        {settings.rival && <p className="mt-2 text-xs text-mute">rival: {PERSONAS[settings.rival].emoji} {PERSONAS[settings.rival].label} argues back</p>}
        <p className="mt-2 text-xs text-mute">commentary: {settings.commentary ? 'on' : 'muted by admin'}</p>
        <div className="mt-3 flex gap-2">
          <Toggle on={!muted} onClick={onToggleMute} label={muted ? 'sound off' : 'sound on'} icon={muted ? <VolumeX size={16} /> : <Volume2 size={16} />} />
          <Toggle on={voice} onClick={onToggleVoice} label="robot voice" icon={voice ? <Mic size={16} /> : <MicOff size={16} />} />
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-display text-lg uppercase tracking-wide text-mute">In the chat · {members.filter((m) => m.online).length}</h3>
        <ul className="space-y-1.5">
          {members.map((m) => (
            <li key={m.id}>
              <button onClick={() => onProfile(m.id)} className="flex w-full items-center gap-3 rounded-xl bg-ink-800/60 px-3 py-2 text-left transition hover:bg-ink-700" aria-label={`${m.name} profile`}>
              <span className="relative">
                <Avatar type={m.avatar} size={30} paused={!m.online} state={m.online ? 'default' : 'sleeping'} />
                <span className={clsx('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-ink-900', m.online ? 'bg-mint' : 'bg-mute/50')} />
              </span>
              <span className="truncate text-sm font-medium">{m.name}{m.id === meId && <span className="text-mute"> (you)</span>}</span>
              <span className="ml-auto flex items-center gap-1.5 text-xs">
                {m.elsewhere && <span className="rounded bg-sun/15 px-1 py-px font-mono text-[9px] uppercase text-sun" title="online elsewhere">elsewhere</span>}
                {m.isBot && <span className="rounded bg-ink-600 px-1 py-px font-mono text-[9px] uppercase text-mute">bot</span>}
                <span title={CREATURES[m.stats.creature].name}>{CREATURES[m.stats.creature].emoji}</span>
              </span>
              </button>
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
