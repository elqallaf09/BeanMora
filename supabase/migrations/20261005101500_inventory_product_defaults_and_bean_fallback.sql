create or replace function public.fill_inventory_defaults()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  product_weight int;
  product_roast date;
begin
  if new.roasted_product_id is not null then
    select rp.weight_grams, rp.roast_date
      into product_weight, product_roast
    from public.roasted_products rp
    where rp.id = new.roasted_product_id;
    if new.original_weight_grams is null and product_weight is not null then new.original_weight_grams := product_weight; end if;
    if new.remaining_weight_grams is null and product_weight is not null then new.remaining_weight_grams := product_weight; end if;
    if new.roast_date is null and product_roast is not null then new.roast_date := product_roast; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists user_bean_inventory_fill_defaults on public.user_bean_inventory;
create trigger user_bean_inventory_fill_defaults
  before insert on public.user_bean_inventory
  for each row execute function public.fill_inventory_defaults();

revoke all on function public.fill_inventory_defaults() from public;
grant execute on function public.fill_inventory_defaults() to authenticated;

create or replace function public.apply_brew_to_inventory()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  product_id uuid;
  target_id uuid;
  result_text text;
begin
  select r.roasted_product_id into product_id from public.recipes r where r.id = new.recipe_id;
  select i.id into target_id
  from public.user_bean_inventory i
  where i.user_id = new.user_id
    and (
      (product_id is not null and i.roasted_product_id = product_id)
      or (new.bean_id is not null and i.legacy_bean_id = new.bean_id)
      or (
        new.bean_id is not null and i.roasted_product_id is not null
        and exists (
          select 1 from public.roasted_products rp
          where rp.id = i.roasted_product_id and rp.legacy_bean_id = new.bean_id
        )
      )
    )
    and coalesce(i.remaining_weight_grams, 1) > 0
  order by
    case
      when product_id is not null and i.roasted_product_id = product_id then 0
      when new.bean_id is not null and i.roasted_product_id is not null and exists (
        select 1 from public.roasted_products rp2
        where rp2.id = i.roasted_product_id and rp2.legacy_bean_id = new.bean_id
      ) then 1
      else 2
    end,
    case when i.opened_at is not null then 0 else 1 end,
    i.opened_at desc nulls last,
    i.updated_at desc,
    i.created_at desc
  limit 1
  for update;

  if target_id is null then return new; end if;
  result_text := new.outcome_submission->>'outcome';

  update public.user_bean_inventory
  set
    opened_at = coalesce(opened_at, current_date),
    remaining_weight_grams = case
      when remaining_weight_grams is null or new.dose_grams is null then remaining_weight_grams
      else greatest(0, remaining_weight_grams - ceil(new.dose_grams)::int)
    end,
    brew_count = brew_count + 1,
    preferred_recipe_id = case
      when result_text = 'excellent' and new.recipe_id is not null then new.recipe_id
      else preferred_recipe_id
    end,
    updated_at = now()
  where id = target_id;

  return new;
end;
$$;

revoke all on function public.apply_brew_to_inventory() from public;
grant execute on function public.apply_brew_to_inventory() to authenticated;
