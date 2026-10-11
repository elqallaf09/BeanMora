#!/usr/bin/env node
// Read-only redirect configuration probe. The token is deliberately invalid:
// this never signs a user in, sends email, or handles a real user's credentials.
import { randomUUID } from 'node:crypto';

const flags = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index];
  const value = process.argv[index + 1];
  if (!['--project-url', '--web-url'].includes(flag) || !value || flags.has(flag)) {
    console.error('Usage: node scripts/check-auth-redirect.mjs --project-url https://PROJECT.supabase.co --web-url https://YOUR-APP.expo.app/');
    process.exit(2);
  }
  flags.set(flag, value);
}

let project;
let web;
try {
  project = new URL(flags.get('--project-url') ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '');
  web = new URL(flags.get('--web-url') ?? '');
  if (
    project.protocol !== 'https:' || !/^[a-z0-9]+\.supabase\.co$/.test(project.hostname) ||
    project.port || project.username || project.password ||
    web.protocol !== 'https:' || web.username || web.password || web.port
  ) throw new Error('Invalid configuration');
} catch {
  console.error('Supply a hosted Supabase project URL and the HTTPS production web URL.');
  process.exit(2);
}

const webRoot = `${web.origin}/`;
const targets = [
  ['web', webRoot],
  // Existing web releases sent the origin without a trailing slash.
  ['existing-web', web.origin],
  ['native', 'beanmora://auth'],
];
let failed = false;
for (const [platform, redirect] of targets) {
  const request = new URL('/auth/v1/verify', project.origin);
  request.searchParams.set('type', 'signup');
  request.searchParams.set('token', `beanmora-invalid-redirect-probe-${randomUUID()}`);
  request.searchParams.set('redirect_to', redirect);
  try {
    const response = await fetch(request, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
      headers: { 'Cache-Control': 'no-store' },
    });
    const rawLocation = response.headers.get('location');
    const location = rawLocation ? new URL(rawLocation, project.origin) : null;
    const expected = new URL(redirect);
    const matches = response.status >= 300 && response.status < 400 && location &&
      !location.username && !location.password &&
      location.protocol === expected.protocol && location.host === expected.host &&
      (location.pathname.replace(/\/$/, '') === expected.pathname.replace(/\/$/, ''));
    // Never print query strings, fragments, response bodies, or cookies.
    const safeTarget = location ? `${location.protocol}//${location.host}${location.pathname}` : 'no redirect';
    console.log(`${platform}: ${matches ? 'PASS' : 'FAIL'}; HTTP ${response.status}; target ${safeTarget}`);
    if (!matches) failed = true;
    await response.body?.cancel();
  } catch (error) {
    console.error(`${platform}: FAIL; request ${error?.name === 'TimeoutError' ? 'timed out' : 'could not complete'}`);
    failed = true;
  }
}
if (failed) {
  console.error('Check Supabase Auth Site URL and redirect allow-list. This probe validates redirect routing only, not a completed sign-in.');
  process.exitCode = 1;
} else {
  console.log('Redirect routing is configured. Complete Google sign-in and recovery on the target devices separately.');
}
