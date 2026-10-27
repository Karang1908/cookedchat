export function clockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function fmtAura(n: number): string {
  return `${n > 0 ? '+' : ''}${n.toLocaleString()}`;
}

export { fmtDuration } from '@cooked/shared';
