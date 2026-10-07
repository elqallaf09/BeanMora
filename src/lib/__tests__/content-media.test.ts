import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { contentMediaPath, resolveContentMedia } from '../content-media';
const project = 'https://project.supabase.co';
it('only resolves private content buckets on the configured project', () => {
  expect(
    contentMediaPath(
      project + '/storage/v1/object/public/post-media/owner/file.jpg',
      project,
    ),
  ).toEqual({ bucket: 'post-media', path: 'owner/file.jpg' });
  expect(
    contentMediaPath(
      'https://evil.invalid/storage/v1/object/public/post-media/owner/file.jpg',
      project,
    ),
  ).toBeNull();
  expect(
    contentMediaPath('storage://recipe-images/owner/file.jpg', project)?.bucket,
  ).toBe('recipe-images');
  expect(
    contentMediaPath('storage://recipe-images/owner/%2e%2e/file.jpg', project),
  ).toBeNull();
});
it('does not fall back to a public URL after authorization failure', async () => {
  const createSignedUrl = vi
    .fn()
    .mockResolvedValue({ data: null, error: new Error('denied') });
  const db = {
    storage: { from: () => ({ createSignedUrl }) },
  } as unknown as SupabaseClient;
  expect(
    await resolveContentMedia(
      db,
      project + '/storage/v1/object/public/recipe-videos/owner/file.mp4',
      project,
    ),
  ).toBeNull();
  expect(createSignedUrl).toHaveBeenCalledWith('owner/file.mp4', 60);
});
