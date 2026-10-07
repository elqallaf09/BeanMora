import type { SupabaseClient } from '@supabase/supabase-js';
const buckets = new Set(['post-media', 'recipe-images', 'recipe-videos']);
/** Match this project's Storage only. Never send arbitrary URLs to a signer. */
export function contentMediaPath(
  value: string | null | undefined,
  project: string,
) {
  if (!value) return null;
  if (/\/(?:\.|%2e){1,2}(?:\/|%2f|$)/i.test(value) || /%25/i.test(value))
    return null;
  try {
    const url = new URL(value);
    let bucket: string, path: string;
    if (url.protocol === 'storage:') {
      bucket = url.hostname;
      path = decodeURIComponent(url.pathname.slice(1));
    } else {
      if (url.origin !== new URL(project).origin) return null;
      const match = url.pathname.match(
        /^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/,
      );
      if (!match) return null;
      bucket = match[1];
      path = decodeURIComponent(match[2]);
    }
    if (
      !buckets.has(bucket) ||
      !path ||
      path.split('/').some((x) => !x || x === '.' || x === '..') ||
      /[\\\u0000-\u001f]/.test(path)
    )
      return null;
    return { bucket, path };
  } catch {
    return null;
  }
}
export async function resolveContentMedia(
  client: Pick<SupabaseClient, 'storage'>,
  value: string | null | undefined,
  project: string,
): Promise<string | null> {
  const target = contentMediaPath(value, project);
  if (!target) return value?.startsWith('https://') ? value : null;
  // Signed URLs remain capabilities until expiry; never persist them in the DB.
  const { data, error } = await client.storage
    .from(target.bucket)
    .createSignedUrl(target.path, 60);
  return error ? null : (data?.signedUrl ?? null);
}
