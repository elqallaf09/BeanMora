import { classifyProviderFailure } from './errors.ts';

export interface WebResearch { text: string; sources: { title: string; url: string }[] }
export interface StructuredModel {
  generate(name: string, schema: Record<string, unknown>, instructions: string, input: unknown): Promise<unknown>;
  /** Optional: a web-searched prose answer with the pages it cited. */
  research?(name: string, instructions: string, input: unknown): Promise<WebResearch>;
}

function safeSource(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    url.searchParams.delete('utm_source');
    return url.href;
  } catch { return null; }
}
/** Removes inline citation markers and any other link so prose carries no URL;
 * the cited pages travel separately as sources. */
export function researchProse(text: string, spans: { start: number; end: number }[]): string {
  let prose = text;
  for (const span of [...spans].sort((a, b) => b.start - a.start)) {
    if (span.start >= 0 && span.end > span.start && span.end <= prose.length) prose = prose.slice(0, span.start) + prose.slice(span.end);
  }
  return prose
    .replace(/\(\s*\[[^\]]*\]\([^)]*\)\s*\)/g, '')
    .replace(/\[([^\]]*)\]\((?:https?:|www\.)[^)]*\)/g, '$1')
    .replace(/(?:https?:\/\/|www\.)\S+/g, '')
    .replace(/[<>]/g, '').replace(/\*\*/g, '').replace(/^#{1,6}\s*/gm, '')
    .replace(/[ \t]+([.,،؛:!?؟])/g, '$1').replace(/\(\s*\)/g, '').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
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
  type Body = Record<string, unknown>;
  async function call<T>(name: string, body: Body, timeoutMs: number, read: (parts: { type: string; text?: string; annotations?: unknown[] }[], data: { output?: unknown[] }) => T): Promise<T> {
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
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({ model, store: false, ...body }),
      });
      usage.http_status = response.status;
      usage.provider_request_id = identifier(response.headers.get('x-request-id'));
      if (!response.ok) {
        usage.outcome = 'http_error';
        // Classify only stable error codes; never persist or return provider messages.
        const errorBody = await response.json().catch(() => null);
        throw classifyProviderFailure(response.status, errorBody);
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
      const result = read(parts.filter((part: { type: string }) => part.type === 'output_text'), data);
      usage.outcome = 'completed';
      return result;
    } finally {
      // A malformed/incomplete/refused response can still consume tokens.
      // Await persistence before returning; missing usage is unknown, never zero.
      usage.duration_ms = Math.max(0, Date.now() - started);
      await options.onUsage?.(usage);
    }
  }
  return {
    generate(name, schema, instructions, input) {
      return call(name, {
        max_output_tokens: 1200,
        ...(options.reasoningEffort ? { reasoning: { effort: options.reasoningEffort } } : {}),
        instructions,
        input: [{ role: 'user', content: JSON.stringify(input) }],
        text: { format: { type: 'json_schema', name, strict: true, schema } },
      }, 8500, parts => {
        const text = parts.map(part => part.text ?? '').join('');
        if (!text) throw new Error('MODEL_EMPTY');
        if (text.length > 16000) throw new Error('MODEL_INVALID');
        try { return JSON.parse(text) as unknown; } catch { throw new Error('MODEL_INVALID'); }
      });
    },
    research(name, instructions, input) {
      return call(name, {
        max_output_tokens: 2500,
        // Searching needs some reasoning; "none" is documented to lower quality.
        ...(options.reasoningEffort ? { reasoning: { effort: options.reasoningEffort === 'none' ? 'low' : options.reasoningEffort } } : {}),
        tools: [{ type: 'web_search', search_context_size: 'low' }], tool_choice: 'required',
        instructions,
        input: [{ role: 'user', content: JSON.stringify(input) }],
      }, 18000, (parts, data) => {
        const searched = (data.output ?? []).some(item => (item as { type?: string }).type === 'web_search_call');
        const sources = new Map<string, { title: string; url: string }>();
        let text = '';
        for (const part of parts) {
          const own = part.text ?? '';
          const spans: { start: number; end: number }[] = [];
          for (const raw of part.annotations ?? []) {
            const note = raw as { type?: string; url?: unknown; title?: unknown; start_index?: unknown; end_index?: unknown };
            if (note.type !== 'url_citation') continue;
            const url = safeSource(note.url);
            if (url && sources.size < 8 && !sources.has(url)) sources.set(url, { title: typeof note.title === 'string' && note.title.trim() ? note.title.trim().slice(0, 160) : new URL(url).hostname, url });
            if (typeof note.start_index === 'number' && typeof note.end_index === 'number') spans.push({ start: note.start_index, end: note.end_index });
          }
          text += researchProse(own, spans) + '\n';
        }
        text = text.trim();
        // An answer without a completed search and a cited page is not research.
        if (!searched || !sources.size || !text || text.length > 6000) throw new Error('MODEL_INVALID');
        return { text, sources: [...sources.values()] };
      });
    },
  };
}
