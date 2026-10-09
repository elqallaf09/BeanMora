-- Replace the unreleased six-argument overload with one unambiguous RPC.
drop function public.save_community_post(uuid,text,text,text,text,uuid);
create or replace function public.save_community_post(p_id uuid,p_body text,p_language text,p_media_path text default null,p_media_type text default null,p_brew_id uuid default null,p_replace_media boolean default true)
returns uuid language plpgsql security invoker set search_path='' as $$
declare owner uuid:=(select auth.uid()); existing public.posts; b public.brew_logs;
begin
 if owner is null or not coalesce(private.social_member_active(owner),false) or coalesce((select auth.jwt()->>'is_anonymous'),'true')<>'false' then raise exception 'MEMBER_REQUIRED' using errcode='42501';end if;
 if length(trim(coalesce(p_body,'')))>3000 then raise exception 'POST_LENGTH';end if;
 select * into existing from public.posts where id=p_id;
 if found and existing.user_id<>owner then raise exception 'POST_OWNER_REQUIRED' using errcode='42501';end if;
 if existing.id is not null and not p_replace_media then
  -- A text-only edit keeps every previously uploaded image/video, including legacy posts.
  update public.posts set body=nullif(trim(p_body),''),content_language=p_language where id=p_id and user_id=owner;
  return p_id;
 end if;
 if p_media_path is not null and (p_media_path not like owner::text||'/%' or p_media_type not in ('image','video') or not exists(select 1 from storage.objects where bucket_id='post-media' and name=p_media_path)) then raise exception 'POST_MEDIA_INVALID';end if;
 if p_brew_id is not null then
  select * into b from public.brew_logs where id=p_brew_id and user_id=owner;
  if not found then raise exception 'BREW_OWNER_REQUIRED';end if;
 end if;
 if existing.id is not null then
  -- Editing commentary/media preserves the genuine brew/roast facts.
  update public.posts set body=nullif(trim(p_body),''),content_language=p_language,
   primary_media_path=p_media_path,content_type=coalesce(p_media_type,'topic') where id=p_id and user_id=owner;
 else
  insert into public.posts(id,user_id,body,content_language,content_type,primary_media_path,visibility,recipe_id,brew_log_id,bean_id,brew_method,dose_grams,water_grams,actual_time_seconds,outcome)
   values(p_id,owner,nullif(trim(p_body),''),p_language,coalesce(p_media_type,'topic'),p_media_path,'public',b.recipe_id,b.id,b.bean_id,b.brew_method,b.dose_grams,b.water_grams,b.actual_time_seconds,b.outcome_submission->>'outcome');
 end if;
 delete from public.post_media where post_id=p_id;
 if p_media_path is not null then insert into public.post_media(post_id,url,media_type) values(p_id,'storage://post-media/'||p_media_path,p_media_type);end if;
 return p_id;
end $$;
revoke all on function public.save_community_post(uuid,text,text,text,text,uuid,boolean) from public,anon;
grant execute on function public.save_community_post(uuid,text,text,text,text,uuid,boolean) to authenticated;
notify pgrst,'reload schema';
