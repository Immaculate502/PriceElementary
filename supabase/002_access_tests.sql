-- Run after the migration in a SEPARATE TEST Supabase project.
-- Fixtures are rolled back. This file was supplied for verification, not executed here.
begin;
insert into auth.users(id,email) values
 ('90000000-0000-0000-0000-000000000001','rc-test-admin-a@example.test'),
 ('90000000-0000-0000-0000-000000000002','rc-test-member-a@example.test'),
 ('90000000-0000-0000-0000-000000000003','rc-test-admin-b@example.test'),
 ('90000000-0000-0000-0000-000000000004','rc-test-member-b@example.test'),
 ('90000000-0000-0000-0000-000000000005','rc-test-outsider@example.test');
insert into public.rc_profiles(id,display_name,cross_opt_in) select id,'Test member',id<>'90000000-0000-0000-0000-000000000004'::uuid from auth.users where id::text like '90000000-%';
insert into public.rc_branches(id,name) values('91000000-0000-0000-0000-000000000001','Test A'),('91000000-0000-0000-0000-000000000002','Test B');
insert into public.rc_memberships(branch_id,user_id,role) values
 ('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','admin'),
 ('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002','member'),
 ('91000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000003','admin'),
 ('91000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000004','member');
insert into public.rc_rooms(id,name,kind,branch_id,restricted) values
 ('92000000-0000-0000-0000-000000000001','A General','branch','91000000-0000-0000-0000-000000000001',false),
 ('92000000-0000-0000-0000-000000000002','B General','branch','91000000-0000-0000-0000-000000000002',false),
 ('92000000-0000-0000-0000-000000000003','Fellowship','fellowship',null,false),
 ('92000000-0000-0000-0000-000000000004','A Leaders','branch','91000000-0000-0000-0000-000000000001',true);
insert into public.rc_messages(id,room_id,sender_id,body) values
 ('93000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','A private message'),
 ('93000000-0000-0000-0000-000000000002','92000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000003','B private message');
create function pg_temp.expect_denied(command text,expected text) returns void language plpgsql as $$
begin
 begin execute command;exception when others then
  if position(expected in sqlerrm)>0 then return;end if;
  raise;
 end;
 raise exception 'TEST FAILED: expected denial for %',command;
end;$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true);
do $$ begin
 if exists(select 1 from public.rc_rooms where kind='fellowship' or branch_id='91000000-0000-0000-0000-000000000002') then raise exception 'TEST FAILED: branch isolation or opt-in';end if;
 if(select count(*) from public.rc_messages)<>1 then raise exception 'TEST FAILED: private message isolation';end if;
end $$;
select pg_temp.expect_denied($q$insert into public.rc_memberships values('91000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000002','admin',true)$q$,'permission denied');
select pg_temp.expect_denied($q$select public.rc_send('92000000-0000-0000-0000-000000000002','intrusion')$q$,'permission');
select pg_temp.expect_denied($q$select public.rc_send('92000000-0000-0000-0000-000000000004','intrusion')$q$,'permission');
select pg_temp.expect_denied($q$select public.rc_set_branch_fellowship('91000000-0000-0000-0000-000000000001',true)$q$,'administrator');
select pg_temp.expect_denied($q$select public.rc_request_dm('90000000-0000-0000-0000-000000000004')$q$,'not available');
-- Administrator A opts in and approves member A for its restricted group.
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
select public.rc_set_branch_fellowship('91000000-0000-0000-0000-000000000001',true);
select public.rc_room_member('92000000-0000-0000-0000-000000000004','90000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true);
do $$ begin
 if not exists(select 1 from public.rc_rooms where id='92000000-0000-0000-0000-000000000004') or not exists(select 1 from public.rc_rooms where kind='fellowship') then raise exception 'TEST FAILED: approved restricted group and shared fellowship';end if;
 if exists(select 1 from public.rc_profiles where id='90000000-0000-0000-0000-000000000004') then raise exception 'TEST FAILED: unconsented cross-church directory';end if;
end $$;
select set_config('rc.member_room',public.rc_create_room('Member-created small group','branch','91000000-0000-0000-0000-000000000001',true)::text,true);
select public.rc_send(current_setting('rc.member_room')::uuid,'Creator can enter own restricted group');
select set_config('rc.shared_room',public.rc_create_room('Member-created shared group','fellowship',null,false)::text,true);
select public.rc_send(current_setting('rc.shared_room')::uuid,'Opted-in member can create shared rooms');
-- Administrator B opts its church in. B's member still cannot access fellowship.
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000003',true);
select public.rc_set_branch_fellowship('91000000-0000-0000-0000-000000000002',true);
select pg_temp.expect_denied($q$select public.rc_manage_member('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002','admin',true)$q$,'administrator');
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000004',true);
do $$ begin if exists(select 1 from public.rc_rooms where kind='fellowship') then raise exception 'TEST FAILED: member opt-in not enforced';end if;end $$;
select public.rc_save_profile('Member B','',true);
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true);
select set_config('rc.test_dm',public.rc_request_dm('90000000-0000-0000-0000-000000000004')::text,true);
select pg_temp.expect_denied(format('select public.rc_send(%L,%L)',current_setting('rc.test_dm'),'before acceptance'),'permission');
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000004',true);
select public.rc_respond_dm(current_setting('rc.test_dm')::uuid,true);
select public.rc_send(current_setting('rc.test_dm')::uuid,'Accepted private conversation');
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000003',true);
do $$ begin
 if exists(select 1 from public.rc_rooms where id=current_setting('rc.test_dm')::uuid) or exists(select 1 from public.rc_messages where room_id=current_setting('rc.test_dm')::uuid) then raise exception 'TEST FAILED: private conversation visible to unrelated administrator';end if;
end $$;
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000004',true);
select public.rc_block('90000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true);
select pg_temp.expect_denied(format('select public.rc_send(%L,%L)',current_setting('rc.test_dm'),'after block'),'permission');
do $$ begin if exists(select 1 from public.rc_rooms where id=current_setting('rc.test_dm')::uuid) then raise exception 'TEST FAILED: blocked conversation still readable';end if;end $$;
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
select public.rc_moderate('93000000-0000-0000-0000-000000000001');
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true);
do $$ begin if exists(select 1 from public.rc_messages where id='93000000-0000-0000-0000-000000000001') then raise exception 'TEST FAILED: removed message leaked';end if;end $$;
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
select public.rc_manage_member('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002','member',false);
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true);
do $$ begin if exists(select 1 from public.rc_rooms) or exists(select 1 from public.rc_messages) then raise exception 'TEST FAILED: restricted account retains room access';end if;end $$;
select 'All database access checks passed' as result;
rollback;
