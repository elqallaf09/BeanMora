-- Explainable matching over the complete public xBloom library. These are
-- similarity terms, not additional tasting claims or a probability of success.
create or replace function public.coffee_similarity_terms(p_text text)
returns table(note text, family text)
language sql immutable parallel safe security invoker set search_path = ''
as $terms$
  with input as (
    select ' ' || regexp_replace(public.recipe_discovery_search_text(p_text),
      '[^[:alnum:]]+', ' ', 'g') || ' ' as words
  )
  select v.note, v.family from input cross join (values
    ('strawberry','fruity',array['strawberry','strawberries','فراولة']),
    ('blueberry','fruity',array['blueberry','blueberries','توت ازرق']),
    ('raspberry','fruity',array['raspberry','raspberries','توت العليق']),
    ('blackberry','fruity',array['blackberry','blackberries','توت اسود']),
    ('berry','fruity',array['berry','berries','توت']),
    ('peach','fruity',array['peach','peaches','خوخ']),
    ('apricot','fruity',array['apricot','apricots','مشمش']),
    ('plum','fruity',array['plum','plums','برقوق']),
    ('apple','fruity',array['apple','apples','تفاح']),
    ('pear','fruity',array['pear','pears','اجاص','كمثرى']),
    ('mango','fruity',array['mango','مانجو','منجا']),
    ('pineapple','fruity',array['pineapple','اناناس']),
    ('passion fruit','fruity',array['passion fruit','passionfruit','باشن فروت']),
    ('cherry','fruity',array['cherry','cherries','كرز']),
    ('grape','fruity',array['grape','grapes','عنب']),
    ('raisin','fruity',array['raisin','raisins','زبيب']),
    ('lychee','fruity',array['lychee','ليتشي']),
    ('melon','fruity',array['melon','شمام']),
    ('fig','fruity',array['fig','figs','تين']),
    ('fruity','fruity',array['fruit','fruits','fruity','فواكه']),
    ('citrus','citrus',array['citrus','حمضيات']),
    ('lemon','citrus',array['lemon','ليمون']),
    ('lime','citrus',array['lime','لايم']),
    ('orange','citrus',array['orange','برتقال']),
    ('grapefruit','citrus',array['grapefruit','جريب فروت']),
    ('bergamot','citrus',array['bergamot','برغموت']),
    ('mandarin','citrus',array['mandarin','mandarine','tangerine','يوسفي']),
    ('jasmine','floral',array['jasmine','ياسمين']),
    ('rose','floral',array['rose','ورد']),
    ('floral','floral',array['floral','florals','flower','flowers','زهور']),
    ('chocolate','chocolate',array['chocolate','شوكولاتة']),
    ('cocoa','chocolate',array['cocoa','cacao','كاكاو']),
    ('cashew','nutty',array['cashew','cashews','كاجو']),
    ('almond','nutty',array['almond','almonds','لوز']),
    ('hazelnut','nutty',array['hazelnut','hazelnuts','بندق']),
    ('walnut','nutty',array['walnut','walnuts','جوز']),
    ('nutty','nutty',array['nutty','nuts','مكسرات']),
    ('caramel','sweet',array['caramel','كراميل']),
    ('honey','sweet',array['honey','عسل']),
    ('toffee','sweet',array['toffee','توفي']),
    ('vanilla','sweet',array['vanilla','فانيلا']),
    ('sugar','sweet',array['sugar','سكر']),
    ('tea','tea',array['tea','شاي']),
    ('cinnamon','spice',array['cinnamon','قرفة']),
    ('cardamom','spice',array['cardamom','هيل']),
    ('spice','spice',array['spice','spices','spicy','توابل']),
    ('cola','other',array['cola','كولا'])
  ) v(note,family,aliases)
  where exists(select 1 from unnest(v.aliases) a(value)
    where strpos(input.words, ' ' || public.recipe_discovery_normalize(a.value) || ' ') > 0);
$terms$;

