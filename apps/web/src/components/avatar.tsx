'use client';

import { BotAvatar } from 'bot-avatars';
import type { AvatarType } from '@cooked/shared';
import clsx from 'clsx';

/** Animated avatars are canvas + rAF each, so lists use `paused` (still pose) and only a few animate. */
export function Avatar({ type, size = 36, paused = true, state, className }: { type: AvatarType; size?: number; paused?: boolean; state?: 'default' | 'working' | 'sleeping'; className?: string }) {
  return (
    <span className={clsx('avatar-spin inline-block shrink-0', className)} style={{ width: size, height: size }}>
      <BotAvatar type={type} size={size} paused={paused} state={state} aria-label={`${type} avatar`} />
    </span>
  );
}
