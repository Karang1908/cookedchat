# Cooked Chat 💀

**Team struct** · Karan Garg and Anushka Mohanty

A group chat with an AI member that has zero chill. Built for a hackathon whose theme was *unserious and fun*.

## What it does

You and your friends join a room by scanning a QR code. Then you chat like normal while an AI watches *how* you text, not just what you say, and calls it out:

- **Roasts on behaviour.** Typing for 30 seconds and then sending "ok", taking 3 hours to reply, saying "I'll reply later" (or "baad mein reply karta hu"), dry texts, message bursts, editing or deleting, and leaving someone on read.
- **Aura points.** Every move earns or costs aura (+1000 for mogging someone, -500 for "I'll reply later", +67 for saying 67, -50 for using expired slang like "fanum tax"). There's a live leaderboard with receipts, daily Sigma/Beta tiers, RPG classes and a power-level scouter.
- **The chat gets cooked.** The more chaotic the chat gets, the more the UI deep-fries itself: shake, glitch and saturation, ending in a full meltdown at 100%.
- **Games.** "Chat, is this real?" votes, hot takes, a fake-coin prediction market, rizz battles judged by the AI, anonymous confessions, forecasts, instant replays, memes, recaps, awards and a Brainrot Wrapped.
- **Personas.** Gen Z Gremlin, Sports Commentator, Nature Documentary, Reality TV, Passive-Aggressive Mom, Confused Boomer, and the desi pair: **Desi Bhai** and **Relative Aunty** (Hinglish).
- **AI vs AI.** Turn on the duel and Groq argues with Gemma 4 on Ollama Cloud, and they roast each other when the humans go quiet. Both can drop reaction GIFs.

The AI's words come from an LLM, but the game itself (aura, effects, sounds) is decided by rules, so it stays fair and fast. With no API keys at all it still works, using canned lines.

## Run it on your laptop (everyone on the same Wi-Fi)

```bash
pnpm install
cp apps/server/.env.example apps/server/.env   # set ADMIN_KEY (and GROQ_API_KEY / OLLAMA_API_KEY for real AI lines)
pnpm local                                      # builds everything, then serves the web app on :3000 and the server on :4000
```

The server prints the address phones should use, e.g. `[local] phones on the same Wi-Fi: http://192.168.1.23:3000`.

1. On the laptop, open http://localhost:3000 and start a room.
2. Press **QR**. Even though the laptop is on `localhost`, the QR code points to the laptop's Wi-Fi address, so phones can scan it straight away.
3. Phones open the link, pick a name, and chat. Tap once to unlock sound (phones only allow audio after a tap).
4. The admin panel is at `/admin/<ROOM CODE>` (password = `ADMIN_KEY`). From there you can add demo bots, stage moments (typing drama, slow reply, dead chat, arguments...), warp the clock and toggle the AI duel.

If phones can't connect:
- Everyone must be on the same Wi-Fi. Guest or campus networks that isolate devices from each other won't work; use a phone hotspot instead.
- When macOS asks whether `node` may accept incoming connections, click **Allow**.
- Ports 3000 and 4000 must be free.
- Leave `NEXT_PUBLIC_SERVER_URL` unset locally. The app then finds the server on whatever address the page was opened from.

For development with hot reload, use `pnpm dev:server` and `pnpm dev:web` instead. Without `DATABASE_URL`, rooms live in memory until the server stops.

## Tests

```bash
pnpm build && pnpm test      # unit tests: shared + server
```

Real-client end-to-end suites live in [`e2e/`](e2e/README.md).

## Deploy (optional)

For a hosted version instead of the laptop: everything runs on **Render** (two free web services from [`render.yaml`](render.yaml)), with **UptimeRobot** keeping the server awake. Optional: any **Postgres** for rooms that survive restarts.

