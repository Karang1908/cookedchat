/**
 * The whole Postgres schema, applied by PgStore on boot (idempotent), so any Postgres works from just a DATABASE_URL.
 * Also upgrades databases created by the old supabase/migrations (0001 + 0002), which used these same tables.
 */
export const SCHEMA = `
create table if not exists rooms (
  code            text primary key,
  tz_offset_min   int    not null default 0,
  clock_offset_ms bigint not null default 0,
  settings        jsonb  not null default '{}'::jsonb,
  extras          jsonb  not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
alter table rooms add column if not exists extras jsonb not null default '{}'::jsonb;

create table if not exists members (
  room_code  text not null references rooms(code) on delete cascade,
  id         text not null,
  name       text not null,
  avatar     text not null,
  is_bot     boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (room_code, id)
);

create table if not exists messages (
  id           uuid primary key,
  room_code    text not null references rooms(code) on delete cascade,
  author_id    text,
  kind         text not null,
  text         text not null,
  at           bigint not null,
  edited       boolean not null default false,
  deleted      boolean not null default false,
  ai_reactions text[] not null default '{}',
  reply_to     uuid,
  trigger      text,
  extra        jsonb not null default '{}'::jsonb
);
alter table messages add column if not exists extra jsonb not null default '{}'::jsonb;
-- cards and confessions are authored by nobody; old databases only allowed user/ai/system
alter table messages drop constraint if exists messages_kind_check;
alter table messages add constraint messages_kind_check check (kind in ('user','ai','system','card'));
create index if not exists messages_room_at on messages (room_code, at);

create table if not exists message_edits (
  id         bigserial primary key,
  message_id uuid not null,
  old_text   text not null,
  at         bigint not null
);

create table if not exists aura_ledger (
  id         uuid primary key,
  room_code  text not null references rooms(code) on delete cascade,
  member_id  text not null,
  delta      int  not null,
  reason     text not null,
  message_id uuid,
  receipt    text not null,
  at         bigint not null
);
create index if not exists aura_room_at on aura_ledger (room_code, at);
`;
