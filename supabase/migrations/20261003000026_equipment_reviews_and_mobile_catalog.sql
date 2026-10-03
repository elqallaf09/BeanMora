-- Model-specific community opinions. Editorial guides remain separate in the app.
create table public.equipment_reviews (
  id uuid primary key default gen_random_uuid(),
  equipment_model_id uuid not null references public.equipment_models(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  review_text text not null check (char_length(btrim(review_text)) between 10 and 2000),
  pros text not null default '' check (char_length(pros) <= 500),
  cons text not null default '' check (char_length(cons) <= 500),
  experience text not null check (experience in ('owner', 'used', 'interested')),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (equipment_model_id, user_id)
);
create index equipment_reviews_public_idx on public.equipment_reviews (equipment_model_id, created_at desc, id) where status = 'published';
create index equipment_reviews_user_id_idx on public.equipment_reviews (user_id);
create trigger equipment_reviews_set_updated_at before update on public.equipment_reviews
  for each row execute function public.set_updated_at();
alter table public.equipment_reviews enable row level security;
revoke all on public.equipment_reviews from anon, authenticated;
grant select on public.equipment_reviews to anon, authenticated;
grant insert (equipment_model_id, user_id, rating, review_text, pros, cons, experience) on public.equipment_reviews to authenticated;
grant update (rating, review_text, pros, cons, experience) on public.equipment_reviews to authenticated;
grant delete on public.equipment_reviews to authenticated;

create policy "read published equipment opinions or own hidden opinion" on public.equipment_reviews for select
  using (status = 'published' or user_id = (select auth.uid()) or (select private.has_role('admin')) or (select private.has_role('moderator')));
create policy "members submit one opinion per reviewed model" on public.equipment_reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and not (select private.is_guest()) and status = 'published'
    and exists (select 1 from public.equipment_models e where e.id = equipment_model_id and not e.requires_review));
create policy "members edit their own visible opinion" on public.equipment_reviews for update to authenticated
  using (user_id = (select auth.uid()) and not (select private.is_guest()) and status = 'published')
  with check (user_id = (select auth.uid()) and not (select private.is_guest()) and status = 'published');
create policy "members remove their own opinion" on public.equipment_reviews for delete to authenticated
  using (user_id = (select auth.uid()) and not (select private.is_guest()));

create function public.equipment_review_summary(p_equipment_id uuid)
returns table (review_count bigint, average_rating numeric)
language sql stable security invoker set search_path = '' as $$
  select count(*), round(avg(rating), 1) from public.equipment_reviews
  where equipment_model_id = p_equipment_id and status = 'published';
$$;
revoke all on function public.equipment_review_summary(uuid) from public;
grant execute on function public.equipment_review_summary(uuid) to anon, authenticated;

alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('recipe', 'post', 'comment', 'user', 'equipment_review'));
alter table public.moderation_actions drop constraint moderation_actions_target_type_check;
alter table public.moderation_actions add constraint moderation_actions_target_type_check
  check (target_type in ('recipe', 'post', 'comment', 'user', 'bean', 'roaster', 'equipment_review'));

-- Only trusted moderation roles can change visibility; members have no status-column grant.
create function public.moderate_equipment_review(p_review_id uuid, p_hidden boolean, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not ((select private.has_role('admin')) or (select private.has_role('moderator'))) or (select private.is_guest()) then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 3 and 1000 then
    raise exception 'A moderation reason is required' using errcode = '22023';
  end if;
  update public.equipment_reviews set status = case when p_hidden then 'hidden' else 'published' end where id = p_review_id;
  if not found then raise exception 'Review not found' using errcode = 'P0002'; end if;
  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
    values ((select auth.uid()), 'equipment_review', p_review_id, case when p_hidden then 'hide' else 'unhide' end, btrim(p_reason));
end;
$$;
revoke all on function public.moderate_equipment_review(uuid, boolean, text) from public;
grant execute on function public.moderate_equipment_review(uuid, boolean, text) to authenticated;

-- Verified manufacturer catalog additions; no prices, photos, ratings or device profiles invented.
insert into public.equipment_brands (name) values ('Bialetti'), ('xBloom') on conflict (name) do nothing;
insert into public.equipment_models (brand_id, category, name, description, official_url, suitable_brew_methods,
  source_type, source_url, source_name, last_verified_at, data_confidence, requires_review)
select b.id, v.category, v.name, v.description, v.url, v.methods, 'official_product_page', v.url, b.name, now(), 'official', false
from (values
  ('Bialetti', 'other', 'Bialetti Moka Express', 'Aluminium stovetop coffee maker. Gas/electric hob compatible; induction requires the manufacturer induction plate. Hand rinse with water; not dishwasher safe.', 'https://www.bialetti.com/it_en/moka-express.html', array['moka_pot']::text[]),
  ('xBloom', 'xbloom', 'xBloom Studio', 'Automated pour-over system with independent grinder, brewer and scale modes. Supports own beans and recipe management in the official xBloom app.', 'https://xbloom.com/pages/xbloom-studio', array['xbloom']::text[]),
  ('xBloom', 'xbloom', 'xBloom Original', 'Automated pour-over machine. Own beans can be brewed with the reusable dripper and recipes customized in the official xBloom app.', 'https://xbloom.com/pages/xbloom-original', array['xbloom']::text[])
) as v(brand, category, name, description, url, methods)
join public.equipment_brands b on b.name = v.brand
where not exists (select 1 from public.equipment_models e where e.name = v.name and e.brand_id = b.id);
