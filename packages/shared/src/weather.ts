export interface WeatherInput {
  messages: number;
  dry: number;
  lol: number;
  food: number;
  ohioAvg: number;
  ghosts: number;
  cooked: number;
  /** ms since anyone spoke */
  quietMs: number;
  /** room-local hour 0-23 */
  hour: number;
}

export interface Forecast {
  headline: string;
  forecast: { label: string; pct: number }[];
}

const cl = (v: number) => Math.max(3, Math.min(97, Math.round(v)));

/** "70% chance of passive-aggression tonight, scattered sarcasm by 11pm". Built only from real chat stats. */
export function buildForecast(i: WeatherInput): Forecast {
  const n = Math.max(1, i.messages);
  const items = [
    { label: 'passive-aggression', pct: cl((i.dry / n) * 160 + 10) },
    { label: 'scattered sarcasm', pct: cl((i.lol / n) * 140 + 12) },
    { label: 'unhinged chaos', pct: cl(i.ohioAvg * 0.9 + i.cooked * 0.6) },
    { label: 'a dry spell (of replies)', pct: cl(Math.min(90, i.quietMs / 60_000 / 3 * 10) + 5) },
    { label: 'rising snack levels', pct: cl((i.food / n) * 250 + 5) },
    { label: 'thick ghosting fog', pct: cl(i.ghosts * 18 + 5) },
  ].sort((a, b) => b.pct - a.pct);
  const top = items.slice(0, 3);
  const later = (i.hour + 3) % 24;
  const clock = `${later % 12 === 0 ? 12 : later % 12}${later < 12 ? 'am' : 'pm'}`;
  if (i.messages === 0) return { headline: 'Forecast: clear skies. Suspiciously clear. Nobody has said anything.', forecast: [{ label: 'awkward silence', pct: 90 }] };
  return { headline: `${top[0]!.pct}% chance of ${top[0]!.label} tonight, ${top[1]!.label} by ${clock}`, forecast: top };
}
