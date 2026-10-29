'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { Gamepad2, MessageCircle, Moon, QrCode, Sparkles, Users, Volume2, VolumeX } from 'lucide-react';
import { fryStage } from '@cooked/shared';
import type { BrainrotLevel, ChatMessage, PersonaId, RoastIntensity, SoundName } from '@cooked/shared';
import { loadIdentity, saveIdentity } from '@/lib/identity';
import type { Identity } from '@/lib/identity';
import { RoomActionsProvider, useBuildActions } from '@/lib/room-actions';
import { setMuted, unlockAudio } from '@/lib/sounds';
import { useLiveRoom } from '@/lib/use-live-room';
import { CookedMeter } from '../cooked-meter';
import { FxLayer } from '../fx-layer';
import { QrDialog } from '../qr-dialog';
import { Button, Chip, Wordmark } from '../ui';
import { AuraPanel } from './aura-panel';
import { BreakingBanner } from './breaking-banner';
import { Composer } from './composer';
import { Gameplay } from './gameplay';
import { GamesPanel } from './games-panel';
import { JoinGate } from './join-gate';
import { MessageList } from './message-list';
import { ProfileDialog } from './profile-dialog';
import { RoomPanel } from './room-panel';
import { SidePanel } from './side-panel';
import { Soundboard } from './soundboard';

type Tab = 'chat' | 'aura' | 'fun' | 'room';

export function RoomView({ code }: { code: string }) {
  const [saved, setSaved] = useState<Identity | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  useEffect(() => setSaved(loadIdentity()), []);
  if (!identity) {
    return <JoinGate code={code} saved={saved} onEnter={(i) => { saveIdentity(i); setIdentity(i); }} />;
  }
  return <LiveRoom code={code} identity={identity} />;
}

