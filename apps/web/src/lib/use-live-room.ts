'use client';

import { useEffect, useReducer, useRef } from 'react';
import type { AuraEntry, ChatMessage, Member, RoomSettings, RoomSnapshot } from '@cooked/shared';
import { DEFAULT_SETTINGS } from '@cooked/shared';
import { fxBus } from './fx-bus';
import type { Identity } from './identity';
import { playSound } from './sounds';
import { createSocket } from './socket';
import type { CookedSocket } from './socket';

export type Mode = { kind: 'member'; identity: Identity } | { kind: 'admin'; key: string } | { kind: 'watch' };

export interface RoomView {
  status: 'idle' | 'connecting' | 'joining' | 'ready' | 'error';
  error?: string;
  meId?: string;
  members: Member[];
  messages: ChatMessage[];
  ledger: AuraEntry[];
  settings: RoomSettings;
  cooked: number;
  clockOffsetMs: number;
  tzOffsetMin: number;
  typingIds: string[];
  thinking: boolean;
}

const initial: RoomView = {
  status: 'idle', members: [], messages: [], ledger: [], settings: DEFAULT_SETTINGS, cooked: 0, clockOffsetMs: 0, tzOffsetMin: 0, typingIds: [], thinking: false,
};

type Action =
  | { type: 'status'; status: RoomView['status'] }
  | { type: 'error'; error: string }
  | { type: 'snapshot'; snapshot: RoomSnapshot; meId?: string }
  | { type: 'members'; members: Member[] }
  | { type: 'settings'; settings: RoomSettings; clockOffsetMs: number }
  | { type: 'message'; message: ChatMessage }
  | { type: 'update'; message: ChatMessage }
  | { type: 'typing'; ids: string[] }
  | { type: 'thinking'; on: boolean }
  | { type: 'aura'; entry: AuraEntry; total: number }
  | { type: 'cooked'; value: number };

const MAX_MESSAGES = 300;

function reducer(s: RoomView, a: Action): RoomView {
  switch (a.type) {
    case 'status':
      return { ...s, status: a.status, error: undefined };
    case 'error':
      return { ...s, status: 'error', error: a.error };
    case 'snapshot': {
      const x = a.snapshot;
      return { ...s, status: 'ready', error: undefined, meId: a.meId, members: x.members, messages: x.messages, ledger: x.ledger, settings: x.settings, cooked: x.cooked, clockOffsetMs: x.clockOffsetMs, tzOffsetMin: x.tzOffsetMin, typingIds: [], thinking: false };
    }
    case 'members':
      return { ...s, members: a.members };
    case 'settings':
      return { ...s, settings: a.settings, clockOffsetMs: a.clockOffsetMs };
    case 'message':
      return s.messages.some((m) => m.id === a.message.id) ? s : { ...s, messages: [...s.messages, a.message].slice(-MAX_MESSAGES) };
    case 'update':
      return { ...s, messages: s.messages.map((m) => (m.id === a.message.id ? a.message : m)) };
    case 'typing':
      return { ...s, typingIds: a.ids };
    case 'thinking':
      return { ...s, thinking: a.on };
    case 'aura':
      return { ...s, ledger: [...s.ledger, a.entry].slice(-100), members: s.members.map((m) => (m.id === a.entry.memberId ? { ...m, aura: a.total } : m)) };
    case 'cooked':
      return { ...s, cooked: a.value };
  }
}

/** One socket per mounted room view; rejoins automatically after a reconnect (Render restart, phone sleep). */
export function useLiveRoom(code: string, mode: Mode | null): { state: RoomView; socket: React.RefObject<CookedSocket | null> } {
  const [state, dispatch] = useReducer(reducer, initial);
  const socketRef = useRef<CookedSocket | null>(null);
  const modeKey = !mode ? null : mode.kind === 'member' ? `m:${mode.identity.memberId}:${mode.identity.name}:${mode.identity.avatar}` : mode.kind === 'admin' ? `a:${mode.key}` : 'watch';

  useEffect(() => {
    if (!mode) return;
    const socket = createSocket();
    socketRef.current = socket;
    dispatch({ type: 'status', status: 'connecting' });

    const join = () => {
      dispatch({ type: 'status', status: 'joining' });
      if (mode.kind === 'member') {
        socket.emit('room:join', { code, ...mode.identity }, (a) => (a.ok ? dispatch({ type: 'snapshot', snapshot: a.snapshot, meId: mode.identity.memberId }) : dispatch({ type: 'error', error: a.error })));
      } else if (mode.kind === 'watch') {
        socket.emit('room:watch', { code }, (a) => (a.ok ? dispatch({ type: 'snapshot', snapshot: a.snapshot }) : dispatch({ type: 'error', error: a.error })));
      } else {
        socket.emit('admin:auth', { key: mode.key, code }, (a) => (a.ok ? dispatch({ type: 'snapshot', snapshot: a.snapshot }) : dispatch({ type: 'error', error: a.error })));
      }
    };
    socket.on('connect', join);
    socket.on('disconnect', () => dispatch({ type: 'status', status: 'connecting' }));
    socket.on('connect_error', () => dispatch({ type: 'status', status: 'connecting' }));
    socket.on('room:members', (members) => dispatch({ type: 'members', members }));
    socket.on('room:settings', (settings, clockOffsetMs) => dispatch({ type: 'settings', settings, clockOffsetMs }));
    socket.on('chat:message', (message) => dispatch({ type: 'message', message }));
    socket.on('chat:update', (message) => dispatch({ type: 'update', message }));
    socket.on('typing:update', (ids) => dispatch({ type: 'typing', ids }));
    socket.on('ai:thinking', (on) => dispatch({ type: 'thinking', on }));
    socket.on('aura:change', (entry, total) => dispatch({ type: 'aura', entry, total }));
    socket.on('cooked:update', (value) => dispatch({ type: 'cooked', value }));
    socket.on('fx', (p) => fxBus.emit(p));
    socket.on('sound', (p) => playSound(p.name));

    return () => {
      socket.removeAllListeners();
      socket.close();
      socketRef.current = null;
    };
    // `mode` is captured on purpose: modeKey changes whenever it matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, modeKey]);

  return { state, socket: socketRef };
}
