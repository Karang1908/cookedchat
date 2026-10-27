'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { BorderBeam } from 'border-beam';
import { Eye, Flame, Gauge, Music2, Sparkles, UserRound } from 'lucide-react';
import { Goblin3D } from '@/components/goblin3d';
import { MetalCta } from '@/components/metal-cta';
import { createSocket } from '@/lib/socket';

const DEMO_LINES = [
  { who: 'Gen Z Gremlin', text: 'bro went to the shadow realm for 4 hours 💀' },
  { who: 'Sports Commentator', text: 'AND HE LEFT HER ON READ, WHAT A PLAY FROM DEV 🎙️' },
  { who: 'Nature Documentary', text: 'Here we see the human in his natural habitat, ignoring a text. 🦁' },
  { who: 'Gen Z Gremlin', text: 'fanum tax collected 🍟  -50 aura' },
  { who: 'Passive-Aggressive Mom', text: "No, it's fine. Nobody has to reply. I'll just sit here. 👩" },
  { who: 'Gen Z Gremlin', text: 'we all saw you type that essay 👁️' },
];

const FEATURES = [
  { icon: Eye, title: 'It interrupts', body: 'Typing drama, dry texts, left on read, 9 messages in a row. It saw all of it.' },
  { icon: Sparkles, title: 'Aura with receipts', body: 'Every point gained or lost is logged with the exact message that caused it.' },
  { icon: Flame, title: 'Deep fry UI', body: 'The more unhinged the chat gets, the more the interface degrades. It heals when you calm down.' },
  { icon: Music2, title: 'Soundboard + effects', body: 'Vine boom, airhorn, screen shake, emoji rain. 67 triggers a full meltdown.' },
  { icon: UserRound, title: 'Pick a voice', body: 'Gremlin, sports commentator, nature documentary, passive-aggressive mom, and more.' },
  { icon: Gauge, title: 'Cooked-o-meter', body: 'Hit 100% and the whole room melts down together. IT’S OVER.' },
];

export default function Landing() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [i, setI] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const t = setInterval(() => setI((n) => (n + 1) % DEMO_LINES.length), 3200);
    return () => {
      mounted.current = false;
      clearInterval(t);
    };
  }, []);

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
    const timer = setTimeout(() => fail('The server is asleep (free tier). Give it ~30 seconds and try again.'), 12_000);
    socket.on('connect', () => {
      socket.emit('room:create', { tzOffsetMin: -new Date().getTimezoneOffset() }, (a) => {
        clearTimeout(timer);
        socket.close();
        if (a.ok) router.push(`/r/${a.code}`);
        else fail(a.error);
      });
    });
  };

  const demo = DEMO_LINES[i]!;
  return (
    <main className="relative mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8">
      <nav className="flex items-center justify-between">
        <span className="font-display text-2xl uppercase tracking-wider">Cooked <span className="text-blurple-soft">Chat</span> 💀</span>
        <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-mute">hackathon build</span>
      </nav>

      <section className="grid items-center gap-6 pt-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-12">
        <div>
          <h1 className="font-display text-[clamp(2.75rem,7.2vw,5.5rem)] uppercase leading-[0.9] tracking-wide">
            the AI that <span className="bg-gradient-to-r from-blurple-soft via-magenta to-ember bg-clip-text text-transparent">lives in your group chat</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-mute">
            It doesn&apos;t wait to be asked. It watches how you actually behave &mdash; reply speed, typing drama, dry texts &mdash; then interrupts, roasts, and scores your aura. In current brainrot.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <MetalCta>
              <button onClick={create} disabled={busy} className="rounded-full bg-ink-900 px-8 py-4 font-display text-2xl uppercase tracking-wider text-white transition enabled:active:scale-95 disabled:opacity-60">
                {busy ? 'Summoning…' : 'Start a room'}
              </button>
            </MetalCta>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (/^[A-Za-z]{4}$/.test(code)) router.push(`/r/${code.toUpperCase()}`);
              }}
            >
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase())} placeholder="CODE" aria-label="Room code" inputMode="text" autoCapitalize="characters" className="w-28 rounded-full border border-white/10 bg-ink-800 px-5 py-3.5 text-center font-mono text-lg tracking-[0.3em] outline-none transition focus:border-blurple" />
              <button disabled={code.length !== 4} className="rounded-full border border-white/15 px-5 py-3.5 font-semibold transition enabled:hover:bg-white/10 disabled:opacity-40">Join</button>
            </form>
          </div>
          {err && <p role="alert" className="mt-3 text-sm text-sun">{err}</p>}
          <p className="mt-4 text-xs text-mute">Everyone is told the AI roasts when they join. It roasts behavior, never identity.</p>
        </div>

        <div className="relative">
          <Goblin3D heat={0.15} className="mx-auto h-[300px] w-full max-w-[420px] sm:h-[400px]" />
          <div className="mx-auto -mt-4 min-h-[104px] max-w-sm">
            <AnimatePresence mode="wait">
              <motion.div key={i} initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.28 }}>
                <BorderBeam size="md" colorVariant="colorful" strength={0.8} duration={3}>
                  <div className="rounded-2xl border border-white/10 bg-ink-800/95 px-4 py-3" style={{ borderRadius: 16 }}>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-magenta">{demo.who}</div>
                    <p className="mt-0.5 text-base font-medium leading-snug">{demo.text}</p>
                  </div>
                </BorderBeam>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Features">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="glass rounded-2xl p-5 transition hover:border-blurple/50">
            <Icon className="text-blurple-soft" size={22} />
            <h3 className="mt-3 font-display text-2xl uppercase tracking-wide">{title}</h3>
            <p className="mt-1 text-sm text-mute">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
