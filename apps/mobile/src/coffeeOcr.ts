export type CoffeeOcrJob = { id: string; image: string };
export type CoffeeOcrEvent = { type: 'progress'; progress: number } | { type: 'result'; text: string } | { type: 'error' };
export type CoffeeLabelReaderProps = { job: CoffeeOcrJob; event: (event: CoffeeOcrEvent) => void };
export function readCoffeeOcrEvent(value: unknown, id: string): CoffeeOcrEvent | 'ready' | null {
  if (!value || typeof value !== 'object') return null;
  const message = value as Record<string, unknown>;
  if (message.channel !== 'beanmora-coffee-ocr') return null;
  if (message.type === 'ready') return 'ready';
  if (message.id !== id) return null;
  if (message.type === 'result' && typeof message.text === 'string') return { type: 'result', text: message.text.slice(0, 20000) };
  if (message.type === 'progress' && typeof message.progress === 'number' && Number.isFinite(message.progress))
    return { type: 'progress', progress: Math.max(0, Math.min(1, message.progress)) };
  return message.type === 'error' ? { type: 'error' } : null;
}
