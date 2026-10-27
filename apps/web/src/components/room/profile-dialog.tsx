'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { CLASSES, CREATURES, TIERS, fmtDuration } from '@cooked/shared';
import type { Member } from '@cooked/shared';
import { fmtAura } from '@/lib/format';
import { useRoomActions } from '@/lib/room-actions';
import { Avatar } from '../avatar';

export function ProfileDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  useEffect(() => {
    if (!member) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [member, onClose]);
  const s = member?.stats;
  const actions = useRoomActions();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setErr(null), [member?.id]);
  return (
    <AnimatePresence>
      {member && s && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[60] grid place-items-end bg-black/70 backdrop-blur-sm sm:place-items-center sm:p-6" role="dialog" aria-modal aria-label={`${member.name} profile`}>
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass relative w-full max-w-sm rounded-t-3xl p-5 sm:rounded-3xl">
            <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1.5 text-mute hover:text-white"><X size={18} /></button>
            <div className="flex items-center gap-4">
              <Avatar type={member.avatar} size={72} paused={false} />
              <div className="min-w-0">
                <h2 className="truncate font-display text-3xl uppercase tracking-wide">{member.name}</h2>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs font-semibold">
                  <span className="rounded-full bg-blurple/25 px-2 py-0.5">{CLASSES[s.klass].emoji} {CLASSES[s.klass].name}</span>
                  <span className="rounded-full bg-magenta/20 px-2 py-0.5">{TIERS[s.tier].emoji} {TIERS[s.tier].name} tier</span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-ink-900/70 p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-mute">current form</div>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-4xl" aria-hidden>{CREATURES[s.creature].emoji}</span>
                <div>
                  <div className="font-display text-xl uppercase tracking-wide">{CREATURES[s.creature].name}</div>
                  <div className="text-xs text-mute">{CREATURES[s.creature].blurb}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-sun/30 bg-sun/10 p-3 text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-sun">scouter reading</div>
              <div className="font-display text-4xl tracking-wide text-sun">{s.power.toLocaleString()}{s.power > 9000 && ' 😳'}</div>
              {s.power > 9000 && <div className="text-xs text-sun/80">it&apos;s over 9000</div>}
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="aura" value={fmtAura(member.aura)} tone={member.aura >= 0 ? 'good' : 'bad'} />
              <Stat label="rizz" value={`${s.rizz}`} sub={s.rizzTitle} />
              <Stat label="ohio avg" value={`${s.ohioAvg}%`} sub={`peak ${s.ohioPeak}%`} tone={s.ohioAvg > 40 ? 'bad' : undefined} />
              <Stat label="mogs" value={`${s.mogs}`} />
              <Stat label="avg reply" value={s.avgReplyMs === null ? '—' : fmtDuration(s.avgReplyMs)} />
              <Stat label="dry texts" value={`${s.dry}`} />
            </dl>
            <button onClick={async () => { const e = await actions.wrapped(member.id); if (e) setErr(e); else onClose(); }} className="mt-3 w-full rounded-xl border border-magenta/40 bg-magenta/15 py-2.5 text-sm font-bold transition hover:border-magenta active:scale-[0.98]">🎁 post {member.name}&apos;s Brainrot Wrapped</button>
            {err && <p role="alert" className="pop-in mt-2 rounded-lg bg-ember/15 px-3 py-1.5 text-center text-xs font-semibold text-ember">{err}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-xl bg-ink-800/80 px-2 py-2">
      <dt className="font-mono text-[10px] uppercase tracking-widest text-mute">{label}</dt>
      <dd className={tone === 'good' ? 'text-lg font-bold text-mint' : tone === 'bad' ? 'text-lg font-bold text-ember' : 'text-lg font-bold'}>{value}</dd>
      {sub && <div className="text-[10px] text-mute">{sub}</div>}
    </div>
  );
}
