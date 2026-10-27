'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { MessageCircle, QrCode, Sparkles, Users, Zap } from 'lucide-react';
import { fryStage } from '@cooked/shared';
import type { BrainrotLevel, ChatMessage, PersonaId, RoastIntensity, SoundName } from '@cooked/shared';
import { loadIdentity, saveIdentity } from '@/lib/identity';
import type { Identity } from '@/lib/identity';
import { setMuted, unlockAudio } from '@/lib/sounds';
import { RoomActionsProvider, useBuildActions } from '@/lib/room-actions';
import { useLiveRoom } from '@/lib/use-live-room';
import { CookedMeter } from '../cooked-meter';
import { FxLayer } from '../fx-layer';
import { QrDialog } from '../qr-dialog';
import { AuraPanel } from './aura-panel';
import { BreakingBanner } from './breaking-banner';
import { Composer } from './composer';
import { Gameplay } from './gameplay';
import { GamesPanel } from './games-panel';
import { JoinGate } from './join-gate';
import { MessageList } from './message-list';
import { ProfileDialog } from './profile-dialog';
import { RoomPanel } from './room-panel';
import { Soundboard } from './soundboard';

type Tab = 'chat' | 'aura' | 'fun' | 'room';

export function RoomView({ code }: { code: string }) {
  const [saved, setSaved] = useState<Identity | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  useEffect(() => setSaved(loadIdentity()), []);

  if (!identity) {
    return (
      <JoinGate
        code={code}
        saved={saved}
        onEnter={(i) => {
          saveIdentity(i);
          setIdentity(i);
        }}
      />
    );
  }
  return <LiveRoom code={code} identity={identity} />;
}

