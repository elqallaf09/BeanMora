-- Public search documents are maintained in the same transaction as source edits.
-- Only published, reviewed coffee facts and public profile names are indexed.
create table public.recipe_search_documents (
  recipe_id uuid primary key references public.recipes(id) on delete cascade,
  recipe_name text,
  creator_name text,
  creator_country text,
  recipe_country text,
  coffee_name text,
  coffee_type text,
  coffee_origin text,
  roaster_name text,
  source_name text,
  flavor_note text,
  serving_style text,
  search_text text not null,
  refreshed_at timestamptz not null default now()
);
alter table public.recipe_search_documents enable row level security;
create policy "public recipe search documents" on public.recipe_search_documents for select to anon,authenticated
  using (exists(select 1 from public.recipes r where r.id=recipe_id and r.visibility='public'));
revoke all on public.recipe_search_documents from anon,authenticated;
grant select on public.recipe_search_documents to anon,authenticated;
create index recipe_search_documents_text_idx on public.recipe_search_documents using gin(search_text public.gin_trgm_ops);
create or replace function private.refresh_recipe_search_documents(p_ids uuid[] default null)
returns void language plpgsql security definer set search_path='' as $refresh$
begin
  delete from public.recipe_search_documents d where (p_ids is null or d.recipe_id=any(p_ids))
    and not exists(select 1 from public.recipes r where r.id=d.recipe_id and r.visibility='public');
  insert into public.recipe_search_documents(recipe_id,recipe_name,creator_name,creator_country,recipe_country,coffee_name,coffee_type,coffee_origin,roaster_name,source_name,flavor_note,serving_style,search_text)
  select r.id, terms.recipe_name, terms.creator_name, terms.creator_country, terms.recipe_country, terms.coffee_name, terms.coffee_type, terms.coffee_origin, terms.roaster_name, terms.source_name, public.recipe_discovery_search_text(terms.flavor_note), terms.serving_style, public.recipe_discovery_search_text(concat_ws(' ', terms.recipe_name, terms.creator_name, terms.creator_country, terms.recipe_country, terms.coffee_name, terms.coffee_type, terms.coffee_origin, terms.roaster_name, terms.source_name, terms.flavor_note, terms.serving_style, case terms.serving_style when 'hot' then 'ساخن حار' when 'iced' then 'مثلج' when 'cold' then 'بارد' end, r.notes, r.notes_ar, bean.description_ar, bean.description_en, product.short_description))
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
  where r.visibility='public' and (p_ids is null or r.id=any(p_ids))
  on conflict(recipe_id) do update set recipe_name=excluded.recipe_name,creator_name=excluded.creator_name,creator_country=excluded.creator_country,recipe_country=excluded.recipe_country,coffee_name=excluded.coffee_name,coffee_type=excluded.coffee_type,coffee_origin=excluded.coffee_origin,roaster_name=excluded.roaster_name,source_name=excluded.source_name,flavor_note=excluded.flavor_note,serving_style=excluded.serving_style,search_text=excluded.search_text,refreshed_at=now();
end $refresh$;
revoke all on function private.refresh_recipe_search_documents(uuid[]) from public,anon,authenticated;
create or replace function private.maintain_recipe_search_documents()
returns trigger language plpgsql security definer set search_path='' as $maintain$
declare old_row jsonb; new_row jsonb; old_key uuid; new_key uuid; affected uuid[];
begin
  if TG_OP<>'INSERT' then old_row:=to_jsonb(OLD); end if;
  if TG_OP<>'DELETE' then new_row:=to_jsonb(NEW); end if;
  if TG_TABLE_NAME='recipe_sources' then
    old_key:=(old_row->>'recipe_id')::uuid; new_key:=(new_row->>'recipe_id')::uuid;
    affected:=array_remove(array[old_key,new_key],null);
  elsif TG_TABLE_NAME='recipes' then
    old_key:=(old_row->>'id')::uuid; new_key:=(new_row->>'id')::uuid;
    affected:=array_remove(array[old_key,new_key],null);
  else
    old_key:=(old_row->>case when TG_TABLE_NAME='bean_flavor_notes' then 'bean_id' else 'id' end)::uuid;
    new_key:=(new_row->>case when TG_TABLE_NAME='bean_flavor_notes' then 'bean_id' else 'id' end)::uuid;
    select coalesce(array_agg(distinct r.id),'{}'::uuid[]) into affected from public.recipes r
      left join public.roasted_products p on p.id=r.roasted_product_id
      left join public.beans b on b.id=coalesce(r.bean_id,p.legacy_bean_id)
    where r.visibility='public' and case TG_TABLE_NAME
      when 'beans' then b.id=any(array[old_key,new_key])
      when 'bean_flavor_notes' then b.id=any(array[old_key,new_key])
      when 'roasted_products' then r.roasted_product_id=any(array[old_key,new_key])
      when 'coffee_lots' then p.coffee_lot_id=any(array[old_key,new_key])
      when 'roasters' then b.roaster_id=any(array[old_key,new_key]) or p.roaster_id=any(array[old_key,new_key])
      when 'profiles' then r.user_id=any(array[old_key,new_key]) and r.recipe_type in ('community','personal')
      else false end;
  end if;
  if cardinality(affected)>0 then perform private.refresh_recipe_search_documents(affected); end if;
  return null;
