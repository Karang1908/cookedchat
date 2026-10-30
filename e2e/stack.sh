#!/bin/bash
# Brings up everything the e2e scripts need, or tears it down.
#   e2e/stack.sh up      mock LLM + GIPHY (:54331), server (:4010, admin key "letmein"), web (:3010)
#   e2e/stack.sh down
# Env: PG_LOCAL=1  also start a throwaway Postgres on :54329 (the server creates its tables on boot)
#                  (needs root and a `postgres` OS user: for sandboxes/CI; required for the restart/rehydration tests)
#      E2E_RUN_DIR pid/log directory (default /tmp/cooked-e2e)
# Prerequisites: `pnpm build`, and the web app built with NEXT_PUBLIC_SERVER_URL=http://127.0.0.1:4010
set -u
ROOT=$(cd "$(dirname "$0")/.." && pwd)
RUN=${E2E_RUN_DIR:-/tmp/cooked-e2e}
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGDIR=${PGDIR:-/var/tmp/cooked-pg}
PGURL=postgres://postgres@127.0.0.1:54329/cooked
mkdir -p "$RUN"

up() {
  local dburl=""
  if [ "${PG_LOCAL:-0}" = 1 ]; then
    if ! psql -h 127.0.0.1 -p 54329 -U postgres -c 'select 1' >/dev/null 2>&1; then
      rm -rf "$PGDIR"; mkdir -p "$PGDIR"; chown postgres "$PGDIR"
      su postgres -c "$PGBIN/initdb -D $PGDIR/data -A trust -E UTF8 >/dev/null 2>&1; $PGBIN/pg_ctl -D $PGDIR/data -o '-p 54329 -k $PGDIR -c listen_addresses=127.0.0.1' -l $PGDIR/log -w start" >/dev/null 2>&1
      psql -h 127.0.0.1 -p 54329 -U postgres -qc "create database cooked"
    fi
    dburl=$PGURL
  fi
  curl -s --noproxy '*' -m 1 localhost:54331 >/dev/null 2>&1 || (setsid node "$ROOT/e2e/mock-groq.mjs" > "$RUN/mock.log" 2>&1 < /dev/null & echo $! > "$RUN/mock.pid")
  curl -s --noproxy '*' -m 1 localhost:4010/health >/dev/null 2>&1 || (cd "$ROOT/apps/server"; \
    PORT=4010 ADMIN_KEY=letmein DATABASE_URL=$dburl DATABASE_SSL=false GROQ_API_KEY=test-key GROQ_BASE_URL=http://127.0.0.1:54331/v1 \
    OLLAMA_API_KEY=test OLLAMA_BASE_URL=http://127.0.0.1:54331 GIPHY_API_KEY=test GIPHY_BASE_URL=http://127.0.0.1:54331 OLLAMA_MODEL=gemma4:31b LLM_ORDER=groq-120b,ollama setsid node dist/main.js > "$RUN/server.log" 2>&1 < /dev/null & echo $! > "$RUN/server.pid")
  curl -s --noproxy '*' -m 1 localhost:3010 >/dev/null 2>&1 || (cd "$ROOT/apps/web"; setsid pnpm exec next start -p 3010 > "$RUN/web.log" 2>&1 < /dev/null & echo $! > "$RUN/web.pid")
  for _ in $(seq 1 20); do curl -s --noproxy '*' -m 1 -o /dev/null localhost:3010 && curl -s --noproxy '*' -m 1 localhost:4010/health >/dev/null && break; sleep 1; done
  curl -sS --noproxy '*' localhost:4010/health; echo
}

down() {
  for f in web server mock; do [ -f "$RUN/$f.pid" ] && { kill "$(cat "$RUN/$f.pid")" 2>/dev/null; rm -f "$RUN/$f.pid"; }; done
  # `next start` forks a child that outlives its parent and keeps serving the OLD build from memory: kill it by PID
  for p in $(ps -eo pid,args | grep -E 'next-server|next start' | grep -v grep | awk '{print $1}'); do kill "$p" 2>/dev/null; done
  if [ "${PG_LOCAL:-0}" = 1 ]; then su postgres -c "$PGBIN/pg_ctl -D $PGDIR/data -m fast -w stop" >/dev/null 2>&1; rm -rf "$PGDIR"; echo "postgres removed"; fi
  echo down
}

case "${1:-}" in up) up ;; down) down ;; *) echo "usage: $0 up|down" ; exit 2 ;; esac
