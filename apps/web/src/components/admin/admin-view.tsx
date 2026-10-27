'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { BRAINROT, DEFAULT_TIMINGS, FX_KINDS, PERSONAS, SOUND_NAMES } from '@cooked/shared';
import type { PersonaId, RoomTimings, SimulateKind, TriggerKind } from '@cooked/shared';
import { fmtDuration } from '@/lib/format';
import { useLiveRoom } from '@/lib/use-live-room';
import { AuraPanel } from '../room/aura-panel';

const KEY = 'cooked.adminKey';
const WARPS: [string, number][] = [['-1h', -3_600_000], ['+5m', 300_000], ['+30m', 1_800_000], ['+1h', 3_600_000], ['+4h', 14_400_000], ['+12h', 43_200_000]];
const SIMS: [SimulateKind, string][] = [['typing_drama', '⌨️ typing drama'], ['slow_reply', '🕳️ slow reply (+3h)'], ['burst', '💬 message burst'], ['dead_chat', '🦗 dead chat'], ['left_on_read', '👁️ left on read']];
const FORCES: TriggerKind[] = ['six_seven', 'fanum', 'reply_later', 'typing_drama', 'typed_deleted', 'slow_reply', 'burst', 'dry_reply', 'edited', 'deleted', 'left_on_read', 'dead_chat', 'tung_tung', 'cooked_max'];
const BOT_LINES = ['k', '67', "wait I'll reply later", 'pizza tonight?', 'lol', 'WHAT IS HAPPENING', 'ok.', 'fine'];
const TIMING_FIELDS: { key: keyof RoomTimings; label: string; unit: 's' | 'n' }[] = [
  { key: 'typingDramaMs', label: 'typing drama after', unit: 's' }, { key: 'typedDeletedMs', label: 'typed-then-deleted after', unit: 's' },
  { key: 'slowReplyMs', label: 'slow reply gap', unit: 's' }, { key: 'quickReplyMs', label: 'quick reply gap', unit: 's' },
  { key: 'deadChatMs', label: 'dead chat after', unit: 's' }, { key: 'leftOnReadMs', label: 'left on read after', unit: 's' },
  { key: 'burstCount', label: 'burst size (msgs)', unit: 'n' }, { key: 'burstWindowMs', label: 'burst window', unit: 's' },
  { key: 'commentCooldownMs', label: 'AI cooldown', unit: 's' },
];
const DEMO_TIMINGS: Partial<RoomTimings> = { typingDramaMs: 8000, typedDeletedMs: 4000, deadChatMs: 45_000, leftOnReadMs: 60_000, commentCooldownMs: 4000 };

export function AdminView({ code }: { code: string }) {
  const [key, setKey] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState('');
  useEffect(() => {
    try {
      setKey(sessionStorage.getItem(KEY));
    } catch {}
  }, []);

  if (!key) {
    return (
      <main className="mx-auto grid min-h-dvh max-w-sm place-items-center px-5">
        <form
          className="glass w-full rounded-2xl p-6"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              sessionStorage.setItem(KEY, draftKey);
            } catch {}
            setKey(draftKey);
          }}
        >
          <h1 className="font-display text-3xl uppercase">Admin · {code}</h1>
          <label htmlFor="k" className="mt-4 block text-xs font-semibold uppercase tracking-widest text-mute">admin key</label>
          <input id="k" type="password" autoFocus value={draftKey} onChange={(e) => setDraftKey(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-800 px-4 py-3 outline-none focus:border-blurple" />
          <button disabled={!draftKey} className="mt-4 w-full rounded-xl bg-blurple py-3 font-semibold disabled:opacity-50">Unlock</button>
        </form>
      </main>
    );
  }
  return <Panel code={code} adminKey={key} onBadKey={() => { try { sessionStorage.removeItem(KEY); } catch {} setKey(null); }} />;
}

