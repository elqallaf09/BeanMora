-- Keep validated brew submissions aligned with the catalog's existing methods.
do $patch$
declare definition text := pg_get_functiondef('public.record_brew_outcome_v1(uuid,jsonb)'::regprocedure);
        previous text := 'array[''v60'',''espresso'',''xbloom'',''aeropress'',''chemex'',''french_press'',''cold_brew'',''moka_pot'']';
begin
 if position(previous in definition)=0 then raise exception 'Expected supported-method guard was not found'; end if;
 definition := replace(definition,previous,'array[''v60'',''espresso'',''xbloom'',''aeropress'',''chemex'',''french_press'',''cold_brew'',''moka_pot'',''origami'',''kalita_wave'']');
 execute definition;
end;
$patch$;
