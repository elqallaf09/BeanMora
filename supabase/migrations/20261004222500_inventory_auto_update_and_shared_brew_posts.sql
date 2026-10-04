-- BeanMora — inventory auto update + shared brew posts
alter table public.posts
  add column if not exists brew_log_id uuid references public.brew_logs(id) on delete set null,
  add column if not exists bean_id uuid references public.beans(id) on delete set null,
  add column if not exists brew_method text references public.brew_methods(code),
  add column if not exists dose_grams numeric(6,2) check (dose_grams is null or dose_grams > 0),
  add column if not exists water_grams numeric(7,2) check (water_grams is null or water_grams > 0),
  add column if not exists actual_time_seconds int check (actual_time_seconds is null or actual_time_seconds > 0),
  add column if not exists outcome text check (outcome is null or outcome in ('excellent','good','needs_adjustment','poor'));

create index if not exists posts_brew_log_id_idx on public.posts (brew_log_id);
create index if not exists posts_bean_id_idx on public.posts (bean_id);

drop policy if exists "shared brew post must belong to author" on public.posts;
create policy "shared brew post must belong to author"
  on public.posts as restrictive for insert to authenticated
  with check (
    brew_log_id is null
    or exists (
      select 1 from public.brew_logs b
      where b.id = brew_log_id
        and b.user_id = (select auth.uid())
        and b.recipe_id is not distinct from posts.recipe_id
        and b.bean_id is not distinct from posts.bean_id
        and b.brew_method is not distinct from posts.brew_method
        and b.dose_grams is not distinct from posts.dose_grams
        and b.water_grams is not distinct from posts.water_grams
        and b.actual_time_seconds is not distinct from posts.actual_time_seconds
        and (b.outcome_submission->>'outcome') is not distinct from posts.outcome
    )
  );

drop policy if exists "shared brew post updates stay owned" on public.posts;
create policy "shared brew post updates stay owned"
  on public.posts as restrictive for update to authenticated
  using (
    brew_log_id is null
    or exists (select 1 from public.brew_logs b where b.id = brew_log_id and b.user_id = (select auth.uid()))
  )
  with check (
    brew_log_id is null
    or exists (
      select 1 from public.brew_logs b
      where b.id = brew_log_id
        and b.user_id = (select auth.uid())
        and b.recipe_id is not distinct from posts.recipe_id
        and b.bean_id is not distinct from posts.bean_id
        and b.brew_method is not distinct from posts.brew_method
        and b.dose_grams is not distinct from posts.dose_grams
        and b.water_grams is not distinct from posts.water_grams
        and b.actual_time_seconds is not distinct from posts.actual_time_seconds
        and (b.outcome_submission->>'outcome') is not distinct from posts.outcome
    )
  );

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
  select r.roasted_product_id into product_id
  from public.recipes r
  where r.id = new.recipe_id;

  select i.id into target_id
  from public.user_bean_inventory i
  where i.user_id = new.user_id
    and (
      (product_id is not null and i.roasted_product_id = product_id)
      or (new.bean_id is not null and i.legacy_bean_id = new.bean_id)
    )
    and coalesce(i.remaining_weight_grams, 1) > 0
  order by
    case when i.opened_at is not null then 0 else 1 end,
    i.opened_at desc nulls last,
    i.updated_at desc,
    i.created_at desc
  limit 1
  for update;

  if target_id is null then
    return new;
  end if;

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

drop trigger if exists brew_logs_apply_inventory on public.brew_logs;
create trigger brew_logs_apply_inventory
  after insert on public.brew_logs
  for each row execute function public.apply_brew_to_inventory();

revoke all on function public.apply_brew_to_inventory() from public;
grant execute on function public.apply_brew_to_inventory() to authenticated;

comment on function public.apply_brew_to_inventory() is
  'Best-effort inventory update after a saved brew: opens the most relevant bag, decrements known remaining weight, increments brew count, and remembers excellent recipes.';
