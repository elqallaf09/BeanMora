export interface StructuredModel {
  generate(name: string, schema: Record<string, unknown>, instructions: string, input: unknown): Promise<unknown>;
}

export interface ModelUsage {
  operation: string;
  requested_model: string;
  model: string | null;
  provider_request_id: string | null;
  organization_id: string | null;
  project_id: string | null;
  input_tokens: number | null;
  cached_input_tokens: number | null;
  output_tokens: number | null;
  reasoning_tokens: number | null;
  total_tokens: number | null;
  outcome: 'pending' | 'completed' | 'http_error' | 'network_error' | 'incomplete' | 'refused' | 'invalid';
  http_status: number | null;
  duration_ms: number;
}

export interface ModelOptions {
  organizationId?: string;
  projectId?: string;
  reasoningEffort?: 'none' | 'low' | 'medium';
  onStart?: (usage: ModelUsage) => Promise<void>;
  onUsage?: (usage: ModelUsage) => Promise<void>;
}

const identifier = (value: unknown): string | null => typeof value === 'string' && /^[a-zA-Z0-9_.:/-]{1,200}$/.test(value) ? value : null;
const tokens = (value: unknown): number | null => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;

/** Server-only. Never retains a prompt, response text, key or bearer token. */
export function openAIModel(apiKey: string, model: string, fetcher: typeof fetch = fetch, options: ModelOptions = {}): StructuredModel {
  if (!apiKey || !identifier(model)) throw new Error('MODEL_NOT_CONFIGURED');
  const organizationId = identifier(options.organizationId);
  const projectId = identifier(options.projectId);
  if ((options.organizationId && !organizationId) || (options.projectId && !projectId)) throw new Error('MODEL_NOT_CONFIGURED');
  return {
    async generate(name, schema, instructions, input) {
      const started = Date.now();
      const usage: ModelUsage = {
        operation: name, requested_model: model, model: null, provider_request_id: null,
        organization_id: organizationId, project_id: projectId,
        input_tokens: null, cached_input_tokens: null, output_tokens: null, reasoning_tokens: null, total_tokens: null,
        outcome: 'pending', http_status: null, duration_ms: 0,
      };
      // Reserve a row before a paid request so process termination remains visible.
      // If the ledger is unavailable, no provider request is sent.
      await options.onStart?.({ ...usage });
      usage.outcome = 'network_error';
      try {
        const response = await fetcher('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json',
            ...(organizationId ? { 'OpenAI-Organization': organizationId } : {}),
            ...(projectId ? { 'OpenAI-Project': projectId } : {}),
          },
          signal: AbortSignal.timeout(8500),
          body: JSON.stringify({
            model, store: false, max_output_tokens: 1200,
            ...(options.reasoningEffort ? { reasoning: { effort: options.reasoningEffort } } : {}),
            instructions,
            input: [{ role: 'user', content: JSON.stringify(input) }],
            text: { format: { type: 'json_schema', name, strict: true, schema } },
          }),
        });
        usage.http_status = response.status;
        usage.provider_request_id = identifier(response.headers.get('x-request-id'));
        if (!response.ok) {
          usage.outcome = 'http_error';
          throw new Error('MODEL_UNAVAILABLE');
        }
        usage.outcome = 'invalid';
        const data = await response.json();
        usage.model = identifier(data.model);
        usage.input_tokens = tokens(data.usage?.input_tokens);
        usage.cached_input_tokens = tokens(data.usage?.input_tokens_details?.cached_tokens);
        usage.output_tokens = tokens(data.usage?.output_tokens);
        usage.reasoning_tokens = tokens(data.usage?.output_tokens_details?.reasoning_tokens);
        usage.total_tokens = tokens(data.usage?.total_tokens);
        if (data.status !== 'completed') {
          usage.outcome = 'incomplete';
          throw new Error('MODEL_INCOMPLETE');
        }
        const parts = (data.output ?? []).flatMap((item: { type: string; content?: { type: string; text?: string }[] }) => item.type === 'message' ? item.content ?? [] : []);
        if (parts.some((part: { type: string }) => part.type === 'refusal')) {
          usage.outcome = 'refused';
          throw new Error('MODEL_REFUSAL');
        }
        const text = parts.filter((part: { type: string }) => part.type === 'output_text').map((part: { text?: string }) => part.text ?? '').join('');
        if (!text || text.length > 16000) throw new Error('MODEL_INVALID');
        const result = JSON.parse(text);
        usage.outcome = 'completed';
        return result;
      } finally {
        // A malformed/incomplete/refused response can still consume tokens.
        // Await persistence before returning; missing usage is unknown, never zero.
        usage.duration_ms = Math.max(0, Date.now() - started);
        await options.onUsage?.(usage);
      }
    },
  };
}
