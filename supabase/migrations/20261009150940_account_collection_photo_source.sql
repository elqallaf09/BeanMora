-- Collection covers and provenance must come from the same approved image.
-- Existing collection/follower/privacy gates remain unchanged.
do $photos$
declare definition text:=pg_get_functiondef('public.get_member_profile(text)'::regprocedure);
begin
 if strpos(definition,$old0$coalesce(b.image_url,r.image_url) as image_url,coalesce(b.image_usage_status,r.image_usage_status) as image_usage_status$old0$)=0 then raise exception 'PROFILE_IMAGE_PROJECTION_DRIFT';end if;
 definition:=replace(definition,$old0$coalesce(b.image_url,r.image_url) as image_url,coalesce(b.image_usage_status,r.image_usage_status) as image_usage_status$old0$,$new0$photo.url as image_url,photo.image_usage_status$new0$);
 if strpos(definition,$old1$left join public.roasted_products r on r.id=i.roasted_product_id where i.user_id=p.id$old1$)=0 then raise exception 'PROFILE_IMAGE_PROJECTION_DRIFT';end if;
 definition:=replace(definition,$old1$left join public.roasted_products r on r.id=i.roasted_product_id where i.user_id=p.id$old1$,$new1$left join public.roasted_products r on r.id=i.roasted_product_id
 left join lateral (select media.url,media.image_usage_status from (
  select b.image_url as url,b.image_usage_status,0 as priority
  union all select bi.url,bi.image_usage_status,1+bi.position from public.bean_images bi where bi.bean_id=b.id
  union all select r.image_url,r.image_usage_status,10000 where own or not r.requires_review
 )media where media.url is not null and media.image_usage_status in ('source_linked','rights_confirmed') order by media.priority limit 1) photo on true
 where i.user_id=p.id$new1$);
 if strpos(definition,$old2$m.image_url,m.image_usage_status from public.user_equipment$old2$)=0 then raise exception 'PROFILE_IMAGE_PROJECTION_DRIFT';end if;
 definition:=replace(definition,$old2$m.image_url,m.image_usage_status from public.user_equipment$old2$,$new2$case when not m.requires_review then m.image_url end as image_url,case when not m.requires_review then m.image_usage_status end as image_usage_status from public.user_equipment$new2$);
 execute definition;
end $photos$;
