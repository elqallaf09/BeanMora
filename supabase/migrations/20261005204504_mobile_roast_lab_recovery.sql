-- The original Roast Lab tables already exist in production. The two recovered
-- August migrations retain their deployed definitions; this extends their API.
begin;

alter table public.roast_profiles add column if not exists public_coffee jsonb not null default '{}';
alter table public.roast_profiles add constraint roast_public_coffee_object check (jsonb_typeof(public_coffee)='object');
alter table public.posts add column if not exists roast_profile_id uuid references public.roast_profiles(id) on delete set null;
create unique index if not exists posts_roast_profile_unique on public.posts (roast_profile_id) where roast_profile_id is not null;
alter table public.roast_tastings add column if not exists recipe_id uuid references public.recipes(id) on delete set null;
alter table public.roast_tastings add column if not exists brew_log_id uuid references public.brew_logs(id) on delete set null;
create index if not exists roast_tastings_recipe_idx on public.roast_tastings(recipe_id) where recipe_id is not null;
create index if not exists roast_tastings_brew_log_idx on public.roast_tastings(brew_log_id) where brew_log_id is not null;

create policy "roast insert references owned green coffee and machine" on public.roast_profiles as restrictive for insert to authenticated
with check (exists(select 1 from public.green_coffees g where g.id=green_coffee_id and g.user_id=(select auth.uid())) and (roaster_equipment_id is null or exists(select 1 from public.user_equipment e where e.id=roaster_equipment_id and e.user_id=(select auth.uid()) and e.category='roaster')));
create policy "roast update references owned green coffee and machine" on public.roast_profiles as restrictive for update to authenticated
using(user_id=(select auth.uid())) with check (exists(select 1 from public.green_coffees g where g.id=green_coffee_id and g.user_id=(select auth.uid())) and (roaster_equipment_id is null or exists(select 1 from public.user_equipment e where e.id=roaster_equipment_id and e.user_id=(select auth.uid()) and e.category='roaster')));
create policy "inventory insert references owned green coffee" on public.green_inventory_transactions as restrictive for insert to authenticated
with check(exists(select 1 from public.green_coffees g where g.id=green_coffee_id and g.user_id=(select auth.uid())) and (roast_id is null or exists(select 1 from public.roast_profiles r where r.id=roast_id and r.user_id=(select auth.uid()))));
create policy "inventory update references owned green coffee" on public.green_inventory_transactions as restrictive for update to authenticated
using(user_id=(select auth.uid())) with check(exists(select 1 from public.green_coffees g where g.id=green_coffee_id and g.user_id=(select auth.uid())) and (roast_id is null or exists(select 1 from public.roast_profiles r where r.id=roast_id and r.user_id=(select auth.uid()))));
create policy "tasting insert links readable recipe and own brew" on public.roast_tastings as restrictive for insert to authenticated
with check((recipe_id is null or exists(select 1 from public.recipes r where r.id=recipe_id)) and (brew_log_id is null or exists(select 1 from public.brew_logs b where b.id=brew_log_id and b.user_id=(select auth.uid()))));
create policy "tasting update links readable recipe and own brew" on public.roast_tastings as restrictive for update to authenticated
using(exists(select 1 from public.roast_profiles r where r.id=roast_id and r.user_id=(select auth.uid()))) with check((recipe_id is null or exists(select 1 from public.recipes r where r.id=recipe_id)) and (brew_log_id is null or exists(select 1 from public.brew_logs b where b.id=brew_log_id and b.user_id=(select auth.uid()))));
create policy "roast post insert must reference own readable roast" on public.posts as restrictive for insert to authenticated
with check(roast_profile_id is null or exists(select 1 from public.roast_profiles r where r.id=roast_profile_id and r.user_id=(select auth.uid()) and (posts.visibility='private' or r.visibility='public')));
create policy "roast post update must reference own readable roast" on public.posts as restrictive for update to authenticated
using(user_id=(select auth.uid())) with check(roast_profile_id is null or exists(select 1 from public.roast_profiles r where r.id=roast_profile_id and r.user_id=(select auth.uid()) and (posts.visibility='private' or r.visibility='public')));

