import type { LocalAssistantTurn } from './core/local-coffee-assistant';
import { withDeadline } from './requestDeadline';

export type CoffeeAssistantTurn = Omit<LocalAssistantTurn, 'mode'> & { mode: 'local' | 'ai' };
type Options = { url: string; publicKey: string; signal?: AbortSignal; fetcher?: typeof fetch };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function endpoint(url: string) {
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) throw new Error('ASSISTANT_UNAVAILABLE');
  return `${url}/functions/v1/coffee-assistant`;
}

export async function coffeeAssistantAvailable(options: Options & { accessToken?: string }): Promise<boolean> {
  return withDeadline(async signal => {
    const response = await (options.fetcher ?? fetch)(endpoint(options.url), { headers: { apikey: options.publicKey, ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}) }, signal });
    if (!response.ok) return false;
    const data = await response.json();
    // Old endpoints do not have the metering contract, so cannot be activated.
    return data.api_contract === 1 && data.conversation_enabled === true && data.authentication_required === true;
  }, { signal: options.signal, timeoutMs: 7000 });
}

export function shouldUseRemoteAssistant(turn: LocalAssistantTurn): boolean {
  // Preserve live database lessons and deterministic quantities/coaching.
  // The legacy catalog planner does not support the newer advanced filters.
  // Keep those on the current local path until the planner supports their contract.
  return ['search', 'compare', 'explain', 'help'].includes(turn.intent) && !turn.knowledgeTopic && !turn.calculation && !turn.coach
    && !turn.query.servingStyle && turn.query.minAmount == null && !turn.query.purchaseIntent
    && !turn.query.noteTerms?.length && !turn.recipeAlternative && !turn.equipmentAdvice;
}

export async function converseRemotely(local: LocalAssistantTurn, history: CoffeeAssistantTurn[], locale: 'ar' | 'en', options: Options & { accessToken: string }): Promise<CoffeeAssistantTurn | null> {
  if (!options.accessToken || !shouldUseRemoteAssistant(local)) return null;
  return withDeadline(async signal => {
    const response = await (options.fetcher ?? fetch)(endpoint(options.url), {
      method: 'POST', signal,
      headers: { apikey: options.publicKey, Authorization: `Bearer ${options.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: local.question.slice(0, 1000), locale,
        history: history.slice(-6).map(turn => ({ question: turn.question.slice(0, 1000), resultIds: turn.matches.map(match => match.document.id).filter(id => uuid.test(id)).slice(0, 6) })),
      }),
    });
    if (!response.ok) throw new Error('ASSISTANT_UNAVAILABLE');
    const data = await response.json();
    if (data.mode !== 'ai' || typeof data.answer !== 'string' || !data.answer.trim() || data.answer.length > 16000
      || !Array.isArray(data.matches) || data.matches.length > 6 || !data.query || typeof data.query !== 'object') return null;
    if (data.matches.some((match: { document?: { id?: unknown; facts?: unknown } }) => typeof match?.document?.id !== 'string' || !match.document.facts)) return null;
    // A newer local catalog result must not disappear behind an older AI search.
    if (local.matches.length && !data.matches.length) return null;
    return { ...local, mode: 'ai', answer: data.answer, query: data.query, matches: data.matches, followUp: typeof data.followUp === 'string' ? data.followUp.slice(0, 220) : undefined, suggestions: undefined };
  }, { signal: options.signal, timeoutMs: 35000 });
}
