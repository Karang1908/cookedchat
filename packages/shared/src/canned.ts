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
  ohio_high: ['Ohio level {ohio}%. aura -500 🥀', '{name} just sent an Ohio-certified message ({ohio}%) 💀', 'scientists confirm {name} is {ohio}% Ohio 🫩'],
  cap: ['🧢 cap detector: {pct}% on that one, {name}', 'that claim has the structural integrity of wet cardboard, {name} 🧢', '{name} said it with a straight face. {pct}% cap 🧢'],
  tone_shift: ['"{prev}" to "{text}" is crazy. {name} is NOT fine 🥶', 'the punctuation changed. {name} is upset. we all felt it 👁️', '{name} went from "{prev}" to "{text}". the temperature dropped 🥶'],
  derail: ['how did we get from that to this 💀', 'the plot has left the building 🗿', 'chat. what are we even talking about now 🥀'],
  mewing: ['stop arguing and go mew 🤫🧏', 'you two need to mew. immediately 🤫🧏', 'argument detected. prescribing mewing 🤫🧏'],
  simp_radar: ['{name} replies to {other} in {fast} and to everyone else in {slow} 👁️', 'simp radar is going off: {name} → {other}. {fast} vs {slow} for the rest of us 💀'],
  missing: ['MISSING: {name}. last seen {ago} ago. if found, please reply 🥀', 'have you seen {name}? last seen {ago} ago 👁️'],
  owl: ["It's {time}. {name} has not replied in {ago}. We know where you live. 🦉", '🦉 {name}. {ago} of silence. the owl is patient. the owl is also at your door.'],
  betrayal: ['{name} is online elsewhere but leaving {other} on read. betrayal. 🗡️', 'plot twist: {name} is active in another app and ignored {other}. the audacity 🥶'],
  class_change: ['{name} evolved: {from} → {to} {emoji}', 'class change! {name} is now a {to} {emoji}'],
  scouter: ['Power level: {power}?! 😳', 'the scouter is beeping... {name}: {power} 😳'],
  mog: ['{name} just mogged {other}. {other} is looksmaxxing in the corner 🗿', '{other} got mogged by {name}. +1000 aura. the corner is crowded 🫡'],
  lore: ['Remember when {name} said "{text}"? Anyway. 🗿', 'ancient lore: {name} once said "{text}". we never forgot 👁️'],
  chaos: ['chaos agent here. everyone reply as a pirate from now on 🏴‍☠️', 'plot twist: the next person to type loses 100 aura 🥀'],
  weather: ['forecast: scattered sarcasm with a chance of passive-aggression 🌦️'],
  replay: ["let's go to the tape 🎬", 'instant replay: we have footage 🎬'],
  copypasta: ['chat is dead so here is a fresh copypasta 🥀'],
  vote_result: ['the votes are in 🗿', 'chat has spoken 🗿'],
  battle_result: ['the judges have decided 🎙️'],
  bet_result: ['the market has settled 💰'],
  duel: ['the other AI is running on a toaster and it shows 🗿'],
  tiers: ['daily status update: the hierarchy has been recalculated 🗿'],
  recap: ['previously on this group chat… 📺'],
  awards: ['and the awards go to… 🏆'],
  wrapped: ['your Brainrot Wrapped is ready 🎁'],
  meme: ['meme dispensed 🗿'],
};

export const DEAD_CHAT_PROMPTS = [
  'would you rather never reply late or never reply dry? 🗿',
  'hot take: cereal is soup. defend yourself 🧢',
  'last person to type something unhinged owes the chat 500 aura 🥀',
  'rate your replying speed 1-10, be honest, we have receipts 👁️',
  "what's the most diabolical thing you've ever sent at 2am? 💀",
];

/** pick a canned line deterministically from rng (inject Math.random in prod) */
export function cannedLine(kind: TriggerKind, vars: { name?: string; text?: string; [k: string]: string | number | undefined }, rng: () => number = Math.random): string {
  const pool = CANNED[kind];
  const line = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]!;
  const merged: Record<string, string | number | undefined> = { name: 'bro', text: 'k', ...vars };
  // leave unknown placeholders alone so a missing var is visible instead of a silent blank
  return line.replace(/\{(\w+)\}/g, (m, k: string) => (merged[k] !== undefined ? String(merged[k]) : m));
}
