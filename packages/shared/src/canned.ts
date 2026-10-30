import type { TriggerKind } from './types.js';

/**
 * Fallback lines used when no LLM answers in time (or for instant triggers like 67).
 * {name} = the member who triggered it. Persona-agnostic by design: they have to land with zero context.
 */
export const CANNED: Record<TriggerKind, string[]> = {
  six_seven: ['6 7', 'SIX SEVEN. the prophecy is fulfilled 🗿', '67 detected. everybody lock in 🥀', '6 7 bolke {name} ne poora aura farm kar liya 🗿'],
  unc: ['"{term}" in 2026? ok unc 👴 -50 aura', '{name} said "{term}". somebody get unc their reading glasses 👴', '"{term}" bolne wale {name} uncle, chai piyoge? 👴', 'that slang expired before the group chat was made, unc 🥀'],
  reply_later: ['"i\'ll reply later" is crazy, {name} 💀', '{name} said later like later is a real place 🥀', '"baad mein reply karta hu" — {name}, 2026 ka sabse bada jhooth 🧢', '{name} ka reply ab Panchayat ki tanki pe milega 🫖'],
  typing_drama: ['we all saw {name} type that essay 👁️', '{name} wrote a whole novel and sent a crumb 💀', 'itna type karke bas yeh? {name} ne Mahabharat likh ke "ok" bheja 💀'],
  typed_deleted: ['{name} typed something and deleted it. we all saw. 👁️', 'what did {name} almost say?? 🧐', '{name} ka draft deleted. scene kya tha bhai? 👁️'],
  slow_reply: ['{name} went to the shadow realm for hours 💀', 'welcome back {name}. the chat moved on without you 🥀', '{name} reply ke saath "25 din mein paisa double" scheme bhi laaye kya? 🕳️'],
  quick_reply: ['{name} replying instantly, locked in 🫡 +100 aura', 'fast hands {name} 🗿', '{name} ne turant reply kiya. Sharma ji ka beta detected 🫡'],
  burst: ['{name} said it in 9 messages instead of 1 💀', '{name} is crashing out one message at a time', '{name} ka keyboard bawaal macha raha hai 😭'],
  dry_reply: ['bro sent "{text}" 💀', '"{text}"?? that is all you have, {name}? 🥀', '"{text}" bhej ke {name} ne conversation ko VIP funeral de diya 🫡', '{name} is conserving aura for something'],
  edited: ['{name} edited that. what did it say before?? 🧐', 'we saw the edit, {name} 👁️', 'edit kyun kiya {name}? kuch toh gadbad hai 🧐'],
  deleted: ['{name} deleted a message. the receipts are in my heart 🫡', 'unsent but not forgotten, {name} 👁️', 'message delete, yaadein nahi, {name} 🫡'],
  left_on_read: ['{name} saw it and said nothing 👁️', "{name} read it, felt it, and left. that's cold 🥶", '{name} ne seen karke chhod diya. Saiyaara level heartbreak 💔'],
  dead_chat: ['chat is dead. anyone alive? 🥀', 'crickets. would you rather: never reply late or never reply dry? 🗿', 'itna sannata kyun hai bhai? 🦗'],
  tung_tung: ['TUNG TUNG TUNG SAHUR', 'it is 3am. TUNG TUNG TUNG SAHUR. go to sleep 🥀', '3 baje TUNG TUNG TUNG SAHUR. so jao sab 🥀'],
  cooked_max: ["IT'S OVER 🥀", "chat is cooked. we're so cooked. IT'S OVER 🥀", 'utha le re baba. chat is fully cooked 🥀'],
  manual: ['chat 🗿'],
  ohio_high: ['Ohio level {ohio}%. aura -500 🥀', '{name} just sent an Ohio-certified message ({ohio}%) 💀', 'scientists confirm {name} is {ohio}% Ohio 🫩', 'chin tapak dum dum. {name} is {ohio}% Ohio 🫩'],
  cap: ['🧢 cap detector: {pct}% on that one, {name}', '{name} is larping. {pct}% cap 🧢', 'choti bachi ho kya? {pct}% cap, {name} 🧢'],
  tone_shift: ['"{prev}" to "{text}" is crazy. {name} is NOT fine 🥶', 'the punctuation changed. {name} is upset. we all felt it 👁️', '"{prev}" se "{text}"? {name} naraz hai, sab samajh gaye 🥶'],
  derail: ['how did we get from that to this 💀', 'the plot has left the building 🗿', 'baat kahan se kahan pahunch gayi 🗿'],
  crash_out: ['two people crashing out live. quiet on the creek 🤫🧏', 'crash out detected. both of you, quiet on the creek 🤫🧏', 'yeh toh full Mirzapur ho gaya. chill karo dono 🤫🧏'],
  simp_radar: ['{name} replies to {other} in {fast} and to everyone else in {slow} 👁️', 'simp radar is going off: {name} → {other}. {fast} vs {slow} for the rest of us 💀', '{other} ke liye {fast}, baaki sab ke liye {slow}. {name}, sab dikh raha hai 👁️'],
  missing: ['MISSING: {name}. last seen {ago} ago. if found, please reply 🥀', 'have you seen {name}? last seen {ago} ago 👁️', 'GUMSHUDA: {name}. {ago} se gayab 🥀'],
  owl: ["It's {time}. {name} has not replied in {ago}. We know where you live. 🦉", '🦉 {name}. {ago} of silence. the owl is patient. the owl is also at your door.'],
  betrayal: ['{name} is online elsewhere but leaving {other} on read. betrayal. 🗡️', 'plot twist: {name} is active in another app and ignored {other}. the audacity 🥶', '{name} online hai par {other} ko ignore. dhokha 🗡️'],
  class_change: ['{name} evolved: {from} → {to} {emoji}', 'class change! {name} is now a {to} {emoji}'],
  scouter: ['Power level: {power}?! 😳', 'the scouter is beeping... {name}: {power} 😳'],
  mog: ['{name} just mogged {other}. {other} is chopped in the corner 🗿', '{other} got mogged by {name}. +1000 aura. the corner is crowded 🫡', '{name} ne {other} ko mog kar diya. wow vs chee, {other} is chee 🗿'],
  lore: ['Remember when {name} said "{text}"? Anyway. 🗿', 'ancient lore: {name} once said "{text}". we never forgot 👁️'],
  chaos: ['chaos agent here. everyone reply as a pirate from now on 🏴‍☠️', 'plot twist: the next person to type loses 100 aura 🥀'],
  weather: ['forecast: scattered sarcasm with a chance of passive-aggression 🌦️'],
  replay: ["let's go to the tape 🎬", 'instant replay: we have footage 🎬'],
  copypasta: ['chat is dead so here is a fresh copypasta 🥀'],
  vote_result: ['the votes are in 🗿', 'chat has spoken 🗿'],
  battle_result: ['the judges have decided 🎙️'],
  bet_result: ['the market has settled 💰'],
  duel: ['the other clanker is running on a toaster and it shows 🗿'],
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
  'chai ya coffee? galat jawab = -100 aura 🫖',
  'sabse bada delulu moment batao. abhi 💀',
];

/** pick a canned line deterministically from rng (inject Math.random in prod) */
export function cannedLine(kind: TriggerKind, vars: { name?: string; text?: string; [k: string]: string | number | undefined }, rng: () => number = Math.random): string {
  const pool = CANNED[kind];
  const line = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]!;
  const merged: Record<string, string | number | undefined> = { name: 'bro', text: 'k', ...vars };
  // leave unknown placeholders alone so a missing var is visible instead of a silent blank
  return line.replace(/\{(\w+)\}/g, (m, k: string) => (merged[k] !== undefined ? String(merged[k]) : m));
}
