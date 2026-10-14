-- Read-only assertions under the guest's RLS; no catalog fixtures are inserted.
begin;
set local role anon;
do $tests$
declare term text; canonical text; source_text text;
begin
  for term,canonical in select * from (values
    ('いちご','strawberry'),('fraise','strawberry'),('fragola','strawberry'),
    ('fresa','strawberry'),('morango','strawberry'),('草莓','strawberry'),
    ('ジャスミン','jasmine'),('jasmin','jasmine'),('gelsomino','jasmine'),
    ('jazmín','jasmine'),('jasmim','jasmine'),('茉莉','jasmine'),
    ('ココナッツ','coconut'),('noix de coco','coconut'),('cocco','coconut'),
    ('椰子','coconut'),('はちみつ','honey'),('miel','honey'),('miele','honey'),
    ('mel','honey'),('蜂蜜','honey'),('ブラジル','brazil'),('Brésil','brazil'),
    ('Brasile','brazil'),('Brasil','brazil'),('巴西','brazil')
  ) aliases(alias,concept) loop
    source_text:=public.recipe_discovery_search_text(term);
    if source_text not like '%'||canonical||'%' then raise exception 'Missing multilingual alias: %',term; end if;
  end loop;
  if public.recipe_discovery_multilingual_text('sucre')<>' sugar'
    or public.recipe_discovery_multilingual_text('sucré')<>' sweet'
    then raise exception 'French accents merged sugar and sweet'; end if;
  if public.recipe_discovery_multilingual_text('granada') not like '%pomegranate%'
    or public.recipe_discovery_multilingual_text('granada') like '%grenada%'
    then raise exception 'Spanish flavor acquired country facts'; end if;
  if public.recipe_discovery_country_text('Granada')<>'grenada'
    or public.recipe_discovery_country_text('Grenade')<>'grenada'
    or public.recipe_discovery_country_text('Malte')<>'malta'
    or public.recipe_discovery_country_text('unknown_country_%')<>'unknown_country_%'
    then raise exception 'Typed country or literal was lost'; end if;
  if public.recipe_discovery_multilingual_text('unknown_name_%''; SELECT')<>''
    then raise exception 'Unknown source text acquired catalog facts'; end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('recipe_discovery_multilingual_text','recipe_discovery_country_text','recipe_discovery_search_text','search_public_recipes','search_public_recipes_v2') and p.prosecdef)
    then raise exception 'Multilingual search escaped caller RLS'; end if;
  if has_function_privilege('anon','private.refresh_recipe_search_documents(uuid[])','EXECUTE')
    or has_table_privilege('anon','public.recipe_search_documents','UPDATE')
    then raise exception 'Guest acquired index maintenance rights'; end if;
  if exists(select 1 from public.search_public_recipes(p_query=>'strawberry unknown_brand_fixture'))
    or exists(select 1 from public.search_public_recipes(p_query=>'%''; SELECT'))
    then raise exception 'Query constraints became syntax or were dropped'; end if;
  if exists(select 1 from public.recipe_search_documents d join public.recipes r on r.id=d.recipe_id where r.visibility<>'public')
    then raise exception 'Multilingual index exposed a private recipe'; end if;
end $tests$;
rollback;
