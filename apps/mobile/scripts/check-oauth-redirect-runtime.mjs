import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function loadModule(path, globals, requireModule) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  runInNewContext(code, { module, exports: module.exports, URL, URLSearchParams,
    require: requireModule, ...globals });
  return module.exports;
}

function redirectRuntime(platform, globals) {
  const core = loadModule('../src/core/native-oauth-callback.ts', {}, () => assert.fail('Unexpected core import'));
  return loadModule('../src/oauthCallback.ts', globals, name => {
    if (name === 'react-native') return { Platform: { OS: platform } };
    if (name === './core/native-oauth-callback') return core;
    assert.fail('Unexpected redirect import: ' + name);
  });
}

test('native redirects work with React Native window and never read browser location', () => {
  for (const platform of ['android', 'ios']) {
    // React Native defines window as globalThis, without a browser location.
    for (const globals of [{ window: {} }, {}, {
      window: { get location() { assert.fail('Native auth must not inspect browser location'); } },
    }]) {
      assert.equal(redirectRuntime(platform, globals).getAuthRedirect(), 'beanmora://auth');
    }
  }
});

test('web redirect keeps the current origin and removes route, query and fragment', () => {
  for (const origin of ['https://beanmora-mobile.expo.app', 'https://preview.example.test', 'http://localhost:8081']) {
    const { getAuthRedirect } = redirectRuntime('web', {
      window: { location: { href: origin + '/account?code=private#secret' } },
    });
    assert.equal(getAuthRedirect(), origin + '/');
  }
});

test('web cannot substitute an invalid or missing origin with the native callback', () => {
  for (const globals of [{}, { window: { location: { href: 'javascript:alert(1)' } } },
    { window: { location: { href: 'https://user:password@example.test/' } } }]) {
    assert.throws(() => redirectRuntime('web', globals).getAuthRedirect(), /OAUTH_REDIRECT_INVALID/);
  }
});
