'use client';

import { createContext, useContext, useMemo } from 'react';
import type { Member } from '@cooked/shared';
import type { CookedSocket } from './socket';

/** Resolves to null on success, or the server's reason on failure. */
type R = Promise<string | null>;

export interface RoomActions {
  meId?: string;
  members: Member[];
  vote(id: string, option: string): R;
  placeBet(id: string, side: 'yes' | 'no', amount: number): R;
  createBet(subjectId: string, minutes: number): R;
  battleStart(opponentId: string): R;
  battleSubmit(id: string, text: string): R;
  hotTake(text: string): R;
  confess(text: string): R;
  forecast(): R;
  replay(): R;
  recap(): R;
  awards(): R;
  wrapped(memberId?: string): R;
  makeMeme(id: string): R;
  translate(id: string, mode: 'brainrot' | 'plain' | 'dry'): Promise<{ text: string; via: 'ai' | 'rules' } | { error: string }>;
}

const Ctx = createContext<RoomActions | null>(null);
export const RoomActionsProvider = Ctx.Provider;

export function useRoomActions(): RoomActions {
  const a = useContext(Ctx);
  if (!a) throw new Error('RoomActionsProvider missing');
  return a;
}

type AckFn = (a: { ok: boolean; error?: string }) => void;

/** One helper so every action handles offline + slow server the same way */
function call(socket: CookedSocket | null, emit: (s: CookedSocket, ack: AckFn) => void): R {
  return new Promise((resolve) => {
    if (!socket?.connected) return resolve('offline, reconnecting…');
    const t = setTimeout(() => resolve('server is slow, try again'), 5000);
    emit(socket, (a) => {
      clearTimeout(t);
      resolve(a.ok ? null : (a.error ?? 'failed'));
    });
  });
}

export function useBuildActions(socket: React.RefObject<CookedSocket | null>, members: Member[], meId?: string): RoomActions {
  return useMemo(() => {
    const s = () => socket.current;
    return {
      meId,
      members,
      vote: (id, option) => call(s(), (k, ack) => k.emit('vote:cast', { id, option }, ack)),
      placeBet: (id, side, amount) => call(s(), (k, ack) => k.emit('bet:place', { id, side, amount }, ack)),
      createBet: (subjectId, minutes) => call(s(), (k, ack) => k.emit('bet:create', { subjectId, minutes }, ack)),
      battleStart: (opponentId) => call(s(), (k, ack) => k.emit('battle:start', { opponentId }, ack)),
      battleSubmit: (id, text) => call(s(), (k, ack) => k.emit('battle:submit', { id, text }, ack)),
      hotTake: (text) => call(s(), (k, ack) => k.emit('hottake:submit', { text }, ack)),
      confess: (text) => call(s(), (k, ack) => k.emit('confession:post', { text }, ack)),
      forecast: () => call(s(), (k, ack) => k.emit('weather:get', ack)),
      replay: () => call(s(), (k, ack) => k.emit('replay:request', ack)),
      recap: () => call(s(), (k, ack) => k.emit('recap:generate', ack)),
      awards: () => call(s(), (k, ack) => k.emit('awards:get', ack)),
      wrapped: (memberId) => call(s(), (k, ack) => k.emit('wrapped:get', { memberId }, ack)),
      makeMeme: (id) => call(s(), (k, ack) => k.emit('meme:make', { id }, ack)),
      translate: (id, mode) =>
        new Promise((resolve) => {
          const k = s();
          if (!k?.connected) return resolve({ error: 'offline, reconnecting…' });
          const t = setTimeout(() => resolve({ error: 'translator is slow, try again' }), 8000);
          k.emit('translate:request', { id, mode }, (a) => {
            clearTimeout(t);
            resolve(a.ok ? { text: a.text, via: a.via } : { error: a.error });
          });
        }),
    };
  }, [socket, members, meId]);
}
