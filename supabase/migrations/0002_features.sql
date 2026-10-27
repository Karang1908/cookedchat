-- Behavior stats, coins and lore (rooms.extras), and rich message data: reactions, ohio score, cards (messages.extra).
alter table rooms    add column if not exists extras jsonb not null default '{}'::jsonb;
alter table messages add column if not exists extra  jsonb not null default '{}'::jsonb;
-- cards and confessions are authored by nobody
alter table messages drop constraint if exists messages_kind_check;
alter table messages add constraint messages_kind_check check (kind in ('user','ai','system','card'));
