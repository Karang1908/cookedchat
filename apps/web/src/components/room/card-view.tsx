'use client';

import type { Card, ChatMessage } from '@cooked/shared';
import { Avatar } from '../avatar';

/** Renders the rich, server-driven chat items. New card types are added here. */
export function CardView({ m, meId }: { m: ChatMessage; meId?: string }) {
  const card = m.card;
  if (!card) return null;
  void meId;
  switch (card.type) {
    case 'poster':
      return <Poster card={card} />;
    default:
      return <div className="mx-auto my-2 w-full max-w-xl rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-mute">{m.text || card.type}</div>;
  }
}

function Poster({ card }: { card: Extract<Card, { type: 'poster' }> }) {
  return (
    <div className="pop-in mx-auto my-3 w-full max-w-xs -rotate-1 rounded-sm bg-[#f3ecd8] p-4 text-center text-[#241c0e] shadow-xl shadow-black/40" role="img" aria-label={`Missing person poster for ${card.name}`}>
      <div className="font-display text-5xl uppercase leading-none tracking-wider text-[#8c1c13]">Missing</div>
      <div className="mx-auto my-3 grid size-24 place-items-center rounded-full border-4 border-[#241c0e]/70 bg-[#e2d7b8]">
        <Avatar type={card.avatar} size={72} />
      </div>
      <div className="font-display text-3xl uppercase tracking-wide">{card.name}</div>
      <div className="mt-1 font-mono text-xs uppercase tracking-widest">last seen {card.ago} ago</div>
      <div className="mt-3 border-t border-[#241c0e]/30 pt-2 text-xs">If found, please reply. Do not leave on read.</div>
    </div>
  );
}
