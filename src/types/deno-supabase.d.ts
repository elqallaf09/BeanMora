// Edge Function integration tests import the real handler into the Node test
// suite. Resolve its pinned Deno type import to the same locked npm package;
// production continues to use Deno's npm: specifier unchanged.
declare module 'npm:@supabase/supabase-js@2.57.4' {
  export * from '@supabase/supabase-js';
}
