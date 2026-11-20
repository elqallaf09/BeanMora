import type { LocalAssistantTurn } from './core/local-coffee-assistant';
import { assistantSafeUrl, type AssistantMatch, type AssistantQuery } from './core/coffee-assistant';
import type { AppLocale } from './core/app-locales';
import { withDeadline } from './requestDeadline';

export type CoffeeAssistantTurn = Omit<LocalAssistantTurn, 'mode'> & { mode: 'local' | 'ai' };
type Options = { url: string; publicKey: string; signal?: AbortSignal; fetcher?: typeof fetch };
export type AssistantFailure = 'credits' | 'rate' | 'signin' | 'disabled' | 'unavailable';
export class CoffeeAssistantError extends Error {
  constructor(readonly reason: AssistantFailure, readonly retryAfterMs = 60000) {
    super(reason === 'credits' ? 'CREDIT_BALANCE_EXHAUSTED' : reason === 'rate' ? 'RATE_LIMITED' : reason === 'signin' ? 'SIGN_IN_REQUIRED' : reason === 'disabled' ? 'ASSISTANT_DISABLED' : 'ASSISTANT_UNAVAILABLE');
  }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown, max: number, length: number): value is string[] => Array.isArray(value) && value.length <= max && value.every(item => typeof item === 'string' && item.length <= length);
// Match the server's UTF-16 field limits without cutting an emoji in half.
const boundedText = (value: string, max: number) => value.slice(0, max).replace(/[\uD800-\uDBFF]$/, '');
function endpoint(url: string) {
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) throw new CoffeeAssistantError('unavailable');
  return `${url}/functions/v1/coffee-assistant`;
}

export async function coffeeAssistantReadiness(options: Options & { accessToken?: string }): Promise<'ready' | 'disabled' | 'incompatible'> {
  if (!options.accessToken) throw new CoffeeAssistantError('signin');
  return withDeadline(async signal => {
    const response = await (options.fetcher ?? fetch)(endpoint(options.url), { headers: { apikey: options.publicKey, Authorization: `Bearer ${options.accessToken}` }, signal });
    if (!response.ok) throw await responseError(response);
    const data = await response.json();
    // Version 2 supports grounded brewing conversations and typed failures.
    if (data.api_contract !== 2 || data.authentication_required !== true) return 'incompatible';
    return data.conversation_enabled === true ? 'ready' : 'disabled';
  }, { signal: options.signal, timeoutMs: 7000 });
}

export async function coffeeAssistantAvailable(options: Options & { accessToken?: string }): Promise<boolean> {
  if (!options.accessToken) return false;
  return await coffeeAssistantReadiness(options) === 'ready';
}

export function shouldUseRemoteAssistant(turn: LocalAssistantTurn): boolean {
  // Arithmetic and measured coaching remain deterministic.
  if (turn.calculation || turn.intent === 'calculate'
    || (turn.coach && [turn.coach.dose, turn.coach.output, turn.coach.seconds].some(value => value !== undefined))) return false;
  if (['knowledge', 'guide', 'coach'].includes(turn.intent)) return true;
  // Keep advanced catalog filters on the richer local query implementation.
  return !turn.query.servingStyle && turn.query.minAmount == null && !turn.query.purchaseIntent
    && !(turn.query.kind === 'recipe' && turn.query.noteTerms?.length) && !turn.recipeAlternative;
}

function validQuery(value: unknown): value is AssistantQuery {
  if (!record(value)) return false;
  return [null, 'equipment', 'recipe', 'coffee', 'roaster'].includes(value.kind as string | null)
    && (value.category === null || typeof value.category === 'string')
    && strings(value.methods, 8, 80) && strings(value.terms, 32, 100)
    && (value.amount === null || typeof value.amount === 'number' && Number.isFinite(value.amount) && value.amount > 0)
    && [null, 'USD', 'KWD', 'SAR'].includes(value.currency as string | null)
    && [null, 'currency', 'budget', 'intent'].includes(value.clarification as string | null);
}
function validMatch(value: unknown): value is AssistantMatch {
  if (!record(value) || !record(value.document)) return false;
  const document = value.document;
  if (typeof document.id !== 'string' || !uuid.test(document.id)
    || !['equipment', 'recipe', 'coffee', 'roaster'].includes(String(document.kind))
    || !['title_ar', 'title_en', 'summary_ar', 'summary_en'].every(key => typeof document[key] === 'string')
    || !strings(document.methods, 16, 80) || !record(document.facts)
    || !strings(value.matchedTerms, 32, 100) || typeof value.allTerms !== 'boolean') return false;
  if (value.price !== null && value.price !== undefined) {
    if (!record(value.price) || !record(value.price.offer)
      || ![value.price.converted, value.price.offer.amount].every(amount => typeof amount === 'number' && Number.isFinite(amount) && amount > 0)
      || !['USD', 'KWD', 'SAR'].includes(String(value.price.currency))
      || !['USD', 'KWD', 'SAR'].includes(String(value.price.offer.currency))
      || typeof value.price.offer.checked_at !== 'string' || !Number.isFinite(Date.parse(value.price.offer.checked_at))
      || !assistantSafeUrl(value.price.offer.url)
      || !strings(value.price.rateSources, 8, 2000) || !strings(value.price.rateDates, 8, 100)) return false;
  }
  return value.purchaseLinks === undefined || Array.isArray(value.purchaseLinks) && value.purchaseLinks.length <= 20
    && value.purchaseLinks.every(link => record(link) && typeof link.seller === 'string' && typeof link.region === 'string' && !!assistantSafeUrl(link.url));
}

