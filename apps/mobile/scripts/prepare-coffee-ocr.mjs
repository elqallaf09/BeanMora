import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const output = new URL('../public/coffee-ocr/', import.meta.url);
mkdirSync(output, { recursive: true });
const copy = (source, name) => copyFileSync(source, new URL(name, output));
const tesseract = path.dirname(require.resolve('tesseract.js/package.json'));
for (const name of ['tesseract.min.js', 'worker.min.js', 'tesseract.min.js.LICENSE.txt', 'worker.min.js.LICENSE.txt'])
  copy(path.join(tesseract, 'dist', name), name);
copy(path.join(tesseract, 'LICENSE.md'), 'LICENSE-tesseract.txt');
const core = path.dirname(require.resolve('tesseract.js-core/package.json'));
copy(path.join(core, 'LICENSE'), 'LICENSE-core.txt');
for (const suffix of ['lstm', 'simd-lstm'])
  copy(path.join(core, `tesseract-core-${suffix}.wasm.js`), `tesseract-core-${suffix}.wasm.js`);
for (const language of ['eng', 'ara']) {
  const root = path.dirname(require.resolve(`@tesseract.js-data/${language}/package.json`));
  copy(path.join(root, '4.0.0_best_int', language + '.traineddata.gz'), language + '.traineddata.gz');
}
for (const name of ['reader.html', 'reader.js']) copy(new URL('../src/ocr/' + name, import.meta.url), name);
writeFileSync(new URL('NOTICE.txt', output), `BeanMora coffee label reader: Tesseract.js 6.0.1 (Apache-2.0), Tesseract.js-core ${JSON.parse(readFileSync(path.join(core, 'package.json'), 'utf8')).version} (Apache-2.0). Language-data npm packages eng/ara 1.0.0: MIT, copyright Balearica and contributors (https://github.com/naptha/tessdata).\nImages are processed locally; only reviewed text is sent to BeanMora recipe retrieval.\n`);
console.log('Prepared self-hosted English/Arabic coffee-label OCR assets.');
