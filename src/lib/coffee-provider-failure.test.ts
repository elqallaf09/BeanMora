// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { classifyProviderFailure, publicAssistantFailure } from '../../supabase/functions/coffee-assistant/errors';
import { openAIModel, type ModelUsage } from '../../supabase/functions/coffee-assistant/model';

describe('coffee provider failure handling', () => {
  it.each([
    ['credit_balance_exhausted', 'CREDIT_BALANCE_EXHAUSTED'],
    ['insufficient_quota', 'USAGE_LIMIT_REACHED'],
    ['project_spend_limit_exceeded', 'USAGE_LIMIT_REACHED'],
    ['organization_spend_limit_exceeded', 'USAGE_LIMIT_REACHED'],
    ['organization_usage_limit_exceeded', 'USAGE_LIMIT_REACHED'],
    ['rate_limit_exceeded', 'RATE_LIMITED'],
    ['slow_down', 'RATE_LIMITED'],
  ])('classifies %s without retries or leaking error content', async (code, expected) => {
    const records: ModelUsage[] = [];
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: { code, type: 'insufficient_quota', message: 'sensitive-provider-detail' } }), { status: 429 }));
    const model = openAIModel('private-test-key', 'model-test', fetcher, { onUsage: async usage => { records.push(usage); } });
    await expect(model.generate('coffee_plan', {}, 'private-prompt', {})).rejects.toThrow(expected);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ outcome: 'http_error', http_status: 429, total_tokens: null });
    expect(JSON.stringify(records)).not.toMatch(/sensitive-provider|private-test|private-prompt/);
    expect(publicAssistantFailure(classifyProviderFailure(429, { error: { code, message: 'private' } }))).toEqual({ status: 429, body: { error: expected } });
  });
  it('does not mistake a generic throttle or a network error for exhausted credits', () => {
    expect(classifyProviderFailure(429, null).code).toBe('RATE_LIMITED');
    expect(classifyProviderFailure(401, { error: { code: 'credit_balance_exhausted' } }).code).toBe('MODEL_UNAVAILABLE');
    expect(publicAssistantFailure(new Error('private network or database text'))).toEqual({ status: 503, body: { error: 'ASSISTANT_UNAVAILABLE' } });
  });
});
