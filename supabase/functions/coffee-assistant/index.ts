import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { searchAssistantCatalog } from '../_shared/assistant-catalog.ts';
import type { AssistantDocument } from '../_shared/coffee-assistant.ts';
import { converse, parseConversationInput } from './service.ts';
import { openAIModel } from './model.ts';
import { coffeeAssistantConfig } from './config.ts';
import { publicAssistantFailure } from './errors.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
async function boundedJson(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new Error('INVALID_INPUT');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_INPUT');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32768) throw new Error('INVALID_INPUT');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const all = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(all));
}
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const config = coffeeAssistantConfig(name => Deno.env.get(name));
  const availability = (allowed: boolean) => reply({ status: 'ok', api_contract: 2, conversation_enabled: config.enabled && allowed, authentication_required: true });
  if (request.method === 'GET' && (!config.enabled || !config.pilotUserIds)) return availability(true);
  if (request.method !== 'POST' && request.method !== 'GET') return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);
  const authorization = request.headers.get('authorization') ?? '';
  if (!/^Bearer \S+$/i.test(authorization)) return request.method === 'GET' ? availability(false) : reply({ error: 'SIGN_IN_REQUIRED' }, 401);
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!url || !anonKey) return reply({ error: 'SERVICE_UNAVAILABLE' }, 503);
  const member = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  // verify_jwt may be disabled at the gateway for asymmetric Auth keys;
  // this server-side check is mandatory and never trusts a client user ID.
  const { data: { user }, error } = await member.auth.getUser(authorization.slice(7));
  if (error || !user || user.is_anonymous) return request.method === 'GET' ? availability(false) : reply({ error: 'SIGN_IN_REQUIRED' }, 401);
  const allowed = !config.pilotUserIds || config.pilotUserIds.includes(user.id);
  if (request.method === 'GET') return availability(allowed);
  if (!allowed) return reply({ error: 'AI_PILOT_ONLY' }, 403);
  let input;
  try { input = parseConversationInput(await boundedJson(request)); }
  catch { return reply({ error: 'INVALID_INPUT' }, 400); }
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!config.enabled || !config.apiKey || !config.model) return reply({ mode: 'catalog', notice: 'not_configured' });
  if (!serviceKey) return reply({ error: 'SERVICE_UNAVAILABLE' }, 503);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  // Verify metering before incurring provider charges (including first rollout).
  const { error: ledgerError } = await admin.from('coffee_assistant_api_usage').select('id').limit(1).abortSignal(AbortSignal.timeout(3000));
  if (ledgerError) return reply({ error: 'SERVICE_UNAVAILABLE' }, 503);
  const { data: permitted, error: quotaError } = await admin.rpc('consume_coffee_assistant_quota', { p_user_id: user.id });
  if (quotaError) return reply({ error: 'SERVICE_UNAVAILABLE' }, 503);
  if (!permitted) return reply({ error: 'RATE_LIMITED' }, 429);
  // Catalog retrieval always uses the anonymous public projection, even for members.
  const catalog = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const requestId = crypto.randomUUID();
  try {
    const result = await converse(input, {
      model: openAIModel(config.apiKey, config.model, fetch, {
        organizationId: config.organizationId, projectId: config.projectId, reasoningEffort: config.reasoningEffort,
        onStart: async usage => {
          const { error: startError } = await admin.from('coffee_assistant_api_usage')
            .insert({ request_id: requestId, feature: 'coffee_expert', ...usage })
            .abortSignal(AbortSignal.timeout(3000));
          if (startError) throw new Error('METERING_UNAVAILABLE');
        },
        onUsage: async usage => {
          const { error: usageError } = await admin.from('coffee_assistant_api_usage')
            .update(usage).eq('request_id', requestId).eq('operation', usage.operation).select('id').single()
            .abortSignal(AbortSignal.timeout(3000));
          if (usageError) {
            // Reconciliation aid only. This contains no question, answer, key or user ID.
            console.error(JSON.stringify({ event: 'coffee_assistant_usage_write_failed', request_id: requestId, ...usage }));
            throw new Error('METERING_UNAVAILABLE');
          }
        },
      }),
      search: query => searchAssistantCatalog(catalog, query, AbortSignal.timeout(5000)),
      references: async ids => {
        const { data, error } = await catalog.from('assistant_public_documents').select('*').in('id', ids).abortSignal(AbortSignal.timeout(5000));
        if (error) throw new Error('CATALOG_UNAVAILABLE');
        const documents = (data ?? []) as AssistantDocument[];
        return ids.flatMap(id => documents.filter(document => document.id === id));
      },
    });
    return reply(result);
  } catch (error) {
    // No questions, catalog text, identifiers, tokens or provider responses in logs.
    const failure = publicAssistantFailure(error);
    return reply(failure.body, failure.status);
  }
});
