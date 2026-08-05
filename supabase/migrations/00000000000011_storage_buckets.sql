-- BeanMora — 11: storage buckets + RLS
--
-- Convention: user-owned buckets store objects under `${auth.uid()}/...` so
-- policies can check ownership from the path itself via storage.foldername.
-- Public buckets (bean-images, roaster-logos) are world-readable but writes
-- are still restricted to the content owner or admins, mirroring the table
-- policies for beans/roasters. Size/type limits are enforced both here
-- (bucket-level) and in the upload UI.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('bean-images', 'bean-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('recipe-images', 'recipe-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('recipe-videos', 'recipe-videos', true, 52428800, array['video/mp4', 'video/webm']),
  ('roaster-logos', 'roaster-logos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('post-media', 'post-media', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
on conflict (id) do nothing;

-- avatars: path = "{user_id}/avatar.ext" — owner-only write, public read.
create policy "avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users replace their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- recipe-images / recipe-videos: path = "{user_id}/{recipe_id}/file.ext"
create policy "recipe images are publicly readable"
  on storage.objects for select
  using (bucket_id in ('recipe-images', 'recipe-videos'));

create policy "users upload media for their own recipes"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('recipe-images', 'recipe-videos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users manage media for their own recipes"
  on storage.objects for update
  to authenticated
  using (bucket_id in ('recipe-images', 'recipe-videos') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('recipe-images', 'recipe-videos') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete media for their own recipes"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('recipe-images', 'recipe-videos') and (storage.foldername(name))[1] = auth.uid()::text);

-- post-media: path = "{user_id}/{post_id}/file.ext"
create policy "post media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "users upload their own post media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete their own post media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- bean-images / roaster-logos: path = "{user_id}/{bean_or_roaster_id}/file.ext"
-- Any authenticated user may contribute a bean photo (matches the beans
-- table policy allowing authenticated inserts); admins can manage all.
create policy "bean and roaster images are publicly readable"
  on storage.objects for select
  using (bucket_id in ('bean-images', 'roaster-logos'));

create policy "authenticated users upload bean or roaster images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('bean-images', 'roaster-logos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "uploaders manage their own bean or roaster images"
  on storage.objects for update
  to authenticated
  using (bucket_id in ('bean-images', 'roaster-logos') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('bean-images', 'roaster-logos') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "uploaders delete their own bean or roaster images"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('bean-images', 'roaster-logos') and (storage.foldername(name))[1] = auth.uid()::text);
