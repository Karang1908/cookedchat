'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock, Eye, Flame, MessageSquareOff, Scale, Sparkles, Swords, Trophy } from 'lucide-react';
import { DemoChat } from '@/components/demo-chat';
import { Button, Wordmark, fieldCls } from '@/components/ui';
import { createSocket } from '@/lib/socket';

const NOTICES = [
  { icon: Clock, title: 'Reply speed', body: 'The 4-hour "lol". The suspiciously instant reply to one person only.' },
  { icon: Eye, title: 'Typing drama', body: 'Typed for a minute, sent "ok". The bubble that appeared and vanished.' },
  { icon: MessageSquareOff, title: 'Dry texts', body: '"k" vs "k." vs "OKAY". It hears the difference.' },
  { icon: Flame, title: 'Unhinged takes', body: 'Every message gets an Ohio score. Big claims get put to a vote.' },
  { icon: Trophy, title: 'Aura, with receipts', body: 'Every point gained or lost is logged with the exact message that caused it.' },
  { icon: Swords, title: 'Games', body: 'Rizz battles, hot takes, a betting market on who replies first.' },
];

export default function Landing() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);

  const create = () => {
    setBusy(true);
    setErr(null);
    const socket = createSocket();
    const fail = (m: string) => {
      socket.close();
      if (mounted.current) {
        setBusy(false);
        setErr(m);
      }
    };
    const timer = setTimeout(() => fail('The server is waking up (free tier). Give it ~30 seconds and try again.'), 12_000);
    socket.on('connect', () => {
      socket.emit('room:create', { tzOffsetMin: -new Date().getTimezoneOffset() }, (a) => {
        clearTimeout(timer);
        socket.close();
        if (a.ok) router.push(`/r/${a.code}`);
        else fail(a.error);
      });
    });
  };
  const join = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^[A-Za-z]{4}$/.test(code)) router.push(`/r/${code.toUpperCase()}`);
  };

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark />
        <form onSubmit={join} className="flex items-center gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase())} placeholder="CODE" aria-label="Room code" autoCapitalize="characters" className={`${fieldCls} h-9 w-[5.5rem] text-center font-mono tracking-[0.2em]`} />
          <Button size="sm" disabled={code.length !== 4}>Join</Button>
        </form>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs font-medium text-muted">
              <Sparkles size={13} className="text-accent" /> An AI that lives in your group chat
            </p>
            <h1 className="max-w-xl text-[clamp(2.4rem,5.4vw,4rem)] font-bold leading-[1.04] tracking-[-0.035em]">
              Everyone notices the dry “k”. Now something says it out loud.
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-muted">
              Cooked is a group chat with an AI member. It watches how people actually text, the 4-hour reply, the typing bubble that vanishes, the “k” after a paragraph, and roasts it. Then it keeps score.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button variant="primary" size="lg" onClick={create} disabled={busy}>
                {busy ? 'Opening a room…' : 'Start a room'} <ArrowRight size={17} />
              </Button>
              <a href="#how" className="text-sm font-semibold text-muted transition-colors hover:text-fg">How it works</a>
            </div>
            {err && <p role="alert" className="mt-3 text-sm text-warn">{err}</p>}
            <p className="mt-6 text-xs text-faint">Free, no sign-up. Everyone is told the AI roasts when they join. It roasts behavior, never identity.</p>
          </div>
          <DemoChat />
        </section>

        <section className="border-t border-line bg-panel/60">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
            <h2 className="text-2xl font-bold tracking-tight">What it notices</h2>
            <div className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              {NOTICES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface ring-1 ring-line"><Icon size={17} className="text-accent" /></span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
            <ol className="mt-6 space-y-5">
              {[
                ['Start a room', 'You get a four-letter code and a QR code.'],
                ['Everyone scans in', 'Pick a name and a creature. No accounts.'],
                ['Just chat', 'The AI watches, reacts, keeps the aura board, and drops in when something is actually worth saying.'],
              ].map(([t, b], i) => (
                <li key={t} className="flex gap-4">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent/12 font-mono text-xs font-bold text-accent">{i + 1}</span>
                  <div>
                    <div className="font-semibold">{t}</div>
                    <div className="mt-0.5 text-sm text-muted">{b}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-line bg-panel p-6">
            <div className="flex items-center gap-2 text-sm font-semibold"><Scale size={16} className="text-accent" /> It knows when to shut up</div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Comedy is timing. The AI speaks about once every few messages and never twice in a row. Most of the time it just reacts with an emoji. The big moments (a 67, a mog, the room hitting 100% cooked) always get through.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Running a demo? The admin panel lets you tune how chatty it is, warp the room clock, stage any moment on cue, and put two AIs (Groq vs Ollama) in the room to roast each other.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-faint sm:px-8">
          <Wordmark className="text-sm" />
          <span>Roasts behavior, never identity.</span>
        </div>
      </footer>
    </div>
  );
}
