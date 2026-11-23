import type { createClient as supabaseCreateClient } from 'npm:@supabase/supabase-js@2.57.4';
import { searchAssistantCatalog } from '../_shared/assistant-catalog.ts';
import type { AssistantDocument } from '../_shared/coffee-assistant.ts';
import { converse, parseConversationInput } from './service.ts';
import { openAIModel } from './model.ts';
import { coffeeAssistantConfig } from './config.ts';
import { publicAssistantFailure } from './errors.ts';
import { boundedConversationJson } from './request.ts';
import { COFFEE_CONSENT_API, COFFEE_CONSENT_HEADER, COFFEE_CONSENT_POLICY, CoffeeConsentRequired, requireCoffeeConsent, type ConsentReceipt } from './consent.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type, x-coffee-consent, x-coffee-consent-expected',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
};
// A consent write carries its choice in headers only. Native iOS fetch and some
// proxies attach an empty stream (Content-Length: 0) to a body-less PUT, so a
// null check alone rejects real clients; accept zero bytes, refuse any content.
async function emptyBody(request: Request): Promise<boolean> {
  if (request.body === null) return true;
  const length = request.headers.get('content-length');
  if (length !== null && length.trim() !== '0') return false;
  const reader = request.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return true;
      if (value && value.byteLength > 0) return false;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export function createCoffeeAssistantHandler(createClient: typeof supabaseCreateClient, env: (name: string) => string | undefined, fetcher: typeof fetch) {
  return async (request: Request) => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const config = coffeeAssistantConfig(env);
    const availability = (allowed: boolean, receipt?: ConsentReceipt | null) => reply({
      status: 'ok', api_contract: COFFEE_CONSENT_API, conversation_enabled: config.enabled && allowed && receipt?.choice === 'allow',
      authentication_required: true, consent_policy: COFFEE_CONSENT_POLICY, consent_choice: receipt?.choice ?? 'unset',
      consent_available: config.enabled && allowed, ...(receipt ? { consent_generation: receipt.generation } : {}),
    });
    if (!['POST', 'GET', 'PUT'].includes(request.method)) return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);
    const authorization = request.headers.get('authorization') ?? '';
    if (!/^Bearer \S+$/i.test(authorization)) return request.method === 'GET' ? availability(false) : reply({ error: 'SIGN_IN_REQUIRED' }, 401);
    const url = env('SUPABASE_URL') ?? '';
    const anonKey = env('SUPABASE_ANON_KEY') ?? '';
    if (!url || !anonKey) return reply({ error: 'SERVICE_UNAVAILABLE' }, 503);
    const member = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    // verify_jwt may be disabled at the gateway for asymmetric Auth keys;
    // this server-side check is mandatory and never trusts a client user ID.
    const { data: { user }, error } = await member.auth.getUser(authorization.slice(7));
    if (error || !user || user.is_anonymous) return request.method === 'GET' ? availability(false) : reply({ error: 'SIGN_IN_REQUIRED' }, 401);
    const allowed = !config.pilotUserIds || config.pilotUserIds.includes(user.id);
    const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) return reply({ error: 'SERVICE_UNAVAILABLE' }, 503);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    async function consent(): Promise<ConsentReceipt | null> {
      const { data, error } = await admin.from('coffee_assistant_consents').select('choice,generation')
        .eq('user_id', user!.id).eq('policy', COFFEE_CONSENT_POLICY).abortSignal(AbortSignal.timeout(3000)).maybeSingle();
      if (error) throw new Error('CONSENT_UNAVAILABLE');
      if (data && (data.choice === 'allow' || data.choice === 'guide') && typeof data.generation === 'string') return { choice: data.choice, generation: data.generation };
      return null;
    }
    const generation = request.headers.get(COFFEE_CONSENT_HEADER);
    try {
      if (request.method === 'PUT') {
        const choice = request.headers.get(COFFEE_CONSENT_HEADER);
        if (!['allow', 'guide'].some(value => choice === COFFEE_CONSENT_POLICY + ':' + value) || !(await emptyBody(request)))
          return reply({ error: 'INVALID_INPUT' }, 400);
        const decision = choice === COFFEE_CONSENT_POLICY + ':allow' ? 'allow' : 'guide';
        if (decision === 'allow' && (!allowed || !config.enabled)) return reply({ error: 'AI_PILOT_ONLY' }, 403);
        const receipt = { choice: decision, generation: crypto.randomUUID() } as const;
        const table = admin.from('coffee_assistant_consents');
        const values = { user_id: user.id, policy: COFFEE_CONSENT_POLICY, ...receipt, decided_at: new Date().toISOString() };
        const expected = request.headers.get('x-coffee-consent-expected');
        const deadline = AbortSignal.timeout(3000);
        if (decision === 'guide') {
          const { error: saveError } = await table.upsert(values, { onConflict: 'user_id,policy' }).abortSignal(deadline);
          if (saveError) throw new Error('CONSENT_UNAVAILABLE');
        } else if (expected === 'unset') {
          const { error: saveError } = await table.insert(values).abortSignal(deadline);
          if (saveError?.code === '23505') return reply({ error: 'CONSENT_CHANGED' }, 409);
          if (saveError) throw new Error('CONSENT_UNAVAILABLE');
        } else {
          if (!expected || !/^[0-9a-f-]{36}$/i.test(expected)) return reply({ error: 'INVALID_INPUT' }, 400);
          const { data, error: saveError } = await table.update(values).eq('user_id', user.id).eq('policy', COFFEE_CONSENT_POLICY)
            .eq('generation', expected).select('generation').abortSignal(deadline).maybeSingle();
          if (saveError) throw new Error('CONSENT_UNAVAILABLE');
          if (!data) return reply({ error: 'CONSENT_CHANGED' }, 409);
        }
        return availability(allowed, receipt);
      }
      if (request.method === 'GET') return availability(allowed, await consent());
      if (!allowed) return reply({ error: 'AI_PILOT_ONLY' }, 403);
      if (!generation) throw new CoffeeConsentRequired(); // legacy: never read its question/history
      requireCoffeeConsent(await consent(), generation);
    } catch (error) {
      if (error instanceof CoffeeConsentRequired) return reply({ error: 'COFFEE_CONSENT_REQUIRED' }, 403);
      return reply({ error: 'SERVICE_UNAVAILABLE' }, 503);
    }
    if (!config.enabled || !config.apiKey || !config.model) return reply({ mode: 'catalog', notice: 'not_configured' });
    let input;
    try { input = parseConversationInput(await boundedConversationJson(request)); }
    catch { return reply({ error: 'INVALID_INPUT' }, 400); }
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
        model: openAIModel(config.apiKey, config.model, async (...args) => {
          // Check again immediately before each external dispatch. A revoked or
          // replaced receipt also invalidates an already-started conversation.
          requireCoffeeConsent(await consent(), generation);
          return fetcher(...args);
        }, {
          organizationId: config.organizationId, projectId: config.projectId, reasoningEffort: config.reasoningEffort,
          onStart: async usage => {
            requireCoffeeConsent(await consent(), generation);
            const { error: startError } = await admin.from('coffee_assistant_api_usage')
              .insert({ request_id: requestId, feature: 'coffee_expert', ...usage })
              .abortSignal(AbortSignal.timeout(3000));
            if (startError) throw new Error('METERING_UNAVAILABLE');
          },
          onUsage: async usage => {
            const { error: usageError } = await admin.from('coffee_assistant_api_usage')
              .update(usage).eq('request_id', requestId).eq('operation', usage.operation).select('id')
              .abortSignal(AbortSignal.timeout(3000)).single();
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
      if (error instanceof CoffeeConsentRequired) return reply({ error: 'COFFEE_CONSENT_REQUIRED' }, 403);
      const failure = publicAssistantFailure(error);
      return reply(failure.body, failure.status);
    }
  };
}
