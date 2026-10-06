-- Read-only regression against the current published catalog. Nothing persists.
begin;
set local role anon;
do $$
declare
  style text;
  translated text;
  expected_count bigint;
  actual_count bigint;
begin
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='search_public_recipes' and p.prosecdef) then
    raise exception 'Discovery search must honor caller RLS';
  end if;
  for style, translated in select * from (values ('hot','حَار'),('iced','مثلّج'),('cold','بارد')) v(style,translated) loop
    select count(*) into expected_count from public.recipes r
    where r.visibility='public' and
      case when r.serving_style in ('hot','iced','cold') then r.serving_style
        when r.source_brew_parameters->'discovery'->>'serving_style' in ('hot','iced','cold')
        then r.source_brew_parameters->'discovery'->>'serving_style' end=style;
    select count(*) into actual_count from public.search_public_recipes(p_serving_style=>style);
    if actual_count<>expected_count then raise exception 'Fast % filter lost or added recipes',style; end if;
    select count(*) into actual_count from public.search_public_recipes(p_serving_style=>style,p_query=>translated);
    if actual_count<>expected_count then raise exception 'Arabic text + % filter differs from exact serving',style; end if;
    if exists(select 1 from public.search_public_recipes(p_serving_style=>style) r where r.visibility<>'public') then
      raise exception 'A serving filter exposed a private recipe';
    end if;
    select count(*) into expected_count from public.recipes r
      where r.visibility='public' and r.brew_method='xbloom'
        and r.recipe_type in ('official_manufacturer','official_roaster','verified_barista')
        and case when r.serving_style in ('hot','iced','cold') then r.serving_style
          when r.source_brew_parameters->'discovery'->>'serving_style' in ('hot','iced','cold')
          then r.source_brew_parameters->'discovery'->>'serving_style' end=style;
    select count(*) into actual_count from public.search_public_recipes(p_serving_style=>style,p_method=>'xbloom',p_source=>'official');
    if actual_count<>expected_count then raise exception 'Combined method/source/% filter differs',style; end if;
  end loop;
  if not exists(select 1 from public.search_public_recipes(p_query=>'BOMBE',p_serving_style=>'iced')
    where title='ice BOMBE Natural  Jeed') then raise exception 'Reviewed iced BOMBE recipe missing'; end if;
  if exists(select 1 from public.search_public_recipes(p_query=>'BOMBE impossible_fixture_term_7c97',p_serving_style=>'iced')) then
    raise exception 'Search words must all match';
  end if;
  if exists(select 1 from public.search_public_recipes(p_query=>'%'') OR true --',p_serving_style=>'iced'))
    or exists(select 1 from public.search_public_recipes(p_serving_style=>'iced),visibility.eq.private')) then
    raise exception 'Search input was interpreted as query syntax';
  end if;
  if exists(select 1 from public.search_public_recipes() r where r.visibility<>'public') then
    raise exception 'Fast browsing exposed a private recipe';
  end if;
end $$;
rollback;
select 'PASS: serving filters, Arabic text, combined criteria, literal AND search and caller RLS' as result;
