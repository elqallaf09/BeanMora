import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const source = readFileSync(new URL('../src/support-mail.ts', import.meta.url), 'utf8');
const { SUPPORT_EMAIL, SUPPORT_TOPICS, supportCopy, buildSupportMailto } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`
);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const names = { ar: 'العربية', en: 'English', ja: '日本語', fr: 'Français', it: 'Italiano', es: 'Español', 'pt-BR': 'Português (Brasil)', 'zh-CN': '简体中文' };
// Only the compact page controls live here; contact copy and recipients stay single-source.
const controls = {
  ar: ['اللغة', 'نسخ البريد', 'تم نسخ البريد.', 'حدّد البريد وانسخه يدويًا.', 'معلومات قبل الإرسال'],
  en: ['Language', 'Copy email', 'Email copied.', 'Select the email address and copy it manually.', 'Before you send'],
  ja: ['言語', 'メールアドレスをコピー', 'メールアドレスをコピーしました。', 'メールアドレスを選択して手動でコピーしてください。', '送信前のご案内'],
  fr: ['Langue', 'Copier l’adresse e-mail', 'Adresse e-mail copiée.', 'Sélectionnez l’adresse e-mail et copiez-la manuellement.', 'Avant d’envoyer'],
  it: ['Lingua', 'Copia indirizzo email', 'Indirizzo email copiato.', 'Seleziona l’indirizzo email e copialo manualmente.', 'Prima di inviare'],
  es: ['Idioma', 'Copiar correo', 'Dirección de correo copiada.', 'Selecciona la dirección de correo y cópiala manualmente.', 'Antes de enviar'],
  'pt-BR': ['Idioma', 'Copiar e-mail', 'E-mail copiado.', 'Selecione o endereço de e-mail e copie-o manualmente.', 'Antes de enviar'],
  'zh-CN': ['语言', '复制邮箱', '邮箱已复制。', '请选择邮箱地址并手动复制。', '发送前须知'],
};
const paths = {
  bean: '<ellipse cx="12" cy="12" rx="7" ry="10" transform="rotate(35 12 12)"/><path d="M17 4c-9 3-1 13-10 16"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
  support: '<path d="M4 13v-1a8 8 0 0 1 16 0v5a4 4 0 0 1-4 4h-4"/><rect x="2" y="11" width="5" height="7" rx="2"/><rect x="17" y="11" width="5" height="7" rx="2"/>',
  bug: '<rect x="6" y="7" width="12" height="13" rx="6"/><path d="m8 3 2 4m6-4-2 4M2 10h4m12 0h4M2 15h4m12 0h4M4 21l3-3m13 3-3-3M12 11v5"/>',
  report: '<path d="M5 21V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0"/>',
  privacy: '<path d="m12 3 8 4v6c0 5-8 9-8 9S4 18 4 13V7l8-4Z"/><path d="m8 12 3 3 5-5"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
const options = Object.entries(names).map(([locale, name]) => `<option value="${locale}" lang="${locale}">${escape(name)}</option>`).join('');
const sections = Object.entries(supportCopy).map(([locale, text]) => {
  const [language, copy, copied, failed, more] = controls[locale];
  return `<section id="${locale}" lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}" class="locale-panel" data-language-label="${escape(language)}" aria-labelledby="title-${locale}">
