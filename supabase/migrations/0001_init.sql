-- Cooked Chat schema. The NestJS server connects with the project's direct/pooler connection string
-- (a privileged role), so RLS is enabled with NO policies: the public PostgREST/anon API can read nothing.

create table if not exists rooms (
  code            text primary key,
  tz_offset_min   int    not null default 0,
  clock_offset_ms bigint not null default 0,
  settings        jsonb  not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

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
  id          uuid primary key,
  room_code   text not null references rooms(code) on delete cascade,
  author_id   text,
  kind        text not null check (kind in ('user','ai','system')),
  text        text not null,
  at          bigint not null,
  edited      boolean not null default false,
  deleted     boolean not null default false,
  ai_reactions text[] not null default '{}',
  reply_to    uuid,
  trigger     text
);
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

alter table rooms         enable row level security;
alter table members       enable row level security;
alter table messages      enable row level security;
alter table message_edits enable row level security;
alter table aura_ledger   enable row level security;
