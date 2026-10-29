'use client';

import { SOUND_NAMES } from '@cooked/shared';
import type { SoundName } from '@cooked/shared';
import { Section } from '../ui';

const LABEL: Record<SoundName, [string, string]> = {
  vineBoom: ['💥', 'vine boom'], fahhh: ['😩', 'fahhh'], bruh: ['😐', 'bruh'], airhorn: ['📣', 'airhorn'], pipe: ['🔩', 'pipe'], sadViolin: ['🎻', 'sad violin'],
  scream: ['😱', 'scream'], tungTung: ['🪵', 'tung tung'], winError: ['🪟', 'error'], dunDunDun: ['🎬', 'dun dun dun'], crickets: ['🦗', 'crickets'],
};

export function Soundboard({ onPlay }: { onPlay: (n: SoundName) => void }) {
  return (
    <Section title="Soundboard">
      <div className="grid grid-cols-3 gap-1.5">
        {SOUND_NAMES.map((n) => (
          <button key={n} onClick={() => onPlay(n)} className="flex flex-col items-center gap-1 rounded-xl bg-surface px-1 py-2.5 text-[11px] font-medium text-muted ring-1 ring-line transition-colors hover:text-fg hover:ring-line-strong active:scale-95">
            <span className="text-lg leading-none" aria-hidden>{LABEL[n][0]}</span>
            {LABEL[n][1]}
          </button>
        ))}
      </div>
    </Section>
  );
}
