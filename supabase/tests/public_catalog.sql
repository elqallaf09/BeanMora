-- Read and permission checks against the published catalog; no fixtures persist.
begin;
do $$ begin
 if has_function_privilege('anon','private.publish_reviewed_catalog_batch(jsonb)','EXECUTE')
 or has_function_privilege('authenticated','private.publish_reviewed_catalog_batch(jsonb)','EXECUTE') then
  raise exception 'Administrative importer exposed to clients';
 end if;
 if exists(select 1 from public.recipes where visibility='public' and source_brew_parameters ? 'water_ml' and water_grams is not null) then
  raise exception 'Source milliliters were presented as measured grams';
 end if;
 if exists(select 1 from public.recipes r where visibility='public' and source_brew_parameters ? 'pours' and not exists(select 1 from public.recipe_sources s where s.recipe_id=r.id and s.source_url ~ '^https://')) then
  raise exception 'Source recipe attribution missing';
 end if;
 if exists(select 1 from public.beans where image_usage_status='source_linked' and (image_url !~ '^https://' or image_source_url !~ '^https://'))
 or exists(select 1 from public.equipment_models where image_usage_status='source_linked' and (image_url !~ '^https://' or image_source_url !~ '^https://')) then
  raise exception 'Photo attribution missing';
 end if;
end $$;
set local role anon;
do $$ begin
 if (select count(*) from public.recipes where visibility='public' and brew_method='xbloom' and source_brew_parameters ? 'pours') < 3000 then
  raise exception 'Published xBloom library is unavailable to guests';
 end if;
 if (select count(*) from public.recipes where visibility='public' and brew_method in ('origami','kalita_wave')) < 7 then
  raise exception 'Existing Origami/Kalita recipes disappeared';
 end if;
end $$;
reset role;
rollback;
select 'PASS: public source library, attributed media, measurement units and private importer grants' as result;
