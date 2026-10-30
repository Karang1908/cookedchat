'use client';

import { useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import clsx from 'clsx';
import { AURA_RULES, CREATURES, TIERS } from '@cooked/shared';
import type { AuraEntry, Member } from '@cooked/shared';
import { fmtAura } from '@/lib/format';
import { Avatar } from '../avatar';
import { Chip, Section, Segmented, toneFor } from '../ui';

export function AuraPanel({ members, ledger, meId, onProfile }: { members: Member[]; ledger: AuraEntry[]; meId?: string; onProfile?: (id: string) => void }) {
  const [board, setBoard] = useState<'aura' | 'rizz'>('aura');
  const ranked = [...members].sort((a, b) => (board === 'aura' ? b.aura - a.aura : b.stats.rizz - a.stats.rizz));
  const byId = new Map(members.map((m) => [m.id, m]));
  const recent = [...ledger].reverse().slice(0, 40);
  return (
    <div className="space-y-6">
      <Section title={board === 'aura' ? 'Aura board' : 'Rizz meter'} action={<div className="w-32"><Segmented size="sm" label="Leaderboard" value={board} onChange={setBoard} options={[{ value: 'aura', label: 'Aura' }, { value: 'rizz', label: 'Rizz' }]} /></div>}>
        <LayoutGroup>
          <ol className="space-y-2">
            {ranked.map((m, i) => (
              <motion.li layout key={m.id}>
                <button onClick={() => onProfile?.(m.id)} className={clsx('brut-sm press flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left', i === 0 && ranked.length > 1 ? 'bg-acid' : m.id === meId ? toneFor(m.id) : 'bg-surface')} aria-label={`${m.name} profile`}>
                  <span className="w-6 text-center font-display text-2xl leading-none">{i + 1}</span>
                  <Avatar type={m.avatar} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-sm font-extrabold">
                      {m.name}
                      {m.id === meId && <span className="font-medium text-muted">(you)</span>}
                      {m.isBot && <Chip>bot</Chip>}
                      {i === 0 && board === 'aura' && m.aura > 0 && ranked.length > 1 && <span title="main character">👑</span>}
                    </span>
                    <span className="block truncate text-xs font-medium text-muted">
                      {board === 'aura' ? `${CREATURES[m.stats.creature].emoji} ${CREATURES[m.stats.creature].name}` : `${m.stats.rizzTitle} · ${TIERS[m.stats.tier].name}`}
                    </span>
                  </span>
                  {board === 'aura' ? (
                    <motion.span key={m.aura} initial={{ scale: 1.25 }} animate={{ scale: 1 }} className={clsx('rounded-md border-[1.5px] border-line px-1.5 font-mono text-sm font-extrabold tabular-nums', m.aura > 0 ? 'bg-mint' : m.aura < 0 ? 'bg-bad text-white' : 'bg-surface')}>{fmtAura(m.aura)}</motion.span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-14 overflow-hidden rounded-full border-[1.5px] border-line bg-surface"><span className="stripes block h-full bg-accent" style={{ width: `${m.stats.rizz}%` }} /></span>
                      <span className="w-6 text-right font-mono text-sm font-semibold tabular-nums">{m.stats.rizz}</span>
                    </span>
                  )}
                </button>
              </motion.li>
            ))}
          </ol>
        </LayoutGroup>
      </Section>
      <Section title="Receipts">
        <ul className="space-y-2">
          {recent.length === 0 && <li className="text-sm font-medium text-muted">No aura has moved yet. Everyone is at zero. Suspicious.</li>}
          {recent.map((e) => (
            <li key={e.id} className="rounded-sm border-2 border-dashed border-line bg-surface px-3 py-2.5 shadow-[2px_2px_0_var(--color-line)]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-extrabold">{byId.get(e.memberId)?.name ?? '?'} <span className="font-medium text-muted">· {e.reason === 'manual' ? 'manual' : AURA_RULES[e.reason]?.label ?? e.reason}</span></span>
                <span className={clsx('font-mono text-sm font-extrabold tabular-nums', e.delta >= 0 ? 'text-good' : 'text-bad')}>{fmtAura(e.delta)}</span>
              </div>
              <div className="mt-1 truncate font-mono text-xs text-muted">“{e.receipt}”</div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
