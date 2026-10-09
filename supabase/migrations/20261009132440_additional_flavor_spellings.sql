-- Extend compound/plural spellings without duplicating the reviewed vocabulary.
do $spellings$
declare definition text:=pg_get_functiondef('public.recipe_discovery_search_text(text)'::regprocedure);
begin
 if strpos(definition,$old0$ if words && array['currants','كشمش']::text[] then result:=result||' currants كشمش'; end if;$old0$)=0 then raise exception 'SEARCH_VOCABULARY_DRIFT'; end if;
 definition:=replace(definition,$old0$ if words && array['currants','كشمش']::text[] then result:=result||' currants كشمش'; end if;$old0$,$new0$ if words && array['currant','currants','كشمش']::text[] then result:=result||' currant currants كشمش'; end if;$new0$);
 if strpos(definition,$old1$ if words && array['redcurrant']::text[] or strpos(original,'كشمش احمر')>0 then result:=result||' redcurrant كشمش احمر'; end if;$old1$)=0 then raise exception 'SEARCH_VOCABULARY_DRIFT'; end if;
 definition:=replace(definition,$old1$ if words && array['redcurrant']::text[] or strpos(original,'كشمش احمر')>0 then result:=result||' redcurrant كشمش احمر'; end if;$old1$,$new1$ if words && array['redcurrant','redcurrants']::text[] or strpos(original,'red currant')>0 or strpos(original,'كشمش احمر')>0 then result:=result||' redcurrant redcurrants red currant red currants كشمش احمر'; end if;$new1$);
 if strpos(definition,$old2$ if words && array['blackcurrant']::text[] or strpos(original,'كشمش اسود')>0 then result:=result||' blackcurrant كشمش اسود'; end if;$old2$)=0 then raise exception 'SEARCH_VOCABULARY_DRIFT'; end if;
 definition:=replace(definition,$old2$ if words && array['blackcurrant']::text[] or strpos(original,'كشمش اسود')>0 then result:=result||' blackcurrant كشمش اسود'; end if;$old2$,$new2$ if words && array['blackcurrant','blackcurrants']::text[] or strpos(original,'black currant')>0 or strpos(original,'كشمش اسود')>0 then result:=result||' blackcurrant blackcurrants black currant black currants كشمش اسود'; end if;$new2$);
 execute definition;
end $spellings$;
select private.refresh_recipe_search_documents();
