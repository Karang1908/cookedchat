'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { HOT_TAKE_PROMPTS } from '@cooked/shared';
import { useRoomActions } from '@/lib/room-actions';

/** Starts the interactive stuff. Anything that can be refused (rate limits, bad input) shows the server's reason. */
export function GamesPanel() {
  const a = useRoomActions();
  const me = a.members.find((m) => m.id === a.meId);
  const others = a.members.filter((m) => m.id !== a.meId);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [take, setTake] = useState('');
  const [confession, setConfession] = useState('');
  const [opponent, setOpponent] = useState('');
  const [subject, setSubject] = useState('');
  const [minutes, setMinutes] = useState(10);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 3500);
    return () => clearTimeout(t);
  }, [note]);
  useEffect(() => {
    if (!opponent && others[0]) setOpponent(others[0].id);
    if (!subject && others[0]) setSubject(others[0].id);
  }, [others, opponent, subject]);

  const run = async (label: string, p: Promise<string | null>, onOk?: () => void) => {
    const err = await p;
    setNote(err ? { ok: false, text: err } : { ok: true, text: label });
    if (!err) onOk?.();
  };
  const field = 'min-w-0 flex-1 rounded-lg border border-white/10 bg-ink-850 px-3 py-2 text-sm outline-none focus:border-blurple';
  const btn = 'rounded-lg bg-blurple px-3 py-2 text-xs font-bold transition enabled:hover:bg-blurple-soft enabled:active:scale-95 disabled:opacity-40';

  return (
    <section aria-label="Games">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="font-display text-lg uppercase tracking-wide text-mute">Games</h3>
        <span className="font-mono text-xs text-mute">{me?.coins ?? 0} 🪙</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={() => void run('forecast posted', a.forecast())} className="rounded-xl border border-white/5 bg-ink-800/80 px-2 py-2.5 text-left text-xs font-semibold transition hover:border-blurple/60 active:scale-95">🌦️ chat forecast</button>
        <button onClick={() => void run('rolling the tape', a.replay())} className="rounded-xl border border-white/5 bg-ink-800/80 px-2 py-2.5 text-left text-xs font-semibold transition hover:border-blurple/60 active:scale-95">🎬 instant replay</button>
      </div>

      <form className="mt-3" onSubmit={(e) => { e.preventDefault(); void run('hot take is live', a.hotTake(take), () => setTake('')); }}>
        <label className="text-[11px] font-semibold uppercase tracking-widest text-mute" htmlFor="take">hot take arena</label>
        <div className="mt-1 flex gap-1.5">
          <input id="take" value={take} onChange={(e) => setTake(e.target.value)} maxLength={200} placeholder="cereal is soup" className={field} />
          <button className={btn} disabled={take.trim().length < 5}>post</button>
        </div>
        <button type="button" onClick={() => setTake(HOT_TAKE_PROMPTS[Math.floor(Math.random() * HOT_TAKE_PROMPTS.length)]!)} className="mt-1 text-[11px] text-blurple-soft underline">need inspiration?</button>
      </form>

      <form className="mt-3" onSubmit={(e) => { e.preventDefault(); void run('confession posted (anonymously)', a.confess(confession), () => setConfession('')); }}>
        <label className="text-[11px] font-semibold uppercase tracking-widest text-mute" htmlFor="conf">anonymous confession</label>
        <div className="mt-1 flex gap-1.5">
          <input id="conf" value={confession} onChange={(e) => setConfession(e.target.value)} maxLength={280} placeholder="i read it and said nothing" className={field} />
          <button className={btn} disabled={confession.trim().length < 5}>🤫</button>
        </div>
      </form>

      <div className="mt-3">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-mute">rizz battle</div>
        <div className="mt-1 flex gap-1.5">
          <select value={opponent} onChange={(e) => setOpponent(e.target.value)} aria-label="Battle opponent" className={clsx(field, 'bg-ink-800')}>
            {others.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button className={btn} disabled={!opponent} onClick={() => void run('battle started', a.battleStart(opponent))}>⚔️ fight</button>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-mute">prediction market</div>
        <div className="mt-1 flex gap-1.5">
          <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Market subject" className={clsx(field, 'bg-ink-800')}>
            {others.map((m) => <option key={m.id} value={m.id}>will {m.name} reply…</option>)}
          </select>
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} aria-label="Market window" className={clsx(field, 'max-w-20 flex-none bg-ink-800')}>
            {[1, 5, 10, 30].map((n) => <option key={n} value={n}>{n}m</option>)}
          </select>
          <button className={btn} disabled={!subject} onClick={() => void run('market opened', a.createBet(subject, minutes))}>💰 open</button>
        </div>
      </div>

      {note && <p role="status" className={clsx('pop-in mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold', note.ok ? 'bg-mint/15 text-mint' : 'bg-ember/15 text-ember')}>{note.text}</p>}
    </section>
  );
}
