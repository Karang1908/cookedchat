# Cooked Chat

Group chat with an AI that interrupts, roasts and scores "aura" from how people behave (reply speed, typing drama,
dry texts), plus a UI that deep-fries as the chat gets unhinged. Hackathon build. The product spec
(`COOKED_CHAT_HACKATHON.md`, the user's upload) is NOT in this repo: ask for it before adding features.

## Layout

pnpm workspace (pnpm 10, Node >= 20.11, we run 22).

- `packages/shared` — types, socket event contract, aura rules, slang/persona config, pure detectors, cooked meter, canned lines. ESM, built to `dist/` with tsc.
- `apps/server` — NestJS 12 + Socket.IO. Deploys to Render. Game logic is in `src/engine.ts` (no Nest, no sockets: talks through `RoomBus`), so it is unit-testable.
- `apps/web` — Next.js 16 (App Router, Turbopack) + Tailwind 4. Deploys to Render (`render.yaml`: `cookedchat-web` + `cookedchat-server`).
- Persistence: optional, any Postgres via `DATABASE_URL` (`pg`, no vendor SDK). The schema is `apps/server/src/schema.ts`, applied idempotently by `PgStore` on boot (also upgrades databases from the old `supabase/migrations`). Without a URL, rooms are memory-only.

## Commands

```
pnpm install
pnpm dev:server            # tsc -w + node --watch on :4000; loads apps/server/.env if present (see .env.example)
pnpm dev:web               # next dev on :3000
pnpm local                 # demo on the laptop: build, then next start :3000 + server :4000 (phones join over the Wi-Fi)
pnpm build                 # shared -> server -> web
pnpm test                  # shared + server (node:test; needs a build first, `pnpm build:shared` + server build)
pnpm --filter @cooked/web typecheck
```

`build`/`dev` in both apps run `pre*` hooks that build `@cooked/shared` first. If you see "cannot find module '@cooked/shared'", that is why.

## End-to-end tests

`e2e/` has real-client suites (Socket.IO + Playwright with a desktop player, a phone player and the admin) against a stack with a mock LLM/GIPHY and a throwaway Postgres. See `e2e/README.md`. Run them after changing anything in the chat flow; they found most of the UI bugs listed below (unit tests cannot see stacking contexts, overflow or timers).

## Design system (web)

Clean messenger look. Tokens live in `apps/web/src/app/globals.css` (`bg / panel / surface / raised / line / fg / muted / faint`, one `accent` (ember), `good / bad / warn`, `groq / ollama` for duel sides). Primitives in `components/ui.tsx` (`Button`, `Section`, `Segmented`, `Switch`, `Chip`, `fieldCls`, `Wordmark`). Inter everywhere; the display font (Anton) is only for loud moments (meltdown, posters, BREAKING). No gradient text, glows or border beams. AI lines are a ruled aside (`[data-ai-line]`, label `[data-ai-label]`), not a bubble; tests rely on those hooks.

## AI balance

- **Speaking budget** (`Engine.mayTakeTurn`): ordinary triggers need `settings.aiEvery` user messages since the AI's last turn (default 4), priority 8 needs half, priority 9+ needs one. `force` (system events) skips dice/cooldown but still needs one human message. Never two AI turns in a row; timers obey it too, ordered so the specific beats the generic (left on read → daily tiers → posters/owl → duel lull → dead chat). Blocked moments get a quiet emoji (`quietReact`). Staged/admin moments bypass all of it.
- `room.humanSinceAi` resets in `postAi` and in `postCard` when the card has a trigger (AI-chosen). Player-started games don't spend the budget. A follow-up line in the same AI turn passes `sameTurn` (e.g. the instant-replay roast).
- **Duel** (`settings.duel`, admin toggle): main persona on Groq (`prefer: 'groq'`), rival (configured, or a contrasting default) on Ollama (Gemma 4, `OLLAMA_MODEL`); lines carry `model` and `side`. `duelBanter` runs once per lull (`duelLullMs`, room clock) after a human spoke. The router's `prefer` only reorders: if Ollama is down, Groq covers its line.
- Unit tests set `aiEvery = 0` in `setup()`; the budget has its own suite (`engine-e.test.ts`). Test rooms run at local midday (`middayTz()` in `helpers.test-util.ts`): a UTC room run at 03:xx UTC fires the 3am Tung Tung on its first tick, which takes the AI's turn and broke 4 tests only during that hour. Build any new test `Room` with it. E2E flows that test a specific roast turn it off through the admin slider.

## Landmines (each one cost time)

- **Nest 12 is ESM-only.** `apps/server` is `"type": "module"`, tsconfig `NodeNext`: relative imports need the `.js` suffix. Nest's CLI is not used; `tsc` + `node`.
- **TypeScript is pinned to 5.9.** 7.x is "latest" on npm; decorator metadata for Nest is not verified there.
- **Test globs**: `node --test dist/` runs nothing and still "passes". Use `node --test "dist/**/*.test.js"` (the package scripts do).
- **Handlers return acks.** In `chat.gateway.ts` the return value of a `@SubscribeMessage` handler is the Socket.IO ack. Do not return objects with an `event` key.
- **Never trust LLM output for game state.** The model writes one plain-text line. Aura, fx and sounds come from rules. Groq structured outputs are reported flaky on gpt-oss, so we do not use them. Every line goes through `sanitizeLine` (off-limits filter) and falls back to `CANNED`.
- **LLM gating is random on purpose.** Low-priority triggers comment ~35% of the time (`Engine.chance`). Tests inject `rng: () => 0`; E2E checks must use a priority >= 8 trigger (e.g. "I'll reply later").
- **Time**: game logic uses the room clock (`room.now()`, real time + admin offset), except typing duration, cooldowns and rate limits which use real time. "After" between messages means array order, not timestamps (the admin can warp backwards).
- **`NEXT_PUBLIC_*` is inlined at build time.** Changing `NEXT_PUBLIC_SERVER_URL` needs a rebuild.
- **`metal-fx` is not hydration-safe** (server renders its "unsupported" fallback). Use `components/metal-cta.tsx`, which mounts it after hydration.
- **Fixed overlays must live outside `#stage`.** `#stage` carries CSS `filter` (deep fry); a filter on an ancestor makes `position: fixed` children relative to it.
- **Audio is gesture-gated on phones.** The join gate's button calls `unlockAudio()`. Sounds are synthesized (WebAudio), approximations of the memes; real clips are opt-in via `NEXT_PUBLIC_SOUND_CLIPS`. The Subway Surfers sidebar is a neutral placeholder (IP); `NEXT_PUBLIC_GAMEPLAY_SRC` swaps in a video.
- **WebGL cost**: one R3F canvas (goblin) + one MetalFx context on the landing page. Do not add per-message 3D. Headless Chromium with `--enable-unsafe-swiftshader` takes ~20s to compile shaders; do not use that flag in UI tests.
- Bots (Aman, Riya, Dev) share names with likely players; they carry a BOT badge.
- **Staged moments (`Engine.simulate`) must only speak as bots.** Using "any other member" posts words as real players. They also bypass the AI's cooldown and dice (`Engine.staging`): an admin clicking "simp radar" on stage must always get a roast, not a 10% silence.
- **Equal PRIORITY ties go to the first hit** (`detect()` before `analyze()`). Give the funnier trigger the higher number (ohio_high 7 > unc 5: "SKIBIDI!!!!" is both).
- **Mobile layout: the room grid must be `grid-cols-[minmax(0,1fr)]`.** An `auto` track sizes to a child's nowrap min-content (e.g. a long reply banner) and pushes the Send button off-screen. Check `document.documentElement.scrollWidth === innerWidth` in phone tests.
- **Message toolbar sits inside the row** (overlapping the bubble's top edge). Absolutely positioning it outside the bubble overflowed phones.
- **`next start` keeps serving the old build from memory after a rebuild** (chunks 500). Kill the old `next-server` by PID before restarting. `pkill -f` kills your own shell; use `ps`+`kill`.
- **Cards** (`ChatMessage.card`, kind `'card'`) are server-mutated and re-sent with `chat:update`. Open cards are found by scanning the last 60 messages each tick (`Games.tick`): votes/battles expire on real time (`closesAt`), markets settle on the room clock (so a warp settles them). All game actions return an `Ack`; the UI shows the reason.
- **Confessions store no author** (not on the message, not in the room, not in Postgres). Keep it that way; a test mutates this. The "AI guess" is random with fake confidence.
- **Market coins are conserved** (parimutuel; refund when nobody backed the winner). A test checks the total before/after.
- **Votes settle early** only when every eligible member (online non-subject humans + all bots) has voted, otherwise at `voteWindowMs`. In demos, use "demo speed" in the admin Timings.
- **Server TS `lib` is ES2023** (for `findLast`).
- **Popovers must out-stack later rows.** Every chat row is its own stacking context (`.pop-in`), so a menu opening *downward* is painted over by the next message and becomes unclickable. The row owning an open menu gets `relative z-30`, and menus flip below the message only when there is no room above (`menuDir`). If Playwright hangs on a click, probe `document.elementFromPoint` at the element's centre: it is usually telling you the truth about what covers it.
- **Lore is privacy-sensitive**: editing or deleting a message removes its lore (`Memory.forget`) so deleted text never resurfaces as an inside joke.
- **LLM-backed helpers (`writer.generate`)**: translators, memes, recap cliffhanger and the battle judge all fall back to rule-based output, and any model output touching `OFF_LIMITS` is dropped. Rival commentators (`settings.rival`) double the LLM calls per roast; instant triggers use canned retorts (`RIVAL_RETORTS`).
- **Share images are drawn client-side** on a canvas (`lib/share-card.ts`, 1080px PNG) and shared with `navigator.share` or downloaded. Fonts must be loaded first (`ensureFonts`).
- **Timers in effects**: keep UI hide-timers in a `ref`, not in an effect cleanup. The messages array changes constantly (GIFs, reactions); a cleanup cancels the timer and an early return then never re-arms it (this hid the BREAKING banner forever once).
- **GIFs** are optional (`GIPHY_API_KEY`, `GIPHY_BASE_URL` for tests), attached *after* the roast is posted, and only https `giphy.com` URLs are accepted (server and client both check). Stickers are plain emoji tiles keyed by trigger (`STICKER`).
- **Never put sizes in a shared class string.** `fieldCls` once had `h-10 w-full`; a per-use `w-24`/`h-9` then lost silently (two utilities of the same kind resolve by stylesheet order, not class-list order). Each use states its own width/height.
- **Unlayered CSS beats Tailwind utilities regardless of specificity.** Global rules that utilities should be able to override (e.g. the `:focus-visible` ring) go in `@layer base`.
- **Deep fry font**: Comic Neue is shipped via fontsource. Never fall back to the generic `cursive` (it is a serif on Linux/Android, which made the whole UI look broken).
- **Cooked heat is calibrated**: 2 per message, decay 1/s, 67 +20. Ordinary chat stays under 50%, so the UI only fries under real chaos.
- **Env files**: root `.env.example` is the Render paste (block 1 = server, block 2 = web), with placeholders only, never real keys; the per-app `.env.example` files are for local dev. `loadConfig` treats placeholders (`REPLACE_ME`, `xxxxxxxx`, `your-`, `<...>`) as unset and `main.ts` logs which are left, so a half-filled paste degrades to canned lines instead of 401 storms. Two always-on free Render services exceed the ~750 free hours/month: only the server is pinged.
- **Derived data**: `Member.stats` (class, creature, tier, rizz, power) is recomputed by `Room.recompute()` and flushed at most once per tick. Raw counters live in `Room.stats` and are persisted in `rooms.extras` (5s debounce); message extras (reactions, ohio, cards) in `messages.extra`. The schema changes in `schema.ts` only, written idempotently (`if not exists`): it runs on every boot.

- **Off-limits filter vs Hinglish.** `isOffLimits` substring-matches `OFF_LIMITS`; anything whose letters occur inside ordinary words goes in `OFF_LIMITS_WORDS` (whole words). "gay" as a substring rejected every "ho gaya", "sikh" every "sikhaya". A test runs every shipped line through the filter.
- **Ollama Cloud API**: model names are what `https://ollama.com/api/tags` lists (`gemma4:31b`; the `-cloud` suffix is CLI-only). `think` takes levels (`'low'`) only on gpt-oss; Gemma 4 takes `true/false` (we send `false`). `ollamaProvider` picks by model name.
- **Model-picked GIFs**: models may end a line with `[gif: query]` (`GIF_RULE`); `extractGif` strips it, `gifQuery` cleans it. Rationed per side (`MODEL_GIF_GAP_MS`) because GIPHY's free key allows ~100 searches an hour; the trigger's fixed `GIF_QUERY` is the fallback.
- **Memory-only rooms die on every deploy/restart**, UptimeRobot or not (Render free has no disk and may restart any time). Idle rooms nobody is connected to (members or `room.adminSockets`) are evicted by `GameLoop`: after 30 min with a database (reloaded on next join), after 72 h without one (gone).
- **Slang refresh**: `UNC_SLANG` (expired, costs aura) and `SLANG_TERMS` (what the AI may say) must not overlap. `ohioScore` matches its vocabulary as whole words ("ate" is inside "great").
- **E2E on macOS**: `e2e/stack.sh` assumes Linux (`setsid`, `su postgres`, `/usr/lib/postgresql`). Start the pieces by hand; Homebrew Postgres needs `-c unix_socket_directories=''` when the data dir path is long (103-byte socket limit). `ui-d`'s daily-tiers step depends on the time of day: started before ~12:00 local, a missing poster spends the AI's turn before the day rolls over and the tiers are (correctly) skipped. Run it with `TZ` set so local time is afternoon.

- **Local Wi-Fi play** (`pnpm local`): a phone's "localhost" is itself. With `NEXT_PUBLIC_SERVER_URL` unset, `serverUrl()` uses the page's own host on port 4000, and `useRoomUrl` swaps a loopback origin for the laptop's Wi-Fi IP from the server's `GET /lan` (`lan.ts`), so QR codes work while the host browses `localhost`. Never put `localhost` in `apps/web/.env.local`. `next dev` blocks `/_next/*` from non-localhost origins unless they are in `allowedDevOrigins` (private ranges are listed in `next.config.ts`). The server's `start` loads `apps/server/.env`. Port 4000 is also used by other local projects on this machine (bits-idcards API): check `lsof -iTCP:4000` on EADDRINUSE.

## Conventions

- Aura numbers live only in `packages/shared/src/aura.ts`. Timings live in `RoomTimings` and are admin-editable at runtime.
- Slang/emoji lists are hand-edited in `packages/shared/src/slang.ts`; re-check them before the demo (last refreshed Oct 2026). Desi content is Hinglish in Roman script, mixed into the shared pools; the `desi` and `aunty` personas carry `refs`.
- Roast behavior, never identity. The guardrail list is `OFF_LIMITS` in `slang.ts`.
