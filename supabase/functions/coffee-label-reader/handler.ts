import type { createClient as supabaseCreateClient } from 'npm:@supabase/supabase-js@2.57.4';
import { coffeeAssistantConfig } from '../coffee-assistant/config.ts';
import { classifyProviderFailure, publicAssistantFailure } from '../coffee-assistant/errors.ts';
import { LABEL_API, LABEL_CONSENT_HEADER, LABEL_CONSENT_POLICY, MAX_LABEL_BODY_BYTES, labelImage, labelInstructions, labelSchema, parseLabelReading } from './label.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type, x-label-consent',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const identifier = (value: unknown): string | null => typeof value === 'string' && /^[a-zA-Z0-9_.:/-]{1,200}$/.test(value) ? value : null;
const tokens = (value: unknown): number | null => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;

async function boundedJson(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new Error('INVALID_INPUT');
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_LABEL_BODY_BYTES) throw new Error('INVALID_INPUT');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_INPUT');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_LABEL_BODY_BYTES) throw new Error('INVALID_INPUT');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const all = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(all));
}

/** Reads a coffee bag photo with a vision model. The photo is forwarded to the
 * provider only after explicit, recorded consent and is never stored or logged. */
export function createCoffeeLabelHandler(createClient: typeof supabaseCreateClient, env: (name: string) => string | undefined, fetcher: typeof fetch) {
  return async (request: Request) => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!['POST', 'DELETE'].includes(request.method)) return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);
    const authorization = request.headers.get('authorization') ?? '';
    if (!/^Bearer \S+$/i.test(authorization)) return reply({ error: 'SIGN_IN_REQUIRED' }, 401);
    const url = env('SUPABASE_URL') ?? '', anonKey = env('SUPABASE_ANON_KEY') ?? '', serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) return reply({ error: 'SERVICE_UNAVAILABLE' }, 503);
    const member = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    // verify_jwt may be disabled at the gateway; this check is mandatory.
    const { data: { user }, error } = await member.auth.getUser(authorization.slice(7));
    if (error || !user || user.is_anonymous) return reply({ error: 'SIGN_IN_REQUIRED' }, 401);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const consents = () => admin.from('coffee_assistant_consents');
    const record = (choice: 'allow' | 'guide') => consents().upsert({ user_id: user.id, policy: LABEL_CONSENT_POLICY, choice,
      generation: crypto.randomUUID(), decided_at: new Date().toISOString() }, { onConflict: 'user_id,policy' }).abortSignal(AbortSignal.timeout(3000));

    if (request.method === 'DELETE') {
      const { error: saveError } = await record('guide');
      return saveError ? reply({ error: 'SERVICE_UNAVAILABLE' }, 503) : reply({ status: 'ok', api: LABEL_API, consent: 'withdrawn' });
    }

    const config = coffeeAssistantConfig(env);
    const model = identifier(env('COFFEE_LABEL_MODEL')?.trim() || config.model);
    if (!config.enabled || !config.apiKey || !model) return reply({ error: 'LABEL_AI_DISABLED' }, 503);
    if (config.pilotUserIds && !config.pilotUserIds.includes(user.id)) return reply({ error: 'AI_PILOT_ONLY' }, 403);
    // Never read the photo without this request's explicit permission.
    if (request.headers.get(LABEL_CONSENT_HEADER) !== LABEL_CONSENT_POLICY + ':allow') return reply({ error: 'LABEL_CONSENT_REQUIRED' }, 403);

    let image: string;
    try {
      const body = await boundedJson(request) as { image?: unknown };
      if (typeof body?.image !== 'string' || !labelImage.test(body.image)) throw new Error('INVALID_INPUT');
      image = body.image;
    } catch { return reply({ error: 'INVALID_INPUT' }, 400); }

    const { error: consentError } = await record('allow');
    if (consentError) return reply({ error: 'SERVICE_UNAVAILABLE' }, 503);
    const { data: permitted, error: quotaError } = await admin.rpc('consume_coffee_assistant_quota', { p_user_id: user.id });
    if (quotaError) return reply({ error: 'SERVICE_UNAVAILABLE' }, 503);
    if (!permitted) return reply({ error: 'RATE_LIMITED' }, 429);

    const requestId = crypto.randomUUID(), started = Date.now();
    const usage = {
      operation: 'coffee_label_read', requested_model: model, model: null as string | null, provider_request_id: null as string | null,
      organization_id: identifier(config.organizationId), project_id: identifier(config.projectId),
      input_tokens: null as number | null, cached_input_tokens: null as number | null, output_tokens: null as number | null,
      reasoning_tokens: null as number | null, total_tokens: null as number | null,
      outcome: 'pending', http_status: null as number | null, duration_ms: 0,
    };
    // Reserve the ledger row first: if metering is unavailable, nothing is sent.
    const { error: startError } = await admin.from('coffee_assistant_api_usage')
      .insert({ request_id: requestId, feature: 'coffee_label', ...usage }).abortSignal(AbortSignal.timeout(3000));
    if (startError) return reply({ error: 'SERVICE_UNAVAILABLE' }, 503);

    try {
      usage.outcome = 'network_error';
      let parsed: unknown;
      try {
        const response = await fetcher('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json',
            ...(usage.organization_id ? { 'OpenAI-Organization': usage.organization_id } : {}),
            ...(usage.project_id ? { 'OpenAI-Project': usage.project_id } : {}),
          },
          signal: AbortSignal.timeout(25000),
          body: JSON.stringify({
            model, store: false, max_output_tokens: 1200,
            ...(config.reasoningEffort ? { reasoning: { effort: config.reasoningEffort } } : {}),
            instructions: labelInstructions,
            input: [{ role: 'user', content: [
              { type: 'input_text', text: 'Transcribe the coffee facts printed on this bag.' },
              { type: 'input_image', image_url: image, detail: 'high' },
            ] }],
            text: { format: { type: 'json_schema', name: 'coffee_label', strict: true, schema: labelSchema } },
          }),
        });
        usage.http_status = response.status;
        usage.provider_request_id = identifier(response.headers.get('x-request-id'));
        if (!response.ok) {
          usage.outcome = 'http_error';
          throw classifyProviderFailure(response.status, await response.json().catch(() => null));
        }
        usage.outcome = 'invalid';
        const data = await response.json();
        usage.model = identifier(data.model);
        usage.input_tokens = tokens(data.usage?.input_tokens);
        usage.cached_input_tokens = tokens(data.usage?.input_tokens_details?.cached_tokens);
        usage.output_tokens = tokens(data.usage?.output_tokens);
        usage.reasoning_tokens = tokens(data.usage?.output_tokens_details?.reasoning_tokens);
        usage.total_tokens = tokens(data.usage?.total_tokens);
        if (data.status !== 'completed') { usage.outcome = 'incomplete'; throw new Error('MODEL_INCOMPLETE'); }
        const parts = (data.output ?? []).flatMap((item: { type: string; content?: { type: string; text?: string }[] }) => item.type === 'message' ? item.content ?? [] : []);
        if (parts.some((part: { type: string }) => part.type === 'refusal')) { usage.outcome = 'refused'; throw new Error('MODEL_REFUSAL'); }
        const text = parts.filter((part: { type: string }) => part.type === 'output_text').map((part: { text?: string }) => part.text ?? '').join('');
        if (!text || text.length > 16000) throw new Error('MODEL_INVALID');
        parsed = parseLabelReading(JSON.parse(text));
        usage.outcome = 'completed';
      } finally {
        usage.duration_ms = Math.max(0, Date.now() - started);
        const { error: usageError } = await admin.from('coffee_assistant_api_usage').update(usage)
          .eq('request_id', requestId).eq('operation', usage.operation).select('id').abortSignal(AbortSignal.timeout(3000)).single();
        // Reconciliation aid only: no photo, label text, key or user ID.
        if (usageError) console.error(JSON.stringify({ event: 'coffee_label_usage_write_failed', request_id: requestId, ...usage }));
      }
      return reply({ status: 'ok', api: LABEL_API, reading: parsed });
    } catch (failure) {
      if (usage.outcome === 'invalid' || usage.outcome === 'incomplete' || usage.outcome === 'refused') return reply({ error: 'LABEL_UNREADABLE' }, 422);
      const result = publicAssistantFailure(failure);
      return reply(result.body, result.status);
    }
  };
}
