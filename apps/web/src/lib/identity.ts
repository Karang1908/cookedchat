import { AVATARS } from '@cooked/shared';
import type { AvatarType } from '@cooked/shared';

export interface Identity {
  memberId: string;
  name: string;
  avatar: AvatarType;
}

const KEY = 'cooked.identity.v1';

/** crypto.randomUUID needs a secure context; phones on a LAN dev URL are not one. getRandomValues is. */
export function uid(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export function loadIdentity(): Identity | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (raw && typeof raw.memberId === 'string' && typeof raw.name === 'string' && AVATARS.includes(raw.avatar)) return raw;
  } catch {}
  return null;
}

export function saveIdentity(i: Identity): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(i));
  } catch {}
}

export function newMemberId(): string {
  try {
    const existing = JSON.parse(localStorage.getItem(KEY) ?? 'null')?.memberId;
    if (typeof existing === 'string') return existing;
  } catch {}
  return uid();
}
