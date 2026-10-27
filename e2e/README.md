# End-to-end tests

Real clients against the real server: socket-level suites (Socket.IO) and browser suites (Playwright, headless Chromium,
a desktop player + a phone player + the admin panel at once). The LLM and GIPHY are replaced by `mock-groq.mjs`, so
no keys or internet are needed.

```bash
pnpm build
NEXT_PUBLIC_SERVER_URL=http://127.0.0.1:4010 pnpm --filter @cooked/web build   # the URL is inlined at build time
PG_LOCAL=1 e2e/stack.sh up        # mock :54331, server :4010, web :3010, throwaway Postgres :54329

node e2e/socket-core.mjs phase1                    # prints ROOM=XXXX
node e2e/socket-batch-a.mjs phase1                 # prints ROOM=YYYY
PG_LOCAL=1 e2e/stack.sh down && PG_LOCAL=1 e2e/stack.sh up   # restart the server (and DB: see note)
node e2e/socket-core.mjs phase2 XXXX               # rooms, aura, stats, reactions, cards survive a restart
node e2e/ui-core.cjs; node e2e/ui-a.cjs; node e2e/ui-b.cjs; node e2e/ui-c.cjs; node e2e/ui-d.cjs
PG_LOCAL=1 e2e/stack.sh down
```

Note on the restart phase: stopping only the server keeps the data, so for phase 2 kill just the server
(`kill $(cat /tmp/cooked-e2e/server.pid)`) and run `e2e/stack.sh up` again (it skips what is already running).

| Script | Covers |
| --- | --- |
| `socket-core.mjs` | rooms, joins, acks, admin auth, 67/aura/LLM path, typing, rate limits, edit/delete leaks, restart rehydration |
| `socket-batch-a.mjs` | replies, reactions, stats/power, posters, persistence of extras |
| `ui-core.cjs` | landing → room, 67 shake, admin staging, deep fry, meltdown, healing, mobile tabs |
| `ui-a.cjs` | Ohio chip, replies, reactions, profile card, vibe switcher, simp radar, posters, midnight |
| `ui-b.cjs` | votes, hot takes, market, rizz battle, confession anonymity, forecast, replay, chaos |
| `ui-c.cjs` | translators, memes (real 1080px PNG), Wrapped, awards, recap, rival, lore |
| `ui-d.cjs` | BREAKING banner, stickers, GIF, daily tiers, no replayed headlines |

Gotchas that cost time (also in `CLAUDE.md`):
- Needs `playwright` resolvable (`npm i -g playwright`); use plain headless Chromium. `--enable-unsafe-swiftshader` makes shader compilation take ~20s.
- Locators: use `getByRole('textbox', { name: 'Message' })`, never `getByLabel('Message')` (the message toolbar buttons match it), and scope text searches to `getByRole('log')`.
- If Playwright hangs on a click, probe `document.elementFromPoint` at the element's centre: something is covering it.
- The AI stays quiet on purpose: low-priority triggers comment ~35% of the time and there is a cooldown. Use "I'll reply later" (priority 8) or `demo speed` in the admin Timings.
- Screenshots go to `e2e/shots/` (git-ignored).
