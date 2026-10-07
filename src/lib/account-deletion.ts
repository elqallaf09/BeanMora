import type { SupabaseClient } from '@supabase/supabase-js';

// All user uploads in these buckets use {auth.uid()}/... (migration 11).
const accountBuckets = [
  'avatars',
  'bean-images',
  'recipe-images',
  'recipe-videos',
  'roaster-logos',
  'post-media',
];

/** Remove Storage files through its API, then atomically delete only the caller. */
export async function deleteCurrentAccount(
  client: SupabaseClient,
): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  const owner = data.user?.id;
  if (!owner) throw new Error('ACCOUNT_SIGN_IN_REQUIRED');

  for (const bucket of accountBuckets) {
    const files: string[] = [];
    const folders = [owner];
    let inspected = 0;
    for (const folder of folders) {
      for (let offset = 0; ; offset += 100) {
        const { data: entries, error: listError } = await client.storage
          .from(bucket)
          .list(folder, {
            limit: 100,
            offset,
            sortBy: { column: 'name', order: 'asc' },
          });
        if (listError) throw listError;
        if (!entries) throw new Error('ACCOUNT_MEDIA_UNAVAILABLE');
        for (const entry of entries) {
          // Reject unexpected paths; never delete outside this account's folder.
          if (
            !entry.name ||
            entry.name === '.' ||
            entry.name === '..' ||
            /[\\/]/.test(entry.name)
          )
            throw new Error('ACCOUNT_MEDIA_PATH');
          if (++inspected > 10000) throw new Error('ACCOUNT_MEDIA_LIMIT');
          const path = folder + '/' + entry.name;
          if (entry.id) files.push(path);
          else folders.push(path);
        }
        if (entries.length < 100) break;
      }
    }
    // Finish pagination before removal so shifted offsets cannot skip files.
    for (let start = 0; start < files.length; start += 100) {
      const { error: removeError } = await client.storage
        .from(bucket)
        .remove(files.slice(start, start + 100));
      if (removeError) throw removeError;
    }
  }

  const { data: current, error: identityError } = await client.auth.getUser();
  if (identityError) throw identityError;
  if (current.user?.id !== owner) throw new Error('ACCOUNT_CHANGED');
  const { error: deleteError } = await client.rpc('delete_own_account');
  if (deleteError) throw deleteError;
  return owner;
}
