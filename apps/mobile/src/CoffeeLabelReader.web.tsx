import { useEffect, useRef } from 'react';
import { readCoffeeOcrEvent, type CoffeeLabelReaderProps } from './coffeeOcr';
export function CoffeeLabelReader({ job, event }: CoffeeLabelReaderProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const callback = useRef(event); callback.current = event;
  useEffect(() => {
    const receive = (message: MessageEvent) => {
      if (message.source !== frame.current?.contentWindow || message.origin !== location.origin) return;
      const parsed = readCoffeeOcrEvent(message.data, job.id);
      if (parsed === 'ready') frame.current?.contentWindow?.postMessage({ ...job, channel: 'beanmora-coffee-ocr', type: 'recognize' }, location.origin);
      else if (parsed) callback.current(parsed);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [job]);
  return <iframe ref={frame} title="Coffee label text reader" aria-hidden tabIndex={-1}
    src="/coffee-ocr/reader.html" style={{ position: 'absolute', width: 1, height: 1, border: 0, opacity: 0, pointerEvents: 'none' }} />;
}