**Where data lives.** Without `DATABASE_URL`, rooms live in the server's memory. UptimeRobot stops the free instance from sleeping, which is enough for a demo, but memory is still wiped on every deploy, crash, or restart Render decides on (its docs say a free service "might restart at any time", and free services cannot have a disk). For data that survives, set `DATABASE_URL` to any Postgres. Neon's free tier does not expire; Render's free Postgres expires after 30 days. The server creates its own tables on boot, so there is no SQL to run.

1. **Postgres** (optional): create a database and copy its connection string.
2. **Render**: New → Blueprint → this repo. It creates `cookedchat-server` and `cookedchat-web`.
3. Open the root [`.env.example`](.env.example). On each service, use Environment → *Add from .env*: paste **block 1** into `cookedchat-server` and **block 2** into `cookedchat-web`. Then replace every `REPLACE_ME` / `xxxx` value with a real one. Leftover placeholders are ignored, and the server logs which ones are still unfilled.
4. Cross-link the two URLs. Set `CORS_ORIGINS` on the server to the web URL, and `NEXT_PUBLIC_SERVER_URL` on the web to the server URL. If Render added a suffix to a name, use the real URLs. `NEXT_PUBLIC_SERVER_URL` is baked into the build, so redeploy the web after changing it.
5. Point UptimeRobot at `https://cookedchat-server.onrender.com/health` every 5 minutes.

**Free-tier hours:** Render gives about 750 free instance hours a month per workspace, which covers one always-on service. Keep only the server pinged. The web sleeps when idle, and its first load after a nap takes about 30–60s, so open it a minute before the demo. Pinging both would use up the month's hours around day 16.

Not exercised from here: these steps have not been run against real Render or Neon accounts. The schema bootstrap and restart rehydration are tested against a local Postgres (`e2e/`).

## Balance and the AI duel

The AI is a member, not a reply bot. It speaks roughly once every few human messages (`aiEvery`, default 4: ordinary moments wait for 4 human messages, core jokes 2, big moments like 67 or a mog 1), never twice in a row, and otherwise just drops an emoji reaction. Tune it live in the admin panel.

Turn on **AI duel** in the admin panel and each roast gets a reply from a second persona running on the other model (Groq vs Ollama Cloud, labelled in the chat). Ollama Cloud runs **Gemma 4** (`OLLAMA_MODEL=gemma4:31b`, the name ollama.com's API uses; no `-cloud` suffix). When the room goes quiet, the two AIs roast each other once, then wait for a human.

**GIFs.** With `GIPHY_API_KEY` set, big moments get a fixed GIF, and either model can ask for its own by ending a line with `[gif: jethalal shocked]`. The tag is stripped from the line, the search is cleaned and filtered, and model-picked GIFs are rationed to one per side every 20s (GIPHY's free key allows about 100 searches an hour).

## What the AI watches

Rule-based detectors decide *when* and *how much aura*; the LLM only writes the one line. 67 and the unc alert are
instant canned lines. Providers fall back Groq 120b -> Groq 20b -> Ollama Cloud (Gemma 4) -> canned within a 3.5s budget.

**Slang is 2026, and old slang costs aura.** Saying expired slang ("fanum tax", "skibidi", "gyatt", "moye moye", "binod"...) gets
you called **unc** for -50 aura (`UNC_SLANG` in `packages/shared/src/slang.ts`). Heated arguments are a **crash out**, liars are
**larping**, and the AIs call each other **clankers**.

**Desi mode.** Two Hinglish personas in the vibe switcher: **Desi Bhai** (Panchayat, Hera Pheri, Mirzapur, chin tapak dum dum, wow vs
chee) and **Relative Aunty** (Sharma ji ka beta, log kya kahenge). Every persona answers in Hinglish when the chat is in Hinglish. The
detectors understand it too: "baad mein reply karta hu" is reply-later (-500), "acha" / "thik h" / "haan" are dry texts, and the
canned lines, dares, copypastas, battles and hot takes mix in desi ones. The safety filter knows Hindi and Devanagari abuse
and matches short terms as whole words, so ordinary Hinglish ("ho gaya", "sikhaya") is never blocked.
