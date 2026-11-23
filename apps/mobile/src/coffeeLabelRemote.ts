import type { CoffeeLabel } from './coffeeLabel';
import { withDeadline } from './requestDeadline';

export const LABEL_CONSENT_POLICY = 'openai-label-v1';
export type LabelConfidence = 'high' | 'medium' | 'low';
export type LabelExtras = { roaster: string; region: string; roastDate: string; altitude: string; weight: string };
export type AiLabelReading = { label: CoffeeLabel; extras: LabelExtras; confidence: Partial<Record<keyof CoffeeLabel | keyof LabelExtras, LabelConfidence>> };
export type AiLabelFailure = 'signin' | 'account' | 'disabled' | 'rate' | 'unreadable' | 'size' | 'network' | 'unknown';
export class AiLabelError extends Error { constructor(readonly reason: AiLabelFailure) { super(reason); } }
export const emptyLabelExtras = (): LabelExtras => ({ roaster: '', region: '', roastDate: '', altitude: '', weight: '' });
type Options = { url: string; publicKey: string; accessToken: string; signal?: AbortSignal; fetcher?: typeof fetch };
/** The server accepts 6 MB; base64 text plus the JSON envelope must fit. */
export const MAX_AI_LABEL_IMAGE = 5.5 * 1024 * 1024;
function endpoint(url: string) {
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) throw new AiLabelError('disabled');
  return `${url}/functions/v1/coffee-label-reader`;
}
const level = (value: unknown): LabelConfidence => value === 'high' || value === 'medium' ? value : 'low';
/** Accept only the documented response; anything else is an unreadable label. */
export function parseAiLabel(data: unknown): AiLabelReading {
  const reading = (data as { api?: unknown; reading?: { fields?: Record<string, { value?: unknown; confidence?: unknown }>; notes?: { value?: unknown; confidence?: unknown } } })?.reading;
  if ((data as { api?: unknown })?.api !== 1 || !reading?.fields || !reading.notes || !Array.isArray(reading.notes.value)) throw new AiLabelError('unreadable');
  const confidence: AiLabelReading['confidence'] = {};
  const text = (key: string, target: keyof CoffeeLabel | keyof LabelExtras, max = 160) => {
    const field = reading.fields![key];
    const value = typeof field?.value === 'string' ? field.value.trim().slice(0, max) : '';
    if (value) confidence[target] = level(field?.confidence);
    return value;
  };
  const notes = reading.notes.value.filter((v): v is string => typeof v === 'string' && !!v.trim()).map(v => v.trim().slice(0, 60)).slice(0, 12);
  if (notes.length) confidence.notes = level(reading.notes.confidence);
  return {
    label: { name: text('name', 'name'), origin: text('origin', 'origin'), variety: text('variety', 'variety'), process: text('process', 'process'), roast: text('roast', 'roast'), notes: notes.join(', ') },
    extras: { roaster: text('roaster', 'roaster'), region: text('region', 'region'), roastDate: text('roast_date', 'roastDate', 40), altitude: text('altitude', 'altitude', 40), weight: text('weight', 'weight', 40) },
    confidence,
  };
}
async function failure(response: Response): Promise<AiLabelError> {
  let code: unknown;
  try { code = (await response.json()).error; } catch { /* status only */ }
  if (code === 'SIGN_IN_REQUIRED' || response.status === 401) return new AiLabelError('signin');
  if (code === 'AI_PILOT_ONLY') return new AiLabelError('account');
  if (code === 'LABEL_AI_DISABLED') return new AiLabelError('disabled');
  if (code === 'LABEL_UNREADABLE') return new AiLabelError('unreadable');
  if (code === 'INVALID_INPUT' || response.status === 413) return new AiLabelError('size');
  if (response.status === 429) return new AiLabelError('rate');
  return new AiLabelError('unknown');
}
const transport = (error: unknown): AiLabelError => error instanceof AiLabelError ? error
  : new AiLabelError(error instanceof TypeError || (error instanceof Error && error.name === 'TimeoutError') ? 'network' : 'unknown');
/** Sends the photo to the BeanMora server, which forwards it to OpenAI.
 * Call only after the person has explicitly chosen AI reading. */
export async function readLabelWithAi(options: Options, image: string): Promise<AiLabelReading> {
  if (!options.accessToken) throw new AiLabelError('signin');
  if (image.length > MAX_AI_LABEL_IMAGE) throw new AiLabelError('size');
  try {
    return await withDeadline(async signal => {
      const response = await (options.fetcher ?? fetch)(endpoint(options.url), {
        method: 'POST', signal,
        headers: { apikey: options.publicKey, Authorization: `Bearer ${options.accessToken}`, 'Content-Type': 'application/json', 'x-label-consent': LABEL_CONSENT_POLICY + ':allow' },
        body: JSON.stringify({ image }),
      });
      if (!response.ok) throw await failure(response);
      return parseAiLabel(await response.json());
    }, { signal: options.signal, timeoutMs: 40000 });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw transport(error);
  }
}
export async function withdrawAiLabelConsent(options: Options): Promise<void> {
  await withDeadline(async signal => {
    const response = await (options.fetcher ?? fetch)(endpoint(options.url), { method: 'DELETE', signal, headers: { apikey: options.publicKey, Authorization: `Bearer ${options.accessToken}` } });
    if (!response.ok) throw await failure(response);
  }, { signal: options.signal, timeoutMs: 7000 });
}
