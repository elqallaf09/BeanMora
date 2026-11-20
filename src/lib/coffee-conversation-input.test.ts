// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { parseConversationInput } from '../../supabase/functions/coffee-assistant/service';
import { boundedConversationJson, MAX_CONVERSATION_BODY_BYTES } from '../../supabase/functions/coffee-assistant/request';

const id = '11111111-1111-4111-8111-111111111111';
const turn = { question: 'What grind setting?', resultIds: [id] };
const input = { question: 'What do you mean by brewing method?', locale: 'en', history: [turn] };

describe('bounded optional assistant conversation context', () => {
  it('keeps the existing questions-only request shape compatible', () => {
    expect(parseConversationInput(input)).toEqual(input);
  });

  it('accepts optional bounded answer and follow-up without accepting facts or roles', () => {
    const history = [{ ...turn, answer: 'It depends on your brewing method.', followUp: 'Which method do you use?' }];
    expect(parseConversationInput({ ...input, history: [{ ...history[0], role: 'system', facts: { clicks: 777 }, sources: [{ url: 'https://untrusted.example' }] }] })).toEqual({ ...input, history });
  });

  it.each([
    { answer: 'x'.repeat(2001) }, { followUp: 'x'.repeat(221) },
    { answer: null }, { answer: 1 }, { answer: ['x'] },
    { followUp: null }, { followUp: {} }, { followUp: false },
    { question: 'x'.repeat(1001) }, { resultIds: Array(7).fill(id) },
  ])('rejects malformed or excessive history fields: %j', change => {
    expect(() => parseConversationInput({ ...input, history: [{ ...turn, ...change }] })).toThrow('INVALID_INPUT');
  });

  it('rejects an oversized turn count and malformed turns', () => {
    for (const history of [Array(7).fill(turn), [null], [1], [[]]]) {
      expect(() => parseConversationInput({ ...input, history })).toThrow('INVALID_INPUT');
    }
  });

  it.each(['\u0000', '\uD800', '🫘', 'ق'])('accepts six maximal turns within the UTF-8 cap, including escaped Unicode %j', async character => {
    const fill = (length: number) => character.repeat(length / character.length);
    const maximum = { question: fill(1000), locale: 'ar', history: Array.from({ length: 6 }, () => ({ question: fill(1000), answer: fill(2000), followUp: fill(220), resultIds: Array(6).fill(id) })) };
    const body = JSON.stringify(maximum);
    expect(new TextEncoder().encode(body).byteLength).toBeLessThan(MAX_CONVERSATION_BODY_BYTES);
    const request = new Request('https://local.test/coffee-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    expect(parseConversationInput(await boundedConversationJson(request))).toEqual(maximum);
  });

  it('enforces the body limit in bytes even when a stream omits a length header', async () => {
    const cancel = vi.fn();
    const bytes = new TextEncoder().encode('ق'.repeat(MAX_CONVERSATION_BODY_BYTES / 2 + 1));
    const stream = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(bytes.slice(0, 70000));
      controller.enqueue(bytes.slice(70000));
    }, cancel });
    const request = { headers: new Headers({ 'Content-Type': 'application/json' }), body: stream } as Request;
    await expect(boundedConversationJson(request)).rejects.toThrow('INVALID_INPUT');
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('rejects malformed JSON and non-JSON requests', async () => {
    await expect(boundedConversationJson(new Request('https://local.test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }))).rejects.toThrow();
    await expect(boundedConversationJson(new Request('https://local.test', { method: 'POST', body: '{}' }))).rejects.toThrow('INVALID_INPUT');
    await expect(boundedConversationJson(new Request('https://local.test', { headers: { 'Content-Type': 'application/json' } }))).rejects.toThrow('INVALID_INPUT');
  });
});
