'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ThinkingOrb } from 'thinking-orbs';
import { ArrowDown, Check, CornerUpLeft, ImagePlus, Languages, Pencil, SmilePlus, Trash2, X } from 'lucide-react';
import { MODEL_LABEL, PERSONAS, SIDE_LABEL, STICKER, isDry } from '@cooked/shared';
import type { ChatMessage, Member, RoomSettings } from '@cooked/shared';
import { clockTime } from '@/lib/format';
import { useRoomActions } from '@/lib/room-actions';
import { Avatar } from '../avatar';
import { Chip } from '../ui';
import { CardView } from './card-view';

interface Props {
  messages: ChatMessage[];
  members: Member[];
  meId?: string;
  settings: RoomSettings;
  typingIds: string[];
  thinking: boolean;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onSeen: (id: string) => void;
  onReact: (id: string, emoji: string) => void;
  onReply: (m: ChatMessage) => void;
  onProfile: (memberId: string) => void;
}

const PICKER = ['🗿', '💀', '😭', '🫡', '🔥', '😂', '🥀', '🧢'];

const TRIGGER_LABEL: Record<string, string> = {
  six_seven: '67', fanum: 'fanum tax', reply_later: 'reply later', typing_drama: 'typing spy', typed_deleted: 'typing spy', slow_reply: 'shadow realm',
  burst: 'burst', dry_reply: 'dry text', edited: 'edit detector', deleted: 'delete detector', left_on_read: 'left on read', dead_chat: 'dead chat', tung_tung: '3am',
  cooked_max: 'cooked', ohio_high: 'ohio', cap: 'cap detector', tone_shift: 'tone shift', derail: 'topic derail', mewing: 'mewing', simp_radar: 'simp radar',
  missing: 'missing', owl: 'the owl', betrayal: 'betrayal', class_change: 'evolution', scouter: 'scouter', mog: 'mog', lore: 'lore', chaos: 'chaos agent',
  weather: 'forecast', replay: 'instant replay', tiers: 'daily tiers', duel: 'ai vs ai', copypasta: 'copypasta', vote_result: 'verdict', battle_result: 'verdict', bet_result: 'market',
};

