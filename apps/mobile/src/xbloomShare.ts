import { withDeadline } from './requestDeadline';
import type { GeneratedXBloom } from './xbloomGenerator';

export type XBloomShareFailure = 'signin' | 'disabled' | 'rate' | 'busy' | 'unavailable' | 'network';
export class XBloomShareError extends Error { constructor(readonly reason: XBloomShareFailure) { super(reason); } }
type Options = { url: string; publicKey: string; accessToken: string; signal?: AbortSignal; fetcher?: typeof fetch };
const SHARE_LINK = /^https:\/\/share-h5\.xbloom\.com\/\?id=[A-Za-z0-9%+/=_-]{8,200}$/;

/** The body the server accepts: the generated recipe, with the source's grinder speed. */
export function shareBody(recipe: GeneratedXBloom, name: string, rpm?: number | null) {
  return { recipe: {
    model: recipe.model, cup: recipe.cup, dose: recipe.dose, grind: recipe.grind, name: name.trim().slice(0, 40),
    ...(typeof rpm === 'number' && rpm >= 60 && rpm <= 120 ? { rpm } : {}),
    pours: recipe.pours.map(pour => ({
      volume: pour.volume, temperature: pour.temperature ?? recipe.temperature,
      ...(pour.flow_rate !== null ? { flow_rate: pour.flow_rate } : {}), ...(pour.pause_seconds !== null ? { pause_seconds: pour.pause_seconds } : {}),
      ...(pour.pattern_code !== null ? { pattern_code: pour.pattern_code } : {}),
    })),
  } };
}
/** Saves the recipe to BeanMora's xBloom account and returns its share link.
 * It does not talk to the machine: the xBloom app does that after opening the link. */
export async function shareToXBloom(options: Options, recipe: GeneratedXBloom, name: string, rpm?: number | null): Promise<string> {
  if (!options.accessToken) throw new XBloomShareError('signin');
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(options.url)) throw new XBloomShareError('disabled');
  try {
    return await withDeadline(async signal => {
      const response = await (options.fetcher ?? fetch)(`${options.url}/functions/v1/xbloom-share`, {
        method: 'POST', signal, body: JSON.stringify(shareBody(recipe, name, rpm)),
        headers: { apikey: options.publicKey, Authorization: `Bearer ${options.accessToken}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json().catch(() => null) as { link?: unknown; error?: unknown } | null;
      if (!response.ok) {
        throw new XBloomShareError(response.status === 401 ? 'signin' : data?.error === 'SHARE_DISABLED' || response.status === 404 ? 'disabled'
          : response.status === 429 ? 'rate' : response.status === 409 ? 'busy' : 'unavailable');
      }
      // Never open anything but an xBloom share page.
      if (typeof data?.link !== 'string' || !SHARE_LINK.test(data.link)) throw new XBloomShareError('unavailable');
      return data.link;
    }, { signal: options.signal, timeoutMs: 45000 });
  } catch (error) {
    if (error instanceof XBloomShareError || (error instanceof Error && error.name === 'AbortError')) throw error;
    throw new XBloomShareError('network');
  }
}
