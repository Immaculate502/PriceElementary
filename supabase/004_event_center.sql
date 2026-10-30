-- ===========================================================================
-- ROOTED Event Center: per-church events, ministries, registrations,
-- broadcasts and in-app notifications.
--
-- Depends on the tenancy helpers already in the database:
--   public.current_church_id(), public.is_church_admin(), public.is_super_admin()
-- Safe to re-run: every object is created idempotently.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Ministries (departments) and who belongs to / leads them
-- ---------------------------------------------------------------------------
create table if not exists public.ministries (
  id          uuid primary key default gen_random_uuid(),
  church_id   uuid not null references public.churches(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  created_at  timestamptz not null default now(),
  unique (church_id, name)
);
create index if not exists ministries_church_idx on public.ministries (church_id);

create table if not exists public.ministry_members (
  ministry_id uuid not null references public.ministries(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  church_id   uuid not null references public.churches(id) on delete cascade,
  is_leader   boolean not null default false,
  created_at  timestamptz not null default now(),
  primary key (ministry_id, user_id)
);
create index if not exists ministry_members_user_idx on public.ministry_members (user_id);
create index if not exists ministry_members_church_idx on public.ministry_members (church_id);

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id                uuid primary key default gen_random_uuid(),
  church_id         uuid not null references public.churches(id) on delete cascade,
  ministry_id       uuid references public.ministries(id) on delete set null,
  created_by        uuid references public.profiles(id) on delete set null,
  title             text not null check (char_length(title) between 1 and 160),
  description       text not null default '',
  banner_url        text,
  category          text not null default 'church_service' check (category in (
                      'church_service','conference','revival','prayer_meeting','bible_study',
                      'youth','mens_ministry','womens_ministry','marriage','leadership_training',
                      'community_outreach','fundraiser','celebration')),
  starts_at         timestamptz not null,
  ends_at           timestamptz,
  -- IANA zone the organiser entered times in, so emails and public pages
  -- render the same wall-clock time everywhere.
  timezone          text not null default 'America/New_York',
  location          text not null default '',
  virtual_link      text,
  registration_url  text,
  contact_name      text not null default '',
  contact_email     text not null default '',
  contact_phone     text not null default '',
  hosting_ministry  text not null default '',
  speakers          text not null default '',
  capacity          integer check (capacity is null or capacity > 0),
  rsvp_required     boolean not null default false,
  -- members: whole church | ministry: hosting ministry only | leaders: admins +
  -- ministry leaders | public: whole church AND the public event page.
  visibility        text not null default 'members'
                      check (visibility in ('members','ministry','leaders','public')),
  status            text not null default 'draft'
                      check (status in ('draft','published','cancelled')),
  view_count        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index if not exists events_church_start_idx on public.events (church_id, starts_at);
create index if not exists events_public_idx on public.events (church_id)
  where visibility = 'public' and status <> 'draft';

-- ---------------------------------------------------------------------------
-- Registrations / RSVPs. user_id is null for public (non-member) visitors.
-- ---------------------------------------------------------------------------
create table if not exists public.event_registrations (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  church_id    uuid not null references public.churches(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  email        text not null check (char_length(email) between 3 and 254),
  status       text not null default 'going'
                 check (status in ('going','maybe','not_going','waitlist')),
  attended     boolean not null default false,
  attended_at  timestamptz,
  source       text not null default 'member' check (source in ('member','public','admin')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists event_reg_member_uniq
  on public.event_registrations (event_id, user_id) where user_id is not null;
create unique index if not exists event_reg_email_uniq
  on public.event_registrations (event_id, lower(email));
create index if not exists event_reg_church_idx on public.event_registrations (church_id);

-- ---------------------------------------------------------------------------
-- Broadcasts (announcements, reminders, follow-ups, updates, cancellations)
-- ---------------------------------------------------------------------------
create table if not exists public.event_broadcasts (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events(id) on delete cascade,
  church_id        uuid not null references public.churches(id) on delete cascade,
  created_by       uuid references public.profiles(id) on delete set null,
  kind             text not null default 'announcement'
                     check (kind in ('announcement','reminder','follow_up','update','cancellation')),
  audience         text not null
                     check (audience in ('all','ministries','leaders','individuals','registrants','attendees')),
  ministry_ids     uuid[] not null default '{}',
  recipient_ids    uuid[] not null default '{}',
  channels         text[] not null default '{in_app}',
  subject          text not null check (char_length(subject) between 1 and 160),
  message          text not null check (char_length(message) between 1 and 4000),
  scheduled_for    timestamptz,
  status           text not null default 'scheduled'
                     check (status in ('scheduled','sending','sent','failed')),
  sent_at          timestamptz,
  recipient_count  integer not null default 0,
  in_app_count     integer not null default 0,
  email_sent       integer not null default 0,
  email_failed     integer not null default 0,
  error            text,
  created_at       timestamptz not null default now(),
  check (channels <@ array['in_app','email']::text[] and cardinality(channels) > 0)
);
create index if not exists event_broadcasts_church_idx on public.event_broadcasts (church_id, created_at desc);
create index if not exists event_broadcasts_due_idx on public.event_broadcasts (scheduled_for)
  where status = 'scheduled';

-- ---------------------------------------------------------------------------
-- In-app notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  church_id     uuid not null references public.churches(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  event_id      uuid references public.events(id) on delete cascade,
  broadcast_id  uuid references public.event_broadcasts(id) on delete cascade,
  title         text not null,
  body          text not null default '',
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Permission helpers (security definer avoids RLS recursion)
-- ---------------------------------------------------------------------------

-- Leads at least one ministry in the caller's church.
create or replace function public.is_ministry_leader()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.ministry_members mm
    where mm.user_id = auth.uid() and mm.is_leader
      and mm.church_id = public.current_church_id()
  );
$$;

-- Senior pastor / church administrator (role = admin) manage every event in
-- their church; a ministry leader manages only their own ministry's events.
create or replace function public.can_manage_event(p_church uuid, p_ministry uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_super_admin()
    or (p_church = public.current_church_id() and (
          public.is_church_admin()
          or (p_ministry is not null and exists (
                select 1 from public.ministry_members mm
                where mm.ministry_id = p_ministry and mm.user_id = auth.uid() and mm.is_leader))
        ));
$$;

-- Whether the caller (a church member) may see an event.
create or replace function public.can_view_event(p_church uuid, p_ministry uuid, p_visibility text, p_status text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_manage_event(p_church, p_ministry)
    or (p_church = public.current_church_id() and p_status <> 'draft' and (
          p_visibility in ('members','public')
          or (p_visibility = 'leaders' and public.is_ministry_leader())
          or (p_visibility = 'ministry' and exists (
                select 1 from public.ministry_members mm
                where mm.ministry_id = p_ministry and mm.user_id = auth.uid()))
        ));
$$;

-- Public view counter; only counts published events.
create or replace function public.increment_event_view(p_event uuid)
returns void language sql volatile security definer set search_path = '' as $$
  update public.events set view_count = view_count + 1
  where id = p_event and status = 'published';
$$;

grant execute on function public.is_ministry_leader() to authenticated;
grant execute on function public.can_manage_event(uuid, uuid) to authenticated;
grant execute on function public.can_view_event(uuid, uuid, text, text) to authenticated;
grant execute on function public.increment_event_view(uuid) to anon, authenticated;

-- Keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists events_touch on public.events;
create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();
drop trigger if exists event_reg_touch on public.event_registrations;
create trigger event_reg_touch before update on public.event_registrations
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.ministries          enable row level security;
alter table public.ministry_members    enable row level security;
alter table public.events              enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_broadcasts    enable row level security;
alter table public.notifications       enable row level security;

-- ministries
drop policy if exists ministries_select on public.ministries;
create policy ministries_select on public.ministries for select to authenticated
  using (church_id = public.current_church_id() or public.is_super_admin());
drop policy if exists ministries_admin_write on public.ministries;
create policy ministries_admin_write on public.ministries for all to authenticated
  using ((public.is_church_admin() and church_id = public.current_church_id()) or public.is_super_admin())
  with check ((public.is_church_admin() and church_id = public.current_church_id()) or public.is_super_admin());

-- ministry_members
drop policy if exists ministry_members_select on public.ministry_members;
create policy ministry_members_select on public.ministry_members for select to authenticated
  using (church_id = public.current_church_id() or public.is_super_admin());
drop policy if exists ministry_members_admin_write on public.ministry_members;
create policy ministry_members_admin_write on public.ministry_members for all to authenticated
  using ((public.is_church_admin() and church_id = public.current_church_id()) or public.is_super_admin())
  with check (
    ((public.is_church_admin() and church_id = public.current_church_id()) or public.is_super_admin())
    and exists (select 1 from public.ministries m
                where m.id = ministry_members.ministry_id and m.church_id = ministry_members.church_id)
    and exists (select 1 from public.profiles p
                where p.id = ministry_members.user_id and p.church_id = ministry_members.church_id)
  );

-- events
drop policy if exists events_select on public.events;
create policy events_select on public.events for select to authenticated
  using (public.can_view_event(church_id, ministry_id, visibility, status));
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert to authenticated
  with check (public.can_manage_event(church_id, ministry_id));
drop policy if exists events_update on public.events;
create policy events_update on public.events for update to authenticated
  using (public.can_manage_event(church_id, ministry_id))
  with check (public.can_manage_event(church_id, ministry_id));
drop policy if exists events_delete on public.events;
create policy events_delete on public.events for delete to authenticated
  using (public.can_manage_event(church_id, ministry_id));

-- event_registrations: members manage their own RSVP; managers see and
-- update everyone's for their events (attendance). Public visitor sign-ups
-- are written server-side with the service role after validation.
drop policy if exists event_reg_select on public.event_registrations;
create policy event_reg_select on public.event_registrations for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_super_admin()
    or exists (select 1 from public.events e where e.id = event_registrations.event_id
               and public.can_manage_event(e.church_id, e.ministry_id))
  );
drop policy if exists event_reg_insert_own on public.event_registrations;
create policy event_reg_insert_own on public.event_registrations for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.events e where e.id = event_registrations.event_id
                and e.church_id = event_registrations.church_id and e.status = 'published'
                and public.can_view_event(e.church_id, e.ministry_id, e.visibility, e.status))
  );
drop policy if exists event_reg_update on public.event_registrations;
create policy event_reg_update on public.event_registrations for update to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.events e where e.id = event_registrations.event_id
               and public.can_manage_event(e.church_id, e.ministry_id))
  )
  with check (
    exists (select 1 from public.events e where e.id = event_registrations.event_id
            and e.church_id = event_registrations.church_id)
  );
drop policy if exists event_reg_delete on public.event_registrations;
create policy event_reg_delete on public.event_registrations for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.events e where e.id = event_registrations.event_id
               and public.can_manage_event(e.church_id, e.ministry_id))
  );

