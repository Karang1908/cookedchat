import type { TriggerKind } from './types.js';

/**
 * Fallback lines used when no LLM answers in time (or for instant triggers like 67).
 * {name} = the member who triggered it. Persona-agnostic by design: they have to land with zero context.
 */
export const CANNED: Record<TriggerKind, string[]> = {
  six_seven: ['6 7', 'SIX SEVEN. the prophecy is fulfilled 🗿', '67 detected. everybody lock in 🥀'],
  fanum: ['fanum tax collected 🍟', '{name} just got fanum taxed 🍟 -50 aura', 'someone say food? the tax man cometh 🍟'],
  reply_later: ['"i\'ll reply later" is crazy, {name} 💀', '{name} said later like later is a real place 🥀', "{name}'s reply is in the shadow realm now"],
  typing_drama: ['we all saw {name} type that essay 👁️', '{name} wrote a whole novel and sent a crumb 💀', 'the typing bubble lasted longer than the message, {name}'],
  typed_deleted: ['{name} typed something and deleted it. we all saw. 👁️', 'what did {name} almost say?? 🧐', '{name} had a whole speech and chickened out 🫡'],
  slow_reply: ['{name} went to the shadow realm for hours 💀', 'welcome back {name}. the chat moved on without you 🥀', '{name} just resurfaced from the backrooms'],
  quick_reply: ['{name} replying instantly, lock in 🫡 +100 aura', 'fast hands {name} 🗿'],
  burst: ['{name} said it in 9 messages instead of 1 💀', '{name} is cooking... cooking what, nobody knows', 'chat, {name} is speedrunning the keyboard'],
  dry_reply: ['bro sent "{text}" 💀', '"{text}"?? that is all you have, {name}? 🥀', '{name} is conserving energy for something'],
  edited: ['{name} edited that. what did it say before?? 🧐', 'we saw the edit, {name} 👁️'],
  deleted: ['{name} deleted a message. the receipts are in my heart 🫡', 'unsent but not forgotten, {name} 👁️'],
  left_on_read: ['{name} saw it and said nothing 👁️', "{name} read it, felt it, and left. that's cold 🥶", '{name} is on read. the missing poster is being printed'],
  dead_chat: ['chat is dead. anyone alive? 🥀', 'crickets. would you rather: never reply late or never reply dry? 🗿', 'dead chat detected. hot take time: cereal is soup 🧢'],
  tung_tung: ['TUNG TUNG TUNG SAHUR', 'it is 3am. TUNG TUNG TUNG SAHUR. go to sleep 🥀'],
  cooked_max: ["IT'S OVER 🥀", "chat is cooked. we're so cooked. IT'S OVER 🥀"],
  manual: ['chat 🗿'],
};

export const DEAD_CHAT_PROMPTS = [
  'would you rather never reply late or never reply dry? 🗿',
  'hot take: cereal is soup. defend yourself 🧢',
  'last person to type something unhinged owes the chat 500 aura 🥀',
  'rate your replying speed 1-10, be honest, we have receipts 👁️',
  "what's the most diabolical thing you've ever sent at 2am? 💀",
];

/** pick a canned line deterministically from rng (inject Math.random in prod) */
export function cannedLine(kind: TriggerKind, vars: { name?: string; text?: string }, rng: () => number = Math.random): string {
  const pool = CANNED[kind];
  const line = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]!;
  return line.replaceAll('{name}', vars.name ?? 'bro').replaceAll('{text}', vars.text ?? 'k');
}
