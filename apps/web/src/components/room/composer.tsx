'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, X } from 'lucide-react';

interface Props {
  disabled?: boolean;
  /** shown above the box while replying to a message */
  replyTo?: { name: string; text: string } | null;
  onCancelReply?: () => void;
  onSend: (text: string) => Promise<string | null>;
  onTyping: (state: 'start' | 'tick' | 'stop', len: number, cleared?: boolean) => void;
  /** the 🔥 next to the box: get personally roasted */
  onRoastMe?: () => void;
}

export function Composer({ disabled, replyTo, onCancelReply, onSend, onTyping, onRoastMe }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const active = useRef(false);
  const lastTick = useRef(0);

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 2500);
    return () => clearTimeout(t);
  }, [error]);

  const change = (v: string) => {
    setValue(v);
    const now = Date.now();
    if (v.length > 0) {
      if (!active.current) {
        active.current = true;
        lastTick.current = now;
        onTyping('start', v.length);
      } else if (now - lastTick.current > 2000) {
        lastTick.current = now;
        onTyping('tick', v.length);
      }
    } else if (active.current) {
      active.current = false;
      onTyping('stop', 0, true); // had text, now empty, nothing sent: "typed then deleted"
    }
  };

  const submit = async () => {
    const text = value.trim();
    if (!text || disabled) return;
    active.current = false; // the server clears typing state on send
    setValue('');
    const err = await onSend(text);
    if (err) {
      setValue(text);
      setError(err);
    }
  };

  return (
    <div className="relative px-3 pb-3 pt-2 sm:px-6">
      {error && <div className="brut-sm pop-in absolute -top-8 left-1/2 -translate-x-1/2 rounded-full bg-bad px-3 py-1 text-xs font-bold text-white">{error}</div>}
      {replyTo && (
        <div className="brut-sm pop-in mb-2.5 flex items-center gap-2 rounded-lg bg-lemon px-2.5 py-1.5 text-xs font-medium">
          <span className="min-w-0 flex-1 truncate">Replying to <b className="font-extrabold">{replyTo.name}</b>: {replyTo.text}</span>
          <button onClick={onCancelReply} aria-label="Cancel reply" className="rounded p-0.5 hover:bg-surface"><X size={14} /></button>
        </div>
      )}
      {/* one row, one height: the roast button and send button live inside the box so they always line up with it */}
      <div className={`flex items-end gap-1.5 rounded-2xl border-[2.5px] border-line bg-surface p-1.5 transition-shadow ${focused ? 'shadow-[5px_5px_0_var(--color-line)]' : 'shadow-[3px_3px_0_var(--color-line)]'}`}>
        {onRoastMe && (
          <button type="button" onClick={onRoastMe} disabled={disabled} aria-label="Roast me" title="Roast me" className="press grid size-10 shrink-0 place-items-center rounded-xl border-2 border-line bg-bad text-lg disabled:opacity-40">🔥</button>
        )}
        <textarea
          ref={ta}
          value={value}
          rows={1}
          maxLength={500}
          disabled={disabled}
          placeholder={disabled ? 'reconnecting…' : 'say something…'}
          aria-label="Message"
          onChange={(e) => change(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            // on phones Enter is a newline; the send button is right there
            if (e.key === 'Enter' && !e.shiftKey && !matchMedia('(pointer: coarse)').matches) {
              e.preventDefault();
              void submit();
            }
          }}
          className="max-h-36 min-h-[28px] min-w-0 flex-1 resize-none bg-transparent px-1.5 py-2 text-[15px] font-medium leading-snug text-fg placeholder:text-faint focus:outline-none focus-visible:outline-none"
        />
        <button onClick={() => void submit()} disabled={disabled || !value.trim()} aria-label="Send" className="press grid size-10 shrink-0 place-items-center rounded-xl border-2 border-line bg-accent text-accent-ink enabled:hover:bg-accent-hover disabled:bg-raised disabled:text-faint">
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
