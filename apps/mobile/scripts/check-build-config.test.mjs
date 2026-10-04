import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkBuildConfig } from './check-build-config.mjs';

// Synthetic values only. These tests never read configuration files or contact
// Supabase, and subprocesses do not inherit the developer's environment.
const project = 'abcdefghijklmnopqrst';
const valid = {
  EXPO_PUBLIC_SUPABASE_URL: `https://${project}.supabase.co`,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6',
};
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function jwt(payload, header = { alg: 'HS256', typ: 'JWT' }) {
  const data = `${encode(header)}.${encode(payload)}`;
  const signature = createHmac('sha256', 'offline-only-test-signing-key').update(data).digest('base64url');
  return `${data}.${signature}`;
}
const withKey = key => ({ ...valid, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key });
const withUrl = url => ({ ...valid, EXPO_PUBLIC_SUPABASE_URL: url });
const run = env => spawnSync(process.execPath, [fileURLToPath(new URL('./check-build-config.mjs', import.meta.url))], {
  env, encoding: 'utf8',
});

test('accepts publishable keys and legacy anon keys with matching or absent project refs', () => {
  assert.deepEqual(checkBuildConfig(valid), []);
  assert.deepEqual(checkBuildConfig(withKey(jwt({ role: 'anon', ref: project }))), []);
  assert.deepEqual(checkBuildConfig(withKey(jwt({ role: 'anon' }))), []);
});

test('reports both missing variables and rejects blank configuration', () => {
  const issues = checkBuildConfig({});
  assert.equal(issues.length, 2);
  assert.match(issues[0], /EXPO_PUBLIC_SUPABASE_URL is required/);
  assert.match(issues[1], /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required/);
  assert.ok(checkBuildConfig(withUrl('   ')).length);
  assert.ok(checkBuildConfig(withKey('\n')).length);
});

test('rejects URLs that the mobile client cannot use', () => {
  for (const url of [
    'not-a-url', `http://${project}.supabase.co`, `https://${project}.supabase.co.evil.test`,
    `https://user:password@${project}.supabase.co`, `https://${project}.supabase.co:443`,
    `${valid.EXPO_PUBLIC_SUPABASE_URL}/`, `${valid.EXPO_PUBLIC_SUPABASE_URL}/rest/v1`,
    `${valid.EXPO_PUBLIC_SUPABASE_URL}?apikey=hidden`, `${valid.EXPO_PUBLIC_SUPABASE_URL} `,
  ]) assert.ok(checkBuildConfig(withUrl(url)).length);
});

test('blocks the browser CI fixture and obvious placeholder configuration', () => {
  for (const url of ['https://mobilefixture.supabase.co', 'https://example.supabase.co', 'https://yourproject.supabase.co']) {
    assert.match(checkBuildConfig(withUrl(url)).join(' '), /fixture or placeholder project/);
  }
  for (const key of ['sb_publishable_isolated_test_fixture', 'sb_publishable_example', 'sb_publishable_change_me', 'sb_publishable_your_key']) {
    assert.match(checkBuildConfig(withKey(key)).join(' '), /fixture or placeholder key/);
  }
});

test('rejects privileged secret/service_role keys and signed-in user tokens', () => {
  assert.match(checkBuildConfig(withKey('sb_secret_sensitiveValue123')).join(' '), /must never contain a secret key/);
  for (const role of ['service_role', 'authenticated', 'admin']) {
    assert.match(checkBuildConfig(withKey(jwt({ role, ref: project }))).join(' '), /publishable or legacy anon key/);
  }
});

test('rejects malformed, incomplete and unsigned keys', () => {
  const anon = jwt({ role: 'anon', ref: project });
  for (const key of [
    'not-a-key', 'sb_publishable_', 'sb_publishable_invalid$character', ` ${valid.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
    anon.split('.').slice(0, 2).join('.'), `${anon}.extra`, `invalid.${encode({ role: 'anon' })}.signature`,
    jwt(null), jwt({ ref: project }), jwt({ role: 'anon' }, { alg: 'none' }),
  ]) assert.ok(checkBuildConfig(withKey(key)).length);
});

test('blocks a known project mismatch and malformed anon project refs', () => {
  assert.match(checkBuildConfig(withKey(jwt({ role: 'anon', ref: 'zyxwvutsrqponmlkjihg' }))).join(' '), /different Supabase projects/);
  for (const ref of [null, '', 123, ['project']]) {
    assert.match(checkBuildConfig(withKey(jwt({ role: 'anon', ref }))).join(' '), /malformed project reference/);
  }
});

test('standalone preflight succeeds without echoing supplied configuration', () => {
  const result = run(valid);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /configuration passed/);
  assert.equal(result.stderr, '');
  for (const value of Object.values(valid)) assert.equal(result.stdout.includes(value), false);
});

test('standalone preflight fails without echoing privileged or malformed values', () => {
  const secretKeys = ['sb_secret_sensitiveValue123', jwt({ role: 'service_role', ref: project }), 'unexpected\nprivateValue456'];
  for (const key of secretKeys) {
    const url = 'https://user:urlPrivateValue789@bad-host.test';
    const result = run({ ...withKey(key), EXPO_PUBLIC_SUPABASE_URL: url });
    const output = result.stdout + result.stderr;
    assert.equal(result.status, 1);
    assert.match(result.stderr, /configuration failed/);
    for (const value of [key, url, 'privateValue456', 'urlPrivateValue789']) {
      assert.equal(output.includes(value), false);
    }
  }
});

test('standalone preflight fails when environment variables are absent', () => {
  const result = run({});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /EXPO_PUBLIC_SUPABASE_URL is required/);
  assert.match(result.stderr, /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required/);
});
