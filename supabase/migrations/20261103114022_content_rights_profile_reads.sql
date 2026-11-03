-- Preserve existing member privacy checks; apply publication holds to definer reads too.
CREATE OR REPLACE FUNCTION public.get_member_profile(p_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p public.profiles; viewer uuid:=(select auth.uid()); allowed boolean; own boolean; result jsonb;
begin
 select pr.* into p from public.profiles pr join auth.users u on u.id=pr.id where pr.username=lower(trim(p_username)) and not coalesce(u.is_anonymous,true);
 if not found then return null;end if;
 own:=coalesce(viewer=p.id,false);allowed:=coalesce(private.can_view_member(p.id),false);
 result:=jsonb_build_object('profile',jsonb_build_object('id',p.id,'name',p.name,'username',p.username,'avatar_url',p.avatar_url,'bio',p.bio,'country',p.country,'is_private',p.is_private,'hide_followers',case when own then p.hide_followers else null end,'hide_following',case when own then p.hide_following else null end,'share_collection',case when own then p.share_collection else null end),
  'can_view',allowed,'is_owner',own,'relationship',(select f.status from public.follows f where f.follower_id=viewer and f.following_id=p.id),
  'can_view_followers',coalesce(private.can_view_follow_list(p.id,'followers'),false),'follower_count',case when private.can_view_follow_list(p.id,'followers') then (select count(*) from public.follows f where f.following_id=p.id and f.status='accepted') else null end,
  'can_view_following',coalesce(private.can_view_follow_list(p.id,'following'),false),'following_count',case when private.can_view_follow_list(p.id,'following') then (select count(*) from public.follows f where f.follower_id=p.id and f.status='accepted') else null end);
 if not allowed then return result;end if;
 result:=result||jsonb_build_object(
  'recipes',coalesce((select jsonb_agg(to_jsonb(x)) from (select r.id,r.title,r.title_ar,r.brew_method,r.visibility from public.recipes r where r.user_id=p.id and not r.rights_suspended and (r.visibility='public' or own) order by r.created_at desc limit 100)x),'[]'::jsonb),
  'photos',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,kind,'storage://profile-gallery/'||image_path as image_url,caption,created_at from public.profile_photos where user_id=p.id order by created_at desc limit 100)x),'[]'::jsonb),
  'followers',coalesce((select jsonb_agg(to_jsonb(x)) from (select pr.id,pr.name,pr.username,pr.avatar_url,pr.is_private from public.follows f join public.profiles pr on pr.id=f.follower_id where f.following_id=p.id and f.status='accepted' and private.can_view_follow_list(p.id,'followers') and (viewer=f.follower_id or own or private.can_view_follow_list(f.follower_id,'following')) order by f.created_at desc limit 100)x),'[]'::jsonb),
  'following',coalesce((select jsonb_agg(to_jsonb(x)) from (select pr.id,pr.name,pr.username,pr.avatar_url,pr.is_private from public.follows f join public.profiles pr on pr.id=f.following_id where f.follower_id=p.id and f.status='accepted' and private.can_view_follow_list(p.id,'following') and (viewer=f.following_id or own or private.can_view_follow_list(f.following_id,'followers')) order by f.created_at desc limit 100)x),'[]'::jsonb));
 if own then result:=result||jsonb_build_object('requests',coalesce((select jsonb_agg(to_jsonb(x)) from (select f.id as request_id,pr.id,pr.name,pr.username,pr.avatar_url,pr.is_private from public.follows f join public.profiles pr on pr.id=f.follower_id where f.following_id=p.id and f.status='pending' order by f.created_at desc limit 100)x),'[]'::jsonb));end if;
 if own or p.share_collection then result:=result||jsonb_build_object(
  'equipment',coalesce((select jsonb_agg(to_jsonb(x)) from (select e.id,e.equipment_model_id,e.category,coalesce(m.name,e.custom_name) as name,m.specifications->'catalog'->>'name_ar' as name_ar,m.specifications->'catalog'->'facts'->'operation' as operation,case when not m.requires_review and m.image_usage_status='rights_confirmed' and nullif(btrim(m.image_permission_ref),'') is not null then m.image_url end as image_url,case when not m.requires_review then m.image_usage_status end as image_usage_status,case when not m.requires_review then m.image_permission_ref end as image_permission_ref from public.user_equipment e left join public.equipment_models m on m.id=e.equipment_model_id where e.user_id=p.id and e.archived_at is null order by e.created_at desc limit 100)x),'[]'::jsonb),
  'beans',coalesce((select jsonb_agg(to_jsonb(x)) from (select i.id,coalesce(b.id,r.id) as coffee_id,case when b.id is not null then 'bean' else 'product' end as kind,coalesce(b.name_ar,r.name_ar) as name_ar,coalesce(b.name_en,r.name_en) as name_en,coalesce(b.slug,r.slug) as slug,photo.url as image_url,photo.image_usage_status,photo.image_permission_ref from public.user_bean_inventory i left join public.beans b on b.id=i.legacy_bean_id left join public.roasted_products r on r.id=i.roasted_product_id
 left join lateral (select media.url,media.image_usage_status,media.image_permission_ref from (
  select b.image_url as url,b.image_usage_status,b.image_permission_ref,0 as priority
  union all select bi.url,bi.image_usage_status,bi.image_permission_ref,1+bi.position from public.bean_images bi where bi.bean_id=b.id
  union all select r.image_url,r.image_usage_status,r.image_permission_ref,10000 where own or not r.requires_review
 )media where media.url is not null and media.image_usage_status='rights_confirmed' and nullif(btrim(media.image_permission_ref),'') is not null order by media.priority limit 1) photo on true
 where i.user_id=p.id and i.archived_at is null and (own or (b.is_published and not b.requires_review) or (not r.requires_review)) order by i.created_at desc limit 100)x),'[]'::jsonb),
  'favorites',coalesce((select jsonb_agg(to_jsonb(x)) from (select r.id,r.title,r.title_ar,r.brew_method from public.recipe_saves s join public.recipes r on r.id=s.recipe_id where s.user_id=p.id and not r.rights_suspended and (r.visibility='public' and (r.user_id is null or private.can_view_member(r.user_id)) or own and r.user_id=viewer) order by s.created_at desc limit 100)x),'[]'::jsonb));end if;
 result:=result||jsonb_build_object('comments',coalesce((select jsonb_agg(to_jsonb(x)) from (
  select c.id,c.body,c.created_at,'recipe'::text as kind,r.id as target_id,r.title as name_en,r.title_ar as name_ar from public.comments c join public.recipes r on r.id=c.recipe_id where c.user_id=p.id and not c.is_hidden and not r.rights_suspended and (r.visibility='public' and private.can_view_member(r.user_id) or own and r.user_id=viewer)
  union all select c.id,c.body,c.created_at,case when c.bean_id is not null then 'bean' else 'product' end,coalesce(b.id,pr.id),coalesce(b.name_en,pr.name_en),coalesce(b.name_ar,pr.name_ar) from public.coffee_comments c left join public.beans b on b.id=c.bean_id left join public.roasted_products pr on pr.id=c.product_id where c.user_id=p.id and (own or b.is_published and not b.requires_review or not pr.requires_review)
  union all select v.id,v.review_text,v.created_at,'recipe',r.id,r.title,r.title_ar from public.recipe_reviews v join public.recipes r on r.id=v.recipe_id where v.user_id=p.id and not r.rights_suspended and v.review_text is not null and (r.visibility='public' and private.can_view_member(r.user_id) or own and r.user_id=viewer)
  union all select v.id,v.review,v.created_at,'recipe',r.id,r.title,r.title_ar from public.recipe_ratings v join public.recipes r on r.id=v.recipe_id where v.user_id=p.id and not r.rights_suspended and v.review is not null and (r.visibility='public' and private.can_view_member(r.user_id) or own and r.user_id=viewer)
  union all select v.id,v.review_text,v.created_at,'product',pr.id,pr.name_en,pr.name_ar from public.bean_reviews v join public.roasted_products pr on pr.id=v.roasted_product_id where v.user_id=p.id and v.review_text is not null and (own or not pr.requires_review)
  order by created_at desc limit 100
 )x),'[]'::jsonb));return result;
end $function$

;
notify pgrst, 'reload schema';
