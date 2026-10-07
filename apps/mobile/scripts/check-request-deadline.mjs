import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(
  readFileSync(new URL('../src/requestDeadline.ts', import.meta.url), 'utf8'),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  },
).outputText;
const { boundedFetch, withDeadline } = await import(
  'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
);
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
const pending = () => new Promise(() => {});

for (const stage of ['headers', 'text body', 'binary body']) {
  test(`deadline settles when native ${stage} ignores cancellation`, async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let signal;
    t.mock.method(globalThis, 'fetch', async (_input, init) => {
      signal = init.signal;
      if (stage === 'headers') return pending();
      return {
        status: 200,
        headers: new Headers({
          'content-type':
            stage === 'text body'
              ? 'application/json'
              : 'application/octet-stream',
        }),
        text: pending,
        arrayBuffer: pending,
      };
    });
    const done = assert.rejects(boundedFetch('https://fixture.test'), {
      name: 'TimeoutError',
    });
    await flush();
    t.mock.timers.tick(12000);
    await done;
    assert.equal(signal.aborted, true);
  });
}

test('caller cancellation after headers settles even if body ignores abort', async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async () => ({
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: pending,
  }));
  const done = assert.rejects(
    boundedFetch('https://fixture.test', { signal: controller.signal }),
    { name: 'AbortError' },
  );
  await flush();
  controller.abort();
  await done;
});

test('already cancelled request never starts transport', async (t) => {
  const transport = t.mock.method(globalThis, 'fetch', pending);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    boundedFetch('https://fixture.test', { signal: controller.signal }),
    { name: 'AbortError' },
  );
  assert.equal(transport.mock.callCount(), 0);
});

test('Arabic JSON, count headers and HTTP errors remain readable', async (t) => {
  const payload = { name: 'قهوة عربية', message: 'انتهت الجلسة' };
  for (const status of [206, 401]) {
    const original = new Response(JSON.stringify(payload), {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-range': '0-1/42',
      },
    });
    t.mock.method(globalThis, 'fetch', async () => original);
    const response = await boundedFetch('https://fixture.test');
    assert.equal(response.status, status);
    assert.equal(response.headers.get('content-range'), '0-1/42');
    await assert.doesNotReject(async () =>
      assert.deepEqual(await response.json(), payload),
    );
    t.mock.restoreAll();
  }
});

test('binary Storage responses and empty responses retain their contents', async (t) => {
  const bytes = new Uint8Array([0, 128, 255, 13, 10]);
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(bytes, { headers: { 'content-type': 'image/png' } }),
  );
  assert.deepEqual(
    new Uint8Array(
      await (await boundedFetch('https://fixture.test')).arrayBuffer(),
    ),
    bytes,
  );
  t.mock.restoreAll();
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(null, { status: 204 }),
  );
  assert.equal((await boundedFetch('https://fixture.test')).status, 204);
});

test('stalled disk-cache read settles without a native abort implementation', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const done = assert.rejects(withDeadline(pending, { timeoutMs: 2000 }), {
    name: 'TimeoutError',
  });
  await flush();
  t.mock.timers.tick(2000);
  await done;
});
