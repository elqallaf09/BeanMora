// Generates reviewed, narrowly scoped catalog DML. Does not connect to a database.
// Apply the output with an authorized administrator; never ship a privileged key.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const catalog = JSON.parse(readFileSync(new URL('../supabase/research/manual-brewing/recipes.json', import.meta.url), 'utf8'));
const approved = new Set(['www.equatorcoffees.com', 'crema-coffee.com', 'www.stumptowncoffee.com', 'cdn.bluebottlecoffee.com', 'www.bialetti.com', 'www.pactcoffee.com', 'timwendelboe.no', 'aeropress.com', 'coffeecollective.dk', 'www.dropcoffee.com', 'kurasu.kyoto', 'onyxcoffeelab.com']);
const slugs = new Set();
for (const r of catalog.recipes) {
  assert.match(r.slug, /^[a-z0-9-]+$/); assert(!slugs.has(r.slug)); slugs.add(r.slug);
  assert(['chemex', 'moka_pot', 'aeropress', 'french_press', 'origami', 'kalita_wave'].includes(r.brew_method));
  const source = new URL(r.source_url); assert(source.protocol === 'https:' && approved.has(source.hostname));
  assert(r.steps.length >= 4 && r.steps.every(s => s.title && s.title_ar && s.description && s.description_ar));
  if (r.pours.length && r.pour_sum_validated !== false) assert(Math.abs(r.pours.reduce((n, p) => n + p.water_grams, 0) - r.water_grams) < 0.01);
  if (r.video_url) assert(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(r.video_url));
  if (r.brew_method === 'moka_pot') assert(!r.source_brew_parameters.manual.scalable && r.pours.length === 0);
}
const payload = JSON.stringify(catalog.recipes);
assert(!payload.includes('$manual_catalog$'));
process.stdout.write(`-- Reviewed on ${catalog.verified_at}. Content only; no schema, grants or user data changes.
begin;
do $apply_manual$
declare curator uuid; r jsonb; s jsonb; p jsonb; v_recipe_id uuid; step_n integer; existing_owner uuid; existing_method text;
begin
  select id into curator from public.profiles where username = 'beanmora_official';
  if curator is null then raise exception 'BeanMora catalog curator is missing'; end if;
  for r in select value from jsonb_array_elements($manual_catalog$${payload}$manual_catalog$::jsonb) loop
    select user_id, brew_method into existing_owner, existing_method from public.recipes where slug = r->>'slug';
    if found and (existing_owner <> curator or existing_method <> r->>'brew_method') then
      raise exception 'Catalog ownership or method conflict for %', r->>'slug';
    end if;
    insert into public.recipes (slug,user_id,title,title_ar,brew_method,recipe_type,visibility,dose_grams,water_grams,water_temp_c,water_temp_c_min,water_temp_c_max,total_time_seconds,grinder_setting,notes,notes_ar,content_language,source_author_name,source_brew_parameters,difficulty,serving_style,pour_style,pour_sum_validated,is_incomplete_source,video_url)
    values (r->>'slug',curator,r->>'title',r->>'title_ar',r->>'brew_method',r->>'recipe_type','public',(r->>'dose_grams')::numeric,(r->>'water_grams')::numeric,(r->>'water_temp_c')::numeric,(r->>'water_temp_c_min')::numeric,(r->>'water_temp_c_max')::numeric,(r->>'total_time_seconds')::integer,r->>'grinder_setting',r->>'notes',r->>'notes_ar','en',r->>'source_author_name',r->'source_brew_parameters','beginner','hot',case when r->>'brew_method'='chemex' then 'pulse' else null end,coalesce((r->>'pour_sum_validated')::boolean,jsonb_array_length(r->'pours')>0),coalesce((r->>'is_incomplete_source')::boolean,false),r->>'video_url')
    on conflict (slug) do update set title=excluded.title,title_ar=excluded.title_ar,recipe_type=excluded.recipe_type,visibility=excluded.visibility,dose_grams=excluded.dose_grams,water_grams=excluded.water_grams,water_temp_c=excluded.water_temp_c,water_temp_c_min=excluded.water_temp_c_min,water_temp_c_max=excluded.water_temp_c_max,total_time_seconds=excluded.total_time_seconds,grinder_setting=excluded.grinder_setting,notes=excluded.notes,notes_ar=excluded.notes_ar,source_author_name=excluded.source_author_name,source_brew_parameters=public.recipes.source_brew_parameters || excluded.source_brew_parameters,serving_style=excluded.serving_style,pour_sum_validated=excluded.pour_sum_validated,is_incomplete_source=excluded.is_incomplete_source,video_url=coalesce(excluded.video_url,public.recipes.video_url)
    returning id into v_recipe_id;
    step_n := 0;
    for s in select value from jsonb_array_elements(r->'steps') loop
      step_n := step_n + 1;
      insert into public.recipe_steps (recipe_id,step_number,title,title_ar,description,description_ar,step_kind,duration_seconds)
      values (v_recipe_id,step_n,s->>'title',s->>'title_ar',s->>'description',s->>'description_ar',s->>'step_kind',(s->>'duration_seconds')::integer)
      on conflict (recipe_id,step_number) do update set title=excluded.title,title_ar=excluded.title_ar,description=excluded.description,description_ar=excluded.description_ar,step_kind=excluded.step_kind,duration_seconds=excluded.duration_seconds;
    end loop;
    -- Remove obsolete instructions only inside the reviewed recipe, never user outcomes.
    delete from public.recipe_steps where recipe_id=v_recipe_id and step_number>step_n;
    delete from public.recipe_pours where recipe_id=v_recipe_id and pour_number not in (select (j.value->>'pour_number')::integer from jsonb_array_elements(r->'pours') as j(value));
    for p in select value from jsonb_array_elements(r->'pours') loop
      insert into public.recipe_pours (recipe_id,pour_number,water_grams,start_at_seconds,is_bloom)
      values (v_recipe_id,(p->>'pour_number')::integer,(p->>'water_grams')::numeric,(p->>'start_at_seconds')::integer,(p->>'is_bloom')::boolean)
      on conflict (recipe_id,pour_number) do update set water_grams=excluded.water_grams,start_at_seconds=excluded.start_at_seconds,is_bloom=excluded.is_bloom;
    end loop;
    update public.recipe_sources rs set source_name=r->>'source_author_name',source_type='official_website',data_confidence='official',last_verified_at='${catalog.verified_at}'::timestamptz
    where rs.recipe_id=v_recipe_id and rs.source_url=r->>'source_url';
    insert into public.recipe_sources (recipe_id,source_url,source_name,source_type,data_confidence,last_verified_at)
    select v_recipe_id,r->>'source_url',r->>'source_author_name','official_website','official','${catalog.verified_at}'::timestamptz
    where not exists (select 1 from public.recipe_sources rs where rs.recipe_id=v_recipe_id and rs.source_url=r->>'source_url');
  end loop;
end
$apply_manual$;
commit;
`);
