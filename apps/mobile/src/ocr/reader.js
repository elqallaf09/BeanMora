/* Apache-2.0 Tesseract OCR. Images, crops and preprocessing stay on-device. */
(() => {
  let worker = null;
  let active = false;
  let pass = 0;
  const send = message => {
    const value = { ...message, channel: 'beanmora-coffee-ocr' };
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(value));
    else window.parent.postMessage(value, window.location.origin);
  };
  async function prepare(job) {
    const image = new Image();
    image.src = job.image;
    await image.decode();
    const crop = job.crop || { left: 0, top: 0, width: 1, height: 1 };
    if (![crop.left, crop.top, crop.width, crop.height].every(Number.isFinite)
      || crop.left < 0 || crop.top < 0 || crop.width <= 0 || crop.height <= 0
      || crop.left + crop.width > 1.001 || crop.top + crop.height > 1.001) throw new Error('CROP');
    const w = image.naturalWidth * crop.width, h = image.naturalHeight * crop.height;
    const scale = Math.min(3, 2400 / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale)); canvas.height = Math.max(1, Math.round(h * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, image.naturalWidth * crop.left, image.naturalHeight * crop.top, w, h, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
  function contrast(canvas) {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const gray = pixels.data[i] * .299 + pixels.data[i + 1] * .587 + pixels.data[i + 2] * .114;
      const value = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
    }
    context.putImageData(pixels, 0, 0);
    return canvas;
  }
  function reading(data) {
    const lines = (data.blocks || []).flatMap(b => b.paragraphs || []).flatMap(p => p.lines || []);
    // Keep a line intact; removing individual words can silently change its meaning.
    const trusted = lines.filter(l => l.confidence >= 45 && /[\p{L}]{3}/u.test(l.text || ''));
    const text = trusted.map(l => l.text.trim()).join('\n');
    return { text: text.slice(0, 20000), rawText: String(data.text || '').slice(0, 20000),
      confidence: Number.isFinite(data.confidence) ? data.confidence : 0,
      quality: trusted.reduce((sum, l) => sum + l.confidence * Math.min(l.text.trim().length, 100), 0) };
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
        logger: event => send({ type: 'progress', id: job.id, progress: event.status === 'recognizing text' ? (pass + event.progress) / 2 : 0 }),
        errorHandler: () => send({ type: 'error', id: job.id }),
      });
      await worker.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1' });
      let best = reading((await worker.recognize(canvas, { rotateAuto: true }, { text: true, blocks: true })).data);
      // One bounded retry helps low contrast or dense labels without penalizing clear photos.
      if (best.confidence < 70 || best.text.length < 30) {
        pass = 1;
        await worker.setParameters({ tessedit_pageseg_mode: '6' });
        const alternative = reading((await worker.recognize(contrast(canvas), { rotateAuto: true }, { text: true, blocks: true })).data);
        if (alternative.quality > best.quality) best = alternative;
      }
      send({ type: 'result', id: job.id, text: best.text, rawText: best.rawText, confidence: best.confidence });
    } catch { send({ type: 'error', id: job.id }); }
    finally { if (worker) await worker.terminate(); worker = null; active = false; }
  };
  window.addEventListener('message', recognize);
  window.addEventListener('beforeunload', () => { if (worker) void worker.terminate(); });
  send({ type: 'ready' });
})();
