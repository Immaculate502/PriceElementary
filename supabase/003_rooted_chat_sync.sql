-- Maps existing Rooted churches and members into the rc_ community tables.
-- Runs after 001_rooted_chat.sql. Church UUIDs are reused as rc_branches ids.
-- A member's church or role is only mapped when the change comes from trusted
-- code: signup/server (no end-user JWT), a platform super admin, or an admin
-- of the target church acting on someone else. Self-assignment is ignored.

create function rc_private.sync_church() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then
  delete from public.rc_branches where id=old.id;
  return old;
 end if;
 insert into public.rc_branches(id,name) values(new.id,left(coalesce(nullif(trim(new.name),''),'Church'),120))
 on conflict(id) do update set name=excluded.name;
 return new;
end;$$;

create function rc_private.sync_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare
 trusted boolean;
begin
 if tg_op='UPDATE' and new.church_id is not distinct from old.church_id and new.role is not distinct from old.role then
  return new;
 end if;
 trusted := auth.uid() is null
  or public.is_super_admin()
  or (auth.uid()<>new.id and new.church_id is not null and exists(
       select 1 from public.profiles a where a.id=auth.uid() and a.church_id=new.church_id and a.role::text='admin'));
 if not trusted then return new; end if;
 if not exists(select 1 from auth.users where id=new.id) then return new; end if;

 if tg_op='UPDATE' and old.church_id is not null and old.church_id is distinct from new.church_id then
  update public.rc_memberships set active=false where branch_id=old.church_id and user_id=new.id;
 end if;
 if new.church_id is not null and exists(select 1 from public.rc_branches where id=new.church_id) then
  insert into public.rc_profiles(id,display_name) values(new.id,left(coalesce(nullif(trim(new.full_name),''),'Member'),80))
  on conflict(id) do nothing;
  insert into public.rc_memberships(branch_id,user_id,role,active)
  values(new.church_id,new.id,case when new.role::text='admin' then 'admin' else 'member' end,true)
  on conflict(branch_id,user_id) do update set role=excluded.role,active=true;
 end if;
 return new;
end;$$;

revoke all on function rc_private.sync_church(),rc_private.sync_profile() from public,anon,authenticated;

create trigger rc_sync_church after insert or update of name or delete on public.churches
 for each row execute function rc_private.sync_church();
create trigger rc_sync_profile after insert or update of church_id,role on public.profiles
 for each row execute function rc_private.sync_profile();

-- Backfill existing Rooted data (branch inserts also seed the default church rooms).
insert into public.rc_branches(id,name)
 select id,left(coalesce(nullif(trim(name),''),'Church'),120) from public.churches
 on conflict(id) do nothing;
insert into public.rc_profiles(id,display_name)
 select p.id,left(coalesce(nullif(trim(p.full_name),''),'Member'),80)
 from public.profiles p join auth.users u on u.id=p.id
 where p.church_id is not null
 on conflict(id) do nothing;
insert into public.rc_memberships(branch_id,user_id,role)
 select p.church_id,p.id,case when p.role::text='admin' then 'admin' else 'member' end
 from public.profiles p
 join public.rc_profiles r on r.id=p.id
 join public.rc_branches b on b.id=p.church_id
 on conflict(branch_id,user_id) do nothing;
