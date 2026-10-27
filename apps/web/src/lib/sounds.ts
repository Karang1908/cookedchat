import type { SoundName } from '@cooked/shared';

/*
 * Soundboard. Everything is synthesized with WebAudio so there are no audio files to license or load.
 * They are approximations of the memes, not the originals. To use real clips, put /public/sounds/<name>.mp3 in
 * place and list the names in NEXT_PUBLIC_SOUND_CLIPS (e.g. "vineBoom,airhorn"). Nothing is probed otherwise,
 * so a deploy without clips makes no failed requests.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
const clips = new Map<SoundName, AudioBuffer | 'missing'>();
const CLIP_NAMES = new Set((process.env.NEXT_PUBLIC_SOUND_CLIPS ?? '').split(',').map((n) => n.trim()).filter(Boolean));

export function unlockAudio(): void {
  if (typeof window === 'undefined') return;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state !== 'running') void ctx.resume();
}

export function setMuted(m: boolean): void {
  muted = m;
}

interface ToneOpts {
  type?: OscillatorType;
  f0: number;
  f1?: number;
  at?: number;
  dur: number;
  gain?: number;
  lowpass?: number;
  vibrato?: { hz: number; depth: number };
}

function tone(c: AudioContext, o: ToneOpts): void {
  const t0 = c.currentTime + (o.at ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.f0, t0);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t0 + o.dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.5, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  let node: AudioNode = osc;
  if (o.lowpass) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lowpass;
    node.connect(f);
    node = f;
  }
  node.connect(g).connect(master!);
  if (o.vibrato) {
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = o.vibrato.hz;
    lg.gain.value = o.vibrato.depth;
    lfo.connect(lg).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + o.dur + 0.05);
  }
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.05);
}

function noise(c: AudioContext, at: number, dur: number, gain: number, lowpass: number): void {
  const t0 = c.currentTime + at;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lowpass;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(t0);
}

const SYNTH: Record<SoundName, (c: AudioContext) => void> = {
  vineBoom: (c) => {
    tone(c, { f0: 95, f1: 36, dur: 1.0, gain: 0.95 });
    tone(c, { type: 'triangle', f0: 190, f1: 60, dur: 0.5, gain: 0.35 });
    noise(c, 0, 0.14, 0.6, 700);
  },
  fahhh: (c) => tone(c, { type: 'sawtooth', f0: 340, f1: 170, dur: 0.9, gain: 0.35, lowpass: 1300, vibrato: { hz: 6, depth: 8 } }),
  bruh: (c) => {
    tone(c, { type: 'sawtooth', f0: 165, f1: 118, dur: 0.22, gain: 0.45, lowpass: 750 });
    tone(c, { type: 'sawtooth', f0: 138, f1: 78, at: 0.26, dur: 0.4, gain: 0.5, lowpass: 650 });
  },
  airhorn: (c) => {
    for (const f of [466, 587, 698]) tone(c, { type: 'sawtooth', f0: f * 0.92, f1: f, dur: 0.9, gain: 0.22, lowpass: 3200 });
    for (const f of [466, 587]) tone(c, { type: 'sawtooth', f0: f, at: 1.0, dur: 0.5, gain: 0.2, lowpass: 3200 });
  },
  pipe: (c) => {
    tone(c, { f0: 160, f1: 55, dur: 0.55, gain: 0.8 });
    tone(c, { type: 'square', f0: 1900, f1: 950, dur: 0.18, gain: 0.12, lowpass: 3000 });
  },
  sadViolin: (c) => {
    [392, 370, 349, 311].forEach((f, i) => tone(c, { type: 'sawtooth', f0: f, at: i * 0.5, dur: i === 3 ? 1.3 : 0.55, gain: 0.22, lowpass: 2200, vibrato: { hz: 5.5, depth: 5 } }));
  },
  scream: (c) => {
    tone(c, { type: 'sawtooth', f0: 820, f1: 1900, dur: 0.7, gain: 0.3, lowpass: 5000, vibrato: { hz: 28, depth: 90 } });
    tone(c, { type: 'square', f0: 1230, f1: 2600, dur: 0.7, gain: 0.12, lowpass: 5000, vibrato: { hz: 31, depth: 120 } });
    noise(c, 0, 0.7, 0.25, 6000);
  },
  tungTung: (c) => {
    [0, 0.2, 0.4, 0.95].forEach((t, i) => tone(c, { type: 'triangle', f0: i === 3 ? 520 : 720, f1: i === 3 ? 260 : 380, at: t, dur: 0.14, gain: 0.8 }));
    [0, 0.2, 0.4].forEach((t) => noise(c, t, 0.04, 0.35, 2500));
  },
  winError: (c) => {
    tone(c, { f0: 988, dur: 0.13, gain: 0.35 });
    tone(c, { f0: 740, at: 0.14, dur: 0.4, gain: 0.35 });
    tone(c, { type: 'square', f0: 370, at: 0.14, dur: 0.3, gain: 0.08, lowpass: 1500 });
  },
  dunDunDun: (c) => {
    [[110, 0], [110, 0.5], [87, 1.0]].forEach(([f, t]) => tone(c, { type: 'sawtooth', f0: f!, at: t, dur: t === 1.0 ? 1.1 : 0.42, gain: 0.5, lowpass: 600 }));
  },
  crickets: (c) => {
    [0, 0.32, 0.64, 0.96].forEach((t) => {
      for (let i = 0; i < 4; i++) tone(c, { f0: 4300, at: t + i * 0.045, dur: 0.03, gain: 0.07 });
    });
  },
};

async function loadClip(name: SoundName): Promise<AudioBuffer | 'missing'> {
  const cached = clips.get(name);
  if (cached) return cached;
  try {
    const res = await fetch(`/sounds/${name}.mp3`);
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('audio')) throw new Error('no clip');
    const buf = await ctx!.decodeAudioData(await res.arrayBuffer());
    clips.set(name, buf);
    return buf;
  } catch {
    clips.set(name, 'missing');
    return 'missing';
  }
}

export function playSound(name: SoundName): void {
  if (muted || !ctx || !master || ctx.state !== 'running') return;
  const c = ctx;
  const cached = clips.get(name);
  if (cached === 'missing' || cached === undefined) {
    if (cached === undefined && CLIP_NAMES.has(name)) void loadClip(name); // first play synths so the joke is not late
    SYNTH[name](c);
    return;
  }
  const src = c.createBufferSource();
  src.buffer = cached;
  src.connect(master);
  src.start();
}
