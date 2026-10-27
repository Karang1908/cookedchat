# Cooked Chat

Group chat with an AI that interrupts, roasts and scores "aura" from how people behave (reply speed, typing drama,
dry texts), plus a UI that deep-fries as the chat gets unhinged. Hackathon build. The product spec
(`COOKED_CHAT_HACKATHON.md`, the user's upload) is NOT in this repo: ask for it before adding features.

## Layout

pnpm workspace (pnpm 10, Node >= 20.11, we run 22).

- `packages/shared` — types, socket event contract, aura rules, slang/persona config, pure detectors, cooked meter, canned lines. ESM, built to `dist/` with tsc.
- `apps/server` — NestJS 12 + Socket.IO. Deploys to Render. Game logic is in `src/engine.ts` (no Nest, no sockets: talks through `RoomBus`), so it is unit-testable.
- `apps/web` — Next.js 16 (App Router, Turbopack) + Tailwind 4. Deploys to Vercel.
- `supabase/migrations` — Postgres schema. The server uses `pg` with `DATABASE_URL`, not supabase-js; RLS is on with no policies.

## Commands

```
pnpm install
pnpm dev:server            # tsc -w + node --watch on :4000; loads apps/server/.env if present (see .env.example)
pnpm dev:web               # next dev on :3000
pnpm build                 # shared -> server -> web
pnpm test                  # shared + server (node:test; needs a build first, `pnpm build:shared` + server build)
pnpm --filter @cooked/web typecheck
```

`build`/`dev` in both apps run `pre*` hooks that build `@cooked/shared` first. If you see "cannot find module '@cooked/shared'", that is why.

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

## Conventions

- Aura numbers live only in `packages/shared/src/aura.ts`. Timings live in `RoomTimings` and are admin-editable at runtime.
- Slang/emoji lists are hand-edited in `packages/shared/src/slang.ts`; re-check them before the demo.
- Roast behavior, never identity. The guardrail list is `OFF_LIMITS` in `slang.ts`.