function Panel({ code, adminKey, onBadKey }: { code: string; adminKey: string; onBadKey: () => void }) {
  const mode = useMemo(() => ({ kind: 'admin' as const, key: adminKey }), [adminKey]);
  const { state, socket } = useLiveRoom(code, mode);
  const [now, setNow] = useState(() => Date.now());
  const [botId, setBotId] = useState('');
  const [custom, setCustom] = useState('');
  const [timings, setTimings] = useState<RoomTimings>(DEFAULT_TIMINGS);
  const [cooked, setCooked] = useState(0);
  const bots = state.members.filter((m) => m.isBot);
  const emit = socket;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (state.status === 'error' && state.error === 'wrong key') onBadKey(); }, [state.status, state.error, onBadKey]);
  useEffect(() => setTimings(state.settings.timings), [state.settings.timings]);
  useEffect(() => setCooked(state.cooked), [state.cooked]);
  useEffect(() => { if (!botId && bots[0]) setBotId(bots[0].id); }, [bots, botId]);

  if (state.status === 'error') {
    return <main className="grid min-h-dvh place-items-center px-6 text-center"><div><h1 className="font-display text-4xl uppercase">{state.error}</h1><Link href="/" className="mt-4 inline-block text-blurple-soft underline">home</Link></div></main>;
  }
  const roomNow = new Date(now + state.clockOffsetMs);
  const settings = state.settings;

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-5">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl uppercase tracking-wide">Control room · <span className="text-blurple-soft">{code}</span></h1>
        <div className="flex items-center gap-3 text-sm">
          <span className={clsx('rounded-full px-3 py-1 font-mono text-xs', state.status === 'ready' ? 'bg-mint/15 text-mint' : 'bg-sun/15 text-sun')}>{state.status}</span>
          <a href={`/r/${code}`} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-3 py-1 hover:bg-white/10">open room ↗</a>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card title="Room clock">
            <div className="font-mono text-3xl tabular-nums">{roomNow.toLocaleTimeString()}</div>
            <div className="text-sm text-mute">{roomNow.toLocaleDateString()} · {state.clockOffsetMs === 0 ? 'real time' : `${state.clockOffsetMs > 0 ? '+' : '-'}${fmtDuration(state.clockOffsetMs)} from real`}</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {WARPS.map(([l, ms]) => <Btn key={l} onClick={() => emit.current?.emit('admin:warp', { ms })}>{l}</Btn>)}
              <Btn onClick={() => emit.current?.emit('admin:warp', { ms: -state.clockOffsetMs })} tone="mute">reset</Btn>
            </div>
            <p className="mt-2 text-xs text-mute">Timers (dead chat, left on read, 3am alarm) all run on this clock.</p>
          </Card>

          <Card title="Commentator">
            <Field label="persona">
              <select value={settings.persona} onChange={(e) => emit.current?.emit('admin:settings', { persona: e.target.value as PersonaId })} className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2">
                {Object.values(PERSONAS).map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}
              </select>
            </Field>
            <Field label={`brainrot: ${BRAINROT[settings.brainrot].name}`}>
              <input type="range" min={0} max={3} step={1} value={settings.brainrot} onChange={(e) => emit.current?.emit('admin:settings', { brainrot: Number(e.target.value) as 0 | 1 | 2 | 3 })} className="w-full accent-blurple" />
            </Field>
            <Field label={`roast intensity: ${['', 'mild', 'medium', 'emotional damage'][settings.intensity]}`}>
              <input type="range" min={1} max={3} step={1} value={settings.intensity} onChange={(e) => emit.current?.emit('admin:settings', { intensity: Number(e.target.value) as 1 | 2 | 3 })} className="w-full accent-magenta" />
            </Field>
            <div className="mt-2 flex gap-2">
              <Toggle on={settings.commentary} onClick={() => emit.current?.emit('admin:settings', { commentary: !settings.commentary })}>AI commentary</Toggle>
              <Toggle on={settings.autopilotBots} onClick={() => emit.current?.emit('admin:settings', { autopilotBots: !settings.autopilotBots })}>bot autopilot</Toggle>
            </div>
          </Card>

          <Card title={`Cooked-o-meter · ${state.cooked}%`}>
            <input type="range" min={0} max={100} value={cooked} onChange={(e) => setCooked(Number(e.target.value))} onPointerUp={() => emit.current?.emit('admin:setCooked', { value: cooked })} onKeyUp={() => emit.current?.emit('admin:setCooked', { value: cooked })} className="w-full accent-ember" aria-label="Cooked percentage" />
            <div className="mt-2 flex gap-1.5">
              {[0, 40, 60, 80].map((v) => <Btn key={v} onClick={() => emit.current?.emit('admin:setCooked', { value: v })}>{v}%</Btn>)}
              <Btn tone="hot" onClick={() => emit.current?.emit('admin:setCooked', { value: 100 })}>100 · meltdown</Btn>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Bots">
            {bots.length === 0 ? (
              <Btn onClick={() => emit.current?.emit('admin:addBots')}>add Aman, Riya & Dev</Btn>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {bots.map((b) => <Btn key={b.id} active={b.id === botId} onClick={() => setBotId(b.id)}>{b.name}</Btn>)}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {BOT_LINES.map((l) => <Btn key={l} onClick={() => emit.current?.emit('admin:botSay', { memberId: botId, text: l })}>{l}</Btn>)}
                </div>
                <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (custom.trim()) { emit.current?.emit('admin:botSay', { memberId: botId, text: custom }); setCustom(''); } }}>
                  <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="make the bot say…" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm outline-none focus:border-blurple" />
                  <Btn type="submit">say</Btn>
                </form>
              </>
            )}
          </Card>

          <Card title="Stage a moment">
            <p className="mb-2 text-xs text-mute">Fakes the inputs the real detectors read, so aura and roasts fire for real. Acts as the selected bot.</p>
            <div className="flex flex-wrap gap-1.5">
              {SIMS.map(([k, l]) => <Btn key={k} disabled={!botId} onClick={() => emit.current?.emit('admin:simulate', { kind: k, memberId: botId })}>{l}</Btn>)}
            </div>
          </Card>

          <Card title="Force a roast">
            <div className="flex flex-wrap gap-1.5">
              {FORCES.map((k) => <Btn key={k} onClick={() => emit.current?.emit('admin:force', { kind: k, memberId: botId || undefined })}>{k}</Btn>)}
            </div>
          </Card>

          <Card title="Effects & sounds">
            <div className="flex flex-wrap gap-1.5">{FX_KINDS.map((k) => <Btn key={k} onClick={() => emit.current?.emit('admin:fx', { kind: k })}>{k}</Btn>)}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">{SOUND_NAMES.map((n) => <Btn key={n} tone="mute" onClick={() => emit.current?.emit('admin:sound', { name: n })}>🔊 {n}</Btn>)}</div>
            <p className="mt-2 text-xs text-mute">These play on every player&apos;s screen, not here.</p>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Timings">
            <div className="space-y-2">
              {TIMING_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-mute">{f.label}</span>
                  <span className="flex items-center gap-1">
                    <input type="number" min={f.unit === 'n' ? 2 : 0.2} step={f.unit === 'n' ? 1 : 0.5} value={f.unit === 'n' ? timings[f.key] : +(timings[f.key] / 1000).toFixed(1)} onChange={(e) => setTimings({ ...timings, [f.key]: f.unit === 'n' ? Number(e.target.value) : Number(e.target.value) * 1000 })} className="w-24 rounded-lg border border-white/10 bg-ink-800 px-2 py-1.5 text-right font-mono outline-none focus:border-blurple" />
                    <span className="w-3 text-xs text-mute">{f.unit === 's' ? 's' : ''}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Btn tone="go" onClick={() => emit.current?.emit('admin:settings', { timings })}>apply</Btn>
              <Btn onClick={() => emit.current?.emit('admin:settings', { timings: DEMO_TIMINGS })}>demo speed</Btn>
              <Btn tone="mute" onClick={() => emit.current?.emit('admin:settings', { timings: DEFAULT_TIMINGS })}>defaults</Btn>
            </div>
          </Card>

          <Card title={`Live feed · ${state.messages.length}`}>
            <ul className="scroll-thin max-h-56 space-y-1 overflow-y-auto text-sm">
              {state.messages.slice(-25).reverse().map((m) => (
                <li key={m.id} className={clsx('rounded-lg px-2 py-1', m.kind === 'ai' ? 'bg-magenta/10 text-magenta' : 'bg-ink-800/70')}>
                  <b>{m.kind === 'ai' ? 'AI' : state.members.find((x) => x.id === m.authorId)?.name ?? '?'}:</b> {m.deleted ? <i>deleted</i> : m.text}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Aura">
            <div className="max-h-80 overflow-y-auto scroll-thin">
              <AuraPanel members={state.members} ledger={state.ledger} />
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-4">
      <h2 className="mb-3 font-display text-xl uppercase tracking-wide text-mute">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block text-xs font-semibold uppercase tracking-widest text-mute">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function Btn({ children, onClick, tone, active, disabled, type = 'button' }: { children: React.ReactNode; onClick?: () => void; tone?: 'mute' | 'hot' | 'go'; active?: boolean; disabled?: boolean; type?: 'button' | 'submit' }) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={clsx('rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 disabled:opacity-40', active ? 'border-blurple bg-blurple/30' : tone === 'hot' ? 'border-ember/60 bg-ember/20 text-ember' : tone === 'go' ? 'border-mint/50 bg-mint/15 text-mint' : tone === 'mute' ? 'border-white/10 bg-ink-800 text-mute hover:text-white' : 'border-white/10 bg-ink-700 hover:border-blurple/60')}>
      {children}
    </button>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} aria-pressed={on} className={clsx('flex-1 rounded-lg border px-2 py-2 text-xs font-semibold', on ? 'border-mint/50 bg-mint/15 text-mint' : 'border-white/10 bg-ink-800 text-mute')}>{children}: {on ? 'on' : 'off'}</button>;
}