create or replace function public.xbloom_matches_for_coffee(
  p_bean_id uuid default null, p_product_id uuid default null,
  p_model text default null, p_limit integer default 3
)
returns table(recipe_id uuid, match_kind text, score integer,
  matching_notes text[], matching_families text[], same_origin boolean,
  same_process boolean, same_roast boolean, device_model text)
language sql stable security invoker set search_path = ''
set statement_timeout = '5s'
as $matches$
  with target as materialized (
    select b.origin_country as origin, b.process, b.roast_level as roast,
      coalesce(nullif((select string_agg(f.flavor, ', ') from public.bean_flavor_notes f where f.bean_id=b.id), ''),
        substring(b.description_en from '(?i)(?:tasting |flavou?r )?notes(?: \([^)]{0,80}\))?[[:space:]]*:[[:space:]]*([^.;\n]+)'),
        substring(b.description_ar from '(?:إيحاءات|ايحاءات|نكهات)[^:：.;\n]{0,80}[:：][[:space:]]*([^.;\n]+)'), '') as notes
    from public.beans b where p_product_id is null and b.id=p_bean_id
      and b.is_published and not b.requires_review
    union all
    select l.origin_country, l.process, p.roast_level,
      coalesce(nullif(array_to_string(p.flavor_notes_on_bag, ', '), ''),
        substring(p.short_description from '(?i)(?:tasting |flavou?r )?notes(?: \([^)]{0,80}\))?[[:space:]]*:[[:space:]]*([^.;\n]+)'), '')
    from public.roasted_products p
    left join public.coffee_lots l on l.id=p.coffee_lot_id and not l.requires_review
    where p_bean_id is null and p.id=p_product_id and not p.requires_review
  ), wanted as materialized (
    select t.*, public.recipe_discovery_normalize(t.origin) as origin_key,
      public.recipe_discovery_normalize(t.process) as process_key,
      public.recipe_discovery_normalize(t.roast) as roast_key,
      coalesce((select array_agg(distinct n.note) from public.coffee_similarity_terms(t.notes) n), '{}'::text[]) as note_keys,
      coalesce((select array_agg(distinct n.family) from public.coffee_similarity_terms(t.notes) n where n.family<>'other'), '{}'::text[]) as family_keys
    from target t
  ), exact_ids as materialized (
    select r.id from public.recipes_for_coffee(p_bean_id,p_product_id) r
    where r.visibility='public' and r.brew_method='xbloom'
  ), candidates as materialized (
    select r.id, r.title, r.source_coffee_name, r.updated_at,
      e.id is not null as exact,
      coalesce(nullif(r.source_origin_country,''),nullif(b.origin_country,''),nullif(l.origin_country,''),
        r.source_brew_parameters->'discovery'->>'coffee_origin') as origin,
      coalesce(nullif(b.process,''),nullif(l.process,''),
        r.source_brew_parameters->'discovery'->>'coffee_process',
        r.source_brew_parameters->'discovery'->>'process') as process,
      coalesce(nullif(p.roast_level,''),nullif(b.roast_level,''),
        r.source_brew_parameters->'discovery'->>'roast_level') as roast,
      case lower(coalesce(nullif(r.source_brew_parameters->>'model',''),xp.device_model))
        when 'studio' then 'Studio' when 'xbloom_studio' then 'Studio'
        when 'original' then 'Original' when 'xbloom_original' then 'Original' end as model,
      coalesce(d.flavor_note, array_to_string(r.flavor_notes,' ') || ' ' || coalesce(r.source_tasting_notes,'')) as notes,
      coalesce(d.serving_style,r.serving_style) as serving,
      -- Imports may deliberately leave normalized water/time empty. Published
      -- source ml/dose still qualify; incomplete status alone is not a veto.
      coalesce(r.dose_grams, xp.dose_grams,
        case when r.source_brew_parameters->>'dose' ~ '^[0-9]+(\.[0-9]+)?$'
          then (r.source_brew_parameters->>'dose')::numeric end) > 0
      and coalesce(r.water_grams, xp.water_grams,
        case when r.source_brew_parameters->>'water_ml' ~ '^[0-9]+(\.[0-9]+)?$'
          then (r.source_brew_parameters->>'water_ml')::numeric end) > 0
      and nullif(coalesce(nullif(r.grinder_setting,''),nullif(xp.grind_setting,''),r.source_brew_parameters->>'grind_size'),'') is not null
      and coalesce(r.source_brew_parameters->>'pour_sum_matches_stated_water','true')<>'false' as usable
    from public.recipes r
    left join exact_ids e on e.id=r.id
    left join public.recipe_search_documents d on d.recipe_id=r.id
    left join public.roasted_products p on p.id=r.roasted_product_id and not p.requires_review
    left join public.beans b on b.id=coalesce(r.bean_id,p.legacy_bean_id) and b.is_published and not b.requires_review
    left join public.coffee_lots l on l.id=p.coffee_lot_id and not l.requires_review
    left join lateral (select x.device_model,x.dose_grams,x.water_grams,x.grind_setting
      from public.xbloom_recipe_profiles x where x.recipe_id=r.id and x.compatibility_status='compatible'
      order by x.device_model limit 1) xp on true
    where r.visibility='public' and r.brew_method='xbloom'
  ), facts as materialized (
    select c.*, w.note_keys, w.family_keys,
      public.recipe_discovery_normalize(c.origin)=w.origin_key and w.origin_key<>'' as origin_match,
      public.recipe_discovery_normalize(c.process)=w.process_key and w.process_key<>'' as process_match,
      public.recipe_discovery_normalize(c.roast)=w.roast_key and w.roast_key<>'' as roast_match,
      coalesce((select array_agg(n.note order by n.note) from public.coffee_similarity_terms(c.notes) n
        where n.note=any(w.note_keys)), '{}'::text[]) as note_matches,
      coalesce((select array_agg(distinct n.family order by n.family) from public.coffee_similarity_terms(c.notes) n
        where n.family=any(w.family_keys) and n.family<>'other'), '{}'::text[]) as family_matches
    from candidates c cross join wanted w
    where (p_model is null or p_model='all' or c.model=p_model)
      and (p_model is null or p_model in ('all','Studio','Original'))
  ), ranked as (
    select f.*, least(5,cardinality(f.note_matches))*12
      + least(3,cardinality(f.family_matches))*5
      + case when f.origin_match then 22 else 0 end
      + case when f.process_match then 12 else 0 end
      + case when f.roast_match then 8 else 0 end as similarity_score
    from facts f
    where f.exact or (f.usable and (cardinality(f.note_matches)>0 or cardinality(f.family_matches)>0 or f.origin_match or f.process_match))
  ), selected as (
    select * from ranked r where r.exact or not exists(select 1 from facts f where f.exact)
  ), distinct_sources as (
    select distinct on (public.recipe_discovery_normalize(s.title),coalesce(s.source_coffee_name,''),coalesce(s.model,'')) s.*
    from selected s order by public.recipe_discovery_normalize(s.title),coalesce(s.source_coffee_name,''),coalesce(s.model,''),
      s.exact desc,s.similarity_score desc,s.updated_at desc,s.id
  )
  select s.id,case when s.exact then 'exact' else 'similar' end,s.similarity_score,
    s.note_matches,s.family_matches,s.origin_match,s.process_match,s.roast_match,s.model
  from distinct_sources s order by s.exact desc,s.similarity_score desc,
    case when s.serving='hot' then 0 when s.serving is null then 1 else 2 end,s.updated_at desc,s.id
  limit greatest(1,least(coalesce(p_limit,3),6));
$matches$;

revoke all on function public.coffee_similarity_terms(text) from public;
revoke all on function public.xbloom_matches_for_coffee(uuid,uuid,text,integer) from public;
grant execute on function public.coffee_similarity_terms(text) to anon,authenticated;
grant execute on function public.xbloom_matches_for_coffee(uuid,uuid,text,integer) to anon,authenticated;
comment on function public.xbloom_matches_for_coffee(uuid,uuid,text,integer) is
  'Public xBloom recipes: verified exact coffee associations first; otherwise explainable notes/origin/process/roast similarities, with optional model filtering. Scores are ordering weights, not confidence percentages.';
