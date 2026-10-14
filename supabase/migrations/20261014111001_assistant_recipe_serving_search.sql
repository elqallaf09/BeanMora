-- Recipe constraints must be applied before the result limit. Filtering only
-- the first catalog page lets recent hot recipes hide an existing cold match.
-- Keep the existing equipment/coffee/roaster RPC signature compatible.
create or replace function public.search_coffee_assistant_recipes(
  p_terms text[] default '{}',
  p_methods text[] default '{}',
  p_serving_style text default null,
  p_limit integer default 60
)
returns setof public.assistant_public_documents
language sql
stable
security invoker
set search_path = ''
as $function$
  with terms as (
    select distinct left(lower(translate(btrim(t), 'أإآٱىةـ', 'اااايه')), 160) term
    from unnest(p_terms) t
    where length(btrim(t)) between 1 and 160
    limit 24
  ), candidates as (
    select d.*, r.serving_style,
      (select count(*) from terms t
        where position(t.term in lower(translate(d.search_text, 'أإآٱىةـ', 'اااايه'))) > 0) hits
    from public.assistant_public_documents d
    join public.recipes r on r.id = d.id
    where d.kind = 'recipe' and r.visibility = 'public'
      and (coalesce(cardinality(p_methods), 0) = 0 or d.methods && p_methods)
      and (p_serving_style is null
        or p_serving_style in ('cold', 'iced') and r.serving_style in ('cold', 'iced')
        or p_serving_style = 'hot' and r.serving_style = 'hot')
  )
  select id, kind, slug, title_ar, title_en, summary_ar, summary_en,
    search_text, source_url, category, methods,
    facts || jsonb_build_object('serving_style', serving_style) as facts,
    offers, verified_at
  from candidates
  where not exists (select 1 from terms) or hits > 0
  order by hits desc, verified_at desc nulls last, id
  limit greatest(1, least(coalesce(p_limit, 60), 200));
$function$;

revoke all on function public.search_coffee_assistant_recipes(text[], text[], text, integer) from public;
grant execute on function public.search_coffee_assistant_recipes(text[], text[], text, integer) to anon, authenticated;
