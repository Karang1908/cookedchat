'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ExternalLink } from 'lucide-react';
import { BRAINROT, DEFAULT_TIMINGS, FX_KINDS, PERSONAS, SOUND_NAMES } from '@cooked/shared';
import type { BrainrotLevel, PersonaId, RoastIntensity, RoomTimings, SimulateKind, TriggerKind } from '@cooked/shared';
import { fmtDuration } from '@/lib/format';
import { useLiveRoom } from '@/lib/use-live-room';
import { AuraPanel } from '../room/aura-panel';
import { Button, Chip, Segmented, Switch, Wordmark, fieldCls } from '../ui';

const KEY = 'cooked.adminKey';
const WARPS: [string, number][] = [['-1h', -3_600_000], ['+5m', 300_000], ['+30m', 1_800_000], ['+1h', 3_600_000], ['+4h', 14_400_000], ['+12h', 43_200_000]];
const SIMS: [SimulateKind, string][] = [['typing_drama', '⌨️ typing drama'], ['slow_reply', '🕳️ slow reply (+3h)'], ['burst', '💬 message burst'], ['dead_chat', '🦗 dead chat'], ['left_on_read', '👁️ left on read'], ['simp', '💘 simp radar'], ['argument', '🔥 argument (crash out)'], ['derail', '🥣 topic derail'], ['tone', '🥶 tone shift (ok → ok.)'], ['claim', '🧢 big claim (is this real?)'], ['hottake', '🔥 hot take'], ['bet', '💰 prediction market'], ['battle', '⚔️ rizz battle (bots)'], ['confession', '🤫 confession']];
const FORCES: TriggerKind[] = ['duel', 'six_seven', 'unc', 'reply_later', 'typing_drama', 'typed_deleted', 'slow_reply', 'burst', 'dry_reply', 'edited', 'deleted', 'left_on_read', 'dead_chat', 'tung_tung', 'cooked_max', 'ohio_high', 'cap', 'tone_shift', 'derail', 'crash_out', 'simp_radar', 'owl', 'betrayal', 'class_change', 'scouter', 'mog', 'lore', 'chaos', 'weather', 'replay', 'copypasta', 'recap', 'awards', 'wrapped', 'meme'];
const BOT_LINES = ['k', '67', "wait I'll reply later", 'baad mein reply karta hu', 'acha', 'skibidi fanum tax', 'lol', 'WHAT IS HAPPENING', 'ok.', 'fine'];
const TIMING_FIELDS: { key: keyof RoomTimings; label: string; unit: 's' | 'n' }[] = [
  { key: 'typingDramaMs', label: 'Typing drama after', unit: 's' }, { key: 'typedDeletedMs', label: 'Typed-then-deleted after', unit: 's' },
  { key: 'slowReplyMs', label: 'Slow reply gap', unit: 's' }, { key: 'quickReplyMs', label: 'Quick reply gap', unit: 's' },
  { key: 'deadChatMs', label: 'Dead chat after', unit: 's' }, { key: 'leftOnReadMs', label: 'Left on read after', unit: 's' },
  { key: 'burstCount', label: 'Burst size (messages)', unit: 'n' }, { key: 'burstWindowMs', label: 'Burst window', unit: 's' },
  { key: 'commentCooldownMs', label: 'AI cooldown', unit: 's' }, { key: 'voteWindowMs', label: 'Votes & battles stay open', unit: 's' },
  { key: 'missingMs', label: 'Missing poster after', unit: 's' }, { key: 'owlMs', label: 'Owl after (post 9pm)', unit: 's' },
  { key: 'loreGapMs', label: 'Lore callback gap', unit: 's' }, { key: 'duelLullMs', label: 'Duel: AIs roast each other after', unit: 's' },
];
const DEMO_TIMINGS: Partial<RoomTimings> = { typingDramaMs: 8000, typedDeletedMs: 4000, deadChatMs: 45_000, leftOnReadMs: 60_000, commentCooldownMs: 4000, voteWindowMs: 10_000, missingMs: 120_000, owlMs: 120_000, loreGapMs: 60_000, duelLullMs: 20_000 };

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
      <main className="flex min-h-dvh flex-col items-center justify-center px-5">
        <Wordmark className="mb-8" />
        <form
          className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              sessionStorage.setItem(KEY, draftKey);
            } catch {}
            setKey(draftKey);
          }}
        >
          <p className="text-sm text-muted">Control room</p>
          <h1 className="font-mono text-3xl font-bold tracking-[0.25em]">{code}</h1>
          <label htmlFor="k" className="mt-6 block text-[13px] font-semibold text-muted">Admin key</label>
          <input id="k" type="password" autoFocus value={draftKey} onChange={(e) => setDraftKey(e.target.value)} className={clsx(fieldCls, 'mt-1.5 h-11 w-full')} />
          <Button variant="primary" size="lg" className="mt-5 w-full" disabled={!draftKey}>Unlock</Button>
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
  const [aiEvery, setAiEvery] = useState(4);
  const bots = state.members.filter((m) => m.isBot);
  const emit = socket;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (state.status === 'error' && state.error === 'wrong key') onBadKey(); }, [state.status, state.error, onBadKey]);
  useEffect(() => setTimings(state.settings.timings), [state.settings.timings]);
  useEffect(() => setCooked(state.cooked), [state.cooked]);
  useEffect(() => setAiEvery(state.settings.aiEvery), [state.settings.aiEvery]);
  useEffect(() => { if (!botId && bots[0]) setBotId(bots[0].id); }, [bots, botId]);

  if (state.status === 'error') {
    return <main className="grid min-h-dvh place-items-center px-6 text-center"><div><h1 className="text-2xl font-bold">{state.error}</h1><Link href="/" className="mt-4 inline-block text-sm text-muted underline">home</Link></div></main>;
  }
  const roomNow = new Date(now + state.clockOffsetMs);
  const settings = state.settings;
  const set = (p: Parameters<NonNullable<typeof emit.current>['emit']>[1] & object) => emit.current?.emit('admin:settings', p as never);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4">
          <Wordmark />
          <span className="text-sm text-muted">Control room <span className="font-mono font-semibold tracking-wider text-fg">{code}</span></span>
          <Chip tone={state.status === 'ready' ? 'good' : 'warn'}>{state.status}</Chip>
          <a href={`/r/${code}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">open room <ExternalLink size={14} /></a>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-4 px-4 py-5 lg:grid-cols-3">
        <div className="space-y-4">
          <Card title="AI behaviour">
            <Field label="Persona">
              <select aria-label="Persona" value={settings.persona} onChange={(e) => set({ persona: e.target.value as PersonaId })} className={clsx(fieldCls, 'h-9 w-full cursor-pointer')}>
                {Object.values(PERSONAS).map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}
              </select>
            </Field>
            <Field label={`Brainrot · ${BRAINROT[settings.brainrot].name}`}>
              <Segmented size="sm" label="Brainrot" value={settings.brainrot} onChange={(v) => set({ brainrot: v })} options={([0, 1, 2, 3] as BrainrotLevel[]).map((v) => ({ value: v, label: v }))} />
            </Field>
            <Field label="Roast intensity">
              <Segmented size="sm" label="Roast intensity" value={settings.intensity} onChange={(v) => set({ intensity: v })} options={[{ value: 1 as RoastIntensity, label: 'mild' }, { value: 2 as RoastIntensity, label: 'medium' }, { value: 3 as RoastIntensity, label: 'emotional damage' }]} />
            </Field>
            <Field label={`How often the AI speaks · ${aiEvery === 0 ? 'whenever a human spoke in between' : `about 1 in ${aiEvery + 1} messages`}`}>
              <input type="range" min={0} max={10} step={1} value={aiEvery} onChange={(e) => setAiEvery(Number(e.target.value))} onPointerUp={() => set({ aiEvery })} onKeyUp={() => set({ aiEvery })} className="w-full accent-[#ff6a3d]" aria-label="AI speaks every N human messages" />
              <p className="mt-1 text-xs text-faint">Ordinary moments wait for this many human messages, core jokes half, big moments (67, mogs, meltdown) one. Never two AI turns in a row. Other moments get a quiet emoji.</p>
            </Field>
            <div className="-mx-1 divide-y divide-line">
              <Switch checked={settings.commentary} onChange={(v) => set({ commentary: v })} label="AI commentary" hint="off = aura and effects keep running, the AI stays silent" />
              <Switch checked={settings.duel} onChange={(v) => set({ duel: v })} label="AI duel: Groq vs Ollama" hint="each roast gets a reply from the other model; in lulls they roast each other" />
              <Switch checked={settings.chaos} onChange={(v) => set({ chaos: v })} label="Chaos agent" hint="random dares and plot twists" />
              <Switch checked={settings.jumpscare} onChange={(v) => set({ jumpscare: v })} label="Jumpscares" />
              <Switch checked={settings.autopilotBots} onChange={(v) => set({ autopilotBots: v })} label="Bot autopilot" hint="bots chat and play games on their own" />
            </div>
            <Field label="Rival commentator (argues with the main one)">
              <select aria-label="Rival commentator" value={settings.rival ?? ''} onChange={(e) => set({ rival: (e.target.value || null) as PersonaId | null })} className={clsx(fieldCls, 'h-9 w-full cursor-pointer')}>
                <option value="">none</option>
                {Object.values(PERSONAS).filter((p) => p.id !== settings.persona).map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}
              </select>
              {settings.duel && !settings.rival && <p className="mt-1 text-xs text-faint">The duel picks a contrasting rival automatically.</p>}
            </Field>
          </Card>

          <Card title="Room clock">
            <div className="font-mono text-3xl font-semibold tabular-nums">{roomNow.toLocaleTimeString()}</div>
            <div className="text-sm text-muted">{roomNow.toLocaleDateString()} · {state.clockOffsetMs === 0 ? 'real time' : `${state.clockOffsetMs > 0 ? '+' : '-'}${fmtDuration(state.clockOffsetMs)} from real`}</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {WARPS.map(([l, ms]) => <Button size="sm" key={l} onClick={() => emit.current?.emit('admin:warp', { ms })}>{l}</Button>)}
              <Button size="sm" variant="ghost" onClick={() => emit.current?.emit('admin:warp', { ms: -state.clockOffsetMs })}>reset</Button>
            </div>
            <p className="mt-2 text-xs text-faint">Dead chat, left on read, posters, the owl, the 3am alarm and markets all run on this clock.</p>
          </Card>

          <Card title={`Cooked-o-meter · ${state.cooked}%`}>
            <input type="range" min={0} max={100} value={cooked} onChange={(e) => setCooked(Number(e.target.value))} onPointerUp={() => emit.current?.emit('admin:setCooked', { value: cooked })} onKeyUp={() => emit.current?.emit('admin:setCooked', { value: cooked })} className="w-full accent-[#ff6a3d]" aria-label="Cooked percentage" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[0, 40, 60, 80].map((v) => <Button size="sm" key={v} onClick={() => emit.current?.emit('admin:setCooked', { value: v })}>{v}%</Button>)}
              <Button size="sm" variant="danger" onClick={() => emit.current?.emit('admin:setCooked', { value: 100 })}>100 · meltdown</Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Bots">
            {bots.length === 0 ? (
              <Button onClick={() => emit.current?.emit('admin:addBots')}>add Aman, Riya & Dev</Button>
            ) : (
              <>
                <Segmented size="sm" label="Bot" value={botId} onChange={setBotId} options={bots.map((b) => ({ value: b.id, label: b.name }))} />
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {BOT_LINES.map((l) => <Button size="sm" key={l} onClick={() => emit.current?.emit('admin:botSay', { memberId: botId, text: l })}>{l}</Button>)}
                </div>
                <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (custom.trim()) { emit.current?.emit('admin:botSay', { memberId: botId, text: custom }); setCustom(''); } }}>
                  <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="make the bot say…" className={clsx(fieldCls, 'h-9 min-w-0 flex-1')} />
                  <Button size="sm" type="submit" className="h-9">say</Button>
                </form>
              </>
            )}
          </Card>

          <Card title="Members">
            <ul className="space-y-2">
              {state.members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="min-w-20 font-medium">{m.name}{m.isBot && <span className="ml-1 text-xs text-faint">bot</span>}</span>
                  <span className="font-mono text-xs text-faint">{m.aura} aura · {m.coins} 🪙</span>
                  <span className="ml-auto flex gap-1">
                    <Button size="sm" variant={m.elsewhere ? 'primary' : 'secondary'} onClick={() => emit.current?.emit('admin:elsewhere', { memberId: m.id, on: !m.elsewhere })}>{m.elsewhere ? 'online elsewhere' : 'offline elsewhere'}</Button>
                    <Button size="sm" onClick={() => emit.current?.emit('admin:aura', { memberId: m.id, delta: 1000 })}>+1k</Button>
                    <Button size="sm" onClick={() => emit.current?.emit('admin:aura', { memberId: m.id, delta: 10000 })}>+10k</Button>
                    <Button size="sm" variant="ghost" onClick={() => emit.current?.emit('admin:aura', { memberId: m.id, delta: -500 })}>-500</Button>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Stage a moment">
            <p className="mb-3 text-xs text-faint">Fakes the inputs the real detectors read, so aura and roasts fire for real. Acts as the selected bot, and always lands.</p>
            <div className="flex flex-wrap gap-1.5">
              {SIMS.map(([k, l]) => <Button size="sm" key={k} disabled={!botId} onClick={() => emit.current?.emit('admin:simulate', { kind: k, memberId: botId })}>{l}</Button>)}
            </div>
          </Card>

          <Card title="Force a moment">
            <div className="flex flex-wrap gap-1.5">
              {FORCES.map((k) => <Button size="sm" key={k} variant={k === 'duel' ? 'primary' : 'secondary'} className="font-mono text-xs" onClick={() => emit.current?.emit('admin:force', { kind: k, memberId: botId || undefined })}>{k}</Button>)}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Timings">
            <div className="space-y-1.5">
              {TIMING_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 text-muted">{f.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <input type="number" min={f.unit === 'n' ? 2 : 0.2} step={f.unit === 'n' ? 1 : 0.5} value={f.unit === 'n' ? timings[f.key] : +(timings[f.key] / 1000).toFixed(1)} onChange={(e) => setTimings({ ...timings, [f.key]: f.unit === 'n' ? Number(e.target.value) : Number(e.target.value) * 1000 })} className={clsx(fieldCls, 'h-8 w-20 text-right font-mono')} />
                    <span className="w-3 text-xs text-faint">{f.unit === 's' ? 's' : ''}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Button size="sm" variant="primary" onClick={() => set({ timings })}>apply</Button>
              <Button size="sm" onClick={() => set({ timings: DEMO_TIMINGS })}>demo speed</Button>
              <Button size="sm" variant="ghost" onClick={() => set({ timings: DEFAULT_TIMINGS })}>defaults</Button>
            </div>
          </Card>

          <Card title="Effects & sounds">
            <div className="flex flex-wrap gap-1.5">{FX_KINDS.map((k) => <Button size="sm" key={k} onClick={() => emit.current?.emit('admin:fx', { kind: k })}>{k}</Button>)}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">{SOUND_NAMES.map((n) => <Button size="sm" variant="ghost" key={n} onClick={() => emit.current?.emit('admin:sound', { name: n })}>🔊 {n}</Button>)}</div>
            <p className="mt-2 text-xs text-faint">These play on every player&apos;s screen, not here.</p>
          </Card>

          <Card title={`Live feed · ${state.messages.length}`}>
            <ul className="scroll-thin max-h-60 space-y-1 overflow-y-auto text-sm">
              {state.messages.slice(-30).reverse().map((m) => (
                <li key={m.id} className={clsx('rounded-lg px-2 py-1', m.kind === 'ai' ? 'bg-accent/[0.07] text-fg' : 'text-muted')}>
                  <b className={m.kind === 'ai' ? (m.side === 'ollama' ? 'text-ollama' : 'text-accent') : 'text-fg'}>{m.kind === 'ai' ? (m.side ? `AI · ${m.side}` : 'AI') : m.kind === 'card' ? 'card' : state.members.find((x) => x.id === m.authorId)?.name ?? '?'}:</b> {m.deleted ? <i>deleted</i> : m.text}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Aura">
            <div className="scroll-thin max-h-80 overflow-y-auto">
              <AuraPanel members={state.members} ledger={state.ledger} />
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** a labelled group, not a <label>: clicking a label's text would press the first button inside it */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5" role="group" aria-label={label}>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
    </div>
  );
}
