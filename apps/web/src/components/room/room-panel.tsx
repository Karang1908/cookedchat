'use client';

import clsx from 'clsx';
import { Mic, MicOff, QrCode, Volume2, VolumeX } from 'lucide-react';
import { BRAINROT, CREATURES, PERSONAS } from '@cooked/shared';
import type { BrainrotLevel, Member, PersonaId, RoastIntensity, RoomSettings } from '@cooked/shared';
import { Avatar } from '../avatar';
import { CopyLink, useRoomUrl } from '../qr-dialog';
import { Button, Chip, Section, Segmented, fieldCls } from '../ui';

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
  onInvite: () => void;
}

/** Room info, the vibe controls and who is here. The desktop left sidebar, and the "Room" tab on phones. */
export function RoomPanel({ code, members, meId, settings, muted, voice, onToggleMute, onToggleVoice, onVibe, onProfile, onInvite }: Props) {
  const url = useRoomUrl(code);
  const online = members.filter((m) => m.online).length;
  const sorted = [...members].sort((a, b) => Number(b.online) - Number(a.online) || Number(a.isBot) - Number(b.isBot));
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 scroll-thin">
      <Section title="Room">
        <div className="rounded-xl bg-surface p-3 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xl font-bold tracking-[0.2em]">{code}</span>
            <Button size="sm" variant="ghost" onClick={onInvite} aria-label="Show invite QR code"><QrCode size={15} /> QR</Button>
          </div>
          <div className="mt-3"><CopyLink url={url} /></div>
        </div>
      </Section>

      <Section title="Vibe">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-faint">Commentator</span>
            <select value={settings.persona} onChange={(e) => onVibe({ persona: e.target.value as PersonaId })} className={clsx(fieldCls, 'h-9 w-full cursor-pointer')}>
              {Object.values(PERSONAS).map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}
            </select>
          </label>
          <div>
            <span className="mb-1 block text-xs text-faint">Brainrot · {BRAINROT[settings.brainrot].name}</span>
            <Segmented size="sm" label="Brainrot level" value={settings.brainrot} onChange={(v) => onVibe({ brainrot: v })} options={([0, 1, 2, 3] as BrainrotLevel[]).map((v) => ({ value: v, label: v }))} />
          </div>
          <div>
            <span className="mb-1 block text-xs text-faint">Roast intensity</span>
            <Segmented size="sm" label="Roast intensity" value={settings.intensity} onChange={(v) => onVibe({ intensity: v })} options={[{ value: 1 as RoastIntensity, label: 'mild' }, { value: 2 as RoastIntensity, label: 'medium' }, { value: 3 as RoastIntensity, label: 'damage' }]} />
          </div>
          {(settings.duel || settings.rival) && (
            <p className="text-xs text-muted">
              {settings.duel ? <><Chip tone="groq">Groq</Chip> vs <Chip tone="ollama">Ollama</Chip> duel is on</> : <>Rival: {PERSONAS[settings.rival!].emoji} {PERSONAS[settings.rival!].label} argues back</>}
            </p>
          )}
          {!settings.commentary && <p className="text-xs text-warn">The admin has muted the AI.</p>}
        </div>
      </Section>

      <Section title={`People · ${online} online`}>
        <ul className="-mx-1.5 space-y-0.5">
          {sorted.map((m) => (
            <li key={m.id}>
              <button onClick={() => onProfile(m.id)} className="flex w-full items-center gap-3 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-surface" aria-label={`${m.name} profile`}>
                <span className="relative">
                  <Avatar type={m.avatar} size={30} paused={!m.online} state={m.online ? 'default' : 'sleeping'} />
                  <span className={clsx('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-panel', m.online ? 'bg-good' : 'bg-faint')} />
                </span>
                <span className={clsx('min-w-0 flex-1 truncate text-sm', m.online ? 'text-fg' : 'text-faint')}>
                  {m.name}{m.id === meId && <span className="text-faint"> (you)</span>}
                </span>
                {m.elsewhere && <Chip tone="warn">elsewhere</Chip>}
                {m.isBot && <Chip>bot</Chip>}
                <span className="text-sm" title={CREATURES[m.stats.creature].name} aria-hidden>{CREATURES[m.stats.creature].emoji}</span>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <div className="mt-auto grid grid-cols-2 gap-2">
        <Button size="sm" onClick={onToggleMute} aria-pressed={!muted}>{muted ? <VolumeX size={15} /> : <Volume2 size={15} />} {muted ? 'Sound off' : 'Sound on'}</Button>
        <Button size="sm" onClick={onToggleVoice} aria-pressed={voice} title="Read the AI's lines aloud">{voice ? <Mic size={15} /> : <MicOff size={15} />} Voice</Button>
      </div>
    </div>
  );
}
