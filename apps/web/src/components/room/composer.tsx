'use client';

import { useEffect, useRef, useState } from 'react';
import { BorderBeam } from 'border-beam';
import { SendHorizontal } from 'lucide-react';

interface Props {
  disabled?: boolean;
  onSend: (text: string) => Promise<string | null>;
  onTyping: (state: 'start' | 'tick' | 'stop', len: number, cleared?: boolean) => void;
}

export function Composer({ disabled, onSend, onTyping }: Props) {
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
    <div className="safe-b relative px-3 pb-3 pt-1 sm:px-5">
      {error && <div className="pop-in absolute -top-7 left-1/2 -translate-x-1/2 rounded-full bg-ember/90 px-3 py-1 text-xs font-semibold">{error}</div>}
      <BorderBeam size="line" colorVariant="ocean" active={focused} strength={0.9}>
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-ink-800 p-2 pl-4" style={{ borderRadius: 16 }}>
          <textarea
            ref={ta}
            value={value}
            rows={1}
            maxLength={500}
            disabled={disabled}
            placeholder={disabled ? 'reconnecting…' : 'say something (the AI is watching)'}
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
            className="max-h-36 min-h-[28px] flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-snug text-text placeholder:text-mute/70 focus:outline-none"
          />
          <button onClick={() => void submit()} disabled={disabled || !value.trim()} aria-label="Send" className="grid size-10 shrink-0 place-items-center rounded-xl bg-blurple text-white transition enabled:hover:bg-blurple-soft enabled:active:scale-95 disabled:opacity-40">
            <SendHorizontal size={18} />
          </button>
        </div>
      </BorderBeam>
    </div>
  );
}
