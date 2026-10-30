'use client';

import { useState } from 'react';
import type { AuraEntry, Member, SoundName } from '@cooked/shared';
import { Segmented } from '../ui';
import { AuraPanel } from './aura-panel';
import { GamesPanel } from './games-panel';
import { Soundboard } from './soundboard';

export type SideTab = 'aura' | 'games' | 'sounds';

/** Desktop right panel: one thing at a time instead of a wall of widgets. */
export function SidePanel({ members, ledger, meId, onProfile, onSound }: { members: Member[]; ledger: AuraEntry[]; meId?: string; onProfile: (id: string) => void; onSound: (n: SoundName) => void }) {
  const [tab, setTab] = useState<SideTab>('aura');
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b-[2.5px] border-line p-3">
        <Segmented label="Panel" value={tab} onChange={setTab} options={[{ value: 'aura', label: 'Aura' }, { value: 'games', label: 'Games' }, { value: 'sounds', label: 'Sounds' }]} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 scroll-thin">
        {tab === 'aura' && <AuraPanel members={members} ledger={ledger} meId={meId} onProfile={onProfile} />}
        {tab === 'games' && <GamesPanel />}
        {tab === 'sounds' && (
          <Soundboard onPlay={onSound} />
        )}
      </div>
    </div>
  );
}
