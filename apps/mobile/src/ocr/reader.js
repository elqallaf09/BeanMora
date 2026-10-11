/* Apache-2.0 Tesseract OCR. This page never uploads images. All assets are self-hosted. */
(() => {
  let worker = null;
  let active = false;
  const send = message => {
    const value = { ...message, channel: 'beanmora-coffee-ocr' };
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(value));
    else window.parent.postMessage(value, window.location.origin);
  };
  const recognize = async event => {
    if (!window.ReactNativeWebView && (event.source !== window.parent || event.origin !== window.location.origin)) return;
    const job = event.data;
    if (!job || job.channel !== 'beanmora-coffee-ocr' || job.type !== 'recognize' || active
      || typeof job.id !== 'string' || !/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(job.image)
      || job.image.length > 14 * 1024 * 1024) return;
    active = true;
    try {
      const root = new URL('./', location.href).href;
      worker = await Tesseract.createWorker(['eng', 'ara'], 1, {
        workerPath: root + 'worker.min.js', corePath: root, langPath: root,
        logger: event => send({ type: 'progress', id: job.id, progress: event.status === 'recognizing text' ? event.progress : 0 }),
        errorHandler: () => send({ type: 'error', id: job.id }),
      });
      await worker.setParameters({ tessedit_pageseg_mode: '11' });
      const { data } = await worker.recognize(job.image);
      send({ type: 'result', id: job.id, text: String(data.text || '').slice(0, 20000) });
    } catch { send({ type: 'error', id: job.id }); }
    finally { if (worker) await worker.terminate(); worker = null; active = false; }
  };
  window.addEventListener('message', recognize);
  window.addEventListener('beforeunload', () => { if (worker) void worker.terminate(); });
  send({ type: 'ready' });
})();
