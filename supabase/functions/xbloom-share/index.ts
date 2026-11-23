import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { createXBloomShareHandler } from './handler.ts';

Deno.serve(createXBloomShareHandler(createClient, name => Deno.env.get(name), fetch));
