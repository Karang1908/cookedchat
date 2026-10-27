import confetti from 'canvas-confetti';
import type { FxKind } from '@cooked/shared';

const CLASS_FX: Partial<Record<FxKind, number>> = { shake: 700, spin: 1100, zoom: 700, glitch: 700, invert: 900, deepfry: 1400 };
const timers = new Map<string, number>();

function reduced(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function runDomFx(kind: FxKind, emoji?: string): void {
  if (reduced() && kind !== 'flash') return;
  const stage = document.getElementById('stage');
  const ms = CLASS_FX[kind];
  if (ms && stage) {
    const cls = `fx-${kind}`;
    stage.classList.remove(cls);
    void stage.offsetWidth; // restart the animation if it is already running
    stage.classList.add(cls);
    window.clearTimeout(timers.get(cls));
    timers.set(cls, window.setTimeout(() => stage.classList.remove(cls), ms));
    return;
  }
  if (kind === 'flash') {
    const el = document.createElement('div');
    el.className = 'fx-flash';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 500);
  } else if (kind === 'confetti') {
    void confetti({ particleCount: 140, spread: 80, origin: { y: 0.7 } });
  } else if (kind === 'emojiRain') {
    const shape = confetti.shapeFromText({ text: emoji ?? '🗿', scalar: 3 });
    const end = Date.now() + 1400;
    (function frame() {
      void confetti({ particleCount: 3, angle: 90, spread: 70, startVelocity: 8, gravity: 0.9, ticks: 320, scalar: 3, shapes: [shape], origin: { x: Math.random(), y: -0.05 }, flat: true });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }
}
