-- Exact and nearby results must use identical flavor-family evidence.
do $patch$
declare definition text; patched text;
begin
 definition:=pg_get_functiondef('public.search_public_recipes_v2(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid)'::regprocedure);
 patched:=regexp_replace(definition,
  'and \(nullif\(btrim\(p_flavor_family\), ''''\) is null or exists \(.*?\)\)[[:space:]]*and not exists',
  'and (nullif(btrim(p_flavor_family), '''') is null or public.recipe_discovery_family_matches(terms.flavor_note,p_flavor_family))
    and not exists','s');
 if patched=definition then raise exception 'SEARCH_FAMILY_DEFINITION_DRIFT'; end if;
 execute patched;
end $patch$;
