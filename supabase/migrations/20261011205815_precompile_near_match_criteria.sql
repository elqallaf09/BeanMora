-- Normalize each requested term once instead of repeating it for every recipe.
do $patch$
declare definition text; patched text;
begin
 definition:=pg_get_functiondef('public.search_public_recipe_near_matches(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid,integer,integer)'::regprocedure);
 patched:=replace(definition,'with criteria(field,value) as materialized (','with input_criteria(field,value) as (');
 patched:=replace(patched,'), candidates as (', '), criteria as materialized (
  select field,value,regexp_split_to_array(public.recipe_discovery_normalize(value),''[[:space:],،;؛]+'') as tokens from input_criteria
 ), candidates as (');
 patched:=replace(patched,'else public.recipe_discovery_matches(case q.field',
  'else not exists(select 1 from unnest(q.tokens) token where token<>'''' and strpos(coalesce(case q.field');
 patched:=replace(patched,'when ''sourceName'' then c.source_name end,q.value) end as ok',
  'when ''sourceName'' then c.source_name end,''''),token)=0) end as ok');
 if patched=definition then raise exception 'NEAR_MATCH_CRITERIA_DEFINITION_DRIFT'; end if;
 execute patched;
end $patch$;
