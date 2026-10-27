export function clockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function fmtAura(n: number): string {
  return `${n > 0 ? '+' : ''}${n.toLocaleString()}`;
}

export function fmtDuration(ms: number): string {
  const s = Math.round(Math.abs(ms) / 1000);
  if (s < 90) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m}m`;
  const h = s / 3600;
  return h < 48 ? `${h.toFixed(h < 10 ? 1 : 0)}h` : `${Math.round(h / 24)}d`;
}
