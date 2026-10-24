import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/oauthBrowser.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { openOAuthBrowser } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const { addBrowserQuery } = createRequire(import.meta.url)('../plugins/with-auth-browser.cjs');
const url = 'https://fixture.supabase.co/auth/v1/authorize?provider=google&code_challenge=unchanged&code_challenge_method=s256';
const redirect = 'beanmora://auth';
const unavailable = Object.assign(new Error('No matching browser activity found'), { code: 'ERR_NO_MATCHING_ACTIVITY' });

test('successful native auth and explicit cancellation never open another browser', async () => {
  for (const platform of ['android', 'ios']) for (const result of [{ type: 'success', url: redirect + '?code=fixture' }, { type: 'cancel' }, { type: 'dismiss' }]) {
    const actual = await openOAuthBrowser(url, redirect, {
      platform,
      openAuthSession: async (start, finish) => { assert.equal(start, url); assert.equal(finish, redirect); return result; },
      openExternalURL: async () => assert.fail('Unexpected external browser'),
    });
    assert.deepEqual(actual, result);
  }
});

test('Android without a matching Custom Tab opens exactly the same PKCE URL once', async () => {
  let opens = 0;
  const result = await openOAuthBrowser(url, redirect, {
    platform: 'android',
    openAuthSession: async () => { throw unavailable; },
    openExternalURL: async value => { opens++; assert.equal(value, url); },
  });
  assert.equal(opens, 1);
  assert.deepEqual(result, { type: 'external' });
});

test('fallback is limited to Android browser launch failures', async () => {
  for (const [platform, error] of [
    ['ios', unavailable],
    ['android', new Error('The WebBrowser is already open, only one can be open at a time')],
    ['android', new Error('private secure storage detail')],
    ['android', new Error('PKCE verifier unavailable')],
    ['android', new TypeError('Failed to fetch')],
  ]) {
    await assert.rejects(openOAuthBrowser(url, redirect, {
      platform,
      openAuthSession: async () => { throw error; },
      openExternalURL: async () => assert.fail('Must not retry an active or failed auth session'),
    }), value => value === error);
  }
});

test('a device without any browser returns an actionable error without exposing native details', async () => {
  await assert.rejects(openOAuthBrowser(url, redirect, {
    platform: 'android',
    openAuthSession: async () => { throw unavailable; },
    openExternalURL: async () => { throw new Error('private Android detail'); },
  }), error => error.code === 'oauth_browser_unavailable' && !error.message.includes('private'));
});

test('invalid or credential-bearing URLs cannot launch a browser', async () => {
  for (const start of ['http://fixture.test', 'javascript:alert(1)', 'https://user:password@fixture.test']) {
    await assert.rejects(openOAuthBrowser(start, redirect, {
      platform: 'android',
      openAuthSession: async () => assert.fail('Unsafe launch'),
      openExternalURL: async () => assert.fail('Unsafe fallback'),
    }), /OAUTH_URL_INVALID/);
  }
});

test('Android browser visibility includes generic HTTPS browsers and preserves existing queries', () => {
  const existing = { service: [{ $: { 'android:name': 'android.support.customtabs.action.CustomTabsService' } }] };
  const manifest = { manifest: { queries: [{ intent: [existing] }] } };
  addBrowserQuery(manifest);
  const intent = manifest.manifest.queries[0].intent;
  assert.deepEqual(intent[0], existing);
  assert.ok(intent[1].action.some(value => value.$['android:name'] === 'android.intent.action.VIEW'));
  assert.deepEqual(intent[1].data, [{ $: { 'android:scheme': 'https' } }]);
  addBrowserQuery(manifest);
  assert.equal(intent.length, 2);
  assert.doesNotThrow(() => addBrowserQuery({ manifest: {} }));
});
