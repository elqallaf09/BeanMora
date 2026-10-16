import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const code = ts.transpileModule(readFileSync(new URL('../src/authFailure.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { authFailure } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

test('real production weak-password error is actionable with or without a code', () => {
  const message = 'Password is known to be weak and easy to guess, please choose a different one.';
  assert.equal(authFailure(new Error(message)).kind, 'weakPassword');
  assert.equal(authFailure({ code: 'weak_password', message: 'Different server wording' }).kind, 'weakPassword');
  assert.equal(authFailure({ code: 'weak_password', reasons: ['pwned'] }).kind, 'breachedPassword');
  assert.equal(authFailure({ code: 'weak_password', reasons: ['length', 'characters'] }).kind, 'passwordPolicy');
});
test('stable codes, transport errors and rate limits stay distinct', () => {
  for (const [code, kind] of Object.entries({ email_address_invalid: 'invalidEmail', email_address_not_authorized: 'emailUnavailable', over_email_send_rate_limit: 'emailRateLimit', over_request_rate_limit: 'rateLimit', signup_disabled: 'signupDisabled', email_provider_disabled: 'signupDisabled', invalid_credentials: 'invalidCredentials', email_not_confirmed: 'emailNotConfirmed', request_timeout: 'network' })) {
    assert.equal(authFailure({ code, message: 'Unrelated text' }).kind, kind);
  }
  assert.equal(authFailure({ status: 429 }).kind, 'rateLimit');
  assert.equal(authFailure({ status: 429, message: 'email rate limit exceeded' }).kind, 'emailRateLimit');
  assert.equal(authFailure({ status: 503 }).kind, 'serviceUnavailable');
  assert.equal(authFailure(new TypeError('Failed to fetch')).kind, 'network');
  assert.equal(authFailure({ name: 'TimeoutError', message: 'Request timed out' }).kind, 'network');
});
test('production email rejection is explained even without a machine-readable code', () => {
  assert.equal(authFailure({ status: 400, message: 'Email address "test@test.com" is invalid' }).kind, 'invalidEmail');
});
test('unknown errors and account existence do not reveal server internals', () => {
  for (const error of [null, undefined, 3, {}, { code: 'email_exists' }, { code: 'unexpected_failure', message: 'private database detail' }]) {
    assert.equal(authFailure(error).kind, 'unknown');
  }
});
