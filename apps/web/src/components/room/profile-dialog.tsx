'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { CLASSES, CREATURES, TIERS, fmtDuration } from '@cooked/shared';
import type { Member } from '@cooked/shared';
import { fmtAura } from '@/lib/format';
import { useRoomActions } from '@/lib/room-actions';
import { Avatar } from '../avatar';
import { Button, Chip } from '../ui';

export function ProfileDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const s = member?.stats;
  const actions = useRoomActions();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setErr(null), [member?.id]);
  useEffect(() => {
    if (!member) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [member, onClose]);
  return (
    <AnimatePresence>
      {member && s && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[60] grid place-items-end bg-black/70 sm:place-items-center sm:p-6" role="dialog" aria-modal aria-label={`${member.name} profile`}>
          <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ duration: 0.18 }} onClick={(e) => e.stopPropagation()} className="brut-lg relative w-full max-w-sm rounded-t-3xl bg-surface p-5 sm:rounded-3xl">
            <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-lg p-1.5 text-faint hover:bg-surface hover:text-fg"><X size={18} /></button>
            <div className="flex items-center gap-4">
              <Avatar type={member.avatar} size={64} paused={false} />
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold tracking-tight">{member.name}</h2>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Chip>{CLASSES[s.klass].emoji} {CLASSES[s.klass].name}</Chip>
                  <Chip tone="accent">{TIERS[s.tier].emoji} {TIERS[s.tier].name} tier</Chip>
                  {member.isBot && <Chip>bot</Chip>}
                </div>
              </div>
            </div>

            <div className="brut-sm mt-5 flex items-center gap-3 rounded-xl bg-acid p-3">
              <span className="text-3xl" aria-hidden>{CREATURES[s.creature].emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-faint">Current form</div>
                <div className="font-semibold">{CREATURES[s.creature].name}</div>
                <div className="text-xs text-muted">{CREATURES[s.creature].blurb}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold text-faint">Power level</div>
                <div className="font-mono text-lg font-bold tabular-nums">{s.power.toLocaleString()}</div>
                {s.power > 9000 && <div className="text-[11px] text-warn">it&apos;s over 9000</div>}
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line">
              <Stat label="Aura" value={fmtAura(member.aura)} tone={member.aura > 0 ? 'good' : member.aura < 0 ? 'bad' : undefined} />
              <Stat label="Rizz" value={`${s.rizz}`} sub={s.rizzTitle} />
              <Stat label="Ohio avg" value={`${s.ohioAvg}%`} sub={`peak ${s.ohioPeak}%`} />
              <Stat label="Mogs" value={`${s.mogs}`} />
              <Stat label="Avg reply" value={s.avgReplyMs === null ? '—' : fmtDuration(s.avgReplyMs)} />
              <Stat label="Dry texts" value={`${s.dry}`} />
            </dl>
            <Button
              className="mt-4 w-full"
              onClick={async () => {
                const e = await actions.wrapped(member.id);
                if (e) setErr(e);
                else onClose();
              }}
            >
              🎁 Post {member.name}&apos;s Brainrot Wrapped
            </Button>
            {err && <p role="alert" className="mt-2 text-center text-xs font-medium text-bad">{err}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="bg-panel px-2 py-2.5 text-center">
      <dt className="text-[11px] text-faint">{label}</dt>
      <dd className={tone === 'good' ? 'font-semibold text-good' : tone === 'bad' ? 'font-semibold text-bad' : 'font-semibold'}>{value}</dd>
      {sub && <div className="text-[10px] text-faint">{sub}</div>}
    </div>
  );
}
