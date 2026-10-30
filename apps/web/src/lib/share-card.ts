import { CREATURES } from '@cooked/shared';
import type { Card } from '@cooked/shared';

type Wrapped = Extract<Card, { type: 'wrapped' }>;
type Awards = Extract<Card, { type: 'awards' }>;
type Meme = Extract<Card, { type: 'meme' }>;

const DISPLAY = 'Anton, Impact, sans-serif';
const BODY = '"Bricolage Grotesque Variable", system-ui, sans-serif';

async function ensureFonts(): Promise<void> {
  try {
    await Promise.all([document.fonts.load('80px Anton'), document.fonts.load('600 40px "Bricolage Grotesque Variable"'), document.fonts.load('700 40px "Bricolage Grotesque Variable"')]);
  } catch {
    /* the fallback fonts still draw */
  }
}

function make(w: number, h: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

function toBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('could not encode image'))), 'image/png'));
}

function wrapLines(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function background(g: CanvasRenderingContext2D, w: number, h: number, a: string, b: string): void {
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, a);
  grad.addColorStop(1, b);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const glow = g.createRadialGradient(w * 0.2, 0, 0, w * 0.2, 0, w * 0.8);
  glow.addColorStop(0, 'rgba(88,101,242,0.45)');
  glow.addColorStop(1, 'rgba(88,101,242,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);
}

function footer(g: CanvasRenderingContext2D, w: number, h: number): void {
  g.textAlign = 'center';
  g.fillStyle = 'rgba(242,243,255,0.6)';
  g.font = `600 30px ${BODY}`;
  g.fillText('COOKED CHAT 💀 the AI that lives in your group chat', w / 2, h - 50);
}

export async function renderWrapped(card: Wrapped): Promise<Blob> {
  await ensureFonts();
  const W = 1080;
  const H = 1350;
  const { c, g } = make(W, H);
  background(g, W, H, '#10102e', '#4a1457');
  g.textAlign = 'center';
  g.fillStyle = '#feE75c';
  g.font = `64px ${DISPLAY}`;
  g.fillText('BRAINROT WRAPPED', W / 2, 130);
  g.fillStyle = '#ffffff';
  g.font = `150px ${DISPLAY}`;
  g.fillText(card.name.toUpperCase().slice(0, 14), W / 2, 300);

  g.font = `700 46px ${BODY}`;
  g.fillStyle = '#f2f3ff';
  g.fillText(`You are ${card.breakdown.map((b) => `${b.pct}% ${b.label}`).join(', ')}`, W / 2, 400, W - 120);

  card.breakdown.forEach((b, i) => {
    const y = 470 + i * 110;
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.beginPath();
    g.roundRect(100, y, W - 200, 54, 27);
    g.fill();
    const grad = g.createLinearGradient(100, 0, W - 100, 0);
    grad.addColorStop(0, '#5865f2');
    grad.addColorStop(1, ['#eb459e', '#57f2a0', '#fee75c'][i % 3]!);
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(100, y, Math.max(54, ((W - 200) * b.pct) / 100), 54, 27);
    g.fill();
    g.textAlign = 'left';
    g.fillStyle = '#fff';
    g.font = `700 34px ${BODY}`;
    g.fillText(`${b.label} ${b.pct}%`, 124, y + 38);
  });

  g.textAlign = 'center';
  g.font = `190px ${BODY}`;
  g.fillText(CREATURES[card.creature].emoji, W / 2, 940);
  g.fillStyle = '#feE75c';
  g.font = `34px ${BODY}`;
  g.fillText('YOUR FINAL FORM', W / 2, 1000);
  g.fillStyle = '#ffffff';
  g.font = `88px ${DISPLAY}`;
  g.fillText(CREATURES[card.creature].name.toUpperCase(), W / 2, 1090, W - 100);

  const stats: [string, string][] = [['AURA', card.stats.aura.toLocaleString()], ['RIZZ', `${card.stats.rizz}`], ['OHIO', `${card.stats.ohio}%`], ['POWER', card.stats.power.toLocaleString()]];
  stats.forEach(([k, v], i) => {
    const x = 170 + i * 247;
    g.fillStyle = 'rgba(242,243,255,0.65)';
    g.font = `600 26px ${BODY}`;
    g.fillText(k, x, 1170);
    g.fillStyle = '#fff';
    g.font = `46px ${DISPLAY}`;
    g.fillText(v, x, 1228);
  });
  footer(g, W, H);
  return toBlob(c);
}

export async function renderAwards(card: Awards): Promise<Blob> {
  await ensureFonts();
  const W = 1080;
  const rows = card.awards.slice(0, 7);
  const H = Math.max(1080, 300 + rows.length * 150 + 160);
  const { c, g } = make(W, H);
  background(g, W, H, '#10102e', '#14304a');
  g.textAlign = 'center';
  g.fillStyle = '#fee75c';
  g.font = `110px ${DISPLAY}`;
  g.fillText('CHAT AWARDS 🏆', W / 2, 170);
  rows.forEach((a, i) => {
    const y = 250 + i * 150;
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.beginPath();
    g.roundRect(70, y, W - 140, 130, 28);
    g.fill();
    g.textAlign = 'left';
    g.font = `64px ${BODY}`;
    g.fillStyle = '#fff';
    g.fillText(a.emoji, 100, y + 84);
    g.fillStyle = '#feE75c';
    g.font = `46px ${DISPLAY}`;
    g.fillText(`${a.title.toUpperCase()}: ${a.name.toUpperCase()}`, 200, y + 58, W - 280);
    g.fillStyle = 'rgba(242,243,255,0.8)';
    g.font = `500 28px ${BODY}`;
    g.fillText(a.why, 200, y + 100, W - 280);
  });
  footer(g, W, H);
  return toBlob(c);
}

/** Impact-style caption that shrinks to fit, then wraps to two lines at the minimum size */
function caption(g: CanvasRenderingContext2D, text: string, cx: number, y: number, maxW: number, anchor: 'top' | 'bottom'): void {
  let size = 110;
  g.font = `${size}px ${DISPLAY}`;
  while (g.measureText(text).width > maxW && size > 58) {
    size -= 4;
    g.font = `${size}px ${DISPLAY}`;
  }
  const lines = wrapLines(g, text, maxW);
  const lh = size * 1.05;
  const start = anchor === 'top' ? y : y - (lines.length - 1) * lh;
  g.textAlign = 'center';
  g.lineJoin = 'round';
  g.lineWidth = size / 7;
  lines.forEach((l, i) => {
    g.strokeStyle = '#000';
    g.strokeText(l, cx, start + i * lh);
    g.fillStyle = '#fff';
    g.fillText(l, cx, start + i * lh);
  });
}

export async function renderMeme(card: Meme): Promise<Blob> {
  await ensureFonts();
  const W = 1080;
  const { c, g } = make(W, W);
  background(g, W, W, '#1b1b4d', '#6a1b5e');
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.font = `560px ${BODY}`;
  g.fillStyle = '#fff';
  g.fillText(card.emoji, W / 2, 700);
  caption(g, card.top.toUpperCase(), W / 2, 130, W - 100, 'top');
  caption(g, card.bottom.toUpperCase(), W / 2, W - 70, W - 100, 'bottom');
  g.font = `600 22px ${BODY}`;
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.fillText('cooked chat 💀', W - 110, W - 18);
  return toBlob(c);
}

/** Native share sheet with the image where the browser supports it, a download everywhere else. */
export async function shareOrDownload(blob: Blob, filename: string, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'cancelled';
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
