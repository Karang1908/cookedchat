import type { FxKind, SoundName } from '@cooked/shared';

export type FxPayload = { kind: FxKind; emoji?: string };
type Listener = (p: FxPayload) => void;

/** Tiny pub/sub so the socket hook does not need to know about the DOM. */
const listeners = new Set<Listener>();
export const fxBus = {
  emit: (p: FxPayload) => listeners.forEach((l) => l(p)),
  subscribe: (l: Listener) => {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
};
export type { SoundName };
