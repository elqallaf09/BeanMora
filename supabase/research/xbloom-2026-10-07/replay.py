#!/usr/bin/env python3
"""Print a reviewed, transactional DML batch. Does not connect to a database.

Usage: python3 replay.py reviewed-01.json > /tmp/beanmora-reviewed.sql
Run the generated SQL with an authorized administrative database connection.
Existing recipe settings, steps, titles, ownership and visibility are preserved.
"""
import json
import sys
from pathlib import Path

rows = json.loads(Path(sys.argv[1]).read_text())
assert isinstance(rows, list) and 0 < len(rows) <= 200
payload = json.dumps(rows, ensure_ascii=False, separators=(',', ':'))
assert '$reviewed$' not in payload
print("begin;\nset local lock_timeout='5s';\nset local statement_timeout='60s';")
print("do $replay$\ndeclare\n  rows jsonb := $reviewed$" + payload + "$reviewed$::jsonb;")
print("""
  item jsonb; source jsonb; rid uuid; owner_id uuid; added integer := 0;
begin
  select id into strict owner_id from public.profiles where username='beanmora_official';
  -- Serialize this narrowly scoped replay so simultaneous runs cannot duplicate rows.
  perform pg_advisory_xact_lock(20261007, 510);
  for item in select value from jsonb_array_elements(rows) loop
    rid := null;
    select r.id into rid from public.recipes r
      where r.user_id=owner_id and (r.slug=item->>'slug' or exists (
        select 1 from public.recipe_sources s where s.recipe_id=r.id and s.source_url=item->>'url'))
      order by (r.slug=item->>'slug') desc,r.created_at limit 1;
    if rid is null then
      perform private.publish_reviewed_catalog_batch(jsonb_build_array(item));
      select r.id into strict rid from public.recipes r where r.user_id=owner_id and r.slug=item->>'slug';
      added := added + 1;
      update public.recipes set content_language=case when item->>'title' ~ '[ء-ي]' then 'ar' else 'en' end where id=rid;
    end if;
    update public.recipes r set
      source_roaster_name=coalesce(nullif(r.source_roaster_name,''),nullif(item->>'roaster','')),
      source_coffee_name=coalesce(nullif(r.source_coffee_name,''),nullif(item->>'coffee','')),
      serving_style=case when coalesce(r.serving_style,'unknown')='unknown' then item->>'serving_style' else r.serving_style end,
      recipe_type=case when (item->>'official_roaster')::boolean then 'official_roaster' else r.recipe_type end,
      source_brew_parameters=coalesce(r.source_brew_parameters,'{}'::jsonb)
        || jsonb_build_object('review_batch','requested-xbloom-2026-10-07')
        || case when (item->>'official_roaster')::boolean then '{"source_tier":"official"}'::jsonb else '{}'::jsonb end
      where r.id=rid and r.user_id=owner_id;
    for source in select value from jsonb_array_elements(item->'provenance') loop
      if coalesce(source->>'url','') !~ '^https://' then raise exception 'Expected HTTPS attribution'; end if;
      update public.recipe_sources s set last_verified_at=(source->>'checked_at')::timestamptz,
        source_name=source->>'name', source_type=source->>'type',data_confidence=source->>'confidence'
        where s.recipe_id=rid and s.source_url=source->>'url';
      insert into public.recipe_sources(recipe_id,source_type,source_url,source_name,last_verified_at,data_confidence)
        select rid,source->>'type',source->>'url',source->>'name',(source->>'checked_at')::timestamptz,source->>'confidence'
        where not exists(select 1 from public.recipe_sources s where s.recipe_id=rid and s.source_url=source->>'url');
    end loop;
    if (item->>'official_roaster')::boolean then
      update public.recipe_sources s set source_type='official_website',data_confidence='official',
        source_name=item->>'roaster',last_verified_at=(item->>'checked_at')::timestamptz
        where s.recipe_id=rid and s.source_url=item->>'url';
    end if;
  end loop;
  raise notice 'Added % reviewed recipes; existing settings preserved.',added;
end $replay$;
select count(*) as reviewed_public_recipes from public.recipes
where source_brew_parameters->>'review_batch'='requested-xbloom-2026-10-07' and visibility='public';
commit;
""")