async function responseError(response: Response): Promise<CoffeeAssistantError> {
  let code: unknown;
  try { const body = await response.json(); code = body.error; } catch { /* Status alone never proves an exhausted balance. */ }
  if (code === 'USAGE_LIMIT_REACHED' || code === 'CREDIT_BALANCE_EXHAUSTED' || code === 'credit_balance_exhausted' || code === 'insufficient_quota') return new CoffeeAssistantError('credits');
  if (code === 'SIGN_IN_REQUIRED' || response.status === 401) return new CoffeeAssistantError('signin');
  if (code === 'RATE_LIMITED' || response.status === 429) {
    const seconds = Number(response.headers.get('Retry-After'));
    return new CoffeeAssistantError('rate', Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, 86400000) : 60000);
  }
  return new CoffeeAssistantError('unavailable');
}

export async function converseRemotely(local: LocalAssistantTurn, history: CoffeeAssistantTurn[], locale: AppLocale, options: Options & { accessToken: string; question?: string }): Promise<CoffeeAssistantTurn | null> {
  if (!options.accessToken || !shouldUseRemoteAssistant(local)) return null;
  return withDeadline(async signal => {
    const response = await (options.fetcher ?? fetch)(endpoint(options.url), {
      method: 'POST', signal,
      headers: { apikey: options.publicKey, Authorization: `Bearer ${options.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: boundedText(options.question ?? local.question, 1000), locale,
        // Prior replies explain what the expert asked the user. They are
        // conversation context only; catalog facts and sources stay server-owned.
        // These field caps also fit the server's 128 KiB limit when JSON-escaped.
        history: history.slice(-6).map(turn => {
          const answer = boundedText(turn.answer, 2000);
          const followUp = boundedText(turn.followUp ?? '', 220);
          return {
            question: boundedText(turn.question, 1000),
            resultIds: turn.matches.map(match => match.document.id).filter(id => uuid.test(id)).slice(0, 6),
            ...(answer.trim() ? { answer } : {}),
            ...(followUp.trim() ? { followUp } : {}),
          };
        }),
      }),
    });
    if (!response.ok) throw await responseError(response);
    const raw = await response.text();
    if (raw.length > 200000) throw new CoffeeAssistantError('unavailable');
    const data = JSON.parse(raw);
    if (record(data) && data.mode === 'catalog' && ['guidance_not_found', 'clarification_required', 'catalog_no_matches'].includes(String(data.notice))) return null;
    if (!record(data) || data.mode !== 'ai' || typeof data.answer !== 'string' || !data.answer.trim() || data.answer.length > 16000
      || !Array.isArray(data.matches) || data.matches.length > 6 || !data.matches.every(validMatch) || !validQuery(data.query)) throw new CoffeeAssistantError('unavailable');
    if (local.matches.length && !data.matches.length && ['search', 'compare', 'explain'].includes(local.intent)) throw new CoffeeAssistantError('unavailable');
    const sources = Array.isArray(data.sources) ? data.sources.slice(0, 12).flatMap(source => record(source)
      && typeof source.title === 'string' && source.title.length <= 160 && assistantSafeUrl(source.url)
      ? [{ title: source.title, url: assistantSafeUrl(source.url)! }] : []) : [];
    // Only server-selected sources accompany generated prose; no inherited local
    // citations, calculations or suggestions masquerade as provider evidence.
    return {
      question: local.question, mode: 'ai', intent: local.intent, knowledgeTopic: local.knowledgeTopic,
      answer: data.answer, query: data.query, matches: data.matches, sources,
      followUp: typeof data.followUp === 'string' ? data.followUp.slice(0, 220) : undefined,
    };
  }, { signal: options.signal, timeoutMs: 35000 });
}
