'use client';

import { useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import clsx from 'clsx';
import { AURA_RULES, CREATURES, TIERS } from '@cooked/shared';
import type { AuraEntry, Member } from '@cooked/shared';
import { fmtAura } from '@/lib/format';
import { Avatar } from '../avatar';

function title(rank: number, total: number, aura: number): string | null {
  if (total < 2) return null;
  if (rank === 0 && aura > 0) return '👑 main character';
  if (rank === total - 1 && aura < 0) return '🥀 npc energy';
  return null;
}

export function AuraPanel({ members, ledger, meId, onProfile }: { members: Member[]; ledger: AuraEntry[]; meId?: string; onProfile?: (id: string) => void }) {
  const [board, setBoard] = useState<'aura' | 'rizz'>('aura');
  const ranked = [...members].sort((a, b) => (board === 'aura' ? b.aura - a.aura : b.stats.rizz - a.stats.rizz));
  const byId = new Map(members.map((m) => [m.id, m]));
  const recent = [...ledger].reverse().slice(0, 40);
  return (
    <div className="flex flex-col gap-4">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-lg uppercase tracking-wide text-mute">{board === 'aura' ? 'Aura board' : 'Rizz meter'}</h3>
          <div className="flex rounded-full border border-white/10 p-0.5 text-[11px] font-semibold" role="tablist" aria-label="Leaderboard">
            {(['aura', 'rizz'] as const).map((b) => (
              <button key={b} role="tab" aria-selected={board === b} onClick={() => setBoard(b)} className={clsx('rounded-full px-3 py-1 transition', board === b ? 'bg-blurple text-white' : 'text-mute hover:text-white')}>{b}</button>
            ))}
          </div>
        </div>
        <LayoutGroup>
          <ul className="space-y-1.5">
            {ranked.map((m, i) => (
              <motion.li layout key={m.id} className={clsx('rounded-xl border', m.id === meId ? 'border-blurple/60 bg-blurple/10' : 'border-white/5 bg-ink-800/70')}>
                <button onClick={() => onProfile?.(m.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left" aria-label={`${m.name} profile`}>
                  <span className="w-4 text-center font-mono text-xs text-mute">{i + 1}</span>
                  <Avatar type={m.avatar} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
                      {m.name}
                      {m.id === meId && <span className="text-mute">(you)</span>}
                      {m.isBot && <span className="rounded bg-ink-600 px-1 py-px font-mono text-[9px] uppercase text-mute">bot</span>}
                    </div>
                    <div className="truncate text-[11px] text-mute">
                      {board === 'aura' ? (title(i, ranked.length, m.aura) ?? `${CREATURES[m.stats.creature].emoji} ${CREATURES[m.stats.creature].name}`) : `${m.stats.rizzTitle} · ${TIERS[m.stats.tier].emoji} ${TIERS[m.stats.tier].name}`}
                    </div>
                  </div>
                  {board === 'aura' ? (
                    <motion.span key={m.aura} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className={clsx('font-mono text-sm font-bold tabular-nums', m.aura > 0 ? 'text-mint' : m.aura < 0 ? 'text-ember' : 'text-mute')}>{fmtAura(m.aura)}</motion.span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-ink-600"><span className="block h-full rounded-full bg-gradient-to-r from-magenta to-mint" style={{ width: `${m.stats.rizz}%` }} /></span>
                      <span className="w-7 text-right font-mono text-sm font-bold tabular-nums">{m.stats.rizz}</span>
                    </span>
                  )}
                </button>
              </motion.li>
            ))}
          </ul>
        </LayoutGroup>
      </section>
      <section>
        <h3 className="mb-2 font-display text-lg uppercase tracking-wide text-mute">Receipts</h3>
        <ul className="scroll-thin max-h-[min(50vh,380px)] space-y-1.5 overflow-y-auto pr-1">
          {recent.length === 0 && <li className="text-sm text-mute">No aura moves yet. Everyone is at zero. Suspicious.</li>}
          {recent.map((e) => (
            <li key={e.id} className="pop-in rounded-xl border border-white/5 bg-ink-800/70 px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold">{byId.get(e.memberId)?.name ?? '?'}</span>
                <span className={clsx('font-mono text-sm font-bold tabular-nums', e.delta >= 0 ? 'text-mint' : 'text-ember')}>{fmtAura(e.delta)}</span>
              </div>
              <div className="text-[11px] text-mute">{e.reason === 'manual' ? 'manual' : AURA_RULES[e.reason].label}</div>
              <div className="mt-1 truncate rounded bg-ink-950/60 px-2 py-1 font-mono text-[11px] text-blurple-soft">&ldquo;{e.receipt}&rdquo;</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
