-- Public identity remains discoverable; private collections are opt-in.
-- Follow approval and row/storage visibility are enforced in PostgreSQL.
alter table public.profiles add column if not exists is_private boolean not null default false;
alter table public.profiles add column if not exists share_collection boolean not null default false;
alter table public.follows add column if not exists status text not null default 'accepted' check(status in ('pending','accepted'));

create or replace function private.can_view_member(p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select p_user=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=p_user and (
  not p.is_private or exists(select 1 from public.follows f where f.following_id=p_user and f.follower_id=(select auth.uid()) and f.status='accepted')))
$$;
revoke all on function private.can_view_member(uuid) from public;
grant execute on function private.can_view_member(uuid) to anon,authenticated;

create or replace function private.enforce_member_follow()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or coalesce((select auth.jwt()->>'is_anonymous'),'true')<>'false' then raise exception 'MEMBER_REQUIRED' using errcode='42501';end if;
 if tg_op='INSERT' then
  if new.follower_id<>(select auth.uid()) or not exists(select 1 from auth.users u where u.id=new.following_id and not coalesce(u.is_anonymous,true)) then raise exception 'INVALID_FOLLOW' using errcode='42501';end if;
  new.status:=case when (select p.is_private from public.profiles p where p.id=new.following_id) then 'pending' else 'accepted' end;
 else
  if (select auth.uid())<>old.following_id or new.following_id<>old.following_id or new.follower_id<>old.follower_id or new.id<>old.id or new.status<>'accepted' then raise exception 'FOLLOW_APPROVAL_OWNER_REQUIRED' using errcode='42501';end if;
 end if;
 return new;
end $$;
revoke all on function private.enforce_member_follow() from public,anon,authenticated;
create trigger follows_approval_guard before insert or update on public.follows for each row execute function private.enforce_member_follow();
create policy "follow target approves requests" on public.follows for update to authenticated using(following_id=(select auth.uid())) with check(following_id=(select auth.uid()));
create policy "follow target removes followers or declines requests" on public.follows for delete to authenticated using(following_id=(select auth.uid()));
create policy "follow graph respects private accounts" on public.follows as restrictive for select to anon,authenticated
using(follower_id=(select auth.uid()) or following_id=(select auth.uid()) or (status='accepted' and private.can_view_member(follower_id) and private.can_view_member(following_id)));
create policy "post author account privacy" on public.posts as restrictive for select to anon,authenticated using(private.can_view_member(user_id) or (select private.has_role('admin')) or (select private.has_role('moderator')));
create policy "community recipe author account privacy" on public.recipes as restrictive for select to anon,authenticated
using(user_id is null or recipe_type in ('official_manufacturer','official_roaster','verified_barista','beanmora_suggested') or private.can_view_member(user_id) or (select private.has_role('admin')));

