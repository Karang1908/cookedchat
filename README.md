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

Two pieces: the web app on **Vercel**, the realtime server on **Render** (Vercel can't hold WebSockets). Optional: **Supabase** for persistence.

1. **Supabase** (optional): run `supabase/migrations/*.sql` in the SQL editor, then copy the *Session pooler* connection string.
2. **Render**: New → Blueprint → this repo (uses `render.yaml`). In Environment, paste `apps/server/.env.example` and fill in `ADMIN_KEY`, `GROQ_API_KEY` / `OLLAMA_API_KEY`, `DATABASE_URL`. Copy the service URL.
3. **Vercel**: Import this repo, set **Root Directory = `apps/web`**, then paste the root [`.env.example`](.env.example) into Environment Variables with `NEXT_PUBLIC_SERVER_URL` = your Render URL. Deploy.
4. Back on Render, set `CORS_ORIGINS` to your Vercel URL.
5. Point UptimeRobot at `https://<service>.onrender.com/health` every 5 minutes so the free instance stays awake.

Not exercised from here: the steps above are standard but have not been run against real Render/Vercel/Supabase accounts.

## Balance and the AI duel

The AI is a member, not a reply bot. It speaks roughly once every few human messages (`aiEvery`, default 4: ordinary moments wait for 4 human messages, core jokes 2, big moments like 67 or a mog 1), never twice in a row, and otherwise just drops an emoji reaction. Tune it live in the admin panel.

Turn on **AI duel** in the admin panel and each roast gets a reply from a second persona running on the other model (Groq vs Ollama Cloud, labelled in the chat). When the room goes quiet, the two AIs roast each other once, then wait for a human.

## What the AI watches

Rule-based detectors decide *when* and *how much aura*; the LLM only writes the one line. 67 and the fanum tax are
instant canned lines. Providers fall back Groq 120b -> Groq 20b -> Ollama Cloud -> canned within a 3.5s budget.
