import { BRAINROT, GIF_MOODS, PERSONAS, gifQuery, isOffLimits } from '@cooked/shared';
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
  /** duel rooms: which provider family should write this line */
  prefer?: 'groq' | 'ollama';
  /** the AI's own recent lines, so it stops repeating itself */
  mine?: string[];
  /** reply in Hinglish (decided by the engine from the chat, not by the model) */
  hinglish?: boolean;
}

export const MAX_LINE = 160;
const LABELS = Object.values(PERSONAS).map((p) => p.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

/** the model may ask for a reaction GIF; the engine searches GIPHY for it (when a key is set) and attaches it */
export const GIF_RULE = `Optional: if a reaction GIF would make it land harder, end the line with [gif: X] where X is exactly one of: ${GIF_MOODS.join(', ')}. Skip it most of the time.`;
const MOODS = new Set<string>(GIF_MOODS);

/** How every line should sound: a friend texting, not an assistant. Shared by roasts, rivals and the AI-vs-AI duel. */
const HINGLISH = [
  'Language: Hinglish, the way Indian college friends actually text each other: Hindi sentence structure with English words mixed in, tu/tera, short and casual (bhai, yaar, abe, kya, re).',
  'Never translate an English idiom word for word into Hindi, and never use formal or shuddh Hindi words. If a line would sound odd said out loud by a Delhi or Mumbai college kid, rewrite it.',
  'How it sounds (the feel, never copy): "tu exam se ek din pehle syllabus dekh raha hai? bahadur hai bhai" / "200 ka latte? ghar pe nescafe bana le, same feel aayegi" / "itna lamba type karke ok? baaki drafts kahan gaye" / "baad mein reply karega? tera baad mein toh kabhi aata hi nahi".',
].join(' ');

export function voiceRules(s: RoomSettings, hinglish = false): string[] {
  return [
    'Your persona comes first (a boomer still sounds like a boomer, a narrator like a narrator), but you text like a real person in a group chat, not like an AI or an assistant: short, blunt, no punctuation ceremony.',
    'Talk straight TO them ("you...") instead of narrating what they did. React like the friend with no chill.',
    'Never write: "Ah", "Well,", "Oh look", "Ladies and gentlemen", em dashes, hashtags, quotes around the line, "ironic, right?", or an explanation of the joke.',
    !s.explicit
      ? 'Keep it clean: no swearing, still savage.'
      : hinglish
        ? 'Swearing is ON: swear the way Indian friends do, only where it lands (bc, saale, chutiye, bsdk, madarchod, fuck, shit). Vary it.'
        : 'Swearing is ON: swear like a real person does (fuck, shit, motherfucker, bitch, ass, wtf). Real trash talk is welcome ("you bald ass motherfucker", "goofy ass"). Vary it.',
    `Intensity ${s.intensity}/3 (1 = light teasing, 3 = brutal, go for the throat like a friend who knows they can take it).`,
    'Emoji: zero or one, only when it adds something. Slang only where a real person would use it; never stack it.',
    'Vary yourself: do not open every line with "bro", and swear like a person does, not in every single line.',
    'Comedy: specific beats generic. Twist their exact words back at them, use absurd comparisons ("the Mars rover replies faster"), call back to earlier chat, and put the punchline at the end. One joke, no setup paragraph.',
    s.explicit
      ? 'Hard limits, even as a joke: no slurs of any kind (racial, ethnic, caste, homophobic, ableist), including the n-word in any spelling; nothing attacking race, ethnicity, religion, caste, gender, sexuality, disability, illness, weight or skin colour; nothing about self-harm.'
      : 'Hard limits, even as a joke: no slurs; nothing about race, ethnicity, religion, caste, gender, sexuality, disability, illness, weight or skin colour; no family insults ("your mom", "teri maa"); nothing sexual; nothing about self-harm.',
    'Words that instantly make you sound like a bot, never use them: cringe, unc, lowkey, highkey, fr, no cap, slay, vibe, "it\'s giving", ate, sus, mid, bussin, rizz, aura, sigma, skibidi, npc, main character, glitchy, toaster, dial-up.',
    hinglish
      ? HINGLISH
      : 'Language: English only. Not a single Hindi word, no Hindi gaalis. How real friends roast each other in a group chat (the feel, never copy): "you typed for a whole minute and that is what made the final cut?" / "you said later like it is a date you are actually showing up to" / "that is not a hot take, that is a cry for help".',
    'It is 2026. Expired slang (fanum tax, skibidi, mewing, gyatt, rizzler, moye moye, binod) is only for mocking people who still use it.',
  ];
}

export function buildMessages(c: CommentContext): ChatMsg[] {
  const persona = PERSONAS[c.settings.persona];
  const level = BRAINROT[c.settings.brainrot];
  const system = [
    `You are ${persona.label}, the bot in this group chat. Everyone knows you are the bot, so never act like an assistant. Personality: ${persona.voice}.`,
    ...voiceRules(c.settings, c.hinglish),
    `Energy: ${level.style}.`,
    'Reply with ONE line, at most 140 characters, and nothing else.',
    persona.refs ? `Desi references you can use: ${persona.refs.join(', ')}.` : '',
    GIF_RULE,
    c.midnight ? 'It is the middle of the night: get weirder and more unhinged.' : '',
    c.kind === 'joined' ? 'Someone just walked into the chat. Greet them the way a friend group greets the new person: by roasting them (their avatar pick, how late they are, their name vibe without touching identity). Make the room laugh.' : '',
    c.kind === 'roast_me' ? 'They asked to be roasted. Go hard and personal using the dossier: quote their own messages back at them, drag their stats. No mercy, still one line.' : '',
    c.kind === 'chime' ? 'Nobody did anything roast-worthy. Just join the conversation like one of the friends: answer the question in the air, take a side, add to the plan, or tease someone about what they actually said. React to the topic, not to how they text. Only mention places, plans and people that are actually in the chat; never invent them.' : '',
    c.kind === 'mention' ? 'They are talking to YOU. Answer what they actually said (a question gets a real answer, with attitude), and roast them if it fits.' : '',
    c.rivalOf ? `The other bot in the chat (${c.rivalOf.label}) just said: "${c.rivalOf.line.slice(0, 160)}". Clap back at THAT bot, disagree, roast it.` : '',
    `How you sound (the vibe, do not copy it): ${persona.example}`,
  ]
    .filter(Boolean)
    .join('\n');
  const user = [
    `What just happened: ${c.fact}`,
    `Who: ${c.name}`,
    c.text ? `Their message: "${c.text.slice(0, 200)}"` : '',
    c.recent.length ? `Recent chat:\n${c.recent.map((m) => `${m.name}: ${m.text.slice(0, 120)}`).join('\n')}` : '',
    c.mine?.length ? `Your recent lines. Never reuse their words, comparisons or insults (said "toaster" once? pick something new):\n${c.mine.join('\n')}` : '',
    'Your line:',
  ]
    .filter(Boolean)
    .join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

/** Model output -> a single safe chat line, or null if it should be replaced by a canned one. */
export function sanitizeLine(raw: string, explicit = false): string | null {
  let line = raw.trim().split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  line = line.replace(new RegExp(`^(ai|assistant|bot|${LABELS})\\s*:\\s*`, 'i'), '').replace(/^["'“”]+|["'“”]+$/g, '').trim();
  if (!line) return null;
  if (isOffLimits(line, { explicit })) return null;
  return line.length > MAX_LINE ? `${line.slice(0, MAX_LINE - 1).trimEnd()}…` : line;
}

const GIF_TAG = /\[\s*gif\s*:\s*([^\]\n]{1,80})\]/i;

/** pulls "[gif: ...]" out of model output. The text loses the tag; the query is kept only if it is one of GIF_MOODS. */
export function extractGif(raw: string): { text: string; gif?: string } {
  const m = GIF_TAG.exec(raw);
  if (!m) return { text: raw };
  const text = raw.replace(new RegExp(GIF_TAG.source, 'gi'), '').replace(/[ \t]{2,}/g, ' ');
  const gif = gifQuery(m[1]);
  return gif && MOODS.has(gif) ? { text, gif } : { text };
}