<h1 id="title-${locale}">${escape(text.title)}</h1><p class="intro">${escape(text.intro)}</p>
<div class="email-row"><a class="email" dir="ltr" href="${escape(buildSupportMailto(locale, 'support'))}">${escape(SUPPORT_EMAIL)}</a><button type="button" class="copy-action" data-copy="${escape(SUPPORT_EMAIL)}" data-copied="${escape(copied)}" data-failed="${escape(failed)}" aria-label="${escape(copy)}" title="${escape(copy)}" hidden>${icon('copy')}</button></div>
<p class="copy-status" role="status" aria-live="polite"></p>
<div class="topics">${SUPPORT_TOPICS.map(topic => `<a class="topic" href="${escape(buildSupportMailto(locale, topic))}"><span class="topic-icon">${icon(topic)}</span><span>${escape(text.topics[topic])}</span></a>`).join('')}</div>
<p class="draft-hint">${escape(text.draftHint)}</p>
<details><summary>${escape(more)}</summary><div class="details-body"><p>${escape(text.reportHint)}</p><p>${escape(text.unavailable)}</p><p class="safety">${escape(text.safety)}</p></div></details>
</section>`;
}).join('\n');

// No network calls, third-party scripts, account identifiers or automatic email sending.
// The CSP hash is calculated from this exact function's serialized bytes at build time.
function supportPageBrowser() {
  'use strict';
  const locales = ['ar', 'en', 'ja', 'fr', 'it', 'es', 'pt-BR', 'zh-CN'];
  const storageKey = 'beanmora.support.locale';
  const root = document.documentElement;
  function normalize(value) {
    const tag = typeof value === 'string' ? value.trim().replace(/_/g, '-').toLowerCase() : '';
    return locales.find(locale => locale.toLowerCase() === tag)
      || locales.find(locale => locale.split('-')[0] === tag.split('-')[0]) || null;
  }
  function urlLocale() {
    try {
      return normalize(new URLSearchParams(location.search).get('lang'))
        || normalize(decodeURIComponent(location.hash.slice(1)));
    } catch { return null; }
  }
  function savedLocale() {
    try { return normalize(localStorage.getItem(storageKey)); } catch { return null; }
  }
  let locale = urlLocale() || savedLocale()
    || Array.from(navigator.languages || [navigator.language]).map(normalize).find(Boolean) || 'ar';
  // Applied in the head before content paints: no flash of eight language panels.
  function setRoot() {
    root.dataset.supportLocale = locale;
    root.lang = locale;
    root.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }
  setRoot();
  function initialize() {
    const picker = document.getElementById('language');
    const panels = Array.from(document.querySelectorAll('.locale-panel'));
    function apply(value, remember) {
      const next = normalize(value);
      if (!next) return;
      locale = next;
      setRoot();
      picker.value = locale;
      const active = document.getElementById(locale);
      picker.setAttribute('aria-label', active.dataset.languageLabel);
      document.title = 'BeanMora — ' + active.querySelector('h1').textContent;
      document.querySelector('meta[name="description"]').content = active.querySelector('.intro').textContent;
      panels.forEach(panel => {
        panel.querySelector('details').open = false;
        panel.querySelector('.copy-status').textContent = '';
      });
      if (remember) {
        try { localStorage.setItem(storageKey, locale); } catch { /* Private/file mode still works. */ }
        try {
          const url = new URL(location.href);
          url.searchParams.set('lang', locale);
          if (normalize(url.hash.slice(1))) url.hash = '';
          history.replaceState(null, '', url.href);
        } catch { /* Storage and history can be disabled in local previews. */ }
      }
    }
    picker.addEventListener('change', () => apply(picker.value, true));
    window.addEventListener('hashchange', () => apply(urlLocale(), false));
    window.addEventListener('popstate', () => apply(urlLocale() || savedLocale() || locale, false));
    document.querySelector('.language-control').hidden = false;
    document.querySelectorAll('[data-copy]').forEach(button => {
      button.hidden = false;
      button.addEventListener('click', async () => {
        const panel = button.closest('.locale-panel');
        const status = panel.querySelector('.copy-status');
        try {
          await navigator.clipboard.writeText(button.dataset.copy);
          status.textContent = button.dataset.copied;
        } catch {
          const range = document.createRange();
          range.selectNodeContents(panel.querySelector('.email'));
          const selection = window.getSelection();
          if (selection) { selection.removeAllRanges(); selection.addRange(range); }
          status.textContent = button.dataset.failed;
        }
      });
    });
    apply(locale, false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
}
const script = `(${supportPageBrowser.toString()})();`;
const css = `
:root{color-scheme:light dark;--bg:#f5f2ec;--card:#fffdfa;--text:#2b211b;--muted:#6d625a;--border:#ded6cc;--soft:#f2ede5;--accent:#225e50;--accent-soft:#eaf1ec;--focus:#9a582d}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}main{width:min(100% - 32px,560px);margin:32px auto;padding-bottom:env(safe-area-inset-bottom,0)}[hidden]{display:none!important}.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px}.brand{display:flex;align-items:center;gap:9px;font-size:20px;font-weight:750;letter-spacing:-.5px;direction:ltr}.brand-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:var(--accent);color:#fff}.language-control{display:flex;align-items:center;gap:7px;color:var(--muted);min-width:0}.language-control>svg{width:18px;flex-shrink:0}select{font:inherit;font-size:13px;color:var(--text);background:var(--card);border:1px solid var(--border);border-radius:10px;min-height:44px;max-width:148px;padding:6px 9px;cursor:pointer}.support-card{background:var(--card);border:1px solid var(--border);border-radius:24px;padding:26px}.locale-panel{display:none}
${Object.keys(names).map(locale => `html[data-support-locale="${locale}"] #${locale}{display:block}`).join('\n')}
h1{font-size:30px;line-height:1.35;letter-spacing:-.6px;margin:0 0 8px}.intro{font-size:14px;color:var(--muted);margin:0 0 18px;line-height:1.8}.email-row{display:flex;align-items:center;gap:8px;background:var(--soft);border:1px solid var(--border);border-radius:13px;padding:5px 10px;margin-bottom:16px}.email{flex:1;min-width:0;color:var(--text);font-size:15px;font-weight:600;text-align:center;overflow-wrap:anywhere;text-decoration:none;min-height:44px;display:flex;align-items:center;justify-content:center}.copy-action{display:grid;place-items:center;flex-shrink:0;width:44px;height:44px;color:var(--accent);background:var(--card);border:1px solid var(--border);border-radius:9px;cursor:pointer}.copy-status{color:var(--accent);font-size:12px;margin:-6px 0 12px;overflow-wrap:anywhere}.copy-status:empty{display:none}.topics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.topic{display:flex;align-items:flex-start;flex-direction:column;justify-content:center;gap:10px;min-height:108px;padding:14px;border:1px solid var(--border);border-radius:14px;background:var(--card);color:var(--text);font-size:13px;font-weight:600;line-height:1.6;text-decoration:none;overflow-wrap:anywhere}.topic-icon{display:grid;place-items:center;width:32px;height:32px;background:var(--accent-soft);color:var(--accent);border-radius:10px}.topic-icon svg{width:19px;height:19px}.draft-hint{font-size:12px;line-height:1.8;color:var(--muted);margin:18px 0 16px}details{border-top:1px solid var(--border);font-size:13px}summary{cursor:pointer;min-height:44px;padding:12px 0 0;color:var(--muted);font-weight:600}.details-body{padding-top:3px;color:var(--muted)}.details-body p{margin:10px 0 0}.safety{font-weight:650;color:var(--text)}a:focus-visible,button:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid var(--focus);outline-offset:4px}@media(hover:hover){.topic:hover,.copy-action:hover{border-color:var(--accent);background:var(--accent-soft)}.email:hover{text-decoration:underline}}@media(max-width:400px){main{margin:20px auto}.support-card{padding:20px}h1{font-size:27px}.topic{padding:12px;gap:8px;min-height:100px}.brand{font-size:18px}select{max-width:132px}}@media(prefers-color-scheme:dark){:root{--bg:#171815;--card:#20231e;--text:#f4f0e8;--muted:#bebaae;--border:#474b40;--soft:#2a2e26;--accent:#a8d8bd;--accent-soft:#303f34;--focus:#e0ac7f}.brand-mark{background:#42745c;color:#fff}}@media(forced-colors:active){.topic,.email-row,.copy-action,.support-card{border:1px solid CanvasText}}
`;
const hash = value => createHash('sha256').update(value).digest('base64');
const html = `<!doctype html>
<html lang="ar" dir="rtl" data-support-locale="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark">
<meta name="description" content="${escape(supportCopy.ar.intro)}">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'sha256-${hash(css)}'; script-src 'sha256-${hash(script)}'; base-uri 'none'; form-action 'none'">
<title>BeanMora — ${escape(supportCopy.ar.title)}</title><style>${css}</style><script>${script}</script></head>
<body><main><header class="topbar"><div class="brand"><span class="brand-mark">${icon('bean')}</span><span>BeanMora</span></div><div class="language-control" hidden>${icon('globe')}<select id="language" aria-label="اللغة">${options}</select></div></header>
<div class="support-card">${sections}</div></main></body></html>
`;
const target = new URL('../public/support.html', import.meta.url);
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== html) throw new Error('Support page drift: run node scripts/generate-support-page.mjs');
} else {
  mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
  writeFileSync(target, html);
}
console.log('Compact support page matches the contact configuration: 8 languages, 1 visible panel.');
