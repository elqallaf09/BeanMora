export type CoffeeOcrCrop = { left: number; top: number; width: number; height: number };
export type CoffeeOcrJob = { id: string; image: string; crop?: CoffeeOcrCrop };
export type CoffeeOcrEvent = { type: 'progress'; progress: number } | { type: 'result'; text: string; rawText?: string; confidence?: number; titles?: string[] } | { type: 'error' };
export type CoffeeLabelReaderProps = { job: CoffeeOcrJob; event: (event: CoffeeOcrEvent) => void };
export function readCoffeeOcrEvent(value: unknown, id: string): CoffeeOcrEvent | 'ready' | null {
  if (!value || typeof value !== 'object') return null;
  const message = value as Record<string, unknown>;
  if (message.channel !== 'beanmora-coffee-ocr') return null;
  if (message.type === 'ready') return 'ready';
  if (message.id !== id) return null;
  if (message.type === 'result' && typeof message.text === 'string') return { type: 'result', text: message.text.slice(0, 20000),
    ...(Array.isArray(message.titles) ? { titles: message.titles.filter((v): v is string => typeof v === 'string' && v.length <= 160).slice(0, 8) } : {}),
    ...(typeof message.rawText === 'string' ? { rawText: message.rawText.slice(0, 20000) } : {}),
    ...(typeof message.confidence === 'number' && Number.isFinite(message.confidence)
      ? { confidence: Math.max(0, Math.min(100, message.confidence)) } : {}) };
  if (message.type === 'progress' && typeof message.progress === 'number' && Number.isFinite(message.progress))
    return { type: 'progress', progress: Math.max(0, Math.min(1, message.progress)) };
  return message.type === 'error' ? { type: 'error' } : null;
}