export function MessageList({ messages, members, meId, settings, typingIds, thinking, onEdit, onDelete, onSeen, onReact, onReply, onProfile }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const seenSent = useRef(new Set<string>());
  const [unread, setUnread] = useState(0);
  const [editing, setEditing] = useState<{ id: string; draft: string } | null>(null);
  const [picker, setPicker] = useState<string | null>(null);
  /** tapped message: shows its toolbar on touch screens, where there is no hover */
  const [selected, setSelected] = useState<string | null>(null);
  const actions = useRoomActions();
  const [tmenu, setTmenu] = useState<string | null>(null);
  /** menus open above the message, or below it when the message is too close to the top of the log to fit them */
  const [menuDir, setMenuDir] = useState<'up' | 'down'>('up');
  const dirFor = (el: HTMLElement, need: number): 'up' | 'down' => {
    const sc = scroller.current;
    return !sc || el.getBoundingClientRect().top - sc.getBoundingClientRect().top >= need ? 'up' : 'down';
  };
  const [translations, setTranslations] = useState<Record<string, { mode: string; text: string; via?: string; error?: string }>>({});
  const [flash, setFlash] = useState<{ id: string; text: string } | null>(null);
  const translate = async (id: string, mode: 'brainrot' | 'plain' | 'dry') => {
    setTmenu(null);
    const r = await actions.translate(id, mode);
    setTranslations((t) => ({ ...t, [id]: 'error' in r ? { mode, text: '', error: r.error } : { mode, ...r } }));
  };
  const meme = async (id: string) => {
    const err = await actions.makeMeme(id);
    if (err) {
      setFlash({ id, text: err });
      setTimeout(() => setFlash((f) => (f?.id === id ? null : f)), 3000);
    }
  };
  const byId = new Map(members.map((m) => [m.id, m]));
  const msgById = new Map(messages.map((m) => [m.id, m]));
  const lastAiId = [...messages].reverse().find((m) => m.kind === 'ai')?.id;

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (pinned.current) el.scrollTo({ top: el.scrollHeight });
    else if (messages.at(-1)?.authorId !== meId) setUnread((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, thinking, typingIds.length]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.mid;
          if (e.isIntersecting && id && document.visibilityState === 'visible' && !seenSent.current.has(id)) {
            seenSent.current.add(id);
            onSeen(id);
          }
        }
      },
      { root: el, threshold: 0.6 },
    );
    el.querySelectorAll('[data-mid]').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [messages.length, onSeen]);

  const typingNames = typingIds.filter((id) => id !== meId).map((id) => byId.get(id)?.name ?? '?');
  const thinkingPersona = PERSONAS[settings.persona];

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          if (pinned.current) setUnread(0);
        }}
        onClick={() => { setPicker(null); setTmenu(null); setSelected(null); }}
        className="scroll-thin absolute inset-0 space-y-1 overflow-y-auto px-3 py-5 sm:px-6"
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="mx-auto mt-20 max-w-xs text-center">
            <div className="text-4xl">🗿</div>
            <p className="mt-3 font-semibold">It&apos;s quiet in here</p>
            <p className="mt-1 text-sm text-muted">The AI is watching. Invite people with the QR code, then say something.</p>
          </div>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          if (m.kind === 'card') return <CardView key={m.id} m={m} />;
          if (m.kind === 'ai') return <AiCard key={m.id} m={m} latest={m.id === lastAiId} onReact={onReact} meId={meId} />;
          const author = m.authorId ? byId.get(m.authorId) : undefined;
          const mine = m.authorId === meId;
          const header = !prev || prev.kind !== 'user' || prev.authorId !== m.authorId || m.at - prev.at > 120_000;
          const isEditing = editing?.id === m.id;
          const quoted = m.replyToId ? msgById.get(m.replyToId) : undefined;
          return (
            <div key={m.id} data-mid={!mine && m.kind === 'user' ? m.id : undefined} className={clsx('group pop-in flex gap-2', mine && 'flex-row-reverse', header && i > 0 && 'pt-2', (tmenu === m.id || picker === m.id) && 'relative z-30')}>
              {!mine && (header && author ? <button onClick={() => onProfile(author.id)} aria-label={`${author.name} profile`}><Avatar type={author.avatar} size={36} /></button> : <div className="w-9 shrink-0" />)}
              <div className={clsx('flex min-w-0 max-w-[80%] flex-col', mine ? 'items-end' : 'items-start')}>
                {header && !mine && (
                  <div className="mb-1 flex items-center gap-1.5 text-[13px]">
                    <span className="font-semibold text-fg">{author?.name ?? 'unknown'}</span>
                    {author?.isBot && <Chip>bot</Chip>}
                    <span className="text-[11px] text-faint">{clockTime(m.at)}</span>
                  </div>
                )}
                {quoted && (
                  <div className="mb-1 max-w-full truncate border-l-2 border-line-strong pl-2 text-xs text-faint">
                    <b className="font-semibold text-muted">{byId.get(quoted.authorId ?? '')?.name ?? '?'}</b> {quoted.deleted ? 'deleted message' : quoted.text}
                  </div>
                )}
                <div className="relative">
                  {isEditing ? (
                    <form
                      className="flex items-center gap-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (editing.draft.trim()) onEdit(m.id, editing.draft);
                        setEditing(null);
                      }}
                    >
                      <input autoFocus value={editing.draft} onChange={(e) => setEditing({ id: m.id, draft: e.target.value })} onKeyDown={(e) => e.key === 'Escape' && setEditing(null)} className="w-56 rounded-xl border border-accent/70 bg-surface px-3 py-2 text-[15px] outline-none" maxLength={500} />
                      <button type="submit" aria-label="Save edit" className="rounded-lg bg-good/15 p-1.5 text-good"><Check size={16} /></button>
                      <button type="button" aria-label="Cancel edit" onClick={() => setEditing(null)} className="rounded-lg bg-surface p-1.5 text-muted"><X size={16} /></button>
                    </form>
                  ) : (
                    <div onClick={(e) => { e.stopPropagation(); setSelected(selected === m.id ? null : m.id); }} className={clsx('whitespace-pre-wrap break-words rounded-[18px] px-3.5 py-2 text-[15px] leading-snug', mine ? 'rounded-br-md bg-[#ececf1] text-[#141418]' : 'rounded-bl-md bg-surface text-fg')}>
                      {m.deleted ? <em className="opacity-50">message deleted</em> : m.text}
                      {m.edited && !m.deleted && <span className="ml-1.5 text-[10px] opacity-60">(edited)</span>}
                    </div>
                  )}
                  {!m.deleted && !isEditing && (
                    <div className={clsx('absolute -top-4 z-10 flex gap-0.5 rounded-lg bg-raised p-0.5 shadow-lg ring-1 ring-line transition-opacity focus-within:opacity-100 group-hover:opacity-100', mine ? 'right-1' : 'left-1', selected === m.id ? 'opacity-100' : 'opacity-0')}>
                      <IconBtn label="Reply" onClick={() => onReply(m)}><CornerUpLeft size={13} /></IconBtn>
                      <IconBtn label="React" onClick={(e) => { e.stopPropagation(); setTmenu(null); setMenuDir(dirFor(e.currentTarget as HTMLElement, 70)); setPicker(picker === m.id ? null : m.id); }}><SmilePlus size={13} /></IconBtn>
                      <IconBtn label="Translate" onClick={(e) => { e.stopPropagation(); setPicker(null); setMenuDir(dirFor(e.currentTarget as HTMLElement, 140)); setTmenu(tmenu === m.id ? null : m.id); }}><Languages size={13} /></IconBtn>
                      <IconBtn label="Make a meme" onClick={() => void meme(m.id)}><ImagePlus size={13} /></IconBtn>
                      {mine && <IconBtn label="Edit message" onClick={() => setEditing({ id: m.id, draft: m.text })}><Pencil size={13} /></IconBtn>}
                      {mine && <IconBtn label="Delete message" onClick={() => onDelete(m.id)} danger><Trash2 size={13} /></IconBtn>}
                    </div>
                  )}
                  {tmenu === m.id && (
                    <div onClick={(e) => e.stopPropagation()} className={clsx('pop-in absolute z-20 flex w-max flex-col whitespace-nowrap rounded-xl bg-raised p-1 text-[13px] font-medium shadow-xl ring-1 ring-line', mine ? 'right-0' : 'left-0', menuDir === 'up' ? '-top-[7.5rem]' : 'top-full mt-1')} role="menu" aria-label="Translate">
                      <button role="menuitem" onClick={() => void translate(m.id, 'brainrot')} className="rounded-lg px-3 py-1.5 text-left hover:bg-surface">🧠 to brainrot</button>
                      <button role="menuitem" onClick={() => void translate(m.id, 'plain')} className="rounded-lg px-3 py-1.5 text-left hover:bg-surface">👴 to plain English</button>
                      {isDry(m.text) && <button role="menuitem" onClick={() => void translate(m.id, 'dry')} className="rounded-lg px-3 py-1.5 text-left hover:bg-surface">🔍 what they really meant</button>}
                    </div>
                  )}
                  {picker === m.id && (
                    <div onClick={(e) => e.stopPropagation()} className={clsx('pop-in absolute z-20 flex w-max gap-0.5 rounded-xl bg-raised p-1 shadow-xl ring-1 ring-line', mine ? 'right-0' : 'left-0', menuDir === 'up' ? '-top-12' : 'top-full mt-1')} role="menu" aria-label="Pick a reaction">
                      {PICKER.map((e) => (
                        <button key={e} role="menuitem" onClick={() => { onReact(m.id, e); setPicker(null); }} className="rounded-lg px-1.5 py-1 text-lg transition hover:scale-110 hover:bg-surface">{e}</button>
                      ))}
                    </div>
                  )}
                </div>
                <Reactions m={m} meId={meId} onReact={onReact} />
                {translations[m.id] && (
                  <div className="pop-in mt-1.5 flex max-w-full items-start gap-1.5 rounded-lg bg-surface px-2.5 py-1.5 text-xs ring-1 ring-line" role="note">
                    <span aria-hidden>{{ brainrot: '🧠', plain: '👴', dry: '🔍' }[translations[m.id]!.mode]}</span>
                    {translations[m.id]!.error ? <span className="text-bad">{translations[m.id]!.error}</span> : <span className="break-words text-fg"><i className="not-italic text-faint">{translations[m.id]!.mode === 'dry' ? 'what they really meant: ' : `${translations[m.id]!.mode}: `}</i>{translations[m.id]!.text}</span>}
                    <button onClick={() => setTranslations(({ [m.id]: _gone, ...rest }) => rest)} aria-label="Dismiss translation" className="ml-1 text-faint hover:text-fg"><X size={12} /></button>
                  </div>
                )}
                {flash?.id === m.id && <span role="status" className="mt-1 rounded-lg bg-bad/10 px-2 py-0.5 text-xs text-bad">{flash.text}</span>}
                {(mine || (m.ohio ?? 0) >= 50) && !m.deleted && (
                  <div className="mt-1 flex items-center gap-2 px-1 text-[11px] text-faint">
                    {mine && <span>{clockTime(m.at)}</span>}
                    {(m.ohio ?? 0) >= 50 && <Chip tone={(m.ohio ?? 0) >= 85 ? 'bad' : 'warn'} className="font-mono">ohio {m.ohio}%</Chip>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {thinking && (
          <div className="pop-in flex items-center gap-2.5 py-1 pl-1 text-[13px] text-muted">
            <ThinkingOrb state="composing" size={20} />
            {thinkingPersona.emoji} {thinkingPersona.label} is typing…
          </div>
        )}
        {typingNames.length > 0 && (
          <div className="flex items-center gap-2 px-1 pt-1 text-xs text-faint">
            <span className="inline-flex gap-0.5" aria-hidden>
              {[0, 1, 2].map((d) => (
                <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d * 120}ms` }} />
              ))}
            </span>
            {typingNames.length === 1 ? `${typingNames[0]} is typing…` : `${typingNames.length} people are typing…`}
          </div>
        )}
      </div>
      {unread > 0 && (
        <button
          onClick={() => {
            scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
            setUnread(0);
          }}
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-raised px-3 py-1.5 text-xs font-semibold shadow-lg ring-1 ring-line-strong"
        >
          <ArrowDown size={14} /> {unread} new
        </button>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, danger, children }: { label: string; onClick: (e: React.MouseEvent) => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className={clsx('rounded-md p-1.5 text-muted transition-colors hover:bg-surface', danger ? 'hover:text-bad' : 'hover:text-fg')}>
      {children}
    </button>
  );
}

/** AI reactions (who it judged) plus member reactions (click to toggle yours) */
function Reactions({ m, meId, onReact }: { m: ChatMessage; meId?: string; onReact: (id: string, emoji: string) => void }) {
  const user = Object.entries(m.reactions ?? {});
  if (!m.aiReactions.length && !user.length) return null;
  return (
    <div className="-mt-1.5 flex flex-wrap gap-1 px-1">
      {m.aiReactions.map((e) => (
        <span key={`ai-${e}`} title="the AI reacted" className="pop-in rounded-full bg-raised px-1.5 py-0.5 text-sm ring-1 ring-accent/40">{e}</span>
      ))}
      {user.map(([e, ids]) => (
        <button key={e} onClick={() => onReact(m.id, e)} aria-pressed={!!meId && ids.includes(meId)} className={clsx('pop-in flex items-center gap-1 rounded-full px-1.5 py-0.5 text-sm ring-1 transition-colors', meId && ids.includes(meId) ? 'bg-accent/12 ring-accent/50' : 'bg-raised ring-line hover:ring-line-strong')}>
          {e}<span className="font-mono text-[11px] text-muted">{ids.length}</span>
        </button>
      ))}
    </div>
  );
}

function AiCard({ m, onReact, meId }: { m: ChatMessage; latest: boolean; onReact: (id: string, emoji: string) => void; meId?: string }) {
  const persona = PERSONAS[m.persona ?? 'gremlin'];
  const sticker = m.trigger ? STICKER[m.trigger] : undefined;
  const gif = m.gif && isGiphy(m.gif) ? m.gif : undefined;
  const rule = m.side === 'ollama' ? 'bg-ollama' : 'bg-accent';
  const tone = m.side === 'ollama' ? 'text-ollama' : 'text-accent';
  const via = m.model && m.model !== 'canned' ? MODEL_LABEL[m.model] ?? m.model : undefined;
  return (
    <div className="pop-in my-3 flex gap-3 pr-1" data-ai-line>
      <span className={clsx('w-[3px] shrink-0 rounded-full', rule)} aria-hidden />
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs" title={via ? `written by ${via}` : undefined} data-ai-label>
          <span aria-hidden>{persona.emoji}</span>
          <span className={clsx('font-semibold', tone)}>{persona.label}</span>
          {m.trigger && <span className="text-faint">· {TRIGGER_LABEL[m.trigger] ?? m.trigger}</span>}
          {m.side && <Chip tone={m.side}>{SIDE_LABEL[m.side]}</Chip>}
        </div>
        <p className="mt-1 break-words text-[15px] font-medium leading-snug text-fg">{m.text}</p>
        {gif && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={gif} alt="reaction gif" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="mt-2 max-h-44 rounded-xl ring-1 ring-line" />
        )}
        <div className="mt-1"><Reactions m={m} meId={meId} onReact={onReact} /></div>
      </div>
      {sticker && <span className="shrink-0 -rotate-6 self-start text-3xl leading-none" aria-hidden>{sticker}</span>}
    </div>
  );
}

/** the server only attaches https giphy.com urls; check again so a bad value can never make the page load another host */
function isGiphy(u: string): boolean {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' && (x.hostname === 'giphy.com' || x.hostname.endsWith('.giphy.com'));
  } catch {
    return false;
  }
}