function LiveRoom({ code, identity }: { code: string; identity: Identity }) {
  const mode = useMemo(() => ({ kind: 'member' as const, identity }), [identity]);
  const { state, socket } = useLiveRoom(code, mode);
  const actions = useBuildActions(socket, state.members, state.meId);
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
  const stage = fryStage(state.cooked);
  const live = state.status === 'ready';
  const online = state.members.filter((m) => m.online).length;

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
  const onTyping = useCallback((st: 'start' | 'tick' | 'stop', len: number, cleared?: boolean) => socket.current?.emit('typing', { state: st, len, cleared }), [socket]);
  const onEdit = useCallback((id: string, text: string) => socket.current?.emit('chat:edit', { id, text }), [socket]);
  const onDelete = useCallback((id: string) => socket.current?.emit('chat:delete', { id }), [socket]);
  const onSeen = useCallback((id: string) => socket.current?.emit('chat:seen', { id }), [socket]);
  const onSound = useCallback((name: SoundName) => socket.current?.emit('sound:play', { name }), [socket]);
  const onReact = useCallback((id: string, emoji: string) => socket.current?.emit('chat:react', { id, emoji }), [socket]);
  const onVibe = useCallback((p: { persona?: PersonaId; brainrot?: BrainrotLevel; intensity?: RoastIntensity }) => socket.current?.emit('room:vibe', p), [socket]);
  const toggleMute = () => { unlockAudio(); setMutedState((m) => !m); };

  if (state.status === 'error') {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="max-w-sm">
          <div className="text-5xl">🫩</div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">{state.error === 'room not found' ? `Room ${code} doesn't exist` : "Couldn't get in"}</h1>
          <p className="mt-2 text-sm text-muted">{state.error === 'room not found' ? 'Check the code, or start a new room.' : state.error}</p>
          <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink">Back home</Link>
        </div>
      </main>
    );
  }

  const panel = (
    <RoomPanel code={code} members={state.members} meId={state.meId} settings={state.settings} muted={muted} voice={voice} onToggleMute={toggleMute} onToggleVoice={() => setVoice((v) => !v)} onVibe={onVibe} onProfile={setProfileId} onInvite={() => setQrOpen(true)} />
  );
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Chat', icon: <MessageCircle size={20} /> },
    { id: 'aura', label: 'Aura', icon: <Sparkles size={20} /> },
    { id: 'fun', label: 'Games', icon: <Gamepad2 size={20} /> },
    { id: 'room', label: 'Room', icon: <Users size={20} /> },
  ];

  return (
    <RoomActionsProvider value={actions}>
      <div id="stage" data-fry={Math.min(3, stage)} className="flex h-dvh flex-col bg-bg lg:flex-row">
        <aside className="hidden w-[272px] shrink-0 flex-col border-r border-line bg-panel lg:flex">
          <div className="flex h-14 shrink-0 items-center border-b border-line px-4"><Link href="/" aria-label="Home"><Wordmark /></Link></div>
          {panel}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4 pt-[env(safe-area-inset-top)]">
            <Link href="/" aria-label="Home" className="lg:hidden"><Wordmark /></Link>
            <div className="hidden min-w-0 lg:block">
              <div className="text-sm font-semibold">Room <span className="font-mono tracking-wider">{code}</span></div>
              <div className="text-xs text-faint">{online} online</div>
            </div>
            {midnight && <Chip tone="ollama" className="hidden sm:inline-flex"><Moon size={11} /> midnight mode</Chip>}
            <div className="ml-auto flex items-center gap-2">
              <CookedMeter value={state.cooked} compact />
              <Button size="sm" variant="ghost" onClick={() => setQrOpen(true)} aria-label="Show invite QR code"><QrCode size={16} /><span className="font-mono text-xs lg:hidden">{code}</span></Button>
              <Button size="sm" variant="ghost" className="hidden lg:inline-flex" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</Button>
            </div>
          </header>
          {!live && <div className="border-b border-warn/20 bg-warn/10 px-4 py-1.5 text-center text-xs text-warn" role="status">connecting… (the free server can take ~30s to wake up)</div>}

          <main className={clsx('min-h-0 flex-1 flex-col', tab === 'chat' ? 'flex' : 'hidden lg:flex')}>
            <MessageList messages={state.messages} members={state.members} meId={state.meId} settings={state.settings} typingIds={state.typingIds} thinking={state.thinking} onEdit={onEdit} onDelete={onDelete} onSeen={onSeen} onReact={onReact} onReply={setReplyTo} onProfile={setProfileId} />
            <Composer disabled={!live} replyTo={replyTo ? { name: state.members.find((m) => m.id === replyTo.authorId)?.name ?? '?', text: replyTo.text } : null} onCancelReply={() => setReplyTo(null)} onSend={send} onTyping={onTyping} />
          </main>

          {tab !== 'chat' && (
            <section className="min-h-0 flex-1 overflow-y-auto p-4 scroll-thin lg:hidden">
              {tab === 'aura' && <AuraPanel members={state.members} ledger={state.ledger} meId={state.meId} onProfile={setProfileId} />}
              {tab === 'fun' && <div className="space-y-8"><GamesPanel /><Soundboard onPlay={onSound} /><Gameplay /></div>}
              {tab === 'room' && <div className="-m-4 flex min-h-full flex-col">{panel}</div>}
            </section>
          )}

          <nav className="safe-b grid shrink-0 grid-cols-4 border-t border-line bg-panel lg:hidden" aria-label="Sections">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id} className={clsx('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors', tab === t.id ? 'text-fg' : 'text-faint')}>
                <span className={clsx('rounded-full px-4 py-1 transition-colors', tab === t.id && 'bg-surface text-accent')}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <aside className="hidden w-[340px] shrink-0 flex-col border-l border-line bg-panel lg:flex">
          <SidePanel members={state.members} ledger={state.ledger} meId={state.meId} onProfile={setProfileId} onSound={onSound} />
        </aside>
      </div>
      <div className={clsx('fry-noise', stage >= 3 && 'on')} aria-hidden />
      <FxLayer />
      <BreakingBanner messages={state.messages} ready={live} />
      <QrDialog code={code} open={qrOpen} onClose={() => setQrOpen(false)} />
      <ProfileDialog member={state.members.find((m) => m.id === profileId) ?? null} onClose={() => setProfileId(null)} />
      {midnight && <div className="pointer-events-none fixed inset-0 z-30 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgb(20_30_70/0.35))]" aria-hidden />}
    </RoomActionsProvider>
  );
}
