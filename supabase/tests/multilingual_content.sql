-- Validation only: no production rows are inserted or changed.
begin;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
do $test$
declare tag text; definition text;
begin
  foreach tag in array array['ar','en','ja','fr','it','es','pt-BR','zh-CN'] loop
    perform private.validate_member_submission(jsonb_build_object('name','Language validation','locale',tag));
  end loop;
  begin
    perform private.validate_member_submission('{"name":"Language validation","locale":"unsupported"}'::jsonb);
    raise exception 'Unsupported language was accepted';
  exception when sqlstate '22023' then null; end;
  foreach tag in array array['posts','comments','recipes'] loop
    select pg_get_constraintdef(oid) into definition from pg_constraint where conname=tag||'_content_language_check' and conrelid=to_regclass('public.'||tag);
    if definition is null or definition not like '%''pt-BR''%' or definition not like '%''zh-CN''%' then raise exception 'Missing language constraint: %',tag; end if;
  end loop;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='private' and p.proname='validate_member_submission' or n.nspname='public' and p.proname='submit_member_bean') and p.prosecdef) then raise exception 'Submission privilege changed'; end if;
end $test$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","is_anonymous":true}',true);
do $test$
begin
  begin
    perform private.validate_member_submission('{"name":"Language validation","locale":"ja"}'::jsonb);
    raise exception 'Anonymous submission was accepted';
  exception when sqlstate '42501' then null; end;
end $test$;
rollback;
