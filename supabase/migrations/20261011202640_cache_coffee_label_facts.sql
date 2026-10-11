-- Cache public, approved label facts at the existing transactional index boundary.
-- Source edits already refresh this document; recipe visibility still controls RLS.
alter table public.recipe_search_documents
 add column label_origins text[] not null default '{}',
 add column label_varieties text[] not null default '{}',
 add column label_processes text[] not null default '{}',
 add column label_roasts text[] not null default '{}',
 add column label_notes text[] not null default '{}',
 add column label_families text[] not null default '{}';
create or replace function private.refresh_recipe_label_facts()
returns trigger language plpgsql security definer set search_path=''
as $refresh$
begin
 select public.coffee_label_fact_keys(coalesce(nullif(r.source_origin_country,''),nullif(b.origin_country,''),nullif(l.origin_country,''),r.source_brew_parameters->'discovery'->>'coffee_origin'),'origin'),
 public.coffee_label_fact_keys(coalesce(nullif(r.source_varietal,''),nullif(b.varietal,''),nullif(l.varietal,''),r.source_brew_parameters->'discovery'->>'coffee_type'),'variety'),
 public.coffee_label_fact_keys(coalesce(nullif(b.process,''),nullif(l.process,''),r.source_brew_parameters->'discovery'->>'coffee_process',r.source_brew_parameters->'discovery'->>'process'),'process'),
 public.coffee_label_fact_keys(coalesce(nullif(p.roast_level,''),nullif(b.roast_level,''),r.source_brew_parameters->'discovery'->>'roast_level'),'roast')
 into new.label_origins,new.label_varieties,new.label_processes,new.label_roasts
 from public.recipes r
 left join public.roasted_products p on p.id=r.roasted_product_id and not p.requires_review
 left join public.beans b on b.id=coalesce(r.bean_id,p.legacy_bean_id) and b.is_published and not b.requires_review
 left join public.coffee_lots l on l.id=p.coffee_lot_id and not l.requires_review
 where r.id=new.recipe_id and r.visibility='public';
 select coalesce(array_agg(distinct n.note),'{}'::text[]),coalesce(array_agg(distinct n.family) filter(where n.family<>'other'),'{}'::text[])
 into new.label_notes,new.label_families from public.coffee_similarity_terms(new.flavor_note) n;
 new.label_origins:=coalesce(new.label_origins,'{}'::text[]); new.label_varieties:=coalesce(new.label_varieties,'{}'::text[]);
 new.label_processes:=coalesce(new.label_processes,'{}'::text[]); new.label_roasts:=coalesce(new.label_roasts,'{}'::text[]);
 return new;
end $refresh$;
revoke all on function private.refresh_recipe_label_facts() from public,anon,authenticated;
create trigger refresh_recipe_label_facts before insert or update on public.recipe_search_documents for each row execute function private.refresh_recipe_label_facts();
update public.recipe_search_documents set refreshed_at=refreshed_at;
do $patch$
declare definition text; patched text;
begin
 definition:=pg_get_functiondef('public.recipes_for_coffee_label(text,text,text,text,text,text,text,uuid,uuid,integer)'::regprocedure);
 patched:=replace(definition,'select r.id,r.title,r.source_coffee_name,r.updated_at,e.id is not null as exact,',
  'select r.id,r.title,r.source_coffee_name,r.updated_at,e.id is not null as exact, d.label_origins as origin_keys,d.label_varieties as variety_keys,d.label_processes as process_keys,d.label_roasts as roast_keys,d.label_notes as note_keys,d.label_families as family_keys,');
 patched:=replace(patched,'public.coffee_label_fact_keys(c.origin,''origin'')','c.origin_keys');
 patched:=replace(patched,'public.coffee_label_fact_keys(c.variety,''variety'')','c.variety_keys');
 patched:=replace(patched,'public.coffee_label_fact_keys(c.process,''process'')','c.process_keys');
 patched:=replace(patched,'public.coffee_label_fact_keys(c.roast,''roast'')','c.roast_keys');
 patched:=replace(patched,'from public.coffee_similarity_terms(c.notes) n where n.note=any(w.notes)','from unnest(c.note_keys) n(note) where n.note=any(w.notes)');
 patched:=replace(patched,'from public.coffee_similarity_terms(c.notes) n where n.family=any(w.families) and n.family<>''other''','from unnest(c.family_keys) n(family) where n.family=any(w.families) and n.family<>''other''');
 if patched=definition then raise exception 'LABEL_CACHE_DEFINITION_DRIFT'; end if;
 execute patched;
end $patch$;
