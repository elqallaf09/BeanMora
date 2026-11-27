import type { SupabaseClient } from '@supabase/supabase-js';
import { parseSavedConversation, parseSavedSummaries, storableTurns, type SavedConversation, type SavedConversationSummary } from './core/coffee-conversations';
import { withDeadline } from './requestDeadline';

/** The member's own saved Coffee Expert conversations. Row-level security
 * limits every call to the signed-in member's rows. */
const table = 'coffee_expert_conversations';
const failed = () => new Error('CONVERSATIONS_UNAVAILABLE');

export async function listConversations(client: SupabaseClient, signal?: AbortSignal): Promise<SavedConversationSummary[]> {
  return withDeadline(async inner => {
    const { data, error } = await client.from(table).select('id,title,updated_at').order('updated_at', { ascending: false }).limit(50).abortSignal(inner);
    if (error) throw failed();
    return parseSavedSummaries(data);
  }, { signal });
}
export async function loadConversation(client: SupabaseClient, id: string, signal?: AbortSignal): Promise<SavedConversation | null> {
  return withDeadline(async inner => {
    const { data, error } = await client.from(table).select('id,title,updated_at,consent_generation,turns').eq('id', id).abortSignal(inner).maybeSingle();
    if (error) throw failed();
    return parseSavedConversation(data);
  }, { signal });
}
/** Returns false when there was nothing storable (for example one oversized answer). */
export async function saveConversation(client: SupabaseClient, conversation: { id: string; title: string; generation: string | null; turns: { matches: unknown[] }[] }): Promise<boolean> {
  const turns = storableTurns(conversation.turns);
  if (!turns.length) return false;
  return withDeadline(async inner => {
    const { error } = await client.from(table)
      .upsert({ id: conversation.id, title: conversation.title, consent_generation: conversation.generation, turns }, { onConflict: 'id' }).abortSignal(inner);
    if (error) throw failed();
    return true;
  });
}
export async function deleteConversation(client: SupabaseClient, id: string): Promise<void> {
  return withDeadline(async inner => {
    const { error } = await client.from(table).delete().eq('id', id).abortSignal(inner);
    if (error) throw failed();
  });
}
export async function clearConversations(client: SupabaseClient, owner: string): Promise<void> {
  return withDeadline(async inner => {
    const { error } = await client.from(table).delete().eq('owner_id', owner).abortSignal(inner);
    if (error) throw failed();
  });
}
