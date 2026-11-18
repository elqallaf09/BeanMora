export class AssistantProviderError extends Error {
  constructor(readonly code: 'CREDIT_BALANCE_EXHAUSTED' | 'USAGE_LIMIT_REACHED' | 'RATE_LIMITED' | 'MODEL_UNAVAILABLE') {
    super(code);
    this.name = 'AssistantProviderError';
  }
}

// An HTTP 429 alone does not establish that credits have run out.
export function classifyProviderFailure(status: number, body: unknown): AssistantProviderError {
  const error = body && typeof body === 'object' ? (body as { error?: unknown }).error : undefined;
  const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : undefined;
  const type = error && typeof error === 'object' ? (error as { type?: unknown }).type : undefined;
  if (status === 429 && ['organization_spend_limit_exceeded', 'project_spend_limit_exceeded', 'organization_usage_limit_exceeded'].includes(String(code))) {
    return new AssistantProviderError('USAGE_LIMIT_REACHED');
  }
  if (status === 429 && (code === 'insufficient_quota' || (!code && type === 'insufficient_quota'))) {
    return new AssistantProviderError('USAGE_LIMIT_REACHED');
  }
  if (status === 429 && code === 'credit_balance_exhausted') {
    return new AssistantProviderError('CREDIT_BALANCE_EXHAUSTED');
  }
  return new AssistantProviderError(status === 429 ? 'RATE_LIMITED' : 'MODEL_UNAVAILABLE');
}

export function publicAssistantFailure(error: unknown) {
  if (error instanceof AssistantProviderError && error.code !== 'MODEL_UNAVAILABLE') {
    return { status: 429, body: { error: error.code } };
  }
  return { status: 503, body: { error: 'ASSISTANT_UNAVAILABLE' } };
}
