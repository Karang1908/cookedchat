'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { HOT_TAKE_PROMPTS } from '@cooked/shared';
import { useRoomActions } from '@/lib/room-actions';
import { Button, Section, fieldCls } from '../ui';

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
  const select = clsx(fieldCls, 'h-9 min-w-0 flex-1 cursor-pointer text-[13px]');
  const input = clsx(fieldCls, 'h-9 min-w-0 flex-1 text-[13px]');

  return (
    <section className="space-y-6" aria-label="Games">
      <Section title="Ask the AI" action={<span className="font-mono text-xs text-faint">{me?.coins ?? 0} 🪙</span>}>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={() => void run('forecast posted', a.forecast())}>🌦️ chat forecast</Button>
          <Button size="sm" onClick={() => void run('rolling the tape', a.replay())}>🎬 instant replay</Button>
          <Button size="sm" onClick={() => void run('season recap posted', a.recap())}>📺 season recap</Button>
          <Button size="sm" onClick={() => void run('awards posted', a.awards())}>🏆 chat awards</Button>
          <Button size="sm" className="col-span-2" onClick={() => void run('your Wrapped is ready', a.wrapped())}>🎁 my Brainrot Wrapped</Button>
        </div>
      </Section>

      <Section title="Hot take arena">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void run('hot take is live', a.hotTake(take), () => setTake('')); }}>
          <input id="take" aria-label="hot take arena" value={take} onChange={(e) => setTake(e.target.value)} maxLength={200} placeholder="cereal is soup" className={input} />
          <Button size="sm" variant="primary" className="h-9" disabled={take.trim().length < 5}>post</Button>
        </form>
        <button type="button" onClick={() => setTake(HOT_TAKE_PROMPTS[Math.floor(Math.random() * HOT_TAKE_PROMPTS.length)]!)} className="mt-1.5 text-xs font-medium text-faint hover:text-fg">Need inspiration?</button>
      </Section>

      <Section title="Anonymous confession">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void run('confession posted (anonymously)', a.confess(confession), () => setConfession('')); }}>
          <input id="conf" aria-label="anonymous confession" value={confession} onChange={(e) => setConfession(e.target.value)} maxLength={280} placeholder="i read it and said nothing" className={input} />
          <Button size="sm" className="h-9" aria-label="🤫" disabled={confession.trim().length < 5}>🤫</Button>
        </form>
        <p className="mt-1.5 text-xs text-faint">Nobody, including the server, keeps who wrote it.</p>
      </Section>

      <Section title="Rizz battle">
        <div className="flex gap-2">
          <select value={opponent} onChange={(e) => setOpponent(e.target.value)} aria-label="Battle opponent" className={select}>
            {others.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <Button size="sm" className="h-9 shrink-0" disabled={!opponent} onClick={() => void run('battle started', a.battleStart(opponent))}>⚔️ fight</Button>
        </div>
      </Section>

      <Section title="Prediction market">
        <div className="flex gap-2">
          <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Market subject" className={select}>
            {others.map((m) => <option key={m.id} value={m.id}>will {m.name} reply…</option>)}
          </select>
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} aria-label="Market window" className={clsx(fieldCls, 'h-9 w-20 shrink-0 cursor-pointer text-[13px]')}>
            {[1, 5, 10, 30].map((n) => <option key={n} value={n}>{n}m</option>)}
          </select>
          <Button size="sm" className="h-9 shrink-0" disabled={!subject} onClick={() => void run('market opened', a.createBet(subject, minutes))}>💰 open</Button>
        </div>
      </Section>

      {note && <p role="status" className={clsx('rounded-lg px-3 py-2 text-xs font-medium', note.ok ? 'bg-good/10 text-good' : 'bg-bad/10 text-bad')}>{note.text}</p>}
    </section>
  );
}