-- Atomic green-coffee record + optional purchase. A zero/missing quantity is not
-- turned into an invented stock balance. Ownership stays enforced by RLS.
create or replace function public.save_green_coffee(p_data jsonb) returns uuid
language plpgsql security invoker set search_path='' as $function$
declare v_uid uuid:=auth.uid(); v_id uuid:=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid()); v_qty numeric:=nullif(p_data->>'quantity_grams','')::numeric;
begin
  if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'ROAST_LOGIN'; end if;
  if jsonb_typeof(p_data)<>'object' or length(trim(coalesce(p_data->>'name','')))<2 or length(p_data->>'name')>160 then raise exception 'GREEN_NAME'; end if;
  if v_qty is not null and (v_qty<=0 or v_qty>1000000) then raise exception 'GREEN_AMOUNT'; end if;
  perform 1 from public.green_coffees where id=v_id and user_id=v_uid for update;
  if found then
    update public.green_coffees set name=trim(p_data->>'name'),origin_country=nullif(p_data->>'origin_country',''),origin_region=nullif(p_data->>'origin_region',''),producer=nullif(p_data->>'producer',''),farm=nullif(p_data->>'farm',''),washing_station=nullif(p_data->>'washing_station',''),lot_number=nullif(p_data->>'lot_number',''),harvest_year=nullif(p_data->>'harvest_year','')::integer,species=nullif(p_data->>'species',''),varietal=nullif(p_data->>'varietal',''),process=nullif(p_data->>'process',''),altitude_meters=nullif(p_data->>'altitude_meters','')::integer,moisture_pct=nullif(p_data->>'moisture_pct','')::numeric,density_g_l=nullif(p_data->>'density_g_l','')::numeric,water_activity=nullif(p_data->>'water_activity','')::numeric,screen_size=nullif(p_data->>'screen_size',''),supplier=nullif(p_data->>'supplier',''),notes=nullif(p_data->>'notes','') where id=v_id and user_id=v_uid;
  else
    if nullif(p_data->>'id','') is not null and not coalesce((p_data->>'create')::boolean,false) then raise exception 'ROAST_OWNER'; end if;
    insert into public.green_coffees(id,user_id,name,origin_country,origin_region,producer,farm,washing_station,lot_number,harvest_year,species,varietal,process,altitude_meters,moisture_pct,density_g_l,water_activity,screen_size,supplier,notes)
    values(v_id,v_uid,trim(p_data->>'name'),nullif(p_data->>'origin_country',''),nullif(p_data->>'origin_region',''),nullif(p_data->>'producer',''),nullif(p_data->>'farm',''),nullif(p_data->>'washing_station',''),nullif(p_data->>'lot_number',''),nullif(p_data->>'harvest_year','')::integer,nullif(p_data->>'species',''),nullif(p_data->>'varietal',''),nullif(p_data->>'process',''),nullif(p_data->>'altitude_meters','')::integer,nullif(p_data->>'moisture_pct','')::numeric,nullif(p_data->>'density_g_l','')::numeric,nullif(p_data->>'water_activity','')::numeric,nullif(p_data->>'screen_size',''),nullif(p_data->>'supplier',''),nullif(p_data->>'notes',''));
  end if;
  if v_qty is not null then insert into public.green_inventory_transactions(id,user_id,green_coffee_id,transaction_type,quantity_grams,supplier) values(coalesce(nullif(p_data->>'transaction_id','')::uuid,gen_random_uuid()),v_uid,v_id,'purchase',v_qty,nullif(p_data->>'supplier','')) on conflict(id) do nothing; end if;
  return v_id;
end $function$;

