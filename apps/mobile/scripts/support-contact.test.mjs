import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';

const source = readFileSync(new URL('../src/support-mail.ts', import.meta.url), 'utf8');
const { SUPPORT_EMAIL, SUPPORT_TOPICS, supportCopy, getSupportCopy, buildSupportMailto, openSupportDraft } =
  await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);
const locales = ['ar', 'en', 'ja', 'fr', 'it', 'es', 'pt-BR', 'zh-CN'];

test('all contact topics use the owner-approved temporary inbox', () => {
  assert.equal(SUPPORT_EMAIL, 'elqallaf09@gmail.com');
  for (const locale of locales) for (const topic of SUPPORT_TOPICS) {
    const url = new URL(buildSupportMailto(locale, topic));
    assert.equal(url.protocol, 'mailto:');
    assert.equal(url.pathname, SUPPORT_EMAIL);
    assert.deepEqual([...url.searchParams.keys()], ['subject', 'body']);
    assert.equal(url.searchParams.get('subject'), `BeanMora — ${supportCopy[locale].topics[topic]}`);
  }
});
test('complete native support copy for all eight supported languages', () => {
  assert.deepEqual(Object.keys(supportCopy).sort(), locales.sort());
  for (const locale of locales) {
    const copy = supportCopy[locale];
    for (const field of ['title', 'intro', 'draftHint', 'unavailable', 'safety', 'reportHint', 'details']) {
      assert.ok(copy[field].trim(), `${locale}: ${field}`);
      if (locale !== 'en') assert.notEqual(copy[field], supportCopy.en[field]);
    }
    assert.deepEqual(Object.keys(copy.topics), [...SUPPORT_TOPICS]);
    assert.equal(new Set(Object.values(copy.topics)).size, SUPPORT_TOPICS.length);
  }
});
test('report drafts request a target and reason without attaching private data', () => {
  for (const locale of locales) {
    const body = new URL(buildSupportMailto(locale, 'report')).searchParams.get('body');
    assert.ok(body.includes(supportCopy[locale].reportHint));
    assert.ok(body.includes(supportCopy[locale].safety));
    assert.ok(!body.includes('access_token'));
  }
});
test('Unicode and line breaks round-trip through mailto encoding', () => {
  for (const locale of locales) {
    const raw = buildSupportMailto(locale, 'report');
    assert.ok(!/[\r\n]/.test(raw));
    const url = new URL(raw);
    assert.ok(url.searchParams.get('body').includes('\r\n'));
    assert.ok(url.searchParams.get('body').includes(supportCopy[locale].details));
  }
});
test('unknown or prototype-like locales fall back safely', () => {
  for (const locale of ['', 'xx', '__proto__', 'constructor']) assert.equal(getSupportCopy(locale), supportCopy.en);
});
test('untrusted topic text cannot inject recipients or mail headers', () => {
  const expected = buildSupportMailto('en', 'support');
  for (const topic of ['unknown', '__proto__', 'report&bcc=other@example.com', '\r\nBcc: other@example.com']) {
    assert.equal(buildSupportMailto('en', topic), expected);
  }
});
test('opening the mail app is explicitly not reported as sent or delivered', async () => {
  const urls = [];
  const result = await openSupportDraft(async url => { urls.push(url); }, 'ar', 'report');
  assert.equal(result, 'opened');
  assert.deepEqual(urls, [buildSupportMailto('ar', 'report')]);
});
test('missing email client and opening failures return a recoverable state', async () => {
  assert.equal(await openSupportDraft(async () => { throw new Error('No handler'); }, 'ar', 'support'), 'unavailable');
  assert.equal(await openSupportDraft(() => { throw new Error('Synchronous failure'); }, 'en', 'bug'), 'unavailable');
});
test('support is present for guests in settings and within legal documents', () => {
  const settings = readFileSync(new URL('../src/SettingsScreen.tsx', import.meta.url), 'utf8');
  const legal = readFileSync(new URL('../src/LegalLinks.tsx', import.meta.url), 'utf8');
  assert.match(settings, /\) : null\}\s*<SupportContact\s*\/?>/);
  assert.match(legal, /<SupportContact\s*\/?>/);
  const ui = readFileSync(new URL('../src/SupportContact.tsx', import.meta.url), 'utf8');
  assert.match(ui, /<Text selectable/);
  assert.match(ui, /accessibilityRole="alert"/);
  assert.match(ui, /text\.draftHint/);
  assert.doesNotMatch(ui, /\bfetch\(|supabase|access_token|refresh_token/);
});
test('generated public support page uses the same inbox in all languages without tracking', async () => {
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const generator = fileURLToPath(new URL('./generate-support-page.mjs', import.meta.url));
  execFileSync(process.execPath, [generator], { stdio: 'pipe' });
  execFileSync(process.execPath, [generator, '--check'], { stdio: 'pipe' });
  const html = readFileSync(new URL('../public/support.html', import.meta.url), 'utf8');
  for (const locale of locales) assert.ok(html.includes(`id="${locale}" lang="${locale}"`));
  const links = [...html.matchAll(/href="(mailto:[^"]+)"/g)];
  assert.equal(links.length, locales.length * (SUPPORT_TOPICS.length + 1));
  for (const [, href] of links) {
    const url = new URL(href.replaceAll('&amp;', '&'));
    assert.equal(url.pathname, SUPPORT_EMAIL);
    assert.deepEqual([...url.searchParams.keys()], ['subject', 'body']);
  }
  assert.doesNotMatch(html, /<script\b|<iframe\b|<form\b|<img\b/i);
  assert.ok(html.includes('Content-Security-Policy'));
});
