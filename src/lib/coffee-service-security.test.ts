// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { converse, type ConversationInput } from '../../supabase/functions/coffee-assistant/service';
import { AssistantProviderError } from '../../supabase/functions/coffee-assistant/errors';
import type { AssistantDocument } from '../../supabase/functions/_shared/coffee-assistant';
import type { StructuredModel } from '../../supabase/functions/coffee-assistant/model';

const input: ConversationInput = { question: 'Find a grinder', locale: 'en', history: [] };
const query = { kind: 'equipment', category: 'grinder', methods: [], terms: ['grinder'], amount: null, currency: null, clarification: null };
const document: AssistantDocument = {
  id: '99999999-1111-4111-8111-111111111111', kind: 'equipment', slug: 'reviewed-grinder',
  title_ar: 'طاحونة مراجعة', title_en: 'Reviewed grinder', summary_ar: '', summary_en: '',
  search_text: 'reviewed grinder', source_url: 'https://manufacturer.example/grinder',
  category: 'grinder', methods: ['espresso'], facts: { operation: 'manual', burr_size_mm: 47, uncited_setting: 999 }, offers: [], verified_at: null,
};
const plan = { intent: 'search', query, focus_ids: [], guidance_ids: [], question: '' };
const catalogAnswer = {
  selected_ids: [document.id], evidence: [{ id: document.id, keys: ['operation'] }],
  answer: 'The published record describes manual operation.', follow_up: '',
};
function dependencies(outputs: (unknown | Error)[], documents = [document]) {
  const generate = vi.fn<StructuredModel['generate']>(async () => {
    const output = outputs.shift();
    if (output instanceof Error) throw output;
    return output;
  });
  return {
    model: { generate },
    search: vi.fn(async () => ({ documents, rates: [] })),
    references: vi.fn(async () => [] as AssistantDocument[]),
  };
}

describe('coffee service evidence boundaries', () => {
  it('does not authorize a generated specification using digits from a database UUID', async () => {
    await expect(converse(input, dependencies([
      plan, { ...catalogAnswer, answer: 'This grinder has a 99999999 mm burr.' },
    ]))).rejects.toThrow('MODEL_UNKNOWN_FACT');
  });

  it('does not authorize a generated setting using a fact the model did not cite', async () => {
    await expect(converse(input, dependencies([
      plan, { ...catalogAnswer, answer: 'Set this grinder to 999.' },
    ]))).rejects.toThrow('MODEL_UNKNOWN_FACT');
  });

  it('does not treat a number in the user question as a verified catalog specification', async () => {
    await expect(converse({ ...input, question: 'Does this grinder have 999 mm burrs?' }, dependencies([
      plan, { ...catalogAnswer, answer: 'This grinder has 999 mm burrs.' },
    ]))).rejects.toThrow('MODEL_UNKNOWN_FACT');
  });

  it('accepts an explicit specification from the selected record and cited fact', async () => {
    const answer = { ...catalogAnswer, answer: 'Its published burr size is 47 mm.', evidence: [{ id: document.id, keys: ['burr_size_mm'] }] };
    expect(await converse(input, dependencies([plan, answer]))).toMatchObject({ mode: 'ai', answer: answer.answer, evidence: { [document.id]: ['burr_size_mm'] } });
  });

  it('does not accept catalog prose without an evidence entry for its selected result', async () => {
    await expect(converse(input, dependencies([
      plan, { ...catalogAnswer, evidence: [] },
    ]))).rejects.toThrow(/MODEL_INVALID|MODEL_UNKNOWN_FACT/);
  });

  it('does not let a generated catalog answer inject a new source URL', async () => {
    await expect(converse(input, dependencies([
      plan, { ...catalogAnswer, answer: 'Read https://untrusted.example/manual for the setup.' },
    ]))).rejects.toThrow('MODEL_UNKNOWN_FACT');
  });

  it('does not accept a guidance source the planner did not select', async () => {
    await expect(converse({ question: 'How much espresso pressure?', locale: 'en', history: [] }, dependencies([
      { ...plan, intent: 'guide', guidance_ids: ['espresso-pressure-bar'] },
      { answer: 'Adjust the grind gradually.', source_ids: ['espresso-dial-in'], follow_up: '' },
    ]))).rejects.toThrow('MODEL_UNKNOWN_REFERENCE');
  });
});

describe('coffee service provider spending boundaries', () => {
  it('stops after a planner credit failure without a catalog query or second paid operation', async () => {
    const deps = dependencies([new AssistantProviderError('CREDIT_BALANCE_EXHAUSTED')]);
    await expect(converse(input, deps)).rejects.toThrow('CREDIT_BALANCE_EXHAUSTED');
    expect(deps.model.generate).toHaveBeenCalledOnce();
    expect(deps.search).not.toHaveBeenCalled();
  });

  it('stops after an answer usage-limit failure without retrying the paid operation', async () => {
    const deps = dependencies([plan, new AssistantProviderError('USAGE_LIMIT_REACHED')]);
    await expect(converse(input, deps)).rejects.toThrow('USAGE_LIMIT_REACHED');
    expect(deps.model.generate.mock.calls.map(call => call[0])).toEqual(['coffee_plan', 'coffee_evidence']);
  });
});
