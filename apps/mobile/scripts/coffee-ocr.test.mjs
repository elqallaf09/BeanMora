import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/ocr/reader.js', import.meta.url), 'utf8');
const scan = (text, confidence = 90) => ({ data: { text, confidence,
  blocks: [{ paragraphs: [{ lines: text.split('\n').map(text => ({ text, confidence })) }] }] } });
async function run(results, overrides = {}) {
  const messages = [], calls = []; let listener, terminated = false;
  const window = { location: { origin: 'https://reader.test' }, parent: { postMessage: value => messages.push(value) },
    addEventListener: (name, callback) => { if (name === 'message') listener = callback; } };
  const canvas = () => ({ width: 1, height: 1, getContext() { return { fillRect() {}, drawImage() {}, putImageData() {},
    getImageData: () => ({ data: new Uint8ClampedArray(this.width * this.height * 4).fill(255) }) }; } });
  vm.runInNewContext(source, { window, location: { href: 'https://reader.test/coffee-ocr/reader.html' }, URL,
    Image: class { naturalWidth = 320; naturalHeight = 200; async decode() {} },
    document: { createElement: canvas }, Tesseract: { createWorker: async () => ({
      setParameters: async params => calls.push(params), reinitialize: async language => calls.push(language),
      recognize: async () => { const next = results.shift(); if (next instanceof Error) throw next; return next; },
      terminate: async () => { terminated = true; },
    }) } });
  await listener({ source: window.parent, origin: window.location.origin,
    data: { channel: 'beanmora-coffee-ocr', type: 'recognize', id: 'test', image: 'data:image/png;base64,AAAA', ...overrides } });
  return { result: messages.find(m => m.type === 'result'), messages, calls, terminated };
}
test('a clear scan finishes without unnecessary language retries', async () => {
  const { result, calls, terminated } = await run([scan('Origin: Colombia\nNotes: Coconut\nCoffee: Fixture estate')]);
  assert.match(result.text, /Colombia/); assert.equal(calls.filter(c => typeof c === 'string').length, 0);
  assert.equal(terminated, true);
});
test('difficult photos retain both confident scripts and exclude weak OCR debris', async () => {
  const { result, calls, terminated } = await run([scan('Alarba\nRoastery', 91),
    scan('Origin: Colombia\nNotes: Coconut'), scan('المعالجة | تنقيع كربوني\nالإيحاءات | جوز الهند')]);
  assert.deepEqual(calls.filter(c => typeof c === 'string'), ['eng', 'ara']);
  assert.match(result.text, /Colombia/); assert.match(result.text, /جوز الهند/); assert.match(result.text, /المعالجة/);
  assert.equal(terminated, true);
  const weak = await run([scan('Noise', 20), scan('garbled random text', 40), scan('كلام مشوش', 30)]);
  assert.equal(weak.result.text, ''); assert.match(weak.result.rawText, /كلام مشوش/);
});
test('Arabic gets a dedicated pass even when the mixed-language average looks high', async () => {
  const { result, calls } = await run([scan('المنشأ: كولومبيا\nالسلالة: كاستيلو\nالمعالجة: مغسول'), scan('الإيحاءات: جوز الهند')]);
  assert.deepEqual(calls.filter(c => typeof c === 'string'), ['ara']);
  assert.match(result.text, /جوز الهند/); assert.match(result.text, /كولومبيا/);
});
test('malformed crops and remote images never reach OCR and failures terminate the worker', async () => {
  const crop = await run([], { crop: { left: .9, top: 0, width: .5, height: 1 } });
  assert.equal(crop.result, undefined); assert.equal(crop.messages.at(-1).type, 'error');
  const remote = await run([], { image: 'https://external.test/photo.jpg' });
  assert.equal(remote.result, undefined); assert.equal(remote.calls.length, 0);
  const failure = await run([new Error('OCR failed')]);
  assert.equal(failure.messages.at(-1).type, 'error'); assert.equal(failure.terminated, true);
});
