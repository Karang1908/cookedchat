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

Everything runs on **Render** (two free web services from [`render.yaml`](render.yaml)). Optional: **Supabase** for persistence, **UptimeRobot** to keep the server awake.

1. **Supabase** (optional): run `supabase/migrations/0001_init.sql` then `0002_features.sql` in the SQL editor, then copy the *Session pooler* URI from Connect.
2. **Render**: New → Blueprint → this repo. It creates `cookedchat-server` and `cookedchat-web`.
3. Open the root [`.env.example`](.env.example). On each service, use Environment → *Add from .env*: paste **block 1** into `cookedchat-server` and **block 2** into `cookedchat-web`. Then replace every `REPLACE_ME` / `xxxx` value with a real one. Leftover placeholders are ignored, and the server logs which ones are still unfilled.
4. Cross-link the two URLs. Set `CORS_ORIGINS` on the server to the web URL, and `NEXT_PUBLIC_SERVER_URL` on the web to the server URL. If Render added a suffix to a name, use the real URLs. `NEXT_PUBLIC_SERVER_URL` is baked into the build, so redeploy the web after changing it.
5. Point UptimeRobot at `https://cookedchat-server.onrender.com/health` every 5 minutes.

**Free-tier hours:** Render gives about 750 free instance hours a month per workspace, which covers one always-on service. Keep only the server pinged. The web sleeps when idle, and its first load after a nap takes about 30–60s, so open it a minute before the demo. Pinging both would use up the month's hours around day 16.

Not exercised from here: these steps have not been run against real Render or Supabase accounts.

## Balance and the AI duel

The AI is a member, not a reply bot. It speaks roughly once every few human messages (`aiEvery`, default 4: ordinary moments wait for 4 human messages, core jokes 2, big moments like 67 or a mog 1), never twice in a row, and otherwise just drops an emoji reaction. Tune it live in the admin panel.

Turn on **AI duel** in the admin panel and each roast gets a reply from a second persona running on the other model (Groq vs Ollama Cloud, labelled in the chat). When the room goes quiet, the two AIs roast each other once, then wait for a human.

## What the AI watches

Rule-based detectors decide *when* and *how much aura*; the LLM only writes the one line. 67 and the fanum tax are
instant canned lines. Providers fall back Groq 120b -> Groq 20b -> Ollama Cloud -> canned within a 3.5s budget.
