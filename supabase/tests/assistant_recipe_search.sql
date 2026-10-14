-- Read-only assertions against the published catalog; no fixtures or private
-- user records are created. Run after assistant_recipe_serving_search.
begin;
set local role anon;
do $tests$
begin
  if not exists (select 1 from public.search_coffee_assistant_recipes(
    array['coconut', 'honey', 'جوز الهند', 'عسل'], array['xbloom'], 'cold', 60)) then
    raise exception 'Published cold xBloom matches are missing';
  end if;
  if exists (
    select 1 from public.search_coffee_assistant_recipes('{}', array['xbloom'], 'cold', 2) d
    where d.kind <> 'recipe' or not ('xbloom' = any(d.methods))
      or coalesce(d.facts->>'serving_style', 'unknown') not in ('cold', 'iced')
  ) then raise exception 'Brewer/style constraints were widened'; end if;
  if (select count(*) from public.search_coffee_assistant_recipes('{}', array['xbloom'], 'cold', 2)) <> 2 then
    raise exception 'Style was filtered after the result limit';
  end if;
  if exists (
    select 1 from public.search_coffee_assistant_recipes('{}', '{}', null, 200) d
    join public.recipes r on r.id = d.id where r.visibility <> 'public'
  ) then raise exception 'A private recipe was exposed'; end if;
  if exists (select 1 from public.search_coffee_assistant_recipes(
    array['__no_such_recipe_20261014__'], array['xbloom'], 'cold', 60)) then
    raise exception 'Unmatched literal terms returned unrelated recipes';
  end if;
  if exists (select 1 from public.search_coffee_assistant_recipes('{}', '{}', 'invalid_style', 60)) then
    raise exception 'An invalid style returned unrestricted recipes';
  end if;
end
$tests$;
rollback;
