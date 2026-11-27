import { describe, expect, it } from 'vitest';
import { conversationTitle, isDrawableTurn, parseSavedConversation, parseSavedSummaries, storableTurns, MAX_SAVED_BYTES } from './coffee-conversations';

const turn = { question: 'ليش قهوتي مرة؟', answer: 'خشّن الطحنة.', mode: 'ai', intent: 'knowledge', query: { kind: null }, matches: [], sources: [{ title: 'Source', url: 'https://example.com' }] };
const id = '11111111-1111-4111-8111-111111111111';

describe('saved coffee expert conversations', () => {
  it('names a conversation after its first question', () => {
    expect(conversationTitle('  شلون   أخزن البن؟ ')).toBe('شلون أخزن البن؟');
    expect(conversationTitle('x'.repeat(200))).toHaveLength(80);
    expect(conversationTitle('   ')).toBe('…');
  });
  it('accepts drawable turns and rejects damaged ones', () => {
    expect(isDrawableTurn(turn)).toBe(true);
    for (const bad of [null, { ...turn, answer: '' }, { ...turn, mode: 'other' }, { ...turn, matches: [{ document: { id: 1 } }] }, { ...turn, sources: 'x' }, { ...turn, query: null }]) {
      expect(isDrawableTurn(bad)).toBe(false);
    }
  });
  it('keeps the last six turns and drops old cards before exceeding the row limit', () => {
    const many = Array.from({ length: 9 }, (_, index) => ({ ...turn, question: 'q' + index }));
    expect(storableTurns(many).map(item => item.question)).toEqual(['q3', 'q4', 'q5', 'q6', 'q7', 'q8']);
    const heavy = { ...turn, matches: [{ document: { id, kind: 'recipe', facts: { steps: 'x'.repeat(MAX_SAVED_BYTES / 2) } } }] };
    const kept = storableTurns([heavy, heavy, { ...turn, question: 'last' }]);
    expect(kept[0].matches).toEqual([]);
    expect(kept[1].matches).toHaveLength(1);
    expect(new TextEncoder().encode(JSON.stringify(kept)).length).toBeLessThanOrEqual(MAX_SAVED_BYTES);
    expect(storableTurns([{ ...turn, answer: 'x'.repeat(MAX_SAVED_BYTES + 1) }])).toEqual([]);
  });
  it('reads back only well-formed rows', () => {
    const row = { id, title: 'T', updated_at: '2026-11-27T10:00:00Z', consent_generation: id, turns: [turn] };
    expect(parseSavedConversation(row)).toMatchObject({ id, title: 'T', generation: id, turns: [turn] });
    expect(parseSavedConversation({ ...row, consent_generation: 'x' })?.generation).toBeNull();
    for (const bad of [{ ...row, id: 'x' }, { ...row, turns: [] }, { ...row, turns: [{ ...turn, answer: 5 }] }, { ...row, turns: Array(7).fill(turn) }]) expect(parseSavedConversation(bad)).toBeNull();
    expect(parseSavedSummaries([row, { id: 'bad' }, null])).toEqual([{ id, title: 'T', updatedAt: row.updated_at }]);
    expect(parseSavedSummaries(null)).toEqual([]);
  });
});
