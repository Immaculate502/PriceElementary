-- F.A.M.E. portal schema
-- Run this in the Supabase SQL editor after connecting the integration.
-- The app (lib/data.ts, app/actions.ts) reads/writes exactly these columns.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.member_role as enum ('member', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.fame_pillar as enum ('faith', 'action', 'ministry', 'evangelism');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.submission_type as enum (
    'journal', 'confession', 'prayer-request', 'testimony', 'bible-study', 'activity'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.submission_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.activity_frequency as enum ('daily', 'weekly', 'monthly');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null default 'Member',
  email        text,
  role         public.member_role not null default 'member',
  avatar_color text not null default 'var(--pillar-faith)',
  streak       integer not null default 0 check (streak >= 0),
  created_at   timestamptz not null default now()
);

create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  pillar      public.fame_pillar not null,
  title       text not null,
  description text not null default '',
  points      integer not null default 0 check (points >= 0),
  frequency   public.activity_frequency not null default 'weekly',
  created_at  timestamptz not null default now()
);

create table if not exists public.submissions (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.profiles(id) on delete cascade,
  member_name text not null default 'Member',
  type        public.submission_type not null,
  pillar      public.fame_pillar not null,
  title       text not null,
  body        text not null,
  status      public.submission_status not null default 'pending',
  is_private  boolean not null default false,
  video_path  text,
  created_at  timestamptz not null default now()
);

-- If upgrading an existing install, add the column in place.
alter table public.submissions add column if not exists video_path text;

create index if not exists submissions_member_id_idx on public.submissions(member_id);
create index if not exists submissions_status_idx on public.submissions(status);

-- ---------------------------------------------------------------------------
-- Helper: is the current user an admin? (SECURITY DEFINER avoids RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.submissions enable row level security;
alter table public.activities enable row level security;

-- profiles: members see/edit their own row; admins can see everyone
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- submissions: members manage their own; public (approved & not private) is
-- readable by any authenticated user; admins can read/moderate everything
drop policy if exists "submissions_select_visible" on public.submissions;
create policy "submissions_select_visible" on public.submissions
  for select using (
    auth.uid() = member_id
    or public.is_admin()
    or (status = 'approved' and is_private = false)
  );

drop policy if exists "submissions_insert_own" on public.submissions;
create policy "submissions_insert_own" on public.submissions
  for insert with check (auth.uid() = member_id);

drop policy if exists "submissions_update_own_or_admin" on public.submissions;
create policy "submissions_update_own_or_admin" on public.submissions
  for update using (auth.uid() = member_id or public.is_admin());

drop policy if exists "submissions_delete_own_or_admin" on public.submissions;
create policy "submissions_delete_own_or_admin" on public.submissions
  for delete using (auth.uid() = member_id or public.is_admin());

-- activities: readable by all authenticated users; only admins manage them
drop policy if exists "activities_select_all" on public.activities;
create policy "activities_select_all" on public.activities
  for select using (auth.role() = 'authenticated');

drop policy if exists "activities_write_admin" on public.activities;
create policy "activities_write_admin" on public.activities
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed activities (optional starter content)
-- ---------------------------------------------------------------------------
insert into public.activities (pillar, title, description, points, frequency) values
  ('faith', 'Daily Scripture Reading', 'Read the assigned passage and reflect.', 10, 'daily'),
  ('faith', 'Morning Prayer', 'Begin the day in prayer and worship.', 5, 'daily'),
  ('action', 'Act of Service', 'Serve someone in your household or community.', 15, 'weekly'),
  ('ministry', 'Small Group', 'Attend and contribute to your small group.', 20, 'weekly'),
  ('evangelism', 'Share Your Faith', 'Have a gospel conversation this week.', 25, 'weekly')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for prayer-request / struggle-report video messages
-- Objects are keyed by "<user_id>/<uuid>.<ext>" and served via signed URLs.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('prayer-videos', 'prayer-videos', false)
on conflict (id) do nothing;

-- Members may upload only into their own folder ("<their uid>/...")
drop policy if exists "prayer_videos_insert_own" on storage.objects;
create policy "prayer_videos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'prayer-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read access: the owner, an admin, OR any authenticated member when the
-- video is attached to an approved, non-private submission (community view).
drop policy if exists "prayer_videos_select_visible" on storage.objects;
create policy "prayer_videos_select_visible" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'prayer-videos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or exists (
        select 1 from public.submissions s
        where s.video_path = storage.objects.name
          and s.status = 'approved'
          and s.is_private = false
      )
    )
  );

drop policy if exists "prayer_videos_delete_own_or_admin" on storage.objects;
create policy "prayer_videos_delete_own_or_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'prayer-videos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