create table public.profile_photos (
 id uuid primary key,user_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('extraction','corner')),image_path text not null unique,
 caption text not null default '' check(length(caption)<=2000),created_at timestamptz not null default now(),
 constraint profile_photo_owned_path check(image_path like user_id::text||'/%')
);
create index profile_photos_owner_idx on public.profile_photos(user_id,created_at desc);
alter table public.profile_photos enable row level security;
create policy "profile photos follow account privacy" on public.profile_photos for select to anon,authenticated using(private.can_view_member(user_id));
create policy "members add owned profile photos" on public.profile_photos for insert to authenticated with check(user_id=(select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous'),'true')='false');
create policy "owners remove profile photos" on public.profile_photos for delete to authenticated using(user_id=(select auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('profile-gallery','profile-gallery',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "members upload profile photos" on storage.objects for insert to authenticated with check(bucket_id='profile-gallery' and split_part(name,'/',1)=(select auth.uid())::text and coalesce((select auth.jwt()->>'is_anonymous'),'true')='false');
create policy "gallery media follows exact visible photo" on storage.objects for select to anon,authenticated using(bucket_id='profile-gallery' and (split_part(name,'/',1)=(select auth.uid())::text or exists(select 1 from public.profile_photos p where p.image_path=name and p.user_id::text=split_part(name,'/',1))));
create policy "members delete their gallery media" on storage.objects for delete to authenticated using(bucket_id='profile-gallery' and split_part(name,'/',1)=(select auth.uid())::text);

create or replace function public.save_profile_photo(p_id uuid,p_kind text,p_path text,p_caption text default '')
returns uuid language plpgsql security invoker set search_path='' as $$
begin
 if (select auth.uid()) is null or coalesce((select auth.jwt()->>'is_anonymous'),'true')<>'false' then raise exception 'MEMBER_REQUIRED' using errcode='42501';end if;
 if exists(select 1 from public.profile_photos where id=p_id and user_id=(select auth.uid())) then return p_id;end if;
 if p_path !~ ('^'||(select auth.uid())::text||'/'||p_id::text||'\.(jpg|png|webp)$') or not exists(select 1 from storage.objects where bucket_id='profile-gallery' and name=p_path) then raise exception 'INVALID_PHOTO';end if;
 insert into public.profile_photos(id,user_id,kind,image_path,caption) values(p_id,(select auth.uid()),p_kind,p_path,trim(coalesce(p_caption,'')));return p_id;
end $$;
revoke all on function public.save_profile_photo(uuid,text,text,text) from public,anon;
grant execute on function public.save_profile_photo(uuid,text,text,text) to authenticated;

create table public.coffee_comments (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 bean_id uuid references public.beans(id) on delete cascade,product_id uuid references public.roasted_products(id) on delete cascade,
 body text not null check(length(trim(body)) between 2 and 2000),created_at timestamptz not null default now(),
 constraint coffee_comment_target check((bean_id is null)<>(product_id is null))
);
create index coffee_comments_owner_idx on public.coffee_comments(user_id,created_at desc);
create index coffee_comments_bean_idx on public.coffee_comments(bean_id);
create index coffee_comments_product_idx on public.coffee_comments(product_id);
alter table public.coffee_comments enable row level security;
create policy "coffee comments visible with their coffee" on public.coffee_comments for select to anon,authenticated using(user_id=(select auth.uid()) or (
 private.can_view_member(user_id) and (exists(select 1 from public.beans b where b.id=bean_id and b.is_published and not b.requires_review) or exists(select 1 from public.roasted_products p where p.id=product_id and not p.requires_review))));
create policy "members comment on visible coffee" on public.coffee_comments for insert to authenticated with check(user_id=(select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous'),'true')='false' and (exists(select 1 from public.beans b where b.id=bean_id) or exists(select 1 from public.roasted_products p where p.id=product_id)));
create policy "owners remove coffee comments" on public.coffee_comments for delete to authenticated using(user_id=(select auth.uid()));

-- Search parameters remain data; no user-entered PostgREST OR expressions.
create or replace function public.search_member_profiles(p_query text default '',p_offset int default 0)
returns table(id uuid,name text,username text,avatar_url text,is_private boolean)
language sql stable security definer set search_path='' as $$
 select p.id,p.name,p.username,p.avatar_url,p.is_private from public.profiles p join auth.users u on u.id=p.id
 where not coalesce(u.is_anonymous,true) and (coalesce(trim(p_query),'')='' or position(lower(trim(p_query)) in lower(p.name||' '||p.username))>0)
 order by p.username,p.id limit 24 offset greatest(0,least(coalesce(p_offset,0),100000))
$$;
revoke all on function public.search_member_profiles(text,int) from public;
grant execute on function public.search_member_profiles(text,int) to anon,authenticated;

create or replace function public.get_member_profile(p_username text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.profiles; viewer uuid:=(select auth.uid()); allowed boolean; own boolean; result jsonb;
begin
 select pr.* into p from public.profiles pr join auth.users u on u.id=pr.id where pr.username=lower(trim(p_username)) and not coalesce(u.is_anonymous,true);
 if not found then return null;end if;
 own:=coalesce(viewer=p.id,false);allowed:=coalesce(private.can_view_member(p.id),false);
 result:=jsonb_build_object('profile',jsonb_build_object('id',p.id,'name',p.name,'username',p.username,'avatar_url',p.avatar_url,'bio',p.bio,'is_private',p.is_private,'share_collection',case when own then p.share_collection else null end),
  'can_view',allowed,'is_owner',own,'relationship',(select f.status from public.follows f where f.follower_id=viewer and f.following_id=p.id),
  'follower_count',(select count(*) from public.follows f where f.following_id=p.id and f.status='accepted'),
  'following_count',(select count(*) from public.follows f where f.follower_id=p.id and f.status='accepted'));
 if not allowed then return result;end if;
 result:=result||jsonb_build_object(
  'recipes',coalesce((select jsonb_agg(to_jsonb(x)) from (select r.id,r.title,r.title_ar,r.brew_method,r.visibility from public.recipes r where r.user_id=p.id and (r.visibility='public' or own) order by r.created_at desc limit 100)x),'[]'::jsonb),
  'photos',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,kind,'storage://profile-gallery/'||image_path as image_url,caption,created_at from public.profile_photos where user_id=p.id order by created_at desc limit 100)x),'[]'::jsonb),
  'followers',coalesce((select jsonb_agg(to_jsonb(x)) from (select pr.id,pr.name,pr.username,pr.avatar_url,pr.is_private from public.follows f join public.profiles pr on pr.id=f.follower_id where f.following_id=p.id and f.status='accepted' order by f.created_at desc limit 100)x),'[]'::jsonb),
  'following',coalesce((select jsonb_agg(to_jsonb(x)) from (select pr.id,pr.name,pr.username,pr.avatar_url,pr.is_private from public.follows f join public.profiles pr on pr.id=f.following_id where f.follower_id=p.id and f.status='accepted' order by f.created_at desc limit 100)x),'[]'::jsonb));
 if own then result:=result||jsonb_build_object('requests',coalesce((select jsonb_agg(to_jsonb(x)) from (select f.id as request_id,pr.id,pr.name,pr.username,pr.avatar_url,pr.is_private from public.follows f join public.profiles pr on pr.id=f.follower_id where f.following_id=p.id and f.status='pending' order by f.created_at desc limit 100)x),'[]'::jsonb));end if;
 if own or p.share_collection then result:=result||jsonb_build_object(
  'equipment',coalesce((select jsonb_agg(to_jsonb(x)) from (select e.id,e.equipment_model_id,e.category,coalesce(m.name,e.custom_name) as name,m.specifications->'catalog'->>'name_ar' as name_ar,m.specifications->'catalog'->'facts'->'operation' as operation from public.user_equipment e left join public.equipment_models m on m.id=e.equipment_model_id where e.user_id=p.id and e.archived_at is null order by e.created_at desc limit 100)x),'[]'::jsonb),
  'beans',coalesce((select jsonb_agg(to_jsonb(x)) from (select i.id,coalesce(b.id,r.id) as coffee_id,case when b.id is not null then 'bean' else 'product' end as kind,coalesce(b.name_ar,r.name_ar) as name_ar,coalesce(b.name_en,r.name_en) as name_en,coalesce(b.slug,r.slug) as slug from public.user_bean_inventory i left join public.beans b on b.id=i.legacy_bean_id left join public.roasted_products r on r.id=i.roasted_product_id where i.user_id=p.id and i.archived_at is null and (own or (b.is_published and not b.requires_review) or (not r.requires_review)) order by i.created_at desc limit 100)x),'[]'::jsonb),
  'favorites',coalesce((select jsonb_agg(to_jsonb(x)) from (select r.id,r.title,r.title_ar,r.brew_method from public.recipe_saves s join public.recipes r on r.id=s.recipe_id where s.user_id=p.id and (r.visibility='public' and (r.user_id is null or private.can_view_member(r.user_id)) or own and r.user_id=viewer) order by s.created_at desc limit 100)x),'[]'::jsonb));end if;
 result:=result||jsonb_build_object('comments',coalesce((select jsonb_agg(to_jsonb(x)) from (
  select c.id,c.body,c.created_at,'recipe'::text as kind,r.id as target_id,r.title as name_en,r.title_ar as name_ar from public.comments c join public.recipes r on r.id=c.recipe_id where c.user_id=p.id and not c.is_hidden and (r.visibility='public' and private.can_view_member(r.user_id) or own and r.user_id=viewer)
  union all select c.id,c.body,c.created_at,case when c.bean_id is not null then 'bean' else 'product' end,coalesce(b.id,pr.id),coalesce(b.name_en,pr.name_en),coalesce(b.name_ar,pr.name_ar) from public.coffee_comments c left join public.beans b on b.id=c.bean_id left join public.roasted_products pr on pr.id=c.product_id where c.user_id=p.id and (own or b.is_published and not b.requires_review or not pr.requires_review)
  union all select v.id,v.review_text,v.created_at,'recipe',r.id,r.title,r.title_ar from public.recipe_reviews v join public.recipes r on r.id=v.recipe_id where v.user_id=p.id and v.review_text is not null and (r.visibility='public' and private.can_view_member(r.user_id) or own and r.user_id=viewer)
  union all select v.id,v.review,v.created_at,'recipe',r.id,r.title,r.title_ar from public.recipe_ratings v join public.recipes r on r.id=v.recipe_id where v.user_id=p.id and v.review is not null and (r.visibility='public' and private.can_view_member(r.user_id) or own and r.user_id=viewer)
  union all select v.id,v.review_text,v.created_at,'product',pr.id,pr.name_en,pr.name_ar from public.bean_reviews v join public.roasted_products pr on pr.id=v.roasted_product_id where v.user_id=p.id and v.review_text is not null and (own or not pr.requires_review)
  order by created_at desc limit 100
 )x),'[]'::jsonb));return result;
end $$;
revoke all on function public.get_member_profile(text) from public;
grant execute on function public.get_member_profile(text) to anon,authenticated;