function LiveRoom({ code, identity }: { code: string; identity: Identity }) {
  const mode = useMemo(() => ({ kind: 'member' as const, identity }), [identity]);
  const { state, socket } = useLiveRoom(code, mode);
  const [tab, setTab] = useState<Tab>('chat');
  const [qrOpen, setQrOpen] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [voice, setVoice] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);
  const hour = new Date(clock + state.clockOffsetMs + state.tzOffsetMin * 60_000).getUTCHours();
  const midnight = hour >= 1 && hour < 5;

  const actions = useBuildActions(socket, state.members, state.meId);
  const stage = fryStage(state.cooked);
  const live = state.status === 'ready';

  useEffect(() => setMuted(muted), [muted]);

  // robot voice: read new AI lines aloud
  const lastAi = state.messages.findLast((m) => m.kind === 'ai');
  useEffect(() => {
    if (!voice || !lastAi || typeof speechSynthesis === 'undefined') return;
    const plain = lastAi.text.replace(/\p{Extended_Pictographic}|️|‍/gu, '').trim();
    if (plain) speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(plain), { rate: 1.1, pitch: 0.9 }));
    return () => void speechSynthesis.cancel();
  }, [voice, lastAi?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback(
    (text: string) =>
      new Promise<string | null>((resolve) => {
        const s = socket.current;
        if (!s?.connected) return resolve('offline, reconnecting…');
        const t = setTimeout(() => resolve('server is slow, try again'), 5000);
        s.emit('chat:send', { text, replyToId: replyTo?.id }, (a) => {
          clearTimeout(t);
          if (a.ok) setReplyTo(null);
          resolve(a.ok ? null : a.error);
        });
      }),
    [socket, replyTo],
  );
  const onReact = useCallback((id: string, emoji: string) => socket.current?.emit('chat:react', { id, emoji }), [socket]);
  const onVibe = useCallback((p: { persona?: PersonaId; brainrot?: BrainrotLevel; intensity?: RoastIntensity }) => socket.current?.emit('room:vibe', p), [socket]);
  const onTyping = useCallback((st: 'start' | 'tick' | 'stop', len: number, cleared?: boolean) => socket.current?.emit('typing', { state: st, len, cleared }), [socket]);
  const onEdit = useCallback((id: string, text: string) => socket.current?.emit('chat:edit', { id, text }), [socket]);
  const onDelete = useCallback((id: string) => socket.current?.emit('chat:delete', { id }), [socket]);
  const onSeen = useCallback((id: string) => socket.current?.emit('chat:seen', { id }), [socket]);
  const onSound = useCallback((name: SoundName) => socket.current?.emit('sound:play', { name }), [socket]);

  if (state.status === 'error') {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <div className="text-6xl">🫩</div>
          <h1 className="mt-4 font-display text-4xl uppercase">{state.error === 'room not found' ? `room ${code} doesn't exist` : "couldn't get in"}</h1>
          <p className="mt-2 text-mute">{state.error}</p>
          <Link href="/" className="mt-6 inline-block rounded-xl bg-blurple px-5 py-3 font-semibold">back home</Link>
        </div>
      </main>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Chat', icon: <MessageCircle size={20} /> },
    { id: 'aura', label: 'Aura', icon: <Sparkles size={20} /> },
    { id: 'fun', label: 'Chaos', icon: <Zap size={20} /> },
    { id: 'room', label: 'Room', icon: <Users size={20} /> },
  ];

  return (
    <RoomActionsProvider value={actions}>
      <div id="stage" data-fry={Math.min(3, stage)} className="flex h-dvh flex-col lg:block">
        <div className="mx-auto grid min-h-0 w-full max-w-[1500px] flex-1 grid-cols-[minmax(0,1fr)] lg:h-full lg:grid-cols-[300px_minmax(0,1fr)_340px]">
          <aside className={clsx('min-h-0 flex-col border-white/5 p-4 lg:flex lg:border-r', tab === 'room' ? 'flex' : 'hidden')}>
            <Brand />
            <RoomPanel code={code} members={state.members} meId={state.meId} settings={state.settings} muted={muted} voice={voice} onToggleMute={() => { unlockAudio(); setMutedState((m) => !m); }} onToggleVoice={() => setVoice((v) => !v)} onVibe={onVibe} onProfile={setProfileId} />
          </aside>

          <main className={clsx('min-h-0 flex-col lg:flex', tab === 'chat' ? 'flex' : 'hidden')}>
            <header className="flex flex-col gap-2.5 border-b border-white/5 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-2xl uppercase tracking-wider lg:hidden">Cooked Chat</span>
                <span className="hidden font-mono text-xs uppercase tracking-widest text-mute lg:block">room {code}{midnight && <span className="ml-2 text-blurple-soft">🌙 midnight mode</span>}</span>
                {midnight && <span className="rounded-full bg-blurple/20 px-2 py-0.5 text-[11px] font-semibold text-blurple-soft lg:hidden">🌙 midnight</span>}
                <button onClick={() => setQrOpen(true)} className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-800 px-3 py-1.5 font-mono text-xs font-semibold tracking-widest lg:hidden" aria-label="Show invite QR code">
                  <QrCode size={14} /> {code}
                </button>
              </div>
              <CookedMeter value={state.cooked} />
            </header>
            {!live && <div className="bg-sun/15 px-4 py-2 text-center text-xs text-sun" role="status">connecting… (the free server can take ~30s to wake up)</div>}
            <MessageList messages={state.messages} members={state.members} meId={state.meId} settings={state.settings} typingIds={state.typingIds} thinking={state.thinking} onEdit={onEdit} onDelete={onDelete} onSeen={onSeen} onReact={onReact} onReply={setReplyTo} onProfile={setProfileId} />
            <Composer disabled={!live} replyTo={replyTo ? { name: state.members.find((m) => m.id === replyTo.authorId)?.name ?? '?', text: replyTo.text } : null} onCancelReply={() => setReplyTo(null)} onSend={send} onTyping={onTyping} />
          </main>

          <aside className={clsx('min-h-0 flex-col gap-4 overflow-y-auto border-white/5 p-4 scroll-thin lg:flex lg:border-l', tab === 'aura' || tab === 'fun' ? 'flex' : 'hidden')}>
            <div className={clsx('shrink-0 flex-col lg:flex', tab === 'aura' ? 'flex' : 'hidden')}>
              <AuraPanel members={state.members} ledger={state.ledger} meId={state.meId} onProfile={setProfileId} />
            </div>
            <div className={clsx('shrink-0 flex-col gap-4 lg:flex', tab === 'fun' ? 'flex' : 'hidden')}>
              <GamesPanel />
              <Soundboard onPlay={onSound} />
              <Gameplay />
            </div>
          </aside>
        </div>

        <nav className="safe-b grid grid-cols-4 border-t border-white/10 bg-ink-900/90 backdrop-blur lg:hidden" aria-label="Sections">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id} className={clsx('flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', tab === t.id ? 'text-white' : 'text-mute')}>
              <span className={clsx('rounded-full px-4 py-1 transition', tab === t.id && 'bg-blurple/30')}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      <div className={clsx('fry-noise', stage >= 3 && 'on')} aria-hidden />
      <FxLayer />
      <BreakingBanner messages={state.messages} ready={live} />
      <QrDialog code={code} open={qrOpen} onClose={() => setQrOpen(false)} />
      <ProfileDialog member={state.members.find((m) => m.id === profileId) ?? null} onClose={() => setProfileId(null)} />
      {midnight && <div className="pointer-events-none fixed inset-0 z-30 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(30_10_80/0.45))]" aria-hidden />}
    </RoomActionsProvider>
  );
}

function Brand() {
  return (
    <Link href="/" className="mb-4 block font-display text-3xl uppercase leading-none tracking-wider">
      Cooked <span className="bg-gradient-to-r from-blurple-soft to-magenta bg-clip-text text-transparent">Chat</span> 💀
    </Link>
  );
}
