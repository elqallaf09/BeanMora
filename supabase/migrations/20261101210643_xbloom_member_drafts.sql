-- Preserve structured xBloom drafts through the existing owner-scoped submission flow.
-- No device sync is claimed: source URLs continue to identify the original recipe.
create or replace function public.submit_member_xbloom_recipe(p_id uuid, p_payload jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare
  b jsonb := p_payload->'xbloom';
  p jsonb;
  amount numeric := 0;
  source_id uuid;
  owner_id uuid := (select auth.uid());
  result_id uuid;
  serving text := b#>>'{discovery,serving_style}';
begin
  perform private.validate_member_submission(p_payload);
  -- A retry must never replace a previously confirmed recipe.
  if exists(select 1 from public.recipes where id=p_id and user_id=owner_id) then return p_id; end if;
  if not coalesce(p_payload->>'method'='xbloom' and jsonb_typeof(b)='object'
      and b->>'model' in ('Studio','Original') and b->>'cup_type' in ('Omni','xPod')
      and serving in ('hot','iced') and jsonb_typeof(b->'pours')='array', false) then
    raise exception 'INVALID_XBLOOM_DRAFT' using errcode='22023';
  end if;
  if jsonb_array_length(b->'pours') not between 1 and 30
    or not coalesce((b->>'dose')::numeric between 5 and 30
      and (b->>'water_ml')::numeric between 50 and 500
      and (b->>'dose')::numeric=(p_payload->>'dose')::numeric
      and (b->>'water_ml')::numeric=(p_payload->>'water')::numeric, false) then
    raise exception 'INVALID_XBLOOM_AMOUNTS' using errcode='22023';
  end if;
  source_id := (b->>'adapted_from_recipe_id')::uuid;
  if source_id is null or not exists (
    select 1 from public.recipes r where r.id=source_id and r.visibility='public' and r.brew_method='xbloom'
    and coalesce(r.source_brew_parameters->>'model',case when r.source_brew_parameters->>'source_model_code'='1' then 'Studio' end)=b->>'model'
    and lower(r.source_brew_parameters->>'cup_type')=lower(b->>'cup_type')
    and (case when serving='hot' then r.serving_style='hot' else r.serving_style in ('cold','iced') end)
  ) then raise exception 'INCOMPATIBLE_XBLOOM_SOURCE' using errcode='22023'; end if;
  for p in select value from jsonb_array_elements(b->'pours') loop
    if not coalesce(jsonb_typeof(p)='object' and (p->>'volume')::numeric > 0 and (p->>'volume')::numeric <= 500, false)
      or (p->>'temperature' is not null and (p->>'temperature')::numeric not between 0 and 100)
      or (p->>'flow_rate' is not null and (p->>'flow_rate')::numeric not between 0.1 and 20)
      or (p->>'pause_seconds' is not null and (p->>'pause_seconds')::numeric not between 0 and 600) then
      raise exception 'INVALID_XBLOOM_POUR' using errcode='22023';
    end if;
    amount := amount + (p->>'volume')::numeric;
  end loop;
  if abs(amount-(b->>'water_ml')::numeric)>0.01 then
    raise exception 'XBLOOM_WATER_MISMATCH' using errcode='22023';
  end if;
  result_id := public.submit_member_recipe(p_id, p_payload - 'xbloom');
  update public.recipes set
    source_brew_parameters = b || jsonb_build_object('adapted',true,'source_tier','community',
      'ratio',(b->>'water_ml')::numeric/(b->>'dose')::numeric,
      'poured_water_ml',amount,'pour_sum_matches_stated_water',true),
    serving_style=serving
  where id=result_id and user_id=owner_id;
  if not found then raise exception 'XBLOOM_SAVE_NOT_CONFIRMED' using errcode='42501'; end if;
  return result_id;
end $$;
revoke all on function public.submit_member_xbloom_recipe(uuid,jsonb) from public,anon;
grant execute on function public.submit_member_xbloom_recipe(uuid,jsonb) to authenticated;
