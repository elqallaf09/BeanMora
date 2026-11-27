/** Saved Coffee Expert conversations: what is stored and what is trusted back. */
export const MAX_SAVED_TURNS = 6;
export const MAX_SAVED_BYTES = 300000;
export interface SavedConversation { id: string; title: string; updatedAt: string; generation: string | null; turns: unknown[] }
export interface SavedConversationSummary { id: string; title: string; updatedAt: string }

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export const isConversationId = (value: unknown): value is string => typeof value === 'string' && uuid.test(value);

/** The first question names the conversation in the list. */
export function conversationTitle(question: string): string {
  const text = question.replace(/\s+/g, ' ').trim();
  if (!text) return '…';
  const cut = text.length > 80 ? text.slice(0, 79).replace(/[\uD800-\uDBFF]$/, '').trimEnd() + '…' : text;
  return cut;
}

/** A turn the screen can draw without crashing. Stored rows are the member's
 * own, but an older app version or a damaged row must not break the screen. */
export function isDrawableTurn(value: unknown): boolean {
  if (!record(value)) return false;
  if (typeof value.question !== 'string' || !value.question.trim() || value.question.length > 1000) return false;
  if (typeof value.answer !== 'string' || !value.answer.trim() || value.answer.length > 16000) return false;
  if (value.mode !== 'local' && value.mode !== 'ai') return false;
  if (typeof value.intent !== 'string' || !record(value.query)) return false;
  if (!Array.isArray(value.matches) || value.matches.length > 60
    || !value.matches.every(match => record(match) && record(match.document) && typeof match.document.id === 'string'
      && typeof match.document.kind === 'string' && record(match.document.facts))) return false;
  if (value.sources !== undefined && !(Array.isArray(value.sources)
    && value.sources.every(source => record(source) && typeof source.title === 'string' && typeof source.url === 'string'))) return false;
  if (value.suggestions !== undefined && !(Array.isArray(value.suggestions) && value.suggestions.every(item => typeof item === 'string'))) return false;
  return value.followUp === undefined || typeof value.followUp === 'string';
}

/** What goes to the server: at most six turns, within the row's size limit.
 * When the cards make it too large, the oldest turns lose their cards first. */
export function storableTurns<T extends { matches: unknown[] }>(turns: T[]): T[] {
  const kept = turns.slice(-MAX_SAVED_TURNS).map(turn => ({ ...turn }));
  const size = () => new TextEncoder().encode(JSON.stringify(kept)).length;
  for (let index = 0; index < kept.length && size() > MAX_SAVED_BYTES; index++) kept[index] = { ...kept[index], matches: [] };
  return size() > MAX_SAVED_BYTES ? [] : kept;
}

export function parseSavedConversation(row: unknown): SavedConversation | null {
  if (!record(row) || !isConversationId(row.id) || typeof row.title !== 'string' || typeof row.updated_at !== 'string') return null;
  if (!Array.isArray(row.turns) || !row.turns.length || row.turns.length > MAX_SAVED_TURNS || !row.turns.every(isDrawableTurn)) return null;
  return { id: row.id, title: row.title.slice(0, 120), updatedAt: row.updated_at,
    generation: isConversationId(row.consent_generation) ? row.consent_generation : null, turns: row.turns };
}
export function parseSavedSummaries(rows: unknown): SavedConversationSummary[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap(row => record(row) && isConversationId(row.id) && typeof row.title === 'string' && typeof row.updated_at === 'string'
    ? [{ id: row.id, title: row.title.slice(0, 120), updatedAt: row.updated_at }] : []);
}
