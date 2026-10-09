-- Actual roles; all users, beans and correction fixtures roll back.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '3s';
do $test$
declare
  owner_id uuid := gen_random_uuid(); other_id uuid := gen_random_uuid();
  guest_id uuid := gen_random_uuid(); admin_id uuid := gen_random_uuid();
  bean_id uuid := gen_random_uuid(); hidden_id uuid := gen_random_uuid();
  correction_id uuid := gen_random_uuid(); denied boolean; changed int;
begin
  insert into auth.users(id,email,raw_user_meta_data,is_anonymous) values
    (owner_id,'correction-test-'||owner_id||'@example.invalid','{}',false),
    (other_id,'correction-test-'||other_id||'@example.invalid','{}',false),
    (guest_id,'correction-test-'||guest_id||'@example.invalid','{}',true),
    (admin_id,'correction-test-'||admin_id||'@example.invalid','{}',false);
  insert into public.user_roles(user_id,role) values(admin_id,'moderator');
  insert into public.beans(id,slug,name_ar,name_en,is_published,created_by) values
    (bean_id,'correction-test-'||bean_id,'بن اختبار','Correction fixture',true,owner_id),
    (hidden_id,'correction-test-'||hidden_id,'بن خاص','Private fixture',false,other_id);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','is_anonymous',false)::text,true);
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  execute 'set local role authenticated';
  insert into public.data_correction_requests(id,entity_type,entity_id,reported_by,reason)
    values(correction_id,'bean',bean_id,owner_id,'The origin requires correction.');
  if not exists(select 1 from public.data_correction_requests where id=correction_id and status='open') then raise exception 'Own correction unreadable'; end if;
  denied := false;
  begin
    insert into public.data_correction_requests(entity_type,entity_id,reported_by,reason,status)
      values('bean',bean_id,owner_id,'Forged moderation decision.','accepted');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Submitter forged accepted status'; end if;
  denied := false;
  begin
    insert into public.data_correction_requests(entity_type,entity_id,reported_by,reason,reviewed_by,reviewed_at)
      values('bean',bean_id,owner_id,'Forged reviewer information.',admin_id,now());
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Submitter forged reviewer'; end if;
  denied := false;
  begin
    insert into public.data_correction_requests(entity_type,entity_id,reported_by,reason)
      values('bean',hidden_id,owner_id,'Private coffee must remain private.');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Hidden bean accepted'; end if;
  denied := false;
  begin
    insert into public.data_correction_requests(entity_type,entity_id,reported_by,reason)
      values('bean',bean_id,owner_id,'short');
  exception when check_violation then denied := true; end;
  if not denied then raise exception 'Invalid correction text accepted'; end if;
  denied := false;
  begin
    insert into public.data_correction_requests(entity_type,entity_id,reported_by,reason)
      values('bean',bean_id,other_id,'Forged correction ownership.');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Other reporter accepted'; end if;
  update public.data_correction_requests set status='accepted' where id=correction_id;
  get diagnostics changed=row_count;
  if changed<>0 then raise exception 'Submitter can moderate'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',other_id,'role','authenticated','is_anonymous',false)::text,true);
  perform set_config('request.jwt.claim.sub',other_id::text,true);
  execute 'set local role authenticated';
  if exists(select 1 from public.data_correction_requests where id=correction_id) then raise exception 'Other member can read correction'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',guest_id,'role','authenticated','is_anonymous',true)::text,true);
  perform set_config('request.jwt.claim.sub',guest_id::text,true);
  execute 'set local role authenticated';
  insert into public.data_correction_requests(entity_type,entity_id,reported_by,reason)
    values('bean',bean_id,guest_id,'Session-owned guest correction.');
  if exists(select 1 from public.data_correction_requests where id=correction_id) then raise exception 'Guest can read other correction'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated','is_anonymous',false)::text,true);
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  execute 'set local role authenticated';
  update public.data_correction_requests set status='accepted',reviewed_by=admin_id,reviewed_at=now() where id=correction_id;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'Moderator cannot review'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  perform set_config('request.jwt.claim.sub','',true);
  execute 'set local role anon';
  if exists(select 1 from public.data_correction_requests where id=correction_id) then raise exception 'Anonymous correction read'; end if;
  denied := false;
  begin
    insert into public.data_correction_requests(entity_type,entity_id,reported_by,reason)
      values('bean',bean_id,owner_id,'Anonymous correction rejected.');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Anonymous correction insert'; end if;
  execute 'reset role';
end $test$;
select 'PASS: bean correction, private ownership, guest feedback, anon denial, text bounds, forged moderation rejection, moderator review' as verification;
rollback;
