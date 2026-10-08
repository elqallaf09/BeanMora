import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.57.4';
import { assistantSearchTerms, type AssistantDocument, type AssistantQuery, type CatalogRate } from './coffee-assistant.ts';

export async function searchAssistantCatalog(client: SupabaseClient, query: AssistantQuery, signal?: AbortSignal) {
  if (query.clarification) return { documents: [] as AssistantDocument[], rates: [] as CatalogRate[] };
  let request=client.rpc('search_coffee_assistant',{p_terms:assistantSearchTerms(query),p_kind:query.kind,p_methods:query.methods,p_category:query.category,p_limit:query.kind==='equipment'?200:60});
  if(signal)request=request.abortSignal(signal);
  let ratesRequest=client.from('catalog_currency_rates').select('currency,kwd_per_unit,observed_at,source_url');
  if(signal)ratesRequest=ratesRequest.abortSignal(signal);
  const [result,rates] = await Promise.all([request,ratesRequest]);
  if(result.error)throw new Error('ASSISTANT_CATALOG_UNAVAILABLE');
  // A missing FX source must never invent a conversion; same-currency offers still work.
  return {documents:(result.data??[]) as AssistantDocument[],rates:(rates.error?[]:rates.data??[]) as CatalogRate[]};
}
