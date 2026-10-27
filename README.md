# Cooked Chat 💀

The AI that lives in your group chat. It interrupts, roasts, reacts and awards aura based on how people behave.

## Run it locally

```bash
pnpm install
cp apps/server/.env.example apps/server/.env   # loaded automatically by dev:server
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

## Deploy (not yet exercised)

- **Supabase**: run `supabase/migrations/0001_init.sql`, then put the connection string in `DATABASE_URL`
  (try the pooler string if the direct one is unreachable from Render).
- **Render**: `render.yaml` describes the server. Point UptimeRobot at `https://<service>.onrender.com/health` every 5 min.
- **Vercel**: root directory `apps/web`, set `NEXT_PUBLIC_SERVER_URL` to the Render URL, and set the server's
  `CORS_ORIGINS` to the Vercel URL. `pnpm build` builds the shared package first.

## What's in it

Everything in the original spec, in four batches:

- **Watches**: reply speed, typing drama, typed-then-deleted, left on read, bursts, dry texts, tone shifts (`ok` → `ok.`), topic derails, edits/deletes, food, 67, Ohio %, cap detector, late night, heated arguments (mewing), simp radar, silence (Duolingo owl, missing-person posters, betrayal alert)
- **Scores**: aura with receipts, rizz meter, power level (scouter), RPG classes, Italian-brainrot creatures, sigma/alpha/beta/NPC tiers, mogs, cooked-o-meter with deep-fry stages and a room-wide meltdown
- **Plays**: "Chat, is this real?" votes, hot take arena, prediction market (fake coins), rizz battles, anonymous confessions, chaos agent, cursed copypasta, chat weather forecast, instant replay
- **Remembers**: lore keeper, season recap, chat awards, Brainrot Wrapped, auto memes, shareable PNG cards, daily tiers
- **Speaks**: 6 personas + a rival that argues back, brainrot slider and roast intensity, brainrot / plain-English / "what they really meant" translators, soundboard, robot voice, stickers, optional GIFs, BREAKING NEWS banner
- **Admin** (`/admin/<code>`): room clock warp, every timing live, staged demos of each moment, forced triggers, bots

## What the AI watches

Rule-based detectors decide *when* and *how much aura*; the LLM only writes the one line. 67 and the fanum tax are
instant canned lines. Providers fall back Groq 120b -> Groq 20b -> Ollama Cloud -> canned within a 3.5s budget.
