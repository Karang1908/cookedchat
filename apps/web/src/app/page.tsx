'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { DemoChat } from '@/components/demo-chat';
import { Button, Wordmark, fieldCls } from '@/components/ui';
import { createSocket } from '@/lib/socket';

const NOTICES = [
  { emoji: '⏳', title: 'Reply speed', body: 'The 4-hour "lol". The suspiciously instant reply to one person only.', tone: 'bg-pink', tilt: '-rotate-2' },
  { emoji: '👁️', title: 'Typing drama', body: 'Typed for a minute, sent "ok". The bubble that appeared and vanished.', tone: 'bg-sky', tilt: 'rotate-1' },
  { emoji: '🥀', title: 'Dry texts', body: '"k" vs "k." vs "acha". It hears the difference.', tone: 'bg-lemon', tilt: '-rotate-1' },
  { emoji: '👴', title: 'Expired slang', body: 'Say "fanum tax" in 2026 and you get called unc. -50 aura.', tone: 'bg-grape', tilt: 'rotate-2' },
  { emoji: '🧾', title: 'Aura, with receipts', body: 'Every point gained or lost is logged with the exact message that caused it.', tone: 'bg-mint', tilt: '-rotate-1' },
  { emoji: '⚔️', title: 'Games', body: 'Rizz battles, hot takes, "chat is this real?" votes, a betting market on who replies first.', tone: 'bg-peach', tilt: 'rotate-1' },
];
const SLANG = ['6 7', 'aura farming', 'crash out', 'unc behaviour', 'chopped', 'clanker', 'delulu', 'baad mein reply karta hu', 'quiet on the creek', 'larping', 'chin tapak dum dum', 'wow vs chee'];

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
    <div className="min-h-dvh overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark className="text-[22px]" />
        <form onSubmit={join} className="flex items-center gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase())} placeholder="CODE" aria-label="Room code" autoCapitalize="characters" className={`${fieldCls} h-9 w-[5.5rem] text-center font-mono font-bold tracking-[0.2em]`} />
          <Button size="sm" disabled={code.length !== 4}>Join</Button>
        </form>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-6 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-12">
          <div className="relative">
            <p className="brut-sm mb-6 inline-flex -rotate-2 items-center gap-2 rounded-lg bg-surface px-3 py-1 text-sm font-bold">
              <span aria-hidden>🤖</span> an AI that lives in your group chat
            </p>
            <h1 className="font-display text-[clamp(3.2rem,8.2vw,6.4rem)] uppercase leading-[0.92] tracking-[0.005em]">
              Your group chat is about to get{' '}
              <span className="relative inline-block -rotate-2 rounded-xl border-[3px] border-line bg-accent px-3 shadow-[6px_6px_0_var(--color-line)]">cooked</span>
            </h1>
            <p className="mt-7 max-w-lg text-lg font-medium leading-relaxed text-muted [text-wrap:pretty]">
              Cooked is a group chat with an AI member. It watches <b className="font-extrabold text-fg">how</b> people text: the 4-hour reply, the typing bubble that vanishes, the &ldquo;k&rdquo; after a paragraph. Then it roasts it and keeps score.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button variant="primary" size="lg" onClick={create} disabled={busy} className="h-14 px-7 text-lg">
                {busy ? 'Opening a room…' : 'Start a room'} <ArrowRight size={20} strokeWidth={2.75} />
              </Button>
              <a href="#how" className="text-sm font-extrabold underline decoration-[3px] decoration-acid underline-offset-4 hover:decoration-accent">How it works</a>
            </div>
            {err && <p role="alert" className="brut-sm mt-4 inline-block rounded-lg bg-lemon px-3 py-1.5 text-sm font-bold">{err}</p>}
            <p className="mt-6 text-xs font-semibold text-faint">Free, no sign-up. It roasts behaviour, never identity.</p>
            <span className="wiggle brut-sm absolute -right-2 top-0 hidden rounded-lg bg-bad px-2 py-1 font-display text-xl uppercase text-white [--r:8deg] sm:block" aria-hidden>-500 aura</span>
          </div>
          <div className="relative">
            <span className="wiggle absolute -left-6 -top-8 z-10 text-6xl drop-shadow-[3px_3px_0_var(--color-line)] [--r:-12deg]" aria-hidden>💀</span>
            <span className="brut-sm absolute -bottom-5 -right-3 z-10 rotate-6 rounded-lg bg-grape px-2 py-1 text-sm font-extrabold uppercase" aria-hidden>unc alert 👴</span>
            <span className="wiggle absolute -right-5 top-16 z-10 text-5xl drop-shadow-[3px_3px_0_var(--color-line)] [--r:10deg]" aria-hidden>🗿</span>
            <DemoChat />
          </div>
        </section>

        <div className="-rotate-1 border-y-[3px] border-line bg-fg py-3" aria-hidden>
          <div className="marquee flex w-max gap-8 whitespace-nowrap font-display text-2xl uppercase tracking-wide text-acid">
            {[...SLANG, ...SLANG].map((w, i) => <span key={i}>{w} <span className="text-accent">✦</span></span>)}
          </div>
        </div>

        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 className="font-display text-5xl uppercase leading-none">What it notices</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {NOTICES.map((n) => (
              <div key={n.title} className={`brut press rounded-2xl p-5 ${n.tone} ${n.tilt}`}>
                <div className="text-4xl" aria-hidden>{n.emoji}</div>
                <h3 className="mt-3 text-xl font-extrabold">{n.title}</h3>
                <p className="mt-1 text-[15px] font-medium leading-relaxed">{n.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto grid max-w-6xl gap-12 px-5 pb-20 sm:px-8 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="font-display text-5xl uppercase leading-none">How it works</h2>
            <ol className="mt-8 space-y-5">
              {[
                ['Start a room', 'You get a four-letter code and a QR code.'],
                ['Everyone scans in', 'Pick a name and a creature. No accounts.'],
                ['Just chat', 'The AI watches, reacts, keeps the aura board, and drops in when something is worth saying. Call it by its name ("gremlin", "ai") to talk to it.'],
              ].map(([t, b], i) => (
                <li key={t} className="flex gap-4">
                  <span className="brut-sm grid size-12 shrink-0 -rotate-3 place-items-center rounded-xl bg-acid font-display text-2xl">{i + 1}</span>
                  <div>
                    <div className="text-lg font-extrabold">{t}</div>
                    <div className="mt-0.5 font-medium text-muted">{b}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="brut-lg rotate-1 rounded-2xl bg-surface p-7">
            <div className="text-lg font-extrabold">🤫 It knows when to shut up</div>
            <p className="mt-3 font-medium leading-relaxed text-muted">
              Comedy is timing. The AI speaks about once every few messages and never twice in a row. Most of the time it just reacts with an emoji. The big moments (a 67, a mog, the room hitting 100% cooked) always get through, and so does anyone who talks to it directly.
            </p>
            <p className="mt-3 font-medium leading-relaxed text-muted">
              Running a demo? The admin panel tunes how chatty it is, warps the room clock, stages any moment on cue, and puts two AIs (Groq vs Gemma on Ollama) in the room to roast each other.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t-[3px] border-line bg-panel">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm font-semibold sm:px-8">
          <Wordmark />
          <span>made by <b className="font-extrabold">team struct</b> · Karan Garg &amp; Anushka Mohanty</span>
        </div>
      </footer>
    </div>
  );
}
