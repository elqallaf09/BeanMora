import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { createCoffeeLabelHandler } from './handler.ts';

Deno.serve(createCoffeeLabelHandler(createClient, name => Deno.env.get(name), fetch));
