-- Real PostgreSQL permission/behavior checks. Every fixture rolls back.
begin;
do $$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); moderator uuid:=gen_random_uuid(); guest uuid:=gen_random_uuid();
 conversation uuid; second_conversation uuid; message_id uuid:=gen_random_uuid(); expired_id uuid:=gen_random_uuid(); voice_id uuid:=gen_random_uuid(); test_post uuid:=gen_random_uuid(); photo_id uuid:=gen_random_uuid();
 story_id uuid:=gen_random_uuid(); bad_one uuid:=gen_random_uuid(); bad_two uuid:=gen_random_uuid(); path text; voice text; failure boolean; result text;
begin
 insert into auth.users(id,email,is_anonymous) values
  (a,'social_a_'||a||'@example.invalid',false),(b,'social_b_'||b||'@example.invalid',false),
  (outsider,'social_c_'||outsider||'@example.invalid',false),(moderator,'social_mod_'||moderator||'@example.invalid',false),(guest,null,true);
 insert into public.user_roles(user_id,role) values(moderator,'moderator');
 update public.profiles set is_private=true where id=b;
 path:=a::text||'/'||photo_id::text||'.jpg';
 insert into storage.objects(bucket_id,name,owner_id,metadata) values
  ('post-media',path,a::text,'{"mimetype":"image/jpeg"}'),('profile-gallery',path,a::text,'{"mimetype":"image/jpeg"}'),
  ('coffee-stories',a||'/'||story_id||'.jpg',a::text,'{"mimetype":"image/jpeg"}'),
  ('coffee-stories',a||'/'||bad_one||'.jpg',a::text,'{"mimetype":"image/jpeg"}'),
  ('coffee-stories',a||'/'||bad_two||'.jpg',a::text,'{"mimetype":"image/jpeg"}');
 set local role authenticated;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','is_anonymous',false)::text,true);
 assert public.can_direct_message(b),'Default member messaging should be open';
 conversation:=public.start_direct_conversation(b); second_conversation:=public.start_direct_conversation(b);
 assert conversation=second_conversation,'Starting twice must not duplicate a conversation';
 insert into public.direct_messages(id,conversation_id,sender_id,kind,body) values(message_id,conversation,a,'text','A coffee question');
 assert (select count(*) from public.direct_messages where id=message_id)=1,'Sender should see own message';
 assert (select expires_at=created_at+interval '24 hours' from public.direct_messages where id=message_id),'Messages live exactly 24 hours from server send time';
 insert into public.direct_messages(id,conversation_id,sender_id,kind,body,created_at,expires_at) values(expired_id,conversation,a,'text','Expired fixture',now()+interval '1 year',now()+interval '2 years');
 assert (select created_at=now() and expires_at=now()+interval '24 hours' from public.direct_messages where id=expired_id),'Client-supplied timestamps cannot extend retention';
 reset role;update public.direct_messages set expires_at=now()-interval '1 second' where id=expired_id;set local role authenticated;
 assert not exists(select 1 from public.direct_messages where id=expired_id),'Sender cannot read expired text';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated','is_anonymous',false)::text,true);
 assert (select count(*) from public.direct_messages where id=message_id)=0,'Outsider cannot read messages';
 assert (select count(*) from public.direct_conversations where id=conversation)=0,'Outsider cannot read thread';
 failure:=false;begin insert into public.direct_messages(id,conversation_id,sender_id,kind,body) values(gen_random_uuid(),conversation,outsider,'text','Intrusion');exception when insufficient_privilege then failure:=true;end;assert failure,'Outsider cannot inject a message';
 failure:=false;begin perform public.review_coffee_story(story_id,true,'');exception when insufficient_privilege then failure:=true;end;assert failure,'Member cannot moderate stories';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','is_anonymous',false)::text,true);
 assert (select count(*) from public.direct_messages where id=message_id)=1,'Receiver sees messages';
 assert not exists(select 1 from public.direct_messages where id=expired_id),'Receiver cannot read expired text';
 insert into public.direct_message_preferences(user_id,audience) values(b,'off');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','is_anonymous',false)::text,true);
 assert not public.can_direct_message(b),'Off blocks an existing thread';
 failure:=false;begin insert into public.direct_messages(id,conversation_id,sender_id,kind,body) values(gen_random_uuid(),conversation,a,'text','Blocked by settings');exception when insufficient_privilege then failure:=true;end;assert failure,'Off must reject sends at database';
 assert (select count(*) from public.direct_messages where id=message_id)=1,'Off preserves history';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','is_anonymous',false)::text,true);
 update public.direct_message_preferences set audience='followers' where user_id=b;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','is_anonymous',false)::text,true);
 assert not public.can_direct_message(b),'Nonfollowers are rejected';
 insert into public.follows(follower_id,following_id) values(a,b);
 assert not public.can_direct_message(b),'Pending private follow does not authorize messages';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','is_anonymous',false)::text,true);
 update public.follows set status='accepted' where follower_id=a and following_id=b;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','is_anonymous',false)::text,true);
 assert public.can_direct_message(b),'Accepted receiver follower is allowed';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','is_anonymous',false)::text,true);
 insert into public.blocks(blocker_id,blocked_id) values(b,a);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','is_anonymous',false)::text,true);
 assert not public.can_direct_message(b),'Receiver blocking sender is enforced despite private block list';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','is_anonymous',false)::text,true);
 delete from public.blocks where blocker_id=b and blocked_id=a;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','is_anonymous',false)::text,true);
 assert public.can_direct_message(b),'Unblock restores eligible sending';

 -- Actual audio verification is required, beyond the numeric 60-second cap.
 voice:=a::text||'/'||conversation::text||'/'||gen_random_uuid()::text||'.m4a';
 reset role;
 insert into storage.objects(bucket_id,name,owner_id,metadata) values('direct-audio',voice,a::text,'{"mimetype":"audio/mp4"}');
 set local role authenticated;
 failure:=false;begin insert into public.direct_messages(id,conversation_id,sender_id,kind,audio_path,duration_seconds) values(gen_random_uuid(),conversation,a,'audio',voice,30);exception when insufficient_privilege then failure:=true;end;assert failure,'Unverified audio is rejected';
 failure:=false;begin perform public.record_direct_voice_check(a,voice,30,repeat('0',64),null);exception when insufficient_privilege then failure:=true;end;assert failure,'Member cannot manufacture server voice validation';
 reset role;
 failure:=false;begin perform public.record_direct_voice_check(a,voice,30,repeat('0',64),gen_random_uuid());exception when others then failure:=true;end;assert failure,'Download identity mismatch cannot create a voice proof';
 perform public.record_direct_voice_check(a,voice,30,repeat('0',64),public.direct_audio_object_identity(a,voice));set local role authenticated;
 insert into public.direct_messages(id,conversation_id,sender_id,kind,audio_path,duration_seconds) values(voice_id,conversation,a,'audio',voice,30);
 failure:=false;begin insert into public.direct_messages(id,conversation_id,sender_id,kind,audio_path,duration_seconds) values(gen_random_uuid(),conversation,a,'audio',voice,61);exception when insufficient_privilege or check_violation then failure:=true;end;assert failure,'Voice over a minute is rejected';
 failure:=false;begin insert into public.direct_messages(id,conversation_id,sender_id,kind,body) values(gen_random_uuid(),conversation,a,'text',null);exception when check_violation then failure:=true;end;assert failure,'NULL cannot bypass message payload checks';
 failure:=false;begin perform public.purge_expired_direct_messages();exception when insufficient_privilege then failure:=true;end;assert failure,'Members cannot call server cleanup';
 reset role;
 update public.direct_messages set expires_at=now()-interval '1 second' where id=voice_id;
 update storage.objects set created_at=now()-interval '25 hours' where bucket_id='direct-audio' and name=voice;
 set local role authenticated;
 assert not exists(select 1 from public.direct_messages where id=voice_id),'Expired voice message is invisible';
 assert not exists(select 1 from storage.objects where bucket_id='direct-audio' and name=voice),'Expired voice is inaccessible even to its sender';
 failure:=false;begin insert into public.direct_messages(id,conversation_id,sender_id,kind,audio_path,duration_seconds) values(gen_random_uuid(),conversation,a,'audio',voice,30);exception when insufficient_privilege then failure:=true;end;assert failure,'Expired audio cannot be replayed into new messages';
 failure:=false;begin perform public.expired_direct_audio_for_owner(a);exception when insufficient_privilege then failure:=true;end;assert failure,'Members cannot request another owner’s expired paths';
 reset role;
 assert voice=any(array(select public.expired_direct_audio_for_owner(a))),'Account cleanup locates its hidden expired audio';
 assert not exists(select 1 from public.expired_direct_audio_for_owner(b)),'Account cleanup stays within the verified owner';
 assert voice=any(array(select public.purge_expired_direct_messages())),'Expired audio is queued for physical Storage API deletion';
 assert not exists(select 1 from public.direct_messages where id in (expired_id,voice_id)),'Maintenance deletes expired text and audio rows';
 assert exists(select 1 from public.direct_messages where id=message_id),'Maintenance keeps current messages';
 assert exists(select 1 from private.direct_audio_cleanup q where q.path=voice),'Failed Storage cleanup can retry the queued path';
 perform public.complete_direct_audio_cleanup(array[voice]);
 assert exists(select 1 from private.direct_audio_cleanup q where q.path=voice),'Old signed voice URLs reserve their paths for one minute';
 -- Simulate the Storage API only for metadata-only fixtures in this rollback.
 perform set_config('storage.allow_delete_query','true',true);
 delete from storage.objects where bucket_id='direct-audio' and name=voice;
 perform set_config('storage.allow_delete_query','false',true);
 set local role authenticated;
 failure:=false;begin insert into storage.objects(bucket_id,name,owner_id,metadata) values('direct-audio',voice,a::text,'{"mimetype":"audio/mp4"}');exception when insufficient_privilege then failure:=true;end;assert failure,'Deleted queued audio cannot be replaced at the same signed path';
 reset role;update private.direct_audio_cleanup q set enqueued_at=now()-interval '61 seconds' where q.path=voice;
 perform public.complete_direct_audio_cleanup(array[voice]);
 assert not exists(select 1 from private.direct_audio_cleanup q where q.path=voice),'Successful cleanup acknowledges the queue';
 set local role authenticated;
 -- Active audio is also tied to its object, without relying on a filename.
 insert into storage.objects(bucket_id,name,owner_id,metadata) values('direct-audio',voice,a::text,'{"mimetype":"audio/mp4"}');
 reset role;perform public.record_direct_voice_check(a,voice,30,repeat('0',64),public.direct_audio_object_identity(a,voice));set local role authenticated;
 insert into public.direct_messages(id,conversation_id,sender_id,kind,audio_path,duration_seconds,audio_object_id) values(voice_id,conversation,a,'audio',voice,30,gen_random_uuid());
 reset role;assert (select audio_object_id=public.direct_audio_object_identity(a,voice) from public.direct_messages where id=voice_id),'Server overrides a client-supplied audio object ID';set local role authenticated;
 -- Simulate the Storage API only for metadata-only fixtures in this rollback.
 perform set_config('storage.allow_delete_query','true',true);
 delete from storage.objects where bucket_id='direct-audio' and name=voice;
 perform set_config('storage.allow_delete_query','false',true);
 assert not exists(select 1 from public.direct_messages where id=voice_id),'Deleting the exact audio object removes its live message';
 failure:=false;begin insert into storage.objects(bucket_id,name,owner_id,metadata) values('direct-audio',voice,a::text,'{"mimetype":"audio/mp4"}');exception when insufficient_privilege then failure:=true;end;assert failure,'A sent voice file cannot be swapped after validation';

 perform public.save_community_post(test_post,'','en',path,'image',null);
 assert (select content_type='image' and brew_method is null and body is null from public.posts where id=test_post),'Photo-only post does not invent espresso or filler text';
 perform public.save_community_post(test_post,'Updated coffee photo','en',path,'image',null);
 assert (select body='Updated coffee photo' from public.posts where id=test_post),'Owner edits post';
 -- Legacy multiple-media entries are retained on commentary-only edits.
 insert into public.post_media(post_id,url,media_type) values(test_post,'https://fixture.example.invalid/coffee.jpg','image');
 update public.posts set primary_media_path=null where id=test_post;
 perform public.save_community_post(test_post,'Preserved legacy gallery','en',null,null,null,false);
 assert (select count(*) from public.post_media where post_id=test_post)=2,'Text-only edit preserves all legacy media';
 perform public.save_community_post(test_post,'Removed the media explicitly','en',null,null,null,true);
 assert not exists(select 1 from public.post_media where post_id=test_post),'Explicit removal clears post media';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated','is_anonymous',false)::text,true);
 failure:=false;begin perform public.save_community_post(test_post,'Hijack','en',null,null,null);exception when insufficient_privilege then failure:=true;end;assert failure,'Other member cannot edit post';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','is_anonymous',false)::text,true);
 perform public.save_profile_photo(photo_id,'extraction',path,'Coffee extraction');
 update public.profile_photos set caption='My corner',kind='corner' where id=photo_id;
 assert (select caption='My corner' and kind='corner' from public.profile_photos where id=photo_id),'Gallery caption and kind editable by owner';
 failure:=false;begin update public.profile_photos set image_path=b::text||'/replacement.jpg' where id=photo_id;exception when others then failure:=true;end;assert failure,'Gallery replacement requires an owned file';
 failure:=false;begin update public.profile_photos set user_id=b where id=photo_id;exception when others then failure:=true;end;assert failure,'Gallery edit cannot reassign owner';
 delete from public.profile_photos where id=photo_id;
 assert not exists(select 1 from public.profile_photos where id=photo_id),'Owner deletes gallery photo';

 insert into public.coffee_stories(id,user_id,media_path,media_type,category,rights_confirmed) values(story_id,a,a||'/'||story_id||'.jpg','image','coffee',true);
 failure:=false;begin insert into public.coffee_stories(id,user_id,media_path,media_type,category,rights_confirmed,status) values(bad_one,a,a||'/'||bad_one||'.jpg','image','coffee',true,'approved');exception when insufficient_privilege then failure:=true;end;assert failure,'Owner cannot approve story';
 perform set_config('request.jwt.claims','{"role":"anon","is_anonymous":true}',true);
 set local role anon;
 assert not exists(select 1 from public.coffee_stories where id=story_id),'Pending story is invisible to guests';
 failure:=false;begin perform 1 from public.direct_messages;exception when insufficient_privilege then failure:=true;end;assert failure,'Public guest has no message table privilege';
 set local role authenticated;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',moderator,'role','authenticated','is_anonymous',false)::text,true);
 result:=public.review_coffee_story(story_id,true,'');assert result='approved','Moderator approves';
 assert (select expires_at between now()+interval '23 hours 59 minutes' and now()+interval '24 hours 1 minute' from public.coffee_stories where id=story_id),'Story has 24-hour visibility after approval';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated','is_anonymous',false)::text,true);
 assert exists(select 1 from public.coffee_stories where id=story_id),'Approved public story is readable';
 reset role;update public.coffee_stories set expires_at=now()-interval '1 second' where id=story_id;set local role authenticated;
 assert not exists(select 1 from public.coffee_stories where id=story_id),'Expired story is invisible';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','is_anonymous',false)::text,true);
 insert into public.coffee_stories(id,user_id,media_path,media_type,category,rights_confirmed) values
  (bad_one,a,a||'/'||bad_one||'.jpg','image','coffee',true),(bad_two,a,a||'/'||bad_two||'.jpg','image','coffee',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',moderator,'role','authenticated','is_anonymous',false)::text,true);
 result:=public.review_coffee_story(bad_one,false,'Confirmed non-coffee content');assert result='warned','First off-topic violation warns';
 result:=public.review_coffee_story(bad_one,false,'Retry');assert result='rejected','Review retry is idempotent';
 assert (select strikes=1 and banned_at is null from public.social_sanctions where user_id=a),'First rejection does not ban or double-count';
 result:=public.review_coffee_story(bad_two,false,'Repeated non-coffee content');assert result='banned','Second confirmed violation bans community';
 assert (select strikes=2 and banned_at is not null from public.social_sanctions where user_id=a),'Second rejection records suspension';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','is_anonymous',false)::text,true);
 assert (select count(*) from public.notifications where user_id=a and type='story_warning')=1,'First violation sends one warning';
 assert (select count(*) from public.notifications where user_id=a and type='community_suspended')=1,'Second violation sends suspension notification';
 assert not public.can_direct_message(b),'Suspended member cannot message';
 failure:=false;begin insert into public.posts(user_id,body) values(a,'Blocked by suspension');exception when insufficient_privilege then failure:=true;end;assert failure,'Suspension blocks posting';
 delete from public.posts where id=test_post;
 assert not exists(select 1 from public.post_media where public.post_media.post_id=test_post),'Post deletion removes child media';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',guest,'role','authenticated','is_anonymous',true)::text,true);
 failure:=false;begin perform public.start_direct_conversation(b);exception when insufficient_privilege then failure:=true;end;assert failure,'Anonymous signed-in guest cannot message';
 assert not has_table_privilege('authenticated','public.direct_messages','TRUNCATE'),'Clients cannot truncate messages';
 assert not has_table_privilege('anon','public.direct_messages','SELECT'),'Messages have no public table grant';
 assert not has_table_privilege('authenticated','public.direct_messages','UPDATE'),'Clients cannot extend message expiry';
 assert not has_function_privilege('authenticated','public.authorize_direct_cleanup(text)','EXECUTE'),'Maintenance auth is server-only';
 assert not has_function_privilege('authenticated','private.enqueue_direct_cleanup()','EXECUTE'),'Client cannot enqueue maintenance or obtain its token';
 assert not has_schema_privilege('anon','vault','USAGE'),'Maintenance secrets are not public';
end $$;
rollback;
select 'PASS: private messages, settings, blocks, verified voice, owned posts/gallery, 24-hour message expiry/cleanup, story expiry, warning/suspension and guest boundaries' as verification;
