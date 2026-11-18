// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { converse, parseConversationInput, type ConversationInput } from '../../supabase/functions/coffee-assistant/service';
import { hasUnsupportedNumbers } from '../../supabase/functions/coffee-assistant/guidance';
import type { AssistantDocument } from '../../supabase/functions/_shared/coffee-assistant';
import type { StructuredModel } from '../../supabase/functions/coffee-assistant/model';

const query = { kind: null, category: null, methods: [], terms: [], amount: null, currency: null, clarification: null };
const input: ConversationInput = { question: 'شلون أضبط القهوة جم بار؟', locale: 'ar', history: [] };
const guidePlan = { intent: 'guide', query, focus_ids: [], guidance_ids: ['espresso-pressure-bar'], question: '' };
const guidedAnswer = { answer: 'للإسبريسو التقليدي، 9 بار مرجع شائع أثناء الاستخلاص؛ قراءة المضخة تختلف عن الضغط عند البن.', source_ids: ['espresso-pressure-bar'], follow_up: 'شنو موديل الماكينة ومتى تقرأ العداد؟' };
function dependencies(outputs: unknown[]) {
  const model = { generate: vi.fn(async (...args: Parameters<StructuredModel['generate']>) => { void args; return outputs.shift(); }) };
  return { model, search: vi.fn(async () => ({ documents: [] as AssistantDocument[], rates: [] })), references: vi.fn(async () => [] as AssistantDocument[]) };
}

describe('grounded coffee conversation contract', () => {
  it('keeps reviewed server notes synchronized with the local curriculum', () => {
    expect(() => execFileSync(process.execPath, ['scripts/sync-coffee-guidance.mjs', '--check'], { cwd: process.cwd() })).not.toThrow();
  });
  it.each(['ar', 'en', 'ja', 'fr', 'it', 'es', 'pt-BR', 'zh-CN'])('accepts the original question in supported locale %s', locale => {
    expect(parseConversationInput({ ...input, locale, answer: 'untrusted answer', facts: { pressure: 99 } })).toEqual({ ...input, locale });
  });
  it('rejects malformed input before any provider call', () => {
    for (const invalid of [null, { ...input, locale: 'xx' }, { ...input, question: 'x'.repeat(1001) }, { ...input, history: [{ question: 'x', resultIds: ['private-id'] }] }]) {
      expect(() => parseConversationInput(invalid)).toThrow('INVALID_INPUT');
    }
  });
  it('returns a conversational sourced pressure answer using at most two metered operations', async () => {
    const deps = dependencies([guidePlan, guidedAnswer]);
    const result = await converse(input, deps);
    expect(result).toMatchObject({ mode: 'ai', answer: guidedAnswer.answer, matches: [], query: { kind: null, amount: null }, sources: expect.arrayContaining([{ title: expect.any(String), url: expect.stringMatching(/^https:\/\//) }]) });
    expect(result.answer).not.toMatch(/بارد|iced/);
    expect(deps.search).not.toHaveBeenCalled();
    expect(deps.model.generate.mock.calls.map(call => call[0])).toEqual(['coffee_plan', 'coffee_evidence']);
  });
  it('passes previous user measurements to the guide, without previous model answers or client facts', async () => {
    const conversation: ConversationInput = { question: 'والطحنة شلون أعدلها؟', locale: 'ar', history: [{ question: 'عندي اسبريسو والناتج سريع', resultIds: [] }] };
    const deps = dependencies([{ ...guidePlan, guidance_ids: ['espresso-dial-in'] }, { answer: 'ثبّت الجرعة والناتج ثم عدّل الطحن تدريجيًا، وقارن الوقت والطعم.', source_ids: ['espresso-dial-in'], follow_up: 'شنو الجرعة والناتج ووقت الشوت؟' }]);
    await converse(conversation, deps);
    expect(deps.model.generate).toHaveBeenCalledTimes(2);
    expect(deps.model.generate.mock.calls[1][3]).toMatchObject({ question: conversation.question, history: ['عندي اسبريسو والناتج سريع'] });
  });
  it.each([
    { ...guidedAnswer, source_ids: ['invented-reference'] },
    { ...guidedAnswer, answer: 'اضبط الماكينة على 999 بار.' },
    { ...guidedAnswer, answer: 'اضبط الماكينة على ٩٩٩ بار.' },
    { ...guidedAnswer, answer: 'اقرأ https://untrusted.example/manual' },
    { ...guidedAnswer, source_ids: [] },
  ])('rejects invented guidance, quantities and source URLs', async answer => {
    await expect(converse(input, dependencies([guidePlan, answer]))).rejects.toThrow(/MODEL_UNKNOWN|MODEL_INVALID/);
  });
  it('does not allow numbers from uncited notes to justify new settings', async () => {
    expect(hasUnsupportedNumbers('Run at 15 bar', 'Start near 9 bar')).toBe(true);
    expect(hasUnsupportedNumbers('٩ بار', '9 bar')).toBe(false);
    expect(hasUnsupportedNumbers('0.9 bar', '9 bar')).toBe(true);
  });
  it('does not generate an ungrounded answer when no reviewed topic applies', async () => {
    const deps = dependencies([{ ...guidePlan, guidance_ids: [] }]);
    expect(await converse(input, deps)).toMatchObject({ mode: 'catalog', notice: 'guidance_not_found' });
    expect(deps.model.generate).toHaveBeenCalledOnce();
  });
  it('rejects a private or invented product reference selected by the planner', async () => {
    const deps = dependencies([{ ...guidePlan, intent: 'explain', focus_ids: ['99999999-9999-4999-8999-999999999999'] }]);
    await expect(converse(input, deps)).rejects.toThrow('MODEL_UNKNOWN_REFERENCE');
    expect(deps.model.generate).toHaveBeenCalledOnce();
  });
  it('returns grounded catalog prose instead of the old fixed comparison sentence', async () => {
    const document: AssistantDocument = {
      id: '11111111-1111-4111-8111-111111111111', kind: 'equipment', slug: 'reviewed-grinder',
      title_ar: 'طاحونة مراجعة', title_en: 'Reviewed grinder', summary_ar: '', summary_en: '', search_text: 'reviewed grinder',
      source_url: 'https://manufacturer.example/grinder', category: 'grinder', methods: ['espresso'], facts: { operation: 'manual' }, offers: [], verified_at: null,
    };
    const deps = dependencies([
      { ...guidePlan, intent: 'search', query: { ...query, kind: 'equipment', category: 'grinder', terms: ['grinder'] }, guidance_ids: [] },
      { selected_ids: [document.id], evidence: [{ id: document.id, keys: ['operation'] }], answer: 'This option uses manual operation. Its published record does not establish motor power.', follow_up: 'Would you prefer manual operation?' },
    ]);
    deps.search.mockResolvedValue({ documents: [document], rates: [] });
    const result = await converse({ question: 'Find a grinder', locale: 'en', history: [] }, deps);
    expect(result).toMatchObject({ mode: 'ai', answer: expect.stringContaining('manual operation'), sources: [{ title: 'Reviewed grinder', url: document.source_url }] });
  });
});
