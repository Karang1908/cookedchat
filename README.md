# Cooked Chat 💀

The AI that lives in your group chat. It interrupts, roasts, reacts and awards aura based on how people behave.

## Run it locally

```bash
pnpm install
cp apps/server/.env.example apps/server/.env   # loaded automatically by dev:server (set ADMIN_KEY)
cp apps/web/.env.example apps/web/.env.local
pnpm dev:server    # :4000
pnpm dev:web       # :3000
```

Open http://localhost:3000, start a room, open the same room in a second tab/phone. The admin panel is `/admin/<ROOM CODE>`
(key = `ADMIN_KEY`). Add the demo bots there, stage moments (typing drama, slow reply, burst, dead chat, left on read),
warp the room clock, and edit every timing live.

No API keys needed to try it: without `GROQ_API_KEY`/`OLLAMA_API_KEY` the commentator falls back to canned lines.
Without `DATABASE_URL` rooms live in memory.

## Tests

```bash
pnpm build && pnpm test      # unit tests: shared + server
```

Real-client end-to-end suites live in [`e2e/`](e2e/README.md).

## Deploy

Everything runs on **Render** (two free web services from [`render.yaml`](render.yaml)), with **UptimeRobot** keeping the server awake. Optional: any **Postgres** for rooms that survive restarts.

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
