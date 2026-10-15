import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const source = readFileSync(new URL('../src/support-mail.ts', import.meta.url), 'utf8');
const { SUPPORT_EMAIL, SUPPORT_TOPICS, supportCopy, buildSupportMailto } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`
);
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const names = {ar:'العربية',en:'English',ja:'日本語',fr:'Français',it:'Italiano',es:'Español','pt-BR':'Português (Brasil)','zh-CN':'简体中文'};
const links = Object.entries(names).map(([locale, name]) => `<a href="#${locale}" lang="${locale}">${name}</a>`).join(' ');
const sections = Object.entries(supportCopy).map(([locale, text]) => `<section id="${locale}" lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}">
<h2>${escape(text.title)}</h2><p>${escape(text.intro)}</p>
<p><a class="email" dir="ltr" href="${escape(buildSupportMailto(locale, 'support'))}">${escape(SUPPORT_EMAIL)}</a></p>
<div class="topics">${SUPPORT_TOPICS.map(topic => `<a href="${escape(buildSupportMailto(locale, topic))}">${escape(text.topics[topic])}</a>`).join('')}</div>
<p>${escape(text.draftHint)}</p><p>${escape(text.reportHint)}</p><p><strong>${escape(text.safety)}</strong></p>
</section>`).join('\n');
const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark">
<meta name="description" content="BeanMora support, contact and content reports. تواصل معنا للدعم والاستفسارات والبلاغات.">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>BeanMora — تواصل معنا | Contact us</title>
<style>html{scroll-behavior:smooth}body{margin:0;background:#f7f2e9;color:#2b1d14;font:1rem/1.8 system-ui,sans-serif}main{max-width:760px;margin:auto;padding:24px}header,section{background:#fffcf6;border:1px solid #e7dccf;border-radius:18px;padding:24px;margin-bottom:20px}h1,h2{line-height:1.4}nav,.topics{display:flex;flex-wrap:wrap;gap:10px}a{color:#146b6e;text-underline-offset:4px}nav a,.topics a{display:flex;align-items:center;justify-content:center;min-height:44px;padding:8px 14px;border:1px solid #e7dccf;border-radius:12px;text-decoration:none}.topics a{flex:1 1 240px}a:focus-visible{outline:3px solid #b76c35;outline-offset:4px}.email{display:inline-block;overflow-wrap:anywhere;font-size:1.1rem}section{scroll-margin-top:12px}@media(prefers-color-scheme:dark){body{background:#171411;color:#f7f2e9}header,section{background:#262019;border-color:#695a4a}a{color:#7ddddc}nav a,.topics a{border-color:#695a4a}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}</style></head>
<body><main><header><h1>BeanMora</h1><nav aria-label="Language / اللغة">${links}</nav></header>
${sections}
</main></body></html>
`;
const target = new URL('../public/support.html', import.meta.url);
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== html) throw new Error('Support page drift: run node scripts/generate-support-page.mjs');
} else {
  mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
  writeFileSync(target, html);
}
console.log('Support page matches the single contact configuration (8 languages).');
