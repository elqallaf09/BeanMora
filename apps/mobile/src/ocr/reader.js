/* Apache-2.0 Tesseract OCR. Images, crops and preprocessing stay on-device. */
(() => {
  let worker = null;
  let active = false;
  let pass = 0;
  const totalPasses = 3;
  const send = message => {
    const value = { ...message, channel: 'beanmora-coffee-ocr' };
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(value));
    else window.parent.postMessage(value, window.location.origin);
  };
  async function prepare(job, normalized = false) {
    const image = new Image();
    image.src = job.image;
    await image.decode();
    const crop = job.crop || { left: 0, top: 0, width: 1, height: 1 };
    if (![crop.left, crop.top, crop.width, crop.height].every(Number.isFinite)
      || crop.left < 0 || crop.top < 0 || crop.width <= 0 || crop.height <= 0
      || crop.left + crop.width > 1.001 || crop.top + crop.height > 1.001) throw new Error('CROP');
    const w = image.naturalWidth * crop.width, h = image.naturalHeight * crop.height;
    const scale = Math.min(job.crop ? 1.5 : 3, 2400 / Math.max(w, h));
    const border = job.crop ? 32 : 0;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale)) + border * 2; canvas.height = Math.max(1, Math.round(h * scale)) + border * 2;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, image.naturalWidth * crop.left, image.naturalHeight * crop.top, w, h, border, border, canvas.width - border * 2, canvas.height - border * 2);
    return normalized ? contrast(canvas) : canvas;
  }
  function contrast(canvas) {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const histogram = new Uint32Array(256);
    for (let i = 0; i < pixels.data.length; i += 4) {
      histogram[Math.round(pixels.data[i] * .299 + pixels.data[i + 1] * .587 + pixels.data[i + 2] * .114)]++;
    }
    const percentile = fraction => {
      let sum = 0;
      for (let i = 0; i < 256; i++) { sum += histogram[i]; if (sum >= canvas.width * canvas.height * fraction) return i; }
      return 255;
    };
    const low = percentile(.01), high = percentile(.99);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const gray = pixels.data[i] * .299 + pixels.data[i + 1] * .587 + pixels.data[i + 2] * .114;
      const value = Math.max(0, Math.min(255, (gray - low) * 255 / Math.max(40, high - low)));
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
    }
    context.putImageData(pixels, 0, 0);
    return canvas;
  }
  // Find an inset light paper panel, independently of its position on the bag.
  // This is only an OCR retry region, never evidence of any coffee attribute.
  function paperLabel(canvas) {
    const thumb = document.createElement('canvas');
    const ratio = Math.min(1, 320 / Math.max(canvas.width, canvas.height));
    thumb.width = Math.max(1, Math.round(canvas.width * ratio)); thumb.height = Math.max(1, Math.round(canvas.height * ratio));
    const ctx = thumb.getContext('2d', { willReadFrequently: true }); ctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
    const { data } = ctx.getImageData(0, 0, thumb.width, thumb.height);
    const w = thumb.width, h = thumb.height, seen = new Uint8Array(w * h), mask = new Uint8Array(w * h);
    for (let i = 0; i < mask.length; i++) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      mask[i] = Math.min(r, g, b) > 150 && Math.max(r, g, b) - Math.min(r, g, b) < 35 ? 1 : 0;
    }
    let best = null;
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i] || seen[i]) continue;
      const queue = [i]; seen[i] = 1;
      let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let j = 0; j < queue.length; j++) {
        const p = queue[j], x = p % w, y = Math.floor(p / w);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
          const next = ny * w + nx;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h && mask[next] && !seen[next]) { seen[next] = 1; queue.push(next); }
        }
      }
      const width = x1 - x0 + 1, height = y1 - y0 + 1, area = width * height;
      if (x0 <= 1 || y0 <= 1 || x1 >= w - 2 || y1 >= h - 2 || area < w * h * .015 || area > w * h * .5
        || width / height < 1.2 || width / height > 8 || queue.length / area < .55) continue;
      if (!best || queue.length > best.score) best = { score: queue.length, left: x0 / w, top: y0 / h, width: width / w, height: height / h };
    }
    // Stay just inside the paper: tilted outer edges otherwise become huge
    // vertical characters and make the layout detector join unrelated lines.
    return best && { left: best.left + best.width * .025, top: best.top + best.height * .06,
      width: best.width * .95, height: best.height * .88 };
  }
  function reading(data) {
    const lines = (data.blocks || []).flatMap(b => b.paragraphs || []).flatMap(p => p.lines || []);
    // Keep a line intact; removing individual words can silently change its meaning.
    const trusted = lines.filter(l => l.confidence >= 45 && /(?:\p{L}\p{M}*){3}/u.test(l.text || '')
      && (l.text.match(/\p{L}/gu) || []).length / Math.max(1, l.text.replace(/\s|[\u200e\u200f]/gu, '').length) >= .65);
    const text = trusted.map(l => l.text.trim()).join('\n');
    return { text: text.slice(0, 20000), rawText: String(data.text || '').slice(0, 20000),
      confidence: Number.isFinite(data.confidence) ? data.confidence : 0 };
  }
  function mergeReadings(readings) {
    const lines = new Map();
    for (const result of readings) for (const line of result.text.split('\n')) {
      const key = line.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (key && !lines.has(key)) lines.set(key, line.trim());
    }
    return { text: [...lines.values()].join('\n').slice(0, 20000), rawText: readings.map(r => r.rawText).join('\n').slice(0, 20000),
      // Never hide a poor scan behind the high confidence of the large logo.
      confidence: Math.min(...readings.map(r => r.confidence)) };
  }
  const recognize = async event => {
    if (!window.ReactNativeWebView && (event.source !== window.parent || event.origin !== window.location.origin)) return;
    const job = event.data;
    if (!job || job.channel !== 'beanmora-coffee-ocr' || job.type !== 'recognize' || active
      || typeof job.id !== 'string' || !/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(job.image)
      || job.image.length > 14 * 1024 * 1024) return;
    active = true; pass = 0;
    try {
      const canvas = await prepare(job);
      const root = new URL('./', location.href).href;
      worker = await Tesseract.createWorker(['eng', 'ara'], 1, {
        workerPath: root + 'worker.min.js', corePath: root, langPath: root,
        logger: event => send({ type: 'progress', id: job.id, progress: event.status === 'recognizing text' ? (pass + event.progress) / totalPasses : 0 }),
        errorHandler: () => send({ type: 'error', id: job.id }),
      });
      await worker.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1' });
      const first = reading((await worker.recognize(canvas, {}, { text: true, blocks: true })).data);
      const readings = [first];
      const panel = !job.crop ? paperLabel(canvas) : null;
      // Sparse mode respects separate columns. A dense-block retry on decorated
      // packaging used to join illustrations and English/Arabic into false lines.
      const hasArabic = /\p{Script=Arabic}/u.test(first.rawText);
      if (panel || hasArabic || first.confidence < 70 || first.text.length < 30) {
        pass = 1;
        const focused = await prepare({ ...job, crop: panel || job.crop }, true);
        if (panel || !hasArabic || (first.rawText.match(/[a-z]/giu) || []).length >= 8) {
          await worker.reinitialize('eng');
          await worker.setParameters({ tessedit_pageseg_mode: '11', thresholding_method: '2', preserve_interword_spaces: '1' });
          readings.push(reading((await worker.recognize(focused, {}, { text: true, blocks: true })).data));
        }
        pass = 2;
        // Mixed-language recognition can prefer Latin lookalikes. Read Arabic
        // independently, retaining only confident Arabic lines from that pass.
        await worker.reinitialize('ara');
        await worker.setParameters({ tessedit_pageseg_mode: '11', thresholding_method: '2', preserve_interword_spaces: '1' });
        const arabic = reading((await worker.recognize(focused, {}, { text: true, blocks: true })).data);
        arabic.text = arabic.text.split('\n').filter(line => /\p{Script=Arabic}/u.test(line)).join('\n');
        readings.push(arabic);
      }
      const best = mergeReadings(readings);
      send({ type: 'result', id: job.id, text: best.text, rawText: best.rawText, confidence: best.confidence });
    } catch { send({ type: 'error', id: job.id }); }
    finally { if (worker) await worker.terminate(); worker = null; active = false; }
  };
  window.addEventListener('message', recognize);
  window.addEventListener('beforeunload', () => { if (worker) void worker.terminate(); });
  send({ type: 'ready' });
})();