-- All profile, milestone, control, curve, stock and optional community changes
-- commit together. No elevated access or exposed private green-coffee join.
create or replace function public.save_roast_profile(p_data jsonb) returns uuid
language plpgsql security invoker set search_path='' as $function$
declare
  v_uid uuid:=auth.uid(); v_id uuid:=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid()); v_green uuid:=nullif(p_data->>'green_coffee_id','')::uuid;
  v_old public.roast_profiles; v_coffee public.green_coffees; v_machine uuid:=nullif(p_data->>'roaster_equipment_id','')::uuid;
  v_weight numeric:=nullif(p_data->>'green_weight_g','')::numeric; v_roasted numeric:=nullif(p_data->>'roasted_weight_g','')::numeric;
  v_total integer:=nullif(p_data->>'total_time_seconds','')::integer; v_status text:=coalesce(p_data->>'status','planned'); v_visibility text:=coalesce(p_data->>'visibility','private');
  v_events jsonb:=coalesce(p_data->'events','[]'); v_controls jsonb:=coalesce(p_data->'controls','[]'); v_points jsonb:=coalesce(p_data->'points','[]');
  v_balance numeric; v_consumed numeric; v_tx record; v_item jsonb; v_previous integer:=-1; v_time integer; v_type text; v_order integer:=-1; v_rank integer;
  v_parent uuid:=nullif(p_data->>'parent_roast_id','')::uuid; v_expected timestamptz:=nullif(p_data->>'expected_updated_at','')::timestamptz;
