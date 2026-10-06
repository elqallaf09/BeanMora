-- Reversible source edits prove index updates and privacy; every edit rolls back.
begin;
do $$
declare target uuid; bean uuid; source uuid; previous_type text;
begin
  if has_function_privilege('anon','private.refresh_recipe_search_documents(uuid[])','EXECUTE')
    or has_function_privilege('authenticated','private.maintain_recipe_search_documents()','EXECUTE')
    or has_table_privilege('anon','public.recipe_search_documents','UPDATE') then raise exception 'Search maintenance permissions leaked'; end if;
  select r.id,r.bean_id into target,bean from public.recipes r join public.beans b on b.id=r.bean_id
    where r.visibility='public' and b.is_published and not b.requires_review limit 1;
  if target is null then raise exception 'Missing coffee-linked fixture'; end if;
  update public.recipes set notes=coalesce(notes,'')||' unique_recipe_6bd71' where id=target;
  if not exists(select 1 from public.search_public_recipes(p_query=>'unique_recipe_6bd71') where id=target) then raise exception 'Recipe edit did not refresh search'; end if;
  update public.beans set description_en='unique_bean_6bd71' where id=bean;
  if not exists(select 1 from public.search_public_recipes(p_query=>'unique_bean_6bd71') where id=target) then raise exception 'Coffee edit did not refresh search'; end if;
  update public.beans set requires_review=true where id=bean;
  if exists(select 1 from public.search_public_recipes(p_query=>'unique_bean_6bd71') where id=target) then raise exception 'Unreviewed coffee facts remained searchable'; end if;
  update public.beans set requires_review=false where id=bean;
  insert into public.bean_flavor_notes(bean_id,flavor) values(bean,'unique_flavor_6bd71');
  if not exists(select 1 from public.search_public_recipes(p_flavor_note=>'unique_flavor_6bd71') where id=target) then raise exception 'Flavor edit did not refresh search'; end if;
  delete from public.bean_flavor_notes where bean_id=bean and flavor='unique_flavor_6bd71';
  if exists(select 1 from public.search_public_recipes(p_flavor_note=>'unique_flavor_6bd71') where id=target) then raise exception 'Deleted flavor remained searchable'; end if;
  insert into public.recipe_sources(recipe_id,source_type,source_name,source_url)
    values(target,'official_website','unique_source_6bd71','https://example.test/unique_source_6bd71') returning id into source;
  if not exists(select 1 from public.search_public_recipes(p_source_name=>'unique_source_6bd71') where id=target) then raise exception 'Source insert did not refresh search'; end if;
  delete from public.recipe_sources where id=source;
  if exists(select 1 from public.search_public_recipes(p_source_name=>'unique_source_6bd71') where id=target) then raise exception 'Deleted source remained searchable'; end if;
  update public.recipes set visibility='private' where id=target;
  if exists(select 1 from public.recipe_search_documents where recipe_id=target) then raise exception 'Private recipe retained a public document'; end if;
  update public.recipes set visibility='public' where id=target;
  if not exists(select 1 from public.search_public_recipes(p_query=>'unique_recipe_6bd71') where id=target) then raise exception 'Republishing did not restore index'; end if;
end $$;
set local role anon;
do $$ begin
  if exists(select 1 from public.recipe_search_documents d join public.recipes r on r.id=d.recipe_id where r.visibility<>'public')
    then raise exception 'Private search document leaked'; end if;
end $$;
rollback;
