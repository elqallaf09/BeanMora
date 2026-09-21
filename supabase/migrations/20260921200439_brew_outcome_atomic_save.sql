-- Applied through the connected Supabase migration API; version is from migration history.
-- Additive, private-by-default outcome capture. No historical outcomes are inferred.
alter table public.brew_logs add column outcome_submission jsonb;
alter table public.recipe_attempts add column share_with_community boolean not null default false;
create unique index recipe_attempts_one_per_brew_log on public.recipe_attempts(brew_log_id) where brew_log_id is not null;
create policy "attempt sharing requires explicit consent" on public.recipe_attempts as restrictive for select to anon, authenticated using (user_id=(select auth.uid()) or (share_with_community and exists (select 1 from public.recipes r where r.id=recipe_id and r.visibility='public')));
create policy "permanent users create linked attempts" on public.recipe_attempts as restrictive for insert to authenticated with check (not (select private.is_guest()) and (brew_log_id is null or exists (select 1 from public.brew_logs b where b.id=brew_log_id and b.user_id=(select auth.uid()) and b.recipe_id=recipe_attempts.recipe_id)));
create policy "permanent users update linked attempts" on public.recipe_attempts as restrictive for update to authenticated using (not (select private.is_guest())) with check (not (select private.is_guest()) and (brew_log_id is null or exists (select 1 from public.brew_logs b where b.id=brew_log_id and b.user_id=(select auth.uid()) and b.recipe_id=recipe_attempts.recipe_id)));
create function public.record_brew_outcome_v1(p_request_id uuid, p_payload jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare uid uuid := auth.uid(); rid uuid; bid uuid; method text; dose numeric; water numeric; secs int; result_id uuid; existing_payload jsonb; recipe_row public.recipes%rowtype; scores jsonb; k text; v jsonb; share boolean; state text;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'BREW_AUTH_REQUIRED' using errcode='42501'; end if;
 if p_request_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
 if (select count(*) from jsonb_object_keys(p_payload))<>12 or exists(select 1 from jsonb_object_keys(p_payload) key where key<>all(array['recipe_id','bean_id','brew_method','dose_grams','water_grams','actual_time_seconds','outcome','status','share_with_community','next_grind_adjustment','taste_scores','brewed'])) then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
 if p_payload->'brewed' is distinct from 'true'::jsonb or jsonb_typeof(p_payload->'share_with_community') is distinct from 'boolean' or jsonb_typeof(p_payload->'dose_grams') is distinct from 'number' or jsonb_typeof(p_payload->'water_grams') is distinct from 'number' or jsonb_typeof(p_payload->'brew_method') is distinct from 'string' or jsonb_typeof(p_payload->'outcome') is distinct from 'string' or jsonb_typeof(p_payload->'status') is distinct from 'string' then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
 if coalesce(jsonb_typeof(p_payload->'recipe_id'),'missing') not in ('string','null') or coalesce(jsonb_typeof(p_payload->'bean_id'),'missing') not in ('string','null') or coalesce(jsonb_typeof(p_payload->'actual_time_seconds'),'missing') not in ('number','null') or coalesce(jsonb_typeof(p_payload->'next_grind_adjustment'),'missing') not in ('string','null') then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
 begin rid:=(p_payload->>'recipe_id')::uuid; bid:=(p_payload->>'bean_id')::uuid; dose:=(p_payload->>'dose_grams')::numeric; water:=(p_payload->>'water_grams')::numeric; secs:=(p_payload->>'actual_time_seconds')::int;
 exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end;
 method:=p_payload->>'brew_method'; state:=p_payload->>'status'; share:=(p_payload->>'share_with_community')::boolean;
 if method<>all(array['v60','espresso','xbloom','aeropress','chemex','french_press','cold_brew','moka_pot']) or (p_payload->>'outcome')<>all(array['excellent','good','needs_adjustment','poor']) or state<>all(array['brewed_as_written','brewed_with_modifications']) or not(dose>0 and dose<=9999.99 and dose=round(dose,2)) or not(water>0 and water<=99999.99 and water=round(water,2)) or (secs is not null and (secs<=0 or secs>604800 or (p_payload->>'actual_time_seconds')::numeric<>secs)) or ((p_payload->>'next_grind_adjustment') is not null and (p_payload->>'next_grind_adjustment')<>all(array['finer','same','coarser'])) then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
 scores:=p_payload->'taste_scores'; if jsonb_typeof(scores) is distinct from 'object' then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
 for k,v in select * from jsonb_each(scores) loop
 if k<>all(array['acidity','bitterness','sweetness','balance','overall_rating']) or jsonb_typeof(v)<>'number' then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
 if (v::text)::numeric<1 or (v::text)::numeric>5 or (v::text)::numeric<>trunc((v::text)::numeric) then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
 end loop;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text||p_request_id::text,0));
 select b.id,b.outcome_submission into result_id,existing_payload from public.brew_logs b where b.id=p_request_id and b.user_id=uid;
 if found then if existing_payload is distinct from p_payload then raise exception 'BREW_REQUEST_CONFLICT' using errcode='22023'; end if; return result_id; end if;
 if rid is not null then
 select * into recipe_row from public.recipes where id=rid;
 if not found then raise exception 'BREW_RECIPE_UNAVAILABLE' using errcode='22023'; end if;
 if recipe_row.brew_method is distinct from method or recipe_row.bean_id is distinct from bid then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
 if share and recipe_row.visibility<>'public' then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
 elsif share then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
 if bid is not null and not exists(select 1 from public.beans where id=bid) then raise exception 'BREW_RECIPE_UNAVAILABLE' using errcode='22023'; end if;
 insert into public.brew_logs(id,user_id,recipe_id,bean_id,brew_method,dose_grams,water_grams,actual_time_seconds,outcome_submission) values(p_request_id,uid,rid,bid,method,dose,water,secs,p_payload);
 if scores<>'{}'::jsonb then insert into public.brew_log_taste_scores(brew_log_id,acidity,bitterness,sweetness,balance,overall_rating) values(p_request_id,(scores->>'acidity')::int,(scores->>'bitterness')::int,(scores->>'sweetness')::int,(scores->>'balance')::int,(scores->>'overall_rating')::int); end if;
 if rid is not null then insert into public.recipe_attempts(recipe_id,user_id,brew_log_id,status,settings_changed,actual_time_seconds,outcome,share_with_community) values(rid,uid,p_request_id,state,state='brewed_with_modifications',secs,p_payload->>'outcome',share); end if;
 return p_request_id;
end; $$;
revoke all on function public.record_brew_outcome_v1(uuid,jsonb) from public,anon;
grant execute on function public.record_brew_outcome_v1(uuid,jsonb) to authenticated;
comment on function public.record_brew_outcome_v1 is 'Atomic self-reported brew outcome. Invoker RLS, explicit consent, payload-bound idempotency; never infers sensor verification.';