begin
  if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'ROAST_LOGIN'; end if;
  if jsonb_typeof(p_data)<>'object' or length(trim(coalesce(p_data->>'title','')))<2 or length(p_data->>'title')>160 or length(coalesce(p_data->>'notes',''))>5000 then raise exception 'ROAST_TITLE'; end if;
  if v_weight is null or v_weight<=0 or v_weight>1000000 then raise exception 'GREEN_AMOUNT'; end if;
  if v_status not in ('planned','in_progress','completed') or v_visibility not in ('private','public') then raise exception 'ROAST_STATE'; end if;
  if v_status='completed' and (v_roasted is null or v_roasted<=0 or v_roasted>v_weight or v_total is null or v_total<=0 or v_total>172800) then raise exception 'ROAST_RESULT'; end if;
  if v_visibility='public' and v_status<>'completed' then raise exception 'ROAST_COMPLETE_FIRST'; end if;
  if jsonb_typeof(v_events)<>'array' or jsonb_array_length(v_events)>30 or jsonb_typeof(v_controls)<>'array' or jsonb_array_length(v_controls)>200 or jsonb_typeof(v_points)<>'array' or jsonb_array_length(v_points)>3000 then raise exception 'ROAST_SERIES'; end if;
  select * into v_old from public.roast_profiles where id=v_id and user_id=v_uid for update;
  if v_old.id is not null and v_expected is not null and v_old.updated_at<>v_expected then raise exception 'ROAST_STALE'; end if;
  if v_old.status='completed' and v_status<>'completed' then raise exception 'ROAST_STATE'; end if;
  -- Lock both beans in a stable order when moving a completed roast to another lot.
  perform 1 from public.green_coffees where user_id=v_uid and id in(v_green,v_old.green_coffee_id) order by id for update;
  select * into v_coffee from public.green_coffees where id=v_green and user_id=v_uid;
  if v_coffee.id is null then raise exception 'ROAST_OWNER'; end if;
  if v_machine is not null and not exists(select 1 from public.user_equipment where id=v_machine and user_id=v_uid and category='roaster') then raise exception 'ROAST_MACHINE'; end if;
  if v_parent is not null and (v_parent=v_id or not exists(select 1 from public.roast_profiles where id=v_parent and (user_id=v_uid or visibility='public'))) then raise exception 'ROAST_PARENT'; end if;
  for v_item in select value from jsonb_array_elements(v_events) loop
    v_time:=(v_item->>'elapsed_seconds')::integer; v_type:=v_item->>'event_type';
    if v_type='drop' and v_total is not null and v_time<>v_total then raise exception 'ROAST_ORDER'; end if;
    if v_type='charge' and v_time<>0 then raise exception 'ROAST_ORDER'; end if;
    v_rank:=case v_type when 'charge' then 0 when 'turning_point' then 1 when 'dry_end' then 2 when 'first_crack_start' then 3 when 'first_crack_end' then 4 when 'second_crack_start' then 5 when 'second_crack_end' then 6 when 'drop' then 7 else null end;
    if v_time is null or v_time<0 or (v_total is not null and v_time>v_total) or v_time<v_previous or (v_rank is not null and v_rank<=v_order) then raise exception 'ROAST_ORDER'; end if;
    if v_rank is not null then v_order:=v_rank; end if; v_previous:=v_time;
  end loop;
  for v_item in select value from jsonb_array_elements(v_controls) union all select value from jsonb_array_elements(v_points) loop
    v_time:=(v_item->>'elapsed_seconds')::integer;
    if v_time is null or v_time<0 or (v_total is not null and v_time>v_total) then raise exception 'ROAST_ORDER'; end if;
  end loop;
  select coalesce(sum(quantity_grams),0) into v_balance from public.green_inventory_transactions where green_coffee_id=v_green and user_id=v_uid;
  select coalesce(-sum(quantity_grams),0) into v_consumed from public.green_inventory_transactions where roast_id=v_id and green_coffee_id=v_green and user_id=v_uid;
  if v_status='completed' and v_weight>v_balance+v_consumed then raise exception 'ROAST_INVENTORY'; end if;
  if v_old.id is null then
    insert into public.roast_profiles(id,user_id,green_coffee_id,roaster_equipment_id,parent_roast_id,title,roast_date,status,visibility,green_weight_g) values(v_id,v_uid,v_green,v_machine,v_parent,trim(p_data->>'title'),coalesce(nullif(p_data->>'roast_date','')::date,current_date),'planned','private',v_weight);
  end if;
  update public.roast_profiles set green_coffee_id=v_green,roaster_equipment_id=v_machine,parent_roast_id=v_parent,title=trim(p_data->>'title'),batch_number=nullif(p_data->>'batch_number','')::integer,roast_date=coalesce(nullif(p_data->>'roast_date','')::date,current_date),notes=nullif(p_data->>'notes',''),status=v_status,visibility=v_visibility,published_at=case when v_visibility='public' then coalesce(v_old.published_at,now()) else null end,green_weight_g=v_weight,roasted_weight_g=v_roasted,total_time_seconds=v_total,charge_temp_c=nullif(p_data->>'charge_temp_c','')::numeric,drop_temp_c=nullif(p_data->>'drop_temp_c','')::numeric,ambient_temp_c=nullif(p_data->>'ambient_temp_c','')::numeric,green_temp_c=nullif(p_data->>'green_temp_c','')::numeric,target_roast_level=nullif(p_data->>'target_roast_level',''),roast_level=nullif(p_data->>'roast_level',''),agtron_whole=nullif(p_data->>'agtron_whole','')::integer,agtron_ground=nullif(p_data->>'agtron_ground','')::integer,public_coffee=jsonb_strip_nulls(jsonb_build_object('name',v_coffee.name,'origin',v_coffee.origin_country,'process',v_coffee.process,'varietal',v_coffee.varietal)) where id=v_id and user_id=v_uid;
  if v_status='completed' and (v_consumed<>v_weight or v_old.green_coffee_id is distinct from v_green) then
    for v_tx in select green_coffee_id,sum(quantity_grams) amount from public.green_inventory_transactions where roast_id=v_id and user_id=v_uid group by green_coffee_id having sum(quantity_grams)<>0 loop
      insert into public.green_inventory_transactions(user_id,green_coffee_id,roast_id,transaction_type,quantity_grams,notes) values(v_uid,v_tx.green_coffee_id,v_id,'reversal',-v_tx.amount,'Roast revision');
    end loop;
    insert into public.green_inventory_transactions(user_id,green_coffee_id,roast_id,transaction_type,quantity_grams) values(v_uid,v_green,v_id,'roast_consumption',-v_weight);
  end if;
  delete from public.roast_events where roast_id=v_id;
  insert into public.roast_events(roast_id,event_type,elapsed_seconds,bean_temp_c,environment_temp_c,notes) select v_id,x.event_type,x.elapsed_seconds,x.bean_temp_c,x.environment_temp_c,x.notes from jsonb_to_recordset(v_events) as x(event_type text,elapsed_seconds integer,bean_temp_c numeric,environment_temp_c numeric,notes text);
  delete from public.roast_control_events where roast_id=v_id;
  insert into public.roast_control_events(roast_id,elapsed_seconds,control_type,value,unit,notes) select v_id,x.elapsed_seconds,x.control_type,x.value,x.unit,x.notes from jsonb_to_recordset(v_controls) as x(elapsed_seconds integer,control_type text,value numeric,unit text,notes text);
  delete from public.roast_curve_points where roast_id=v_id;
  insert into public.roast_curve_points(roast_id,elapsed_seconds,bean_temp_c,environment_temp_c,ror) select v_id,x.elapsed_seconds,x.bean_temp_c,x.environment_temp_c,x.ror from jsonb_to_recordset(v_points) as x(elapsed_seconds integer,bean_temp_c numeric,environment_temp_c numeric,ror numeric);
  if v_visibility='public' then
    insert into public.posts(user_id,roast_profile_id,body,content_language,visibility,is_hidden) values(v_uid,v_id,concat_ws(E'\n',trim(p_data->>'title'),nullif(p_data->>'notes','')),coalesce(p_data->>'language','ar'),'public',false)
    on conflict(roast_profile_id) where roast_profile_id is not null do update set body=excluded.body,visibility='public',content_language=excluded.content_language where public.posts.user_id=v_uid;
  else update public.posts set visibility='private' where roast_profile_id=v_id and user_id=v_uid; end if;
  return v_id;
