-- Run once in Supabase SQL Editor. All objects are prefixed rc_ to avoid
-- overwriting existing Rooted records. Membership is approved, never self-assigned.
create schema if not exists rc_private;
revoke all on schema rc_private from public;

create table public.rc_branches (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120), fellowship_enabled boolean not null default false
);
create table public.rc_profiles (
 id uuid primary key references auth.users on delete cascade,
 display_name text not null default 'Member' check(length(display_name) between 1 and 80),
 bio text not null default '' check(length(bio)<=500), avatar_url text not null default '' check(avatar_url='' or (avatar_url like 'https://%' and length(avatar_url)<=1000)), cross_opt_in boolean not null default false
);
create table public.rc_memberships (
 branch_id uuid references public.rc_branches on delete cascade, user_id uuid references public.rc_profiles on delete cascade,
 role text not null default 'member' check(role in ('member','admin')), active boolean not null default true,
 primary key(branch_id,user_id)
);
create table public.rc_rooms (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120),
 is_default boolean not null default false, created_by uuid references public.rc_profiles on delete set null, restricted boolean not null default false, kind text not null check(kind in ('branch','fellowship','dm')), branch_id uuid references public.rc_branches on delete cascade,
 requester uuid references public.rc_profiles on delete cascade, recipient uuid references public.rc_profiles on delete cascade,
 dm_status text check(dm_status in ('pending','accepted','declined')), created_at timestamptz not null default now(),
 check((kind='branch' and branch_id is not null and requester is null and recipient is null and dm_status is null)
 or (kind='fellowship' and branch_id is null and requester is null and recipient is null and dm_status is null)
 or (kind='dm' and branch_id is null and requester is not null and recipient is not null and requester<>recipient and dm_status is not null))
);
create unique index rc_dm_pair on public.rc_rooms(least(requester,recipient),greatest(requester,recipient)) where kind='dm';
create table public.rc_moderators (room_id uuid references public.rc_rooms on delete cascade,user_id uuid references public.rc_profiles on delete cascade,primary key(room_id,user_id));
create table public.rc_room_members (room_id uuid references public.rc_rooms on delete cascade,user_id uuid references public.rc_profiles on delete cascade,primary key(room_id,user_id));
create table public.rc_blocks (user_id uuid references public.rc_profiles on delete cascade,blocked_id uuid references public.rc_profiles on delete cascade,primary key(user_id,blocked_id),check(user_id<>blocked_id));
create table public.rc_messages (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.rc_rooms on delete cascade,
 sender_id uuid not null references public.rc_profiles on delete cascade, body text not null check(length(trim(body)) between 1 and 2000),
 removed boolean not null default false, created_at timestamptz not null default now()
);
create index rc_message_history on public.rc_messages(room_id,created_at desc,id);
create index rc_message_sender on public.rc_messages(sender_id,created_at desc);
create index rc_membership_user on public.rc_memberships(user_id,active);
create table public.rc_preferences (
 room_id uuid references public.rc_rooms on delete cascade,user_id uuid references public.rc_profiles on delete cascade,
 muted boolean not null default false,last_read timestamptz not null default '1970-01-01',primary key(room_id,user_id)
);
create table public.rc_reports (
 id uuid primary key default gen_random_uuid(),message_id uuid references public.rc_messages on delete cascade,
 room_id uuid not null references public.rc_rooms on delete cascade, reporter_id uuid not null references public.rc_profiles on delete cascade,
 reason text not null check(length(trim(reason)) between 1 and 1000),status text not null default 'open' check(status in ('open','closed')),
 created_at timestamptz not null default now(), unique(message_id,reporter_id)
);

