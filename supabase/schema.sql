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
  -- Leaders retire activities instead of deleting them, so submissions,
  -- points and streaks that reference them stay intact.
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Added after the initial release; keeps existing installs in sync.
alter table public.activities
  add column if not exists active boolean not null default true;

create index if not exists activities_active_idx on public.activities (active);

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
-- search_path is pinned to '' (and tables fully qualified) so a caller cannot
-- shadow a name and run their own code with the function owner's privileges.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Handles both email sign-up (full_name) and Google OAuth (name).
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, 'Member'), '@', 1)
    ),
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

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- ---------------------------------------------------------------------------
-- Role management
--
-- The policy above lets a member update their own profile row, which on its
-- own would allow anyone to set role='admin' on themselves. This trigger
-- rejects any role change that does not come from set_member_role() below.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_role_self_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and coalesce(current_setting('fame.allow_role_change', true), '') <> 'on'
  then
    raise exception 'Roles can only be changed by a leader from the Leadership area';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.prevent_role_self_change();

-- Guarded promote/demote. Callable by an existing leader, or by anyone while
-- no leader exists yet (first-leader bootstrap, additionally gated in the app
-- by the administrator password). Never lets the last leader be demoted.
create or replace function public.set_member_role(
  target_id uuid,
  new_role  public.member_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_count int;
  target_is_admin boolean;
begin
  select count(*) into admin_count from public.profiles where role = 'admin';

  if not (public.is_admin() or admin_count = 0) then
    raise exception 'Only a leader can change member roles';
  end if;

  select (role = 'admin') into target_is_admin
  from public.profiles where id = target_id;

  if target_is_admin is null then
    raise exception 'Member not found';
  end if;

  if new_role = 'member' and target_is_admin and admin_count <= 1 then
    raise exception 'At least one leader must remain';
  end if;

  perform set_config('fame.allow_role_change', 'on', true);
  update public.profiles set role = new_role where id = target_id;
end;
$$;

revoke all on function public.set_member_role(uuid, public.member_role) from public;
grant execute on function public.set_member_role(uuid, public.member_role) to authenticated;

-- submissions: a member sees only their own entries; leadership sees all.
-- Deliberately private — journals, confessions and struggle reports are never
-- readable by other members, so there is no "approved and public" case here.
drop policy if exists "submissions_select_visible" on public.submissions;
drop policy if exists "submissions_select_own_or_admin" on public.submissions;
create policy "submissions_select_own_or_admin" on public.submissions
  for select using (auth.uid() = member_id or public.is_admin());

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
drop policy if exists "activities_select_authenticated" on public.activities;
create policy "activities_select_authenticated" on public.activities
  for select to authenticated using (true);

drop policy if exists "activities_write_admin" on public.activities;
drop policy if exists "activities_admin_write" on public.activities;
create policy "activities_admin_write" on public.activities
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed activities (optional starter content)
-- ---------------------------------------------------------------------------
-- Guarded by "not exists" rather than "on conflict": the primary key is a
-- generated uuid, so it never collides and re-running would duplicate rows.
insert into public.activities (pillar, title, description, points, frequency)
select * from (values
  ('faith'::public.fame_pillar,      'Daily Scripture reading',  'Read the assigned passage and note one truth to carry into your day.', 10, 'daily'::public.activity_frequency),
  ('faith'::public.fame_pillar,      'Morning prayer',           'Begin the day in prayer before other commitments.',                    10, 'daily'::public.activity_frequency),
  ('faith'::public.fame_pillar,      'Weekly journal entry',     'Reflect in writing on how God moved during the week.',                 15, 'weekly'::public.activity_frequency),
  ('action'::public.fame_pillar,     'Act of service',           'Serve someone in practical love without expecting return.',            15, 'weekly'::public.activity_frequency),
  ('action'::public.fame_pillar,     'Community fast',           'Join the community in a scheduled season of fasting.',                 25, 'monthly'::public.activity_frequency),
  ('action'::public.fame_pillar,     'Volunteer outreach',       'Give time to an outreach, food drive, or benevolence effort.',         20, 'monthly'::public.activity_frequency),
  ('ministry'::public.fame_pillar,   'Serve on a team',          'Take your place on a worship, media, hospitality, or care team.',      20, 'weekly'::public.activity_frequency),
  ('ministry'::public.fame_pillar,   'Host or lead small group', 'Open your home or lead discussion for a small group gathering.',       25, 'weekly'::public.activity_frequency),
  ('ministry'::public.fame_pillar,   'Mentor a member',          'Walk alongside a newer member and encourage their growth.',            30, 'monthly'::public.activity_frequency),
  ('evangelism'::public.fame_pillar, 'Share your testimony',     'Tell someone what God has done in your life.',                         20, 'weekly'::public.activity_frequency),
  ('evangelism'::public.fame_pillar, 'Invite someone to church', 'Personally invite and welcome a guest to a gathering.',                15, 'weekly'::public.activity_frequency),
  ('evangelism'::public.fame_pillar, 'Gospel conversation',      'Have an intentional conversation about the gospel.',                   20, 'monthly'::public.activity_frequency)
) as seed(pillar, title, description, points, frequency)
where not exists (select 1 from public.activities);

-- ---------------------------------------------------------------------------
-- Storage: private bucket for prayer-request / struggle-report video messages
-- Objects are keyed by "<user_id>/<uuid>.<ext>" and served via signed URLs.
-- ---------------------------------------------------------------------------
-- 50 MB cap keeps phone recordings reasonable. Enforced by Supabase itself,
-- so it cannot be bypassed from the client.
insert into storage.buckets (id, name, public, file_size_limit)
values ('prayer-videos', 'prayer-videos', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- Members may upload only into their own folder ("<their uid>/...")
drop policy if exists "prayer_videos_insert_own" on storage.objects;
create policy "prayer_videos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'prayer-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read access is leadership-only: the video's owner or an admin. Video
-- messages are never exposed in the community feed.
drop policy if exists "prayer_videos_select_visible" on storage.objects;
drop policy if exists "prayer_videos_select_own_or_admin" on storage.objects;
create policy "prayer_videos_select_own_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'prayer-videos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "prayer_videos_delete_own_or_admin" on storage.objects;
create policy "prayer_videos_delete_own_or_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'prayer-videos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ---------------------------------------------------------------------------
-- App settings: key/value store for leadership configuration such as the
-- admin-area password hash (key = 'admin_password_hash'). Admin-only access.
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_admin_only" on public.app_settings;
create policy "app_settings_admin_only" on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Lessons system: leader-authored lessons (video + scriptures + instructions
-- + questions) and member responses (typed answers, reviewed like submissions)
-- ---------------------------------------------------------------------------
create table if not exists public.lessons (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  summary      text not null default '',
  scripture    text not null default '',       -- scripture references to read
  instructions text not null default '',       -- what to read / how to study
  video_path   text,                            -- key in the lesson-videos bucket
  position     integer not null default 0,      -- manual ordering (lower = first)
  active       boolean not null default true,   -- retire instead of delete
  created_at   timestamptz not null default now()
);
create index if not exists lessons_active_idx on public.lessons (active);
create index if not exists lessons_position_idx on public.lessons (position);

create table if not exists public.lesson_questions (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons(id) on delete cascade,
  prompt     text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists lesson_questions_lesson_id_idx on public.lesson_questions (lesson_id);

create table if not exists public.lesson_responses (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  member_id   uuid not null references public.profiles(id) on delete cascade,
  member_name text not null default 'Member',
  status      public.submission_status not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (lesson_id, member_id)              -- one response per member per lesson
);
create index if not exists lesson_responses_lesson_id_idx on public.lesson_responses (lesson_id);
create index if not exists lesson_responses_member_id_idx on public.lesson_responses (member_id);
create index if not exists lesson_responses_status_idx on public.lesson_responses (status);

create table if not exists public.lesson_answers (
  id          uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.lesson_responses(id) on delete cascade,
  question_id uuid not null references public.lesson_questions(id) on delete cascade,
  answer      text not null default '',
  created_at  timestamptz not null default now(),
  unique (response_id, question_id)
);
create index if not exists lesson_answers_response_id_idx on public.lesson_answers (response_id);

alter table public.lessons enable row level security;
alter table public.lesson_questions enable row level security;
alter table public.lesson_responses enable row level security;
alter table public.lesson_answers enable row level security;

drop policy if exists "lessons_select_authenticated" on public.lessons;
create policy "lessons_select_authenticated" on public.lessons
  for select to authenticated using (true);
drop policy if exists "lessons_admin_write" on public.lessons;
create policy "lessons_admin_write" on public.lessons
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "lesson_questions_select_authenticated" on public.lesson_questions;
create policy "lesson_questions_select_authenticated" on public.lesson_questions
  for select to authenticated using (true);
drop policy if exists "lesson_questions_admin_write" on public.lesson_questions;
create policy "lesson_questions_admin_write" on public.lesson_questions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "lesson_responses_select_own_or_admin" on public.lesson_responses;
create policy "lesson_responses_select_own_or_admin" on public.lesson_responses
  for select using (auth.uid() = member_id or public.is_admin());
drop policy if exists "lesson_responses_insert_own" on public.lesson_responses;
create policy "lesson_responses_insert_own" on public.lesson_responses
  for insert with check (auth.uid() = member_id);
drop policy if exists "lesson_responses_update_own_or_admin" on public.lesson_responses;
create policy "lesson_responses_update_own_or_admin" on public.lesson_responses
  for update using (auth.uid() = member_id or public.is_admin());
drop policy if exists "lesson_responses_delete_own_or_admin" on public.lesson_responses;
create policy "lesson_responses_delete_own_or_admin" on public.lesson_responses
  for delete using (auth.uid() = member_id or public.is_admin());

drop policy if exists "lesson_answers_select_own_or_admin" on public.lesson_answers;
create policy "lesson_answers_select_own_or_admin" on public.lesson_answers
  for select using (
    public.is_admin() or exists (
      select 1 from public.lesson_responses r
      where r.id = lesson_answers.response_id and r.member_id = auth.uid()
    )
  );
drop policy if exists "lesson_answers_insert_own" on public.lesson_answers;
create policy "lesson_answers_insert_own" on public.lesson_answers
  for insert with check (
    exists (
      select 1 from public.lesson_responses r
      where r.id = lesson_answers.response_id and r.member_id = auth.uid()
    )
  );
drop policy if exists "lesson_answers_update_own_or_admin" on public.lesson_answers;
create policy "lesson_answers_update_own_or_admin" on public.lesson_answers
  for update using (
    public.is_admin() or exists (
      select 1 from public.lesson_responses r
      where r.id = lesson_answers.response_id and r.member_id = auth.uid()
    )
  );
drop policy if exists "lesson_answers_delete_own_or_admin" on public.lesson_answers;
create policy "lesson_answers_delete_own_or_admin" on public.lesson_answers
  for delete using (
    public.is_admin() or exists (
      select 1 from public.lesson_responses r
      where r.id = lesson_answers.response_id and r.member_id = auth.uid()
    )
  );

-- Private bucket for lesson teaching videos: any member may watch (signed URL);
-- only leadership uploads or deletes. 200 MB cap allows longer teaching sessions.
insert into storage.buckets (id, name, public, file_size_limit)
values ('lesson-videos', 'lesson-videos', false, 209715200)
on conflict (id) do update set public = false, file_size_limit = 209715200;

drop policy if exists "lesson_videos_select_authenticated" on storage.objects;
create policy "lesson_videos_select_authenticated" on storage.objects
  for select to authenticated using (bucket_id = 'lesson-videos');
drop policy if exists "lesson_videos_admin_insert" on storage.objects;
create policy "lesson_videos_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lesson-videos' and public.is_admin());
drop policy if exists "lesson_videos_admin_delete" on storage.objects;
create policy "lesson_videos_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'lesson-videos' and public.is_admin());
