// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { converse, exampleHints, parseConversationInput, type ConversationInput } from '../../supabase/functions/coffee-assistant/service';
import { hasUnsupportedNumbers } from '../../supabase/functions/coffee-assistant/guidance';
import type { AssistantDocument } from '../../supabase/functions/_shared/coffee-assistant';
import { openAIModel, researchProse, type StructuredModel } from '../../supabase/functions/coffee-assistant/model';

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
  it('passes previous user measurements to the guide with server-assigned dialogue roles', async () => {
    const conversation: ConversationInput = { question: 'والطحنة شلون أعدلها؟', locale: 'ar', history: [{ question: 'عندي اسبريسو والناتج سريع', resultIds: [] }] };
    const deps = dependencies([{ ...guidePlan, guidance_ids: ['espresso-dial-in'] }, { answer: 'ثبّت الجرعة والناتج ثم عدّل الطحن تدريجيًا، وقارن الوقت والطعم.', source_ids: ['espresso-dial-in'], follow_up: 'شنو الجرعة والناتج ووقت الشوت؟' }]);
    await converse(conversation, deps);
    expect(deps.model.generate).toHaveBeenCalledTimes(2);
    expect(deps.model.generate.mock.calls[1][3]).toMatchObject({ question: conversation.question, history: [{ role: 'user', content: 'عندي اسبريسو والناتج سريع' }] });
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
  it('returns a normal catalog handoff when a successful search has no published matches', async () => {
    const deps = dependencies([{ ...guidePlan, intent: 'search', query: { ...query, kind: 'coffee', terms: ['strawberry'] }, guidance_ids: [] }]);
    expect(await converse({ question: 'أبي بن بإيحاء فراولة', locale: 'ar', history: [] }, deps)).toEqual({ mode: 'catalog', notice: 'catalog_no_matches' });
    expect(deps.search).toHaveBeenCalledOnce();
    expect(deps.model.generate).toHaveBeenCalledOnce();
  });
  it('preserves the reported bean flavor request when the planner chooses recipes or drops the note', async () => {
    const document: AssistantDocument = {
      id: '11111111-1111-4111-8111-111111111111', kind: 'coffee', slug: 'reviewed-coffee',
      title_ar: 'بن موثّق', title_en: 'Reviewed coffee', summary_ar: '', summary_en: '', search_text: 'Strawberry coffee',
      source_url: 'https://roaster.example/coffee', category: null, methods: [], facts: { notes: ['Strawberry'] }, offers: [], verified_at: null,
    };
    const deps = dependencies([
      { ...guidePlan, intent: 'search', query: { ...query, kind: 'recipe' }, guidance_ids: [] },
      { selected_ids: [document.id], evidence: [{ id: document.id, keys: ['notes'] }], answer: 'تذكر المحمصة إيحاء الفراولة لهذا البن.', follow_up: '' },
    ]);
    deps.search.mockResolvedValue({ documents: [document], rates: [] });
    const result = await converse({ question: 'شنو البن الي طعمه او ايحاءه على فراولة', locale: 'ar', history: [] }, deps);
    expect(deps.search).toHaveBeenCalledWith(expect.objectContaining({ kind: 'coffee', terms: ['strawberry'], noteTerms: ['strawberry'] }));
    expect(result).toMatchObject({ mode: 'ai', query: { kind: 'coffee' }, matches: [{ allTerms: true, confirmedNotes: ['strawberry'] }] });
    expect(deps.model.generate).toHaveBeenCalledTimes(2);
    expect(deps.model.generate.mock.calls[1][3]).toMatchObject({ matches: [{ confirmedNotes: ['strawberry'], allTerms: true }] });
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
  it('answers about a listed product that has no reviewed facts yet, without inventing specifications', async () => {
    const document: AssistantDocument = {
      id: '22222222-2222-4222-8222-222222222222', kind: 'equipment', slug: null as unknown as string,
      title_ar: 'Listed scale', title_en: 'Listed scale', summary_ar: '', summary_en: '', search_text: 'listed scale',
      source_url: 'https://manufacturer.example/scale', category: 'scale', methods: ['espresso'], facts: {}, offers: [], verified_at: null,
    };
    const plan = { ...guidePlan, intent: 'search', query: { ...query, kind: 'equipment', category: 'scale', terms: ['scale'] }, guidance_ids: [] };
    const honest = dependencies([plan,
      { selected_ids: [document.id], evidence: [{ id: document.id, keys: [] }], answer: 'BeanMora lists this scale for espresso, but has no reviewed specifications for it yet.', follow_up: '' }]);
    honest.search.mockResolvedValue({ documents: [document], rates: [] });
    await expect(converse({ question: 'What do you think of this scale?', locale: 'en', history: [] }, honest))
      .resolves.toMatchObject({ mode: 'ai', answer: expect.stringContaining('no reviewed specifications') });
    const invented = dependencies([plan,
      { selected_ids: [document.id], evidence: [{ id: document.id, keys: [] }], answer: 'It reads to 0.1 g and responds quickly.', follow_up: '' }]);
    invented.search.mockResolvedValue({ documents: [document], rates: [] });
    await expect(converse({ question: 'What do you think of this scale?', locale: 'en', history: [] }, invented)).rejects.toThrow('MODEL_UNKNOWN_FACT');
  });
  it('still requires a cited fact for a record that has reviewed facts', async () => {
    const document: AssistantDocument = {
      id: '11111111-1111-4111-8111-111111111111', kind: 'equipment', slug: 'reviewed-grinder',
      title_ar: 'Reviewed grinder', title_en: 'Reviewed grinder', summary_ar: '', summary_en: '', search_text: 'reviewed grinder',
      source_url: 'https://manufacturer.example/grinder', category: 'grinder', methods: ['espresso'], facts: { operation: 'manual' }, offers: [], verified_at: null,
    };
    const deps = dependencies([
      { ...guidePlan, intent: 'search', query: { ...query, kind: 'equipment', category: 'grinder', terms: ['grinder'] }, guidance_ids: [] },
      { selected_ids: [document.id], evidence: [{ id: document.id, keys: [] }], answer: 'A fine grinder.', follow_up: '' }]);
    deps.search.mockResolvedValue({ documents: [document], rates: [] });
    await expect(converse({ question: 'Find a grinder', locale: 'en', history: [] }, deps)).rejects.toThrow('MODEL_UNKNOWN_FACT');
  });
  describe('example bank hints', () => {
    const row = { question: 'شنو رأيك بفلير 58؟', answer: 'ignored', plan: { intent: 'search', kind: 'equipment', category: 'espresso_machine', methods: [], terms: ['Flair 58'] } };
    it('gives the planner the closest bank phrasings and their routing, never their answers', async () => {
      const deps = { ...dependencies([guidePlan, guidedAnswer]), examples: vi.fn(async () => [row, { question: 'x', plan: { kind: 'weapon', category: null, methods: [], terms: ['x'] } }]) };
      await converse(input, deps);
      expect(deps.examples).toHaveBeenCalledWith(input.question, 'ar');
      const sent = deps.model.generate.mock.calls[0][3] as { similar_examples: unknown };
      expect(sent.similar_examples).toEqual([{ question: row.question, plan: { kind: 'equipment', category: 'espresso_machine', methods: [], terms: ['Flair 58'] } }]);
      expect(JSON.stringify(deps.model.generate.mock.calls)).not.toContain('ignored');
    });
    it('answers normally when the bank is unavailable or returns junk', async () => {
      const failing = { ...dependencies([guidePlan, guidedAnswer]), examples: vi.fn(async () => { throw new Error('down'); }) };
      await expect(converse(input, failing)).resolves.toMatchObject({ mode: 'ai' });
      expect((failing.model.generate.mock.calls[0][3] as { similar_examples: unknown[] }).similar_examples).toEqual([]);
      for (const junk of [null, 'x', [null, 5, { question: 5 }, { question: 'q', plan: { kind: 'recipe', category: 'DROP TABLE', methods: [], terms: ['a'] } }, { question: 'q', plan: { kind: 'recipe', category: null, methods: [], terms: [] } }]]) expect(exampleHints(junk)).toEqual([]);
      expect(exampleHints(Array(9).fill(row))).toHaveLength(3);
    });
  });
  describe('web research when BeanMora has nothing reviewed', () => {
    const scale: AssistantDocument = {
      id: '22222222-2222-4222-8222-222222222222', kind: 'equipment', slug: null as unknown as string,
      title_ar: 'Listed scale', title_en: 'Listed scale', summary_ar: '', summary_en: '', search_text: 'listed scale',
      source_url: 'https://manufacturer.example/scale', category: 'scale', methods: ['espresso'], facts: {}, offers: [], verified_at: null,
    };
    const found = { text: 'It reads in 0.1 g steps.', sources: [{ title: 'Maker', url: 'https://manufacturer.example/scale' }] };
    const searchPlan = { ...guidePlan, intent: 'search', query: { ...query, kind: 'equipment', category: 'scale', terms: ['scale'] }, guidance_ids: [] };
    function researching(outputs: unknown[], result: unknown = found) {
      const deps = dependencies(outputs);
      const research = vi.fn(async (...args: unknown[]) => { void args; return result as { text: string; sources: { title: string; url: string }[] }; });
      return { ...deps, model: { ...deps.model, research }, research };
    }
    it('looks up a listed product that has no reviewed facts and labels the answer as web research', async () => {
      const deps = researching([searchPlan]);
      deps.search.mockResolvedValue({ documents: [scale], rates: [] });
      const result = await converse({ question: 'What do you think of this scale?', locale: 'en', history: [] }, deps);
      expect(result).toMatchObject({ mode: 'ai', sources: found.sources, matches: [{ document: { id: scale.id } }] });
      expect(result.answer).toMatch(/^From a web search, not information reviewed by BeanMora:\nIt reads in 0\.1 g steps\.$/);
      expect(deps.model.generate).toHaveBeenCalledOnce();
      expect(deps.research.mock.calls[0][2]).toMatchObject({ listed_products: [{ title: 'Listed scale', category: 'scale' }] });
    });
    it('keeps the reviewed path for records that have facts', async () => {
      const grinder = { ...scale, id: '11111111-1111-4111-8111-111111111111', title_ar: 'Reviewed grinder', title_en: 'Reviewed grinder', search_text: 'reviewed grinder', category: 'grinder', facts: { operation: 'manual' } };
      const deps = researching([{ ...searchPlan, query: { ...searchPlan.query, category: 'grinder', terms: ['grinder'] } },
        { selected_ids: [grinder.id], evidence: [{ id: grinder.id, keys: ['operation'] }], answer: 'Manual operation.', follow_up: '' }]);
      deps.search.mockResolvedValue({ documents: [grinder], rates: [] });
      await expect(converse({ question: 'Find a grinder', locale: 'en', history: [] }, deps)).resolves.toMatchObject({ answer: 'Manual operation.' });
      expect(deps.research).not.toHaveBeenCalled();
    });
    it('looks up unlisted equipment and uncovered topics, but leaves beans to the catalog guide', async () => {
      const gear = researching([searchPlan]);
      await expect(converse({ question: 'Which scale is good?', locale: 'en', history: [] }, gear)).resolves.toMatchObject({ mode: 'ai', matches: [] });
      const topic = researching([{ ...guidePlan, guidance_ids: [] }]);
      await expect(converse(input, topic)).resolves.toMatchObject({ mode: 'ai', answer: expect.stringMatching(/^من بحث الويب/) });
      const beans = researching([{ ...guidePlan, intent: 'search', query: { ...query, kind: 'coffee', terms: ['strawberry'] }, guidance_ids: [] }]);
      await expect(converse({ question: 'أبي بن بإيحاء فراولة', locale: 'ar', history: [] }, beans)).resolves.toEqual({ mode: 'catalog', notice: 'catalog_no_matches' });
      expect(beans.research).not.toHaveBeenCalled();
    });
    it('rejects research without a cited https page or with a link left in the prose', async () => {
      for (const bad of [{ text: 'Fine scale.', sources: [] }, { text: 'Fine scale.', sources: [{ title: 'x', url: 'http://plain.example' }] }, { text: 'See https://x.example', sources: found.sources }]) {
        const deps = researching([searchPlan], bad);
        deps.search.mockResolvedValue({ documents: [scale], rates: [] });
        // Unusable research is dropped; with no grounded answer queued the request still fails closed.
        await expect(converse({ question: 'This scale?', locale: 'en', history: [] }, deps)).rejects.toThrow('MODEL_INVALID');
        expect(deps.model.generate.mock.calls.map(call => call[0])).toEqual(['coffee_plan', 'coffee_evidence']);
      }
    });
    it('frames research with the expert brief and the reviewed lesson for the product kind', async () => {
      const deps = researching([searchPlan]);
      deps.search.mockResolvedValue({ documents: [scale], rates: [] });
      await converse({ question: 'What do you think of this scale?', locale: 'en', history: [] }, deps);
      expect(deps.research.mock.calls[0][1]).toContain('How to judge equipment');
      expect(deps.research.mock.calls[0][2]).toMatchObject({ reviewed_lessons: [{ title: expect.any(String), body: expect.any(String) }] });
    });
    it('falls back to the grounded answer when research returns nothing usable', async () => {
      const deps = researching([searchPlan, { selected_ids: [scale.id], evidence: [{ id: scale.id, keys: [] }], answer: 'BeanMora lists this scale but has no reviewed specifications yet.', follow_up: '' }]);
      deps.research.mockRejectedValue(new Error('MODEL_INVALID'));
      deps.search.mockResolvedValue({ documents: [scale], rates: [] });
      await expect(converse({ question: 'This scale?', locale: 'en', history: [] }, deps)).resolves.toMatchObject({ mode: 'ai', answer: expect.stringContaining('no reviewed specifications') });
      const unlisted = researching([searchPlan]);
      unlisted.research.mockRejectedValue(Object.assign(new Error('timed out'), { name: 'TimeoutError' }));
      await expect(converse({ question: 'Which scale?', locale: 'en', history: [] }, unlisted)).resolves.toEqual({ mode: 'catalog', notice: 'catalog_no_matches' });
    });
    it('retries a malformed plan or answer once under its own metered name, and no more', async () => {
      // The provider adapter throws these codes for an empty or unparsable reply.
      const failing = (outputs: unknown[]) => {
        const deps = dependencies(outputs);
        deps.model.generate.mockImplementation(async () => { const next = outputs.shift(); if (next instanceof Error) throw next; return next; });
        return deps;
      };
      const deps = failing([new Error('MODEL_EMPTY'), guidePlan, new Error('MODEL_INVALID'), guidedAnswer]);
      await expect(converse(input, deps)).resolves.toMatchObject({ mode: 'ai', answer: guidedAnswer.answer });
      expect(deps.model.generate.mock.calls.map(call => call[0])).toEqual(['coffee_plan', 'coffee_plan_retry', 'coffee_evidence', 'coffee_evidence_retry']);
      const broken = failing([new Error('MODEL_EMPTY'), new Error('MODEL_EMPTY'), guidePlan]);
      await expect(converse(input, broken)).rejects.toThrow('MODEL_EMPTY');
      expect(broken.model.generate).toHaveBeenCalledTimes(2);
      const limited = failing([new Error('RATE_LIMITED'), guidePlan]);
      await expect(converse(input, limited)).rejects.toThrow('RATE_LIMITED');
      expect(limited.model.generate).toHaveBeenCalledOnce();
    });
    it('strips citation markers and links from researched prose', () => {
      const text = 'Reads 0.1 g ([maker.example](https://maker.example/a?utm_source=openai)). See [the manual](https://maker.example/m) or https://x.example now.';
      const start = text.indexOf('([');
      expect(researchProse(text, [{ start, end: text.indexOf('))') + 2 }])).toBe('Reads 0.1 g. See the manual or now.');
    });
    it('requires a completed search and a citation from the provider, and meters the call', async () => {
      const usage: string[] = [];
      const reply = (output: unknown[]) => vi.fn(async () => new Response(JSON.stringify({ status: 'completed', model: 'm', output, usage: {} }), { headers: { 'x-request-id': 'req_1' } })) as unknown as typeof fetch;
      const message = (annotations: unknown[]) => ({ type: 'message', content: [{ type: 'output_text', text: 'Reads 0.1 g (maker).', annotations }] });
      const cite = { type: 'url_citation', url: 'https://maker.example/a?utm_source=openai', title: 'Maker', start_index: 11, end_index: 19 };
      const good = reply([{ type: 'web_search_call', status: 'completed' }, message([cite])]);
      const model = openAIModel('k', 'm', good, { onUsage: async row => { usage.push(row.operation + ':' + row.outcome); } });
      await expect(model.research!('coffee_research', 'i', {})).resolves.toEqual({ text: 'Reads 0.1 g.', sources: [{ title: 'Maker', url: 'https://maker.example/a' }] });
      const sent = JSON.parse((good as unknown as { mock: { calls: [string, { body: string }][] } }).mock.calls[0][1].body);
      expect(sent).toMatchObject({ store: false, tool_choice: 'required', tools: [{ type: 'web_search' }] });
      await expect(openAIModel('k', 'm', reply([message([cite])])).research!('coffee_research', 'i', {})).rejects.toThrow('MODEL_INVALID');
      await expect(openAIModel('k', 'm', reply([{ type: 'web_search_call' }, message([])])).research!('coffee_research', 'i', {})).rejects.toThrow('MODEL_INVALID');
      expect(usage).toEqual(['coffee_research:completed']);
    });
  });
});
