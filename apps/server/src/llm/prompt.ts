import { BRAINROT, PERSONAS, SLANG_TERMS, TREND_EMOJI, isOffLimits } from '@cooked/shared';
import type { RoomSettings, TriggerKind } from '@cooked/shared';
import type { ChatMsg } from './providers.js';

export interface CommentContext {
  kind: TriggerKind;
  name: string;
  /** what they sent (may be empty for edits/deletes) */
  text: string;
  /** one-line description of the behavior, built by the engine */
  fact: string;
  recent: { name: string; text: string }[];
  settings: RoomSettings;
  midnight: boolean;
  /** set when this line is a rival commentator answering another persona */
  rivalOf?: { label: string; line: string };
}

export const MAX_LINE = 160;

export function buildMessages(c: CommentContext): ChatMsg[] {
  const persona = PERSONAS[c.settings.persona];
  const level = BRAINROT[c.settings.brainrot];
  const slang = SLANG_TERMS[c.settings.brainrot];
  const system = [
    `You are the AI member of a group chat. Voice: ${persona.voice}.`,
    `Style: ${level.style}.${slang.length ? ` Slang you may use: ${slang.join(', ')}.` : ''}`,
    `Roast intensity: ${c.settings.intensity} out of 3 (1 = light teasing, 3 = savage but friendly).`,
    `Write exactly ONE short line, at most 140 characters, plain text. No quotes around it, no hashtags, no explanation.`,
    `Use at most 2 emoji, from: ${TREND_EMOJI.join(' ')}.`,
    `Roast the behavior, never the person's identity. Never mention race, religion, gender, sexuality, disability, health, family or appearance.`,
    c.midnight ? 'It is the middle of the night: get weirder and more philosophical.' : '',
    c.rivalOf ? `You are the RIVAL commentator. Another commentator (${c.rivalOf.label}) just said: "${c.rivalOf.line.slice(0, 160)}". Answer THEM directly, in your own voice, and disagree with them.` : '',
    `Example of your voice: ${persona.example}`,
  ]
    .filter(Boolean)
    .join('\n');
  const user = [
    `What just happened: ${c.fact}`,
    `Who: ${c.name}`,
    c.text ? `Their message: "${c.text.slice(0, 200)}"` : '',
    c.recent.length ? `Recent chat:\n${c.recent.map((m) => `${m.name}: ${m.text.slice(0, 120)}`).join('\n')}` : '',
    'Reply with the one line only.',
  ]
    .filter(Boolean)
    .join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

/** Model output -> a single safe chat line, or null if it should be replaced by a canned one. */
export function sanitizeLine(raw: string): string | null {
  let line = raw.trim().split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  line = line.replace(/^(ai|assistant|commentator)\s*:\s*/i, '').replace(/^["'“”]+|["'“”]+$/g, '').trim();
  if (!line) return null;
  if (isOffLimits(line)) return null;
  return line.length > MAX_LINE ? `${line.slice(0, MAX_LINE - 1).trimEnd()}…` : line;
}
