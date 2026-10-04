-- Add verified shared coffee names without rewriting an already applied migration.
-- Keep the existing RPC signature, public visibility, caller RLS and AND filters.
do $guard$
begin
  if not exists (
    select 1 from pg_catalog.pg_proc p
    where p.oid = pg_catalog.to_regprocedure('public.search_public_recipes(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text)')
      and p.prorettype = 'public.recipes'::regtype and p.proretset
      and p.provolatile = 's' and not p.prosecdef and p.pronargdefaults = 16
  ) then
    raise exception 'Expected the public recipe discovery RPC before its shared-coffee upgrade';
  end if;
end;
$guard$;

create or replace function public.search_public_recipes(
  p_query text default null,
  p_method text default null,
  p_source text default null,
  p_model text default null,
  p_flavor_note text default null,
  p_flavor_family text default null,
  p_creator_name text default null,
  p_creator_country text default null,
  p_recipe_country text default null,
  p_recipe_name text default null,
  p_serving_style text default null,
  p_coffee_type text default null,
  p_coffee_name text default null,
  p_coffee_origin text default null,
  p_roaster_name text default null,
  p_source_name text default null
)
returns setof public.recipes
language sql stable security invoker
set search_path = ''
as $$
  select r.*
  from public.recipes r
  left join public.roasted_products product on product.id = r.roasted_product_id and product.requires_review = false
  left join public.beans bean on bean.id = coalesce(r.bean_id, product.legacy_bean_id)
    and bean.is_published = true and bean.requires_review = false
  left join public.coffee_lots lot on lot.id = product.coffee_lot_id and lot.requires_review = false
  left join public.roasters product_roaster on product_roaster.id = product.roaster_id and product_roaster.requires_review = false
  left join public.roasters bean_roaster on bean_roaster.id = bean.roaster_id and bean_roaster.requires_review = false
  left join public.profiles creator on creator.id = r.user_id and r.recipe_type in ('community', 'personal')
  cross join lateral (
    select case when jsonb_typeof(r.source_brew_parameters->'discovery') = 'object'
      then r.source_brew_parameters->'discovery' else '{}'::jsonb end as metadata
  ) raw_discovery
  cross join lateral (
    -- Malformed JSON values are not country/name facts. For list fields retain
    -- string entries only, matching the mobile discovery reader.
    select coalesce(jsonb_object_agg(entry.key,
      case when jsonb_typeof(entry.value) = 'array' then (
        select coalesce(jsonb_agg(atom.value), '[]'::jsonb)
        from jsonb_array_elements(entry.value) atom(value)
        where jsonb_typeof(atom.value) = 'string'
      ) else entry.value end), '{}'::jsonb) as metadata
    from jsonb_each(raw_discovery.metadata) entry(key, value)
    where (entry.key in ('flavor_notes', 'flavor_notes_ar', 'flavor_families', 'source_urls', 'applicable_coffee_names', 'applicable_coffee_names_ar') and jsonb_typeof(entry.value) = 'array')
      or (entry.key not in ('flavor_notes', 'flavor_notes_ar', 'flavor_families', 'source_urls', 'applicable_coffee_names', 'applicable_coffee_names_ar') and jsonb_typeof(entry.value) = 'string')
  ) discovery
  cross join lateral (
    -- These names were verified against the same roaster by the source importer.
    -- Read strings as text so quotes and punctuation remain literal search terms.
    select string_agg(coffee.name, ' ') as names
    from jsonb_array_elements_text(
      coalesce(discovery.metadata->'applicable_coffee_names', '[]'::jsonb)
      || coalesce(discovery.metadata->'applicable_coffee_names_ar', '[]'::jsonb)
    ) coffee(name)
  ) applicable_coffees
  cross join lateral (
    select string_agg(concat_ws(' ', s.source_name, s.source_url), ' ') as source_text
    from public.recipe_sources s where s.recipe_id = r.id
  ) source
  cross join lateral (
    select string_agg(f.flavor, ' ') as flavor_text
    from public.bean_flavor_notes f where f.bean_id = bean.id
  ) bean_flavor
  cross join lateral (
    select
      public.recipe_discovery_normalize(concat_ws(' ', r.title, r.title_ar)) as recipe_name,
      public.recipe_discovery_normalize(concat_ws(' ', r.source_author_name, creator.name, creator.username,
        discovery.metadata->>'creator_name', discovery.metadata->>'creator_name_ar')) as creator_name,
      -- Creator's sourced operating/base country is independent of nationality,
      -- the roaster's address, the recipe's provenance and the coffee's origin.
      public.recipe_discovery_normalize(concat_ws(' ', discovery.metadata->>'creator_country', discovery.metadata->>'creator_country_ar')) as creator_country,
      public.recipe_discovery_normalize(concat_ws(' ', discovery.metadata->>'recipe_country', discovery.metadata->>'recipe_country_ar')) as recipe_country,
      public.recipe_discovery_normalize(concat_ws(' ', r.source_coffee_name, bean.name_en, bean.name_ar, product.name_en, product.name_ar,
        discovery.metadata->>'coffee_name', discovery.metadata->>'coffee_name_ar', applicable_coffees.names)) as coffee_name,
      public.recipe_discovery_normalize(concat_ws(' ', r.source_varietal, bean.varietal, lot.varietal, product.origin_type,
        discovery.metadata->>'coffee_type', discovery.metadata->>'coffee_type_ar')) as coffee_type,
      public.recipe_discovery_normalize(concat_ws(' ', r.source_origin_country, bean.origin_country, lot.origin_country,
        discovery.metadata->>'coffee_origin', discovery.metadata->>'coffee_origin_ar')) as coffee_origin,
      public.recipe_discovery_normalize(concat_ws(' ', r.source_roaster_name, product_roaster.name_en, product_roaster.name_ar,
        bean_roaster.name_en, bean_roaster.name_ar, discovery.metadata->>'roaster_name', discovery.metadata->>'roaster_name_ar')) as roaster_name,
      public.recipe_discovery_normalize(concat_ws(' ', source.source_text, discovery.metadata->>'source_urls')) as source_name,
      public.recipe_discovery_normalize(concat_ws(' ', array_to_string(r.flavor_notes, ' '), r.source_tasting_notes,
        bean_flavor.flavor_text, array_to_string(product.flavor_notes_on_bag, ' '), discovery.metadata->>'flavor_notes',
        discovery.metadata->>'flavor_notes_ar', discovery.metadata->>'flavor_families')) as flavor_note,
      case when r.serving_style in ('hot', 'iced', 'cold') then r.serving_style
        when discovery.metadata->>'serving_style' in ('hot', 'iced', 'cold') then discovery.metadata->>'serving_style'
        else null end as serving_style
  ) terms
  where r.visibility = 'public'
    and (nullif(btrim(p_method), '') is null or r.brew_method = p_method)
    and (nullif(btrim(p_source), '') is null or p_source = 'all'
      or (p_source = 'official' and r.recipe_type in ('official_manufacturer', 'official_roaster', 'verified_barista'))
      or (p_source = 'community' and r.recipe_type = 'community'))
    and (p_method is distinct from 'xbloom' or nullif(btrim(p_model), '') is null or p_model = 'all'
      or r.source_brew_parameters->>'model' = p_model)
    and (nullif(btrim(p_serving_style), '') is null or terms.serving_style = p_serving_style)
    and strpos(terms.recipe_name, public.recipe_discovery_normalize(left(p_recipe_name, 160))) > 0
    and strpos(terms.creator_name, public.recipe_discovery_normalize(left(p_creator_name, 160))) > 0
    and strpos(terms.creator_country, public.recipe_discovery_normalize(left(p_creator_country, 160))) > 0
    and strpos(terms.recipe_country, public.recipe_discovery_normalize(left(p_recipe_country, 160))) > 0
    and strpos(terms.coffee_name, public.recipe_discovery_normalize(left(p_coffee_name, 160))) > 0
    and strpos(terms.coffee_type, public.recipe_discovery_normalize(left(p_coffee_type, 160))) > 0
    and strpos(terms.coffee_origin, public.recipe_discovery_normalize(left(p_coffee_origin, 160))) > 0
    and strpos(terms.roaster_name, public.recipe_discovery_normalize(left(p_roaster_name, 160))) > 0
    and strpos(terms.source_name, public.recipe_discovery_normalize(left(p_source_name, 160))) > 0
    and strpos(terms.flavor_note, public.recipe_discovery_normalize(left(p_flavor_note, 160))) > 0
    and (nullif(btrim(p_flavor_family), '') is null or exists (
      -- Categorize explicit tasting notes using the same vocabulary as the
      -- existing recommendation engine; never manufacture a tasting note.
      select 1 from (values
        ('chocolate', array['chocolate','cocoa','cacao','شوكولاتة','شوكولاته','كاكاو']::text[]),
        ('nutty', array['nutty','nuts','hazelnut','almond','مكسرات','بندق','لوز']::text[]),
        ('fruity', array['fruity','fruit','berry','berries','strawberry','blueberry','فواكه','فراولة','توت']::text[]),
        ('citrus', array['citrus','lemon','orange','grapefruit','حمضيات','ليمون','برتقال']::text[]),
        ('floral', array['floral','jasmine','rose','زهور','ياسمين','ورد']::text[]),
        ('caramel', array['caramel','toffee','كراميل','توفي']::text[]),
        ('spice', array['spice','spicy','cinnamon','cardamom','توابل','قرفة','هيل']::text[])
      ) family(name, aliases)
      cross join lateral unnest(family.aliases) as alias(value)
      where family.name = p_flavor_family
        and public.recipe_discovery_normalize(alias.value) = any(regexp_split_to_array(terms.flavor_note, '[^[:alnum:]]+'))
    ))
    and not exists (
      select 1 from regexp_split_to_table(public.recipe_discovery_normalize(left(p_query, 160)), '[[:space:]]+') as query(term)
      where query.term <> '' and strpos(concat_ws(' ', terms.recipe_name, terms.creator_name, terms.creator_country,
        terms.recipe_country, terms.coffee_name, terms.coffee_type, terms.coffee_origin, terms.roaster_name, terms.source_name,
        terms.flavor_note, terms.serving_style, case terms.serving_style when 'hot' then 'ساخن حار' when 'iced' then 'مثلج' when 'cold' then 'بارد' end), query.term) = 0
    );