end $maintain$;
revoke all on function private.maintain_recipe_search_documents() from public,anon,authenticated;
create trigger maintain_recipe_search_documents after insert or update or delete on public.recipes for each row execute function private.maintain_recipe_search_documents();
create trigger maintain_recipe_search_documents after insert or update or delete on public.recipe_sources for each row execute function private.maintain_recipe_search_documents();
create trigger maintain_recipe_search_documents after insert or update or delete on public.beans for each row execute function private.maintain_recipe_search_documents();
create trigger maintain_recipe_search_documents after insert or update or delete on public.bean_flavor_notes for each row execute function private.maintain_recipe_search_documents();
create trigger maintain_recipe_search_documents after insert or update or delete on public.roasted_products for each row execute function private.maintain_recipe_search_documents();
create trigger maintain_recipe_search_documents after insert or update or delete on public.coffee_lots for each row execute function private.maintain_recipe_search_documents();
create trigger maintain_recipe_search_documents after insert or update or delete on public.roasters for each row execute function private.maintain_recipe_search_documents();
create trigger maintain_recipe_search_documents after insert or update or delete on public.profiles for each row execute function private.maintain_recipe_search_documents();
select private.refresh_recipe_search_documents();
CREATE OR REPLACE FUNCTION public.search_public_recipes_v2(p_query text DEFAULT NULL::text, p_method text DEFAULT NULL::text, p_source text DEFAULT NULL::text, p_model text DEFAULT NULL::text, p_flavor_note text DEFAULT NULL::text, p_flavor_family text DEFAULT NULL::text, p_creator_name text DEFAULT NULL::text, p_creator_country text DEFAULT NULL::text, p_recipe_country text DEFAULT NULL::text, p_recipe_name text DEFAULT NULL::text, p_serving_style text DEFAULT NULL::text, p_coffee_type text DEFAULT NULL::text, p_coffee_name text DEFAULT NULL::text, p_coffee_origin text DEFAULT NULL::text, p_roaster_name text DEFAULT NULL::text, p_source_name text DEFAULT NULL::text, p_bean_id uuid DEFAULT NULL, p_product_id uuid DEFAULT NULL)
 RETURNS SETOF public.recipes
 LANGUAGE plpgsql
 STABLE
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
DECLARE coffee_ids uuid[]; anchor_pattern text;
BEGIN
  select '%' || replace(replace(replace(query.word, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
    into anchor_pattern from regexp_split_to_table(public.recipe_discovery_normalize(left(p_query,160)), '[[:space:]]+') query(word)
    where length(query.word)>=3 order by length(query.word) desc limit 1;
  if p_bean_id is not null and p_product_id is not null then
    raise exception 'Choose one exact coffee scope' using errcode='22023';
  end if;
  if p_bean_id is not null or p_product_id is not null then
    select coalesce(array_agg(scoped.id), '{}'::uuid[]) into coffee_ids
    from public.recipes_for_coffee(p_bean_id, p_product_id) scoped;
  end if;
  -- Browsing and serving/method/source/model choices need no joins or normalized text.
  -- The rich search branch below retains every existing literal/AND search condition.
  IF concat_ws('', btrim(p_query), btrim(p_flavor_note), btrim(p_flavor_family),
    btrim(p_creator_name), btrim(p_creator_country), btrim(p_recipe_country), btrim(p_recipe_name),
    btrim(p_coffee_type), btrim(p_coffee_name), btrim(p_coffee_origin), btrim(p_roaster_name), btrim(p_source_name)) = '' THEN
    RETURN QUERY
      SELECT r.* FROM public.recipes r
      WHERE r.visibility = 'public' AND (coffee_ids is null or r.id = any(coffee_ids))
        AND (nullif(btrim(p_method),'') IS NULL OR r.brew_method = p_method)
        AND (nullif(btrim(p_source),'') IS NULL OR p_source = 'all'
          OR (p_source = 'official' AND r.recipe_type IN ('official_manufacturer','official_roaster','verified_barista'))
          OR (p_source = 'community' AND r.recipe_type = 'community'))
        AND (p_method IS DISTINCT FROM 'xbloom' OR nullif(btrim(p_model),'') IS NULL OR p_model = 'all'
          OR r.source_brew_parameters->>'model' = p_model)
        AND (nullif(btrim(p_serving_style),'') IS NULL OR
          CASE WHEN r.serving_style IN ('hot','iced','cold') THEN r.serving_style
            WHEN r.source_brew_parameters->'discovery'->>'serving_style' IN ('hot','iced','cold')
              THEN r.source_brew_parameters->'discovery'->>'serving_style' ELSE NULL END = any(case when p_serving_style = 'cold_or_iced' then array['cold','iced'] else array[p_serving_style] end));
    RETURN;
  END IF;
  RETURN QUERY
select r.* from public.recipes r join public.recipe_search_documents terms on terms.recipe_id=r.id
  where r.visibility = 'public' and (coffee_ids is null or r.id = any(coffee_ids))
    and (anchor_pattern is null or terms.search_text like anchor_pattern escape E'\\')
    and (nullif(btrim(p_serving_style), '') is null or
      case when r.serving_style in ('hot','iced','cold') then r.serving_style
        when r.source_brew_parameters->'discovery'->>'serving_style' in ('hot','iced','cold')
          then r.source_brew_parameters->'discovery'->>'serving_style' end = any(case when p_serving_style = 'cold_or_iced' then array['cold','iced'] else array[p_serving_style] end))
    and (nullif(btrim(p_method), '') is null or r.brew_method = p_method)
    and (nullif(btrim(p_source), '') is null or p_source = 'all'
      or (p_source = 'official' and r.recipe_type in ('official_manufacturer', 'official_roaster', 'verified_barista'))
      or (p_source = 'community' and r.recipe_type = 'community'))
    and (p_method is distinct from 'xbloom' or nullif(btrim(p_model), '') is null or p_model = 'all'
      or r.source_brew_parameters->>'model' = p_model)

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
      where query.term <> '' and strpos(terms.search_text, query.term) = 0
    );
END;
$function$;