-- Members must not be able to mark their own attendance.
create or replace function public.guard_registration_attendance()
returns trigger language plpgsql security definer set search_path = '' as $$
declare e record;
begin
  if auth.uid() is null then return new; end if; -- service role
  select church_id, ministry_id into e from public.events where id = new.event_id;
  if not public.can_manage_event(e.church_id, e.ministry_id) then
    if tg_op = 'INSERT' then
      new.attended := false; new.attended_at := null; new.source := 'member';
    else
      new.attended := old.attended; new.attended_at := old.attended_at; new.source := old.source;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists event_reg_guard on public.event_registrations;
create trigger event_reg_guard before insert or update on public.event_registrations
  for each row execute function public.guard_registration_attendance();

-- event_broadcasts: managers only
drop policy if exists event_broadcasts_all on public.event_broadcasts;
create policy event_broadcasts_all on public.event_broadcasts for all to authenticated
  using (exists (select 1 from public.events e where e.id = event_broadcasts.event_id
                 and e.church_id = event_broadcasts.church_id
                 and public.can_manage_event(e.church_id, e.ministry_id)))
  with check (exists (select 1 from public.events e where e.id = event_broadcasts.event_id
                      and e.church_id = event_broadcasts.church_id
                      and public.can_manage_event(e.church_id, e.ministry_id)));

-- notifications: each member reads and marks their own. Inserts happen
-- server-side (service role) after the broadcaster's permission is checked.
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: public bucket for event banners/flyers (written server-side only)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-banners', 'event-banners', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;
