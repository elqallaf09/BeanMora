-- Separate native flavor homonyms from typed country fields (e.g. Spanish granada).
-- Rewrite only the two inspected function bodies; preserve privileges and RLS.
do $migration$
declare definition text; country_literal text; refreshed text; expression text;
begin
  definition:=pg_get_functiondef('public.recipe_discovery_multilingual_text(text)'::regprocedure);
  country_literal:=split_part(split_part(definition,'  country_aliases constant jsonb:=',2),E'::jsonb;\n',1);
  if length(country_literal) not between 10000 and 100000
    or position('if country_aliases ? btrim(original) then return country_aliases->>btrim(original); end if;' in definition)=0
    then raise exception 'Unexpected reviewed multilingual helper'; end if;
  execute 'create or replace function public.recipe_discovery_country_text(p_value text)
    returns text language plpgsql immutable security invoker set search_path='''' as $countries$
    declare original text:=lower(normalize(coalesce(p_value,''''),NFKC));
      country_aliases constant jsonb:='||country_literal||'::jsonb;
    begin return coalesce(btrim(country_aliases->>btrim(original)),p_value); end $countries$;';
  definition:=replace(definition,'  country_aliases constant jsonb:='||country_literal||E'::jsonb;\n','');
  definition:=replace(definition,E'  if country_aliases ? btrim(original) then return country_aliases->>btrim(original); end if;\n','');
  execute definition;
  refreshed:=pg_get_functiondef('private.refresh_recipe_search_documents(uuid[])'::regprocedure);
  if position('recipe_discovery_country_text' in refreshed)>0 then raise exception 'Country index already revised'; end if;
  foreach expression in array array[
    'discovery.metadata->>''creator_country''','discovery.metadata->>''creator_country_ar''',
    'discovery.metadata->>''recipe_country''','discovery.metadata->>''recipe_country_ar''',
    'r.source_origin_country','bean.origin_country','lot.origin_country',
    'discovery.metadata->>''coffee_origin''','discovery.metadata->>''coffee_origin_ar'''
  ] loop
    if position(expression in refreshed)=0 then raise exception 'Missing typed country field: %',expression; end if;
    refreshed:=replace(refreshed,expression,'public.recipe_discovery_country_text('||expression||')');
  end loop;
  execute refreshed;
end $migration$;
revoke all on function public.recipe_discovery_country_text(text) from public;
grant execute on function public.recipe_discovery_country_text(text) to anon,authenticated,service_role;
select private.refresh_recipe_search_documents(null::uuid[]);
