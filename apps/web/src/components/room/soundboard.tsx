'use client';

import { SOUND_NAMES } from '@cooked/shared';
import type { SoundName } from '@cooked/shared';

const LABEL: Record<SoundName, string> = {
  vineBoom: '💥 vine boom', fahhh: '😩 fahhh', bruh: '😐 bruh', airhorn: '📣 airhorn', pipe: '🔩 pipe', sadViolin: '🎻 sad violin',
  scream: '😱 scream', tungTung: '🪵 tung tung', winError: '🪟 error', dunDunDun: '🎬 dun dun dun', crickets: '🦗 crickets',
};

export function Soundboard({ onPlay }: { onPlay: (n: SoundName) => void }) {
  return (
    <section>
      <h3 className="mb-2 font-display text-lg uppercase tracking-wide text-mute">Soundboard</h3>
      <div className="grid grid-cols-2 gap-1.5">
        {SOUND_NAMES.map((n) => (
          <button key={n} onClick={() => onPlay(n)} className="rounded-xl border border-white/5 bg-ink-800/80 px-2 py-2.5 text-left text-xs font-semibold transition hover:border-blurple/60 hover:bg-ink-700 active:scale-95">
            {LABEL[n]}
          </button>
        ))}
      </div>
    </section>
  );
}