end $function$;

create or replace function public.save_roast_tasting(p_roast_id uuid,p_data jsonb) returns uuid
language plpgsql security invoker set search_path='' as $function$
declare v_uid uuid:=auth.uid(); v_id uuid:=gen_random_uuid();
begin
  if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'ROAST_LOGIN'; end if;
  if not exists(select 1 from public.roast_profiles where id=p_roast_id and user_id=v_uid and status='completed') then raise exception 'ROAST_OWNER'; end if;
  if length(coalesce(p_data->>'notes',''))>3000 or jsonb_typeof(coalesce(p_data->'flavor_notes','[]'))<>'array' or jsonb_array_length(coalesce(p_data->'flavor_notes','[]'))>30 then raise exception 'ROAST_TASTING'; end if;
  insert into public.roast_tastings(id,roast_id,rest_days,tasted_on,acidity,sweetness,body,aroma,bitterness,clarity,aftertaste,overall_score,flavor_notes,notes,recipe_id,brew_log_id)
  values(v_id,p_roast_id,nullif(p_data->>'rest_days','')::integer,coalesce(nullif(p_data->>'tasted_on','')::date,current_date),nullif(p_data->>'acidity','')::smallint,nullif(p_data->>'sweetness','')::smallint,nullif(p_data->>'body','')::smallint,nullif(p_data->>'aroma','')::smallint,nullif(p_data->>'bitterness','')::smallint,nullif(p_data->>'clarity','')::smallint,nullif(p_data->>'aftertaste','')::smallint,nullif(p_data->>'overall_score','')::numeric,array(select jsonb_array_elements_text(coalesce(p_data->'flavor_notes','[]'))),nullif(p_data->>'notes',''),nullif(p_data->>'recipe_id','')::uuid,nullif(p_data->>'brew_log_id','')::uuid);
  return v_id;
end $function$;

revoke all on function public.save_green_coffee(jsonb),public.save_roast_profile(jsonb),public.save_roast_tasting(uuid,jsonb) from public,anon;
grant execute on function public.save_green_coffee(jsonb),public.save_roast_profile(jsonb),public.save_roast_tasting(uuid,jsonb) to authenticated;
commit;
