-- JSON 4 and 4.0 should behave identically after integer-range validation.
do $patch$
declare definition text:=pg_get_functiondef('public.record_brew_outcome_v1(uuid,jsonb)'::regprocedure); field text;
begin
 definition:=replace(definition,'(p_payload->>''actual_time_seconds'')::int','(p_payload->>''actual_time_seconds'')::numeric::int');
 foreach field in array array['acidity','bitterness','sweetness','balance','overall_rating'] loop
 definition:=replace(definition,format('(scores->>%L)::int',field),format('(scores->>%L)::numeric::int',field));
 end loop;
 execute definition;
end;
$patch$;
