-- Visual Dairy — Supabase setup
--
-- 1) Run the "Journal table + RLS" section below in SQL Editor.
-- 2) Storage → New bucket → Name: journal-images → Public bucket ON → Create.
-- 3) Run the "Storage policies" section at the bottom.

-- ========== Journal table + RLS ==========

-- Journal entries (one row per entry; blocks JSON includes image URLs after upload)
create table if not exists public.journal_entries (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date_label text not null default '',
  title text not null default '',
  description text not null default '',
  blocks jsonb not null default '[]'::jsonb,
  created_at bigint not null,
  pretext_hero_block_id text null,
  updated_at timestamptz not null default now()
);

alter table public.journal_entries
  add column if not exists pretext_hero_block_id text null;

create index if not exists journal_entries_user_created
  on public.journal_entries (user_id, created_at desc);

alter table public.journal_entries enable row level security;

drop policy if exists "journal_select_own" on public.journal_entries;
drop policy if exists "journal_insert_own" on public.journal_entries;
drop policy if exists "journal_update_own" on public.journal_entries;
drop policy if exists "journal_delete_own" on public.journal_entries;

create policy "journal_select_own"
  on public.journal_entries for select
  using (auth.uid() = user_id);

create policy "journal_insert_own"
  on public.journal_entries for insert
  with check (auth.uid() = user_id);

create policy "journal_update_own"
  on public.journal_entries for update
  using (auth.uid() = user_id);

create policy "journal_delete_own"
  on public.journal_entries for delete
  using (auth.uid() = user_id);

-- ========== Storage policies (after bucket `journal-images` exists) ==========
-- Safe to re-run: drops existing policies first.

drop policy if exists "journal_images_insert_own" on storage.objects;
drop policy if exists "journal_images_select_own" on storage.objects;
drop policy if exists "journal_images_update_own" on storage.objects;
drop policy if exists "journal_images_delete_own" on storage.objects;

create policy "journal_images_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'journal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "journal_images_select_own"
  on storage.objects for select
  using (
    bucket_id = 'journal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "journal_images_update_own"
  on storage.objects for update
  using (
    bucket_id = 'journal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "journal_images_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'journal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
