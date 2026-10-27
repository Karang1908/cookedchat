'use client';

import { LayoutGroup, motion } from 'motion/react';
import clsx from 'clsx';
import { AURA_RULES } from '@cooked/shared';
import type { AuraEntry, Member } from '@cooked/shared';
import { fmtAura } from '@/lib/format';
import { Avatar } from '../avatar';

function title(rank: number, total: number, aura: number): string | null {
  if (total < 2) return null;
  if (rank === 0 && aura > 0) return '👑 main character';
  if (rank === total - 1 && aura < 0) return '🥀 npc energy';
  return null;
}

export function AuraPanel({ members, ledger, meId }: { members: Member[]; ledger: AuraEntry[]; meId?: string }) {
  const ranked = [...members].sort((a, b) => b.aura - a.aura);
  const byId = new Map(members.map((m) => [m.id, m]));
  const recent = [...ledger].reverse().slice(0, 40);
  return (
    <div className="flex flex-col gap-4">
      <section>
        <h3 className="mb-2 font-display text-lg uppercase tracking-wide text-mute">Aura board</h3>
        <LayoutGroup>
          <ul className="space-y-1.5">
            {ranked.map((m, i) => (
              <motion.li layout key={m.id} className={clsx('flex items-center gap-3 rounded-xl border px-3 py-2', m.id === meId ? 'border-blurple/60 bg-blurple/10' : 'border-white/5 bg-ink-800/70')}>
                <span className="w-4 text-center font-mono text-xs text-mute">{i + 1}</span>
                <Avatar type={m.avatar} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    {m.name}
                    {m.id === meId && <span className="text-mute">(you)</span>}
                    {m.isBot && <span className="rounded bg-ink-600 px-1 py-px font-mono text-[9px] uppercase text-mute">bot</span>}
                  </div>
                  {title(i, ranked.length, m.aura) && <div className="text-[11px] text-mute">{title(i, ranked.length, m.aura)}</div>}
                </div>
                <motion.span key={m.aura} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className={clsx('font-mono text-sm font-bold tabular-nums', m.aura > 0 ? 'text-mint' : m.aura < 0 ? 'text-ember' : 'text-mute')}>
                  {fmtAura(m.aura)}
                </motion.span>
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