create function rc_private.member(b uuid,u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.rc_memberships where branch_id=b and user_id=u and active);
$$;
create function rc_private.admin(b uuid,u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.rc_memberships where branch_id=b and user_id=u and active and role='admin');
$$;
create function rc_private.fellow(u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.rc_profiles p join public.rc_memberships m on m.user_id=p.id join public.rc_branches b on b.id=m.branch_id where p.id=u and p.cross_opt_in and m.active and b.fellowship_enabled);
$$;
create function rc_private.blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.rc_blocks where (user_id=a and blocked_id=b) or(user_id=b and blocked_id=a));
$$;
create function rc_private.connected(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select not rc_private.blocked(a,b) and (exists(select 1 from public.rc_memberships x join public.rc_memberships y using(branch_id) where x.user_id=a and y.user_id=b and x.active and y.active) or(rc_private.fellow(a) and rc_private.fellow(b)));
$$;
create function rc_private.visible_profile(target uuid,viewer uuid) returns boolean language sql stable security definer set search_path='' as $$
 select target=viewer or rc_private.connected(target,viewer);
$$;
create function rc_private.room_access(r uuid,u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.rc_rooms where id=r and (
 (kind='branch' and rc_private.member(branch_id,u) and (not restricted or rc_private.admin(branch_id,u) or exists(select 1 from public.rc_moderators where room_id=r and user_id=u) or exists(select 1 from public.rc_room_members where room_id=r and user_id=u))) or
 (kind='fellowship' and rc_private.fellow(u) and (not restricted or exists(select 1 from public.rc_room_members where room_id=r and user_id=u) or exists(select 1 from public.rc_moderators where room_id=r and user_id=u))) or
 (kind='dm' and u in(requester,recipient) and dm_status<>'declined' and rc_private.connected(requester,recipient))));
$$;
create function rc_private.message_access(r uuid,u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select rc_private.room_access(r,u) and exists(select 1 from public.rc_rooms where id=r and (kind<>'dm' or dm_status='accepted'));
$$;
create function rc_private.moderator(r uuid,u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select rc_private.room_access(r,u) and exists(select 1 from public.rc_rooms where id=r and
 ((kind='branch' and rc_private.admin(branch_id,u)) or(kind in ('branch','fellowship') and exists(select 1 from public.rc_moderators where room_id=r and user_id=u))));
$$;
-- Helpers need schema/function privileges for authenticated RLS evaluation.
-- Explicit viewer parameters do not expose message content or private records.
grant usage on schema rc_private to authenticated;
revoke all on all functions in schema rc_private from public;
grant execute on all functions in schema rc_private to authenticated;

alter table public.rc_branches enable row level security;
alter table public.rc_profiles enable row level security;
alter table public.rc_memberships enable row level security;
alter table public.rc_rooms enable row level security;
alter table public.rc_moderators enable row level security;
alter table public.rc_room_members enable row level security;
alter table public.rc_blocks enable row level security;
alter table public.rc_messages enable row level security;
alter table public.rc_preferences enable row level security;
alter table public.rc_reports enable row level security;
create policy rc_branch_read on public.rc_branches for select to authenticated using(true);
create policy rc_profile_read on public.rc_profiles for select to authenticated using(rc_private.visible_profile(id,auth.uid()));
create policy rc_membership_read on public.rc_memberships for select to authenticated using(user_id=auth.uid() or rc_private.admin(branch_id,auth.uid()) or(active and rc_private.visible_profile(user_id,auth.uid())));
create policy rc_room_read on public.rc_rooms for select to authenticated using(rc_private.room_access(id,auth.uid()));
create policy rc_mod_read on public.rc_moderators for select to authenticated using(rc_private.room_access(room_id,auth.uid()));
create policy rc_room_member_read on public.rc_room_members for select to authenticated using(user_id=auth.uid() or rc_private.moderator(room_id,auth.uid()));
create policy rc_block_read on public.rc_blocks for select to authenticated using(user_id=auth.uid());
create policy rc_message_read on public.rc_messages for select to authenticated using(rc_private.message_access(room_id,auth.uid()) and (not removed or rc_private.moderator(room_id,auth.uid())) and(not rc_private.blocked(sender_id,auth.uid()) or rc_private.moderator(room_id,auth.uid())));
create policy rc_pref_read on public.rc_preferences for select to authenticated using(user_id=auth.uid() and rc_private.room_access(room_id,auth.uid()));
create policy rc_report_read on public.rc_reports for select to authenticated using(reporter_id=auth.uid() or rc_private.moderator(room_id,auth.uid()));
revoke all on public.rc_branches,public.rc_profiles,public.rc_memberships,public.rc_rooms,public.rc_moderators,public.rc_room_members,public.rc_blocks,public.rc_messages,public.rc_preferences,public.rc_reports from anon,authenticated;
grant select on public.rc_branches,public.rc_profiles,public.rc_memberships,public.rc_rooms,public.rc_moderators,public.rc_room_members,public.rc_blocks,public.rc_messages,public.rc_preferences,public.rc_reports to authenticated;

create function public.rc_save_profile(p_name text,p_bio text,p_cross boolean,p_avatar text default '') returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 insert into public.rc_profiles(id,display_name,bio,cross_opt_in,avatar_url) values(auth.uid(),trim(p_name),p_bio,p_cross,p_avatar)
 on conflict(id) do update set display_name=excluded.display_name,bio=excluded.bio,cross_opt_in=excluded.cross_opt_in,avatar_url=excluded.avatar_url;
end;$$;
create function public.rc_set_branch_fellowship(p_branch uuid,p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not rc_private.admin(p_branch,auth.uid()) then raise exception 'Church administrator required';end if;
 update public.rc_branches set fellowship_enabled=p_enabled where id=p_branch;
end;$$;
create function public.rc_manage_member(p_branch uuid,p_user uuid,p_role text,p_active boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not rc_private.admin(p_branch,auth.uid()) or p_user=auth.uid() then raise exception 'Another church administrator must manage this membership';end if;
 insert into public.rc_memberships(branch_id,user_id,role,active) values(p_branch,p_user,p_role,p_active)
 on conflict(branch_id,user_id) do update set role=excluded.role,active=excluded.active;
end;$$;
create function public.rc_create_room(p_name text,p_kind text,p_branch uuid default null,p_restricted boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare r uuid;
begin
 if p_kind='branch' then
  if not rc_private.member(p_branch,auth.uid()) then raise exception 'Approved church membership required';end if;
 elsif p_kind='fellowship' then
  if not rc_private.fellow(auth.uid()) then raise exception 'Church participation and personal opt-in required';end if;
  if p_branch is not null then raise exception 'Shared room has no private branch';end if;
 else raise exception 'Invalid room type';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if(select count(*) from public.rc_rooms where created_by=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'You can create up to 10 rooms per day';end if;
 insert into public.rc_rooms(name,kind,branch_id,restricted,created_by) values(trim(p_name),p_kind,p_branch,p_restricted,auth.uid()) returning id into r;
 insert into public.rc_moderators values(r,auth.uid());
 return r;
end;$$;
create function public.rc_manage_room(p_room uuid,p_name text,p_restricted boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not rc_private.moderator(p_room,auth.uid()) then raise exception 'Room moderator required';end if;
 update public.rc_rooms set name=trim(p_name),restricted=p_restricted where id=p_room and kind<>'dm';
end;$$;
create function public.rc_room_member(p_room uuid,p_user uuid,p_add boolean) returns void language plpgsql security definer set search_path='' as $$
declare r public.rc_rooms;
begin
 if not rc_private.moderator(p_room,auth.uid()) then raise exception 'Room moderator required';end if;
 select * into r from public.rc_rooms where id=p_room;
 if p_add then
  if not ((r.kind='branch' and rc_private.member(r.branch_id,p_user)) or(r.kind='fellowship' and rc_private.fellow(p_user))) then raise exception 'Member is not eligible for this room';end if;
  insert into public.rc_room_members values(p_room,p_user) on conflict do nothing;
 else delete from public.rc_room_members where room_id=p_room and user_id=p_user;end if;
end;$$;
create function public.rc_request_dm(p_recipient uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare r uuid;
begin
 if auth.uid() is null or p_recipient=auth.uid() or not rc_private.connected(auth.uid(),p_recipient) then raise exception 'This member is not available for messaging';end if;
 -- Serialize per pair so duplicate requests cannot create duplicate rooms.
 perform pg_advisory_xact_lock(hashtextextended(least(auth.uid(),p_recipient)::text||greatest(auth.uid(),p_recipient)::text,0));
 select id into r from public.rc_rooms where kind='dm' and least(requester,recipient)=least(auth.uid(),p_recipient) and greatest(requester,recipient)=greatest(auth.uid(),p_recipient);
 if r is not null then
  if exists(select 1 from public.rc_rooms where id=r and dm_status='declined') then raise exception 'Message request was declined';end if;
  return r;
 end if;
 insert into public.rc_rooms(name,kind,requester,recipient,dm_status) values('Private conversation','dm',auth.uid(),p_recipient,'pending') returning id into r;
 return r;
end;$$;
create function public.rc_respond_dm(p_room uuid,p_accept boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not rc_private.room_access(p_room,auth.uid()) then raise exception 'Conversation unavailable';end if;
 update public.rc_rooms set dm_status=case when p_accept then 'accepted' else 'declined' end where id=p_room and recipient=auth.uid() and dm_status='pending';
 if not found then raise exception 'Only the recipient may respond to a pending request';end if;
end;$$;
create function public.rc_send(p_room uuid,p_body text) returns uuid language plpgsql security definer set search_path='' as $$
declare r uuid;
begin
 if not rc_private.message_access(p_room,auth.uid()) then raise exception 'You do not have permission to send here';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if(select count(*) from public.rc_messages where sender_id=auth.uid() and created_at>now()-interval '1 minute')>=20 then raise exception 'Please wait before sending more messages';end if;
 insert into public.rc_messages(room_id,sender_id,body) values(p_room,auth.uid(),trim(p_body)) returning id into r;return r;
end;$$;
create function public.rc_block(p_target uuid,p_block boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 if p_block then
  if not rc_private.visible_profile(p_target,auth.uid()) then raise exception 'Member unavailable';end if;
  insert into public.rc_blocks values(auth.uid(),p_target) on conflict do nothing;
 else delete from public.rc_blocks where user_id=auth.uid() and blocked_id=p_target;end if;
end;$$;
create function public.rc_room_preference(p_room uuid,p_muted boolean,p_mark_read boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not rc_private.room_access(p_room,auth.uid()) then raise exception 'Room unavailable';end if;
 insert into public.rc_preferences(room_id,user_id,muted,last_read) values(p_room,auth.uid(),p_muted,case when p_mark_read then now() else '1970-01-01'::timestamptz end)
 on conflict(room_id,user_id) do update set muted=excluded.muted,last_read=case when p_mark_read then now() else public.rc_preferences.last_read end;
end;$$;
create function public.rc_report(p_message uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare r uuid;sender uuid;
begin
 select room_id,sender_id into r,sender from public.rc_messages where id=p_message and not removed;
 if r is null or not rc_private.message_access(r,auth.uid()) or rc_private.blocked(sender,auth.uid()) then raise exception 'Message unavailable';end if;
 insert into public.rc_reports(message_id,room_id,reporter_id,reason) values(p_message,r,auth.uid(),trim(p_reason)) on conflict(message_id,reporter_id) do update set reason=excluded.reason;
end;$$;
create function public.rc_moderate(p_message uuid) returns void language plpgsql security definer set search_path='' as $$
declare r uuid;
begin
 select room_id into r from public.rc_messages where id=p_message;
 if not rc_private.moderator(r,auth.uid()) then raise exception 'Room moderator required';end if;
 -- Keep a tombstone for the moderation audit; removed text never reaches regular users.
 update public.rc_messages set removed=true where id=p_message;
 update public.rc_reports set status='closed' where message_id=p_message;
end;$$;
create function public.rc_close_report(p_report uuid) returns void language plpgsql security definer set search_path='' as $$
declare r uuid;
begin
 select room_id into r from public.rc_reports where id=p_report;
 if not rc_private.moderator(r,auth.uid()) then raise exception 'Room moderator required';end if;
 update public.rc_reports set status='closed' where id=p_report;
end;$$;
create function public.rc_unread() returns table(room_id uuid,unread bigint) language sql stable security invoker set search_path='' as $$
 select m.room_id,count(*) from public.rc_messages m left join public.rc_preferences p on p.room_id=m.room_id and p.user_id=auth.uid()
 where not m.removed and m.sender_id<>auth.uid() and m.created_at>coalesce(p.last_read,'1970-01-01'::timestamptz) and not coalesce(p.muted,false) group by m.room_id;
$$;
-- Default PostgreSQL function EXECUTE is public; explicitly remove it.
revoke all on function public.rc_save_profile(text,text,boolean,text),public.rc_set_branch_fellowship(uuid,boolean),public.rc_manage_member(uuid,uuid,text,boolean),public.rc_create_room(text,text,uuid,boolean),public.rc_manage_room(uuid,text,boolean),public.rc_room_member(uuid,uuid,boolean),public.rc_request_dm(uuid),public.rc_respond_dm(uuid,boolean),public.rc_send(uuid,text),public.rc_block(uuid,boolean),public.rc_room_preference(uuid,boolean,boolean),public.rc_report(uuid,text),public.rc_moderate(uuid),public.rc_close_report(uuid),public.rc_unread() from public,anon;
grant execute on function public.rc_save_profile(text,text,boolean,text),public.rc_set_branch_fellowship(uuid,boolean),public.rc_manage_member(uuid,uuid,text,boolean),public.rc_create_room(text,text,uuid,boolean),public.rc_manage_room(uuid,text,boolean),public.rc_room_member(uuid,uuid,boolean),public.rc_request_dm(uuid),public.rc_respond_dm(uuid,boolean),public.rc_send(uuid,text),public.rc_block(uuid,boolean),public.rc_room_preference(uuid,boolean,boolean),public.rc_report(uuid,text),public.rc_moderate(uuid),public.rc_close_report(uuid),public.rc_unread() to authenticated;

-- Seed default rooms for every newly provisioned church, then existing churches.
create function rc_private.seed_branch_rooms() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.rc_rooms(name,kind,branch_id,is_default) values
 ('General Fellowship','branch',new.id,true),
 ('Bible Study','branch',new.id,true),
 ('Prayer and Encouragement','branch',new.id,true),
 ('Church Events','branch',new.id,true);
 return new;
end;$$;
revoke all on function rc_private.seed_branch_rooms() from public,anon,authenticated;
create trigger rc_default_branch_rooms after insert on public.rc_branches for each row execute function rc_private.seed_branch_rooms();
insert into public.rc_rooms(name,kind,branch_id,is_default)
 select topic,'branch',b.id,true from public.rc_branches b cross join (values ('General Fellowship'),('Bible Study'),('Prayer and Encouragement'),('Church Events')) defaults(topic);
insert into public.rc_rooms(name,kind,is_default) values
 ('Welcome and Introductions','fellowship',true),
 ('Across-Church Bible Study','fellowship',true),
 ('Prayer and Encouragement Network','fellowship',true),
 ('Community Events and Service','fellowship',true);

-- SELECT policies also protect delivery of INSERT/UPDATE events.
-- No DELETE events are used: moderation uses soft removal.
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='rc_messages') then alter publication supabase_realtime add table public.rc_messages;end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='rc_rooms') then alter publication supabase_realtime add table public.rc_rooms;end if;
end $$;
