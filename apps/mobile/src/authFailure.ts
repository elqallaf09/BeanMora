/** Keep machine-readable Auth error details; never display raw server text. */
export function authFailure(error: unknown) {
  const value = error && typeof error === 'object'
    ? error as { message?: unknown; code?: unknown; error_code?: unknown; status?: unknown; name?: unknown; reasons?: unknown }
    : {};
  const message = typeof error === 'string' ? error : typeof value.message === 'string' ? value.message : '';
  const code = (typeof value.code === 'string' ? value.code : typeof value.error_code === 'string' ? value.error_code : '').toLowerCase();
  const lower = message.toLowerCase();
  const reasons = Array.isArray(value.reasons) ? value.reasons : [];

  if (code === 'oauth_browser_unavailable') return { kind: 'oauthBrowser', message } as const;
  if (['bad_code_verifier', 'flow_state_not_found', 'flow_state_expired'].includes(code) || /pkce|code.verifier|code.challenge/.test(lower)) return { kind: 'oauthSession', message } as const;

  if (code === 'weak_password' || value.name === 'AuthWeakPasswordError' || /password.*(weak|easy to guess|at least|contain)/.test(lower)) {
    if (reasons.includes('pwned')) return { kind: 'breachedPassword', message } as const;
    if (reasons.includes('length') || reasons.includes('characters')) return { kind: 'passwordPolicy', message } as const;
    return { kind: 'weakPassword', message } as const;
  }
  if (code === 'email_address_invalid' || /email address.*invalid/.test(lower)) return { kind: 'invalidEmail', message } as const;
  if (code === 'email_address_not_authorized') return { kind: 'emailUnavailable', message } as const;
  if (code === 'over_email_send_rate_limit' || lower.includes('email rate limit')) return { kind: 'emailRateLimit', message } as const;
  if (code.includes('rate_limit') || value.status === 429 || lower.includes('rate limit')) return { kind: 'rateLimit', message } as const;
  if (code === 'signup_disabled' || code === 'email_provider_disabled') return { kind: 'signupDisabled', message } as const;
  if (code === 'invalid_credentials' || lower.includes('invalid login')) return { kind: 'invalidCredentials', message } as const;
  if (code === 'email_not_confirmed' || lower.includes('not confirmed')) return { kind: 'emailNotConfirmed', message } as const;
  if (code === 'request_timeout' || value.name === 'TimeoutError' || /network|fetch|timed? ?out/.test(lower)) return { kind: 'network', message } as const;
  if (typeof value.status === 'number' && value.status >= 500) return { kind: 'serviceUnavailable', message } as const;
  // Do not infer whether an email has an account or expose database messages.
  return { kind: 'unknown', message } as const;
}
