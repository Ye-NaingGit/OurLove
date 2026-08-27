-- ============================================================
-- schema.sql
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Creates every table the site needs, plus starter security rules.
-- ============================================================

-- Enable the pgcrypto extension so we can use gen_random_uuid() for ids.
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- media — every uploaded photo/video lives here once, and other
-- tables (memories, gifts, firsts, us) point to it by id. Keeping
-- media in one table means the Gallery page can just list this
-- table directly instead of pulling from five different places.
-- ------------------------------------------------------------
create table media (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  description text,
  url         text not null,       -- public URL from Supabase Storage
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- places — pins on the map
-- ------------------------------------------------------------
create table places (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  latitude  numeric not null,
  longitude numeric not null
);

-- ------------------------------------------------------------
-- memories — the reverse-chronological timeline
-- ------------------------------------------------------------
create table memories (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  date         date not null,
  description  text,
  is_milestone boolean not null default false,
  location_id  uuid references places(id) on delete set null,
  media_id     uuid references media(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- firsts — corkboard of first-time moments, each optionally
-- linking back to the full memory it belongs to
-- ------------------------------------------------------------
create table firsts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  memory_id   uuid references memories(id) on delete set null,
  -- random-ish rotation + position, set once when a first is created,
  -- so the corkboard layout doesn't reshuffle on every page load
  rotation    numeric not null default 0,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- gifts — presents, opened like a gift box on click
-- ------------------------------------------------------------
create table gifts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  message    text,
  given_by   text,
  date       date,
  media_id   uuid references media(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- future_plans — notebook page, struck through when completed
-- ------------------------------------------------------------
create table future_plans (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  completed  boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- love_notes — shown on the Us page, one at a time with arrows
-- ------------------------------------------------------------
create table love_notes (
  id          uuid primary key default gen_random_uuid(),
  number      integer not null,
  description text not null
);

-- ------------------------------------------------------------
-- us — one row per person, shown side by side on the Us page
-- ------------------------------------------------------------
create table us (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  birthday        date,
  zodiac          text,
  blood           text,
  favorite_food   text,
  favorite_color  text,
  photo_id        uuid references media(id) on delete set null
);


-- ============================================================
-- Row Level Security
--
-- This is a two-person private site, not a public app, so the
-- simplest workable model is: anyone with the anon public key
-- (i.e. anyone with the site URL) can read AND write. That is
-- enough for "just the two of us" use, but note it does mean
-- anyone who finds the URL could technically edit the data.
--
-- If you want it locked down further later, the straightforward
-- upgrade is to keep these read policies, drop the write policies
-- below, and instead write through a Supabase Edge Function that
-- checks a shared passphrase before inserting/updating. Flagged in
-- the README too — not needed to get the prototype working.
-- ============================================================

alter table media         enable row level security;
alter table places        enable row level security;
alter table memories      enable row level security;
alter table firsts        enable row level security;
alter table gifts         enable row level security;
alter table future_plans  enable row level security;
alter table love_notes    enable row level security;
alter table us            enable row level security;

-- One policy per table, allowing every operation for anyone with
-- the anon key. Repeat this pattern's naming per table for clarity.
create policy "public read/write - media"        on media         for all using (true) with check (true);
create policy "public read/write - places"       on places        for all using (true) with check (true);
create policy "public read/write - memories"     on memories      for all using (true) with check (true);
create policy "public read/write - firsts"       on firsts        for all using (true) with check (true);
create policy "public read/write - gifts"        on gifts         for all using (true) with check (true);
create policy "public read/write - future_plans" on future_plans  for all using (true) with check (true);
create policy "public read/write - love_notes"   on love_notes    for all using (true) with check (true);
create policy "public read/write - us"           on us            for all using (true) with check (true);


-- ============================================================
-- Storage bucket for photos/videos (Gallery uploads, gift photos, etc.)
-- Run this too — creates a public bucket named "media".
-- ============================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "public read - media bucket"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "public upload - media bucket"
  on storage.objects for insert
  with check (bucket_id = 'media');


-- ============================================================
-- Starter data — optional, delete this block if you'd rather
-- add everything yourself through the site once it's live.
-- ============================================================
insert into us (name, birthday, zodiac, blood, favorite_food, favorite_color) values
  ('Ye Naing', '2002-10-09', 'Libra', 'AB', 'Shan Noodles', 'Black'),
  ('Thaddar Ye Naing Khit', '2002-08-30', 'Virgo', 'O', null, 'Baby Pink');

insert into love_notes (number, description) values
  (1, 'I like how you always take care of me');


-- ============================================================
-- MIGRATION — added after the first schema run, for the Gallery
-- page's new "delete selected" feature.
--
-- If you already ran everything above once, you do NOT need to
-- re-run this whole file (it would error on tables that already
-- exist). Just run this one block below in the SQL Editor —
-- it adds the missing permission to actually remove a file from
-- storage when you delete it from the Gallery, instead of just
-- deleting its database row and leaving the file behind.
-- ============================================================
create policy "public delete - media bucket"
  on storage.objects for delete
  using (bucket_id = 'media');