$$;

-- Resolve canonical coffee and roaster identity inside PostgreSQL, independent of
-- the caller's display language. No fuzzy, substring or general-guide linkage.
create or replace function public.recipes_for_coffee(
  p_bean_id uuid default null,
  p_product_id uuid default null
)
returns setof public.recipes
language sql stable security invoker
set search_path = ''
as $$
  with target as (
    select product.id as product_id, product.legacy_bean_id as bean_id,
      not product.requires_review as reviewed,
      roaster.id as roaster_id,
      array[product.name_en, product.name_ar,
        case when bean.roaster_id = product.roaster_id then bean.name_en end,
        case when bean.roaster_id = product.roaster_id then bean.name_ar end] as coffee_names,
      array[roaster.name_en, roaster.name_ar] as roaster_names
    from public.roasted_products product
    left join public.beans bean on bean.id = product.legacy_bean_id
      and bean.is_published = true and bean.requires_review = false
    left join public.roasters roaster on roaster.id = product.roaster_id and roaster.requires_review = false
    where p_product_id is not null and product.id = p_product_id
    union all
    select null::uuid, bean.id, bean.is_published and not bean.requires_review,
      roaster.id, array[bean.name_en, bean.name_ar], array[roaster.name_en, roaster.name_ar]
    from public.beans bean
    left join public.roasters roaster on roaster.id = bean.roaster_id and roaster.requires_review = false
    where p_product_id is null and bean.id = p_bean_id
  )
  select r.*
  from public.recipes r
  left join public.roasted_products recipe_product on recipe_product.id = r.roasted_product_id and recipe_product.requires_review = false
  left join public.beans recipe_bean on recipe_bean.id = coalesce(r.bean_id, recipe_product.legacy_bean_id)
    and recipe_bean.is_published = true and recipe_bean.requires_review = false
  cross join lateral (
    select case when jsonb_typeof(r.source_brew_parameters->'discovery') = 'object'
      then r.source_brew_parameters->'discovery' else '{}'::jsonb end as metadata
  ) discovery
  where r.visibility = 'public'
    and (
      -- Existing explicit FK associations remain available for public recipes.
      (p_product_id is not null and r.roasted_product_id = p_product_id)
      or (p_product_id is null and r.bean_id = p_bean_id)
      or exists (
        select 1 from target
        where (p_product_id is not null and r.bean_id = target.bean_id)
          or (
            target.reviewed and target.roaster_id is not null
            and exists (
              select 1
              from jsonb_array_elements(
                case when jsonb_typeof(discovery.metadata->'applicable_coffee_names') = 'array'
                  then discovery.metadata->'applicable_coffee_names' else '[]'::jsonb end
                || case when jsonb_typeof(discovery.metadata->'applicable_coffee_names_ar') = 'array'
                  then discovery.metadata->'applicable_coffee_names_ar' else '[]'::jsonb end
              ) applicable(value)
              cross join lateral unnest(target.coffee_names) canonical(name)
              where jsonb_typeof(applicable.value) = 'string'
                and public.recipe_discovery_normalize(applicable.value #>> '{}') <> ''
                and public.recipe_discovery_normalize(applicable.value #>> '{}') = public.recipe_discovery_normalize(canonical.name)
            )
            and case
              -- A present but malformed or different ID cannot fall back to text.
              when discovery.metadata ? 'roaster_id' then
                jsonb_typeof(discovery.metadata->'roaster_id') = 'string'
                and lower(btrim(discovery.metadata->>'roaster_id')) = target.roaster_id::text
              when recipe_product.roaster_id is not null then recipe_product.roaster_id = target.roaster_id
              when recipe_bean.roaster_id is not null then recipe_bean.roaster_id = target.roaster_id
              else exists (
                select 1
                from (values
                  (r.source_roaster_name),
                  (case when jsonb_typeof(discovery.metadata->'roaster_name') = 'string' then discovery.metadata->>'roaster_name' end),
                  (case when jsonb_typeof(discovery.metadata->'roaster_name_ar') = 'string' then discovery.metadata->>'roaster_name_ar' end)
                ) sourced(name)
                cross join lateral unnest(target.roaster_names) canonical(name)
                where public.recipe_discovery_normalize(sourced.name) <> ''
                  and public.recipe_discovery_normalize(sourced.name) = public.recipe_discovery_normalize(canonical.name)
              )
            end
          )
      )
    );
$$;

comment on function public.search_public_recipes(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text) is
  'Search public recipes across the full library with bound literal AND filters and caller RLS. Includes verified discovery.applicable_coffee_names and applicable_coffee_names_ar. Apply count/order/range to the SETOF result; select order columns in the RPC projection.';
comment on function public.recipes_for_coffee(uuid,uuid) is
  'Public recipes explicitly linked by FK or matching a reviewed coffee through exact verified applicable coffee names and the same reviewed roaster. Product IDs resolve their own legacy bean; a simultaneous bean parameter cannot broaden the product scope. Caller RLS applies. General guides have no implicit coffee association.';

revoke execute on function public.search_public_recipes(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.search_public_recipes(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text) to anon, authenticated, service_role;
revoke execute on function public.recipes_for_coffee(uuid,uuid) from public;
grant execute on function public.recipes_for_coffee(uuid,uuid) to anon, authenticated, service_role;
