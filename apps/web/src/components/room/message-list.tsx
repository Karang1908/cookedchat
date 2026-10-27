'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { BorderBeam } from 'border-beam';
import { ThinkingOrb } from 'thinking-orbs';
import { ArrowDown, Check, Pencil, Trash2, X } from 'lucide-react';
import { PERSONAS } from '@cooked/shared';
import type { ChatMessage, Member, RoomSettings } from '@cooked/shared';
import { clockTime } from '@/lib/format';
import { Avatar } from '../avatar';

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
}

const TRIGGER_LABEL: Record<string, string> = {
  six_seven: '67', fanum: 'fanum tax', reply_later: 'reply later', typing_drama: 'typing spy', typed_deleted: 'typing spy', slow_reply: 'shadow realm',
  burst: 'burst', dry_reply: 'dry text', edited: 'edit detector', deleted: 'delete detector', left_on_read: 'left on read', dead_chat: 'dead chat', tung_tung: '3am', cooked_max: 'cooked',
};

export function MessageList({ messages, members, meId, settings, typingIds, thinking, onEdit, onDelete, onSeen }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const seenSent = useRef(new Set<string>());
  const [unread, setUnread] = useState(0);
  const [editing, setEditing] = useState<{ id: string; draft: string } | null>(null);
  const byId = new Map(members.map((m) => [m.id, m]));
  const persona = PERSONAS[settings.persona];
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

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          if (pinned.current) setUnread(0);
        }}
        className="scroll-thin absolute inset-0 space-y-1 overflow-y-auto px-3 py-4 sm:px-5"
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="mx-auto mt-16 max-w-xs text-center text-mute">
            <div className="text-5xl">🗿</div>
            <p className="mt-3 text-sm">Nobody has said anything yet. The AI is watching. Say something.</p>
          </div>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          if (m.kind === 'ai') return <AiCard key={m.id} m={m} persona={persona} latest={m.id === lastAiId} />;
          const author = m.authorId ? byId.get(m.authorId) : undefined;
          const mine = m.authorId === meId;
          const header = !prev || prev.kind !== 'user' || prev.authorId !== m.authorId || m.at - prev.at > 120_000;
          const isEditing = editing?.id === m.id;
          return (
            <div key={m.id} data-mid={!mine && m.kind === 'user' ? m.id : undefined} className={clsx('group pop-in flex gap-2', mine && 'flex-row-reverse', header && i > 0 && 'pt-2')}>
              {!mine && (header && author ? <Avatar type={author.avatar} size={36} /> : <div className="w-9 shrink-0" />)}
              <div className={clsx('flex min-w-0 max-w-[80%] flex-col', mine ? 'items-end' : 'items-start')}>
                {header && !mine && (
                  <div className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-blurple-soft">
                    {author?.name ?? 'unknown'}
                    {author?.isBot && <span className="rounded bg-ink-600 px-1 py-px font-mono text-[9px] uppercase text-mute">bot</span>}
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
                      <input autoFocus value={editing.draft} onChange={(e) => setEditing({ id: m.id, draft: e.target.value })} onKeyDown={(e) => e.key === 'Escape' && setEditing(null)} className="w-56 rounded-xl border border-blurple bg-ink-850 px-3 py-2 text-[15px] outline-none" maxLength={500} />
                      <button type="submit" aria-label="Save edit" className="rounded-lg bg-mint/20 p-1.5 text-mint"><Check size={16} /></button>
                      <button type="button" aria-label="Cancel edit" onClick={() => setEditing(null)} className="rounded-lg bg-ink-700 p-1.5 text-mute"><X size={16} /></button>
                    </form>
                  ) : (
                    <div className={clsx('whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-snug', mine ? 'rounded-br-md bg-gradient-to-br from-blurple to-[#7c5cff] text-white shadow-lg shadow-blurple/20' : 'rounded-bl-md bg-ink-700 text-text')}>
                      {m.deleted ? <em className="text-white/50">message deleted</em> : m.text}
                      {m.edited && !m.deleted && <span className="ml-1.5 text-[10px] opacity-60">(edited)</span>}
                    </div>
                  )}
                  {mine && !m.deleted && !isEditing && (
                    <div className="absolute -left-14 top-1/2 flex -translate-y-1/2 gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-60">
                      <button aria-label="Edit message" onClick={() => setEditing({ id: m.id, draft: m.text })} className="rounded-md bg-ink-700 p-1.5 text-mute hover:text-white"><Pencil size={13} /></button>
                      <button aria-label="Delete message" onClick={() => onDelete(m.id)} className="rounded-md bg-ink-700 p-1.5 text-mute hover:text-ember"><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
                {m.aiReactions.length > 0 && (
                  <div className="-mt-1.5 flex gap-1 px-1">
                    {m.aiReactions.map((e) => (
                      <span key={e} className="pop-in rounded-full border border-white/10 bg-ink-800 px-1.5 py-0.5 text-sm shadow">{e}</span>
                    ))}
                  </div>
                )}
                <span className="mt-0.5 px-1 text-[10px] text-mute/80">{clockTime(m.at)}</span>
              </div>
            </div>
          );
        })}
        {thinking && (
          <div className="pop-in mx-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3">
            <ThinkingOrb state="composing" size={20} />
            <span className="font-mono text-xs uppercase tracking-widest text-mute">{persona.label} is cooking…</span>
          </div>
        )}
        {typingNames.length > 0 && (
          <div className="flex items-center gap-2 px-1 pt-1 text-xs text-mute">
            <span className="inline-flex gap-0.5" aria-hidden>
              {[0, 1, 2].map((d) => (
                <span key={d} className="size-1.5 animate-bounce rounded-full bg-blurple-soft" style={{ animationDelay: `${d * 120}ms` }} />
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
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-blurple px-3 py-1.5 text-xs font-semibold shadow-lg"
        >
          <ArrowDown size={14} /> {unread} new
        </button>
      )}
    </div>
  );
}

function AiCard({ m, persona, latest }: { m: ChatMessage; persona: { emoji: string; label: string }; latest: boolean }) {
  const card = (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-ink-800/95 px-4 py-3" style={{ borderRadius: 16 }}>
      <span className="text-2xl leading-none" aria-hidden>{persona.emoji}</span>
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-magenta">
          {persona.label}
          {m.trigger && <span className="text-mute"> · {TRIGGER_LABEL[m.trigger] ?? m.trigger}</span>}
        </div>
        <p className="mt-0.5 break-words text-base font-medium leading-snug">{m.text}</p>
      </div>
    </div>
  );
  return (
    <div className="pop-in mx-auto my-2 w-full max-w-xl">
      {latest ? (
        <BorderBeam size="md" colorVariant="colorful" strength={0.85} duration={3.4}>
          {card}
        </BorderBeam>
      ) : (
        card
      )}
    </div>
  );
}
