import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { createCoffeeAssistantHandler } from './handler.ts';

Deno.serve(createCoffeeAssistantHandler(createClient, name => Deno.env.get(name), fetch));
