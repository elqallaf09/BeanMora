// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { converseLocally } from './local-coffee-assistant';
const search = vi.fn(async () => ({ documents: [], rates: [] }));

describe('espresso pressure unit and context', () => {
  it.each(['شلون أضبط القهوة جم بار؟', 'جم بار ضغط الإسبريسو؟', 'جم بار؟', 'How many bar for espresso pressure?', 'What pressure for iced espresso?'])('answers pressure rather than iced coffee: %s', async question => {
    search.mockClear();
    const ar = /[\u0600-\u06ff]/.test(question);
    const turn = await converseLocally(question, ar ? 'ar' : 'en', [], { search });
    expect(turn.knowledgeTopic).toBe('espresso-pressure-bar');
    expect(turn.answer).toMatch(/9 bar|9 بار/);
    expect(turn.answer).not.toMatch(/بارد|iced/i);
    expect(turn.sources?.map(source => new URL(source.url).hostname)).toEqual(['www.breville.com', 'support.flairespresso.com']);
    expect(search).not.toHaveBeenCalled();
  });
  it('does not infer a pressure question from the longer word باردة', async () => {
    const turn = await converseLocally('أبي قهوة باردة بالثلج', 'ar', [], { search });
    expect(turn.knowledgeTopic).not.toBe('espresso-pressure-bar');
  });
  it.each(['How many bar for AeroPress?', 'جم بار للموكا بوت؟'])('does not apply a pump-espresso setting to a different brewer: %s', async question => {
    const turn = await converseLocally(question, 'en', [], { search });
    expect(turn.answer).not.toMatch(/9 bar|9 بار/);
  });
  it('keeps shopping and machine-control comparisons on their intended routes', async () => {
    for (const question of ['أبي ماكينة إسبريسو 15 بار تحت 300 دولار', 'Compare espresso machines with pressure control']) {
      const turn = await converseLocally(question, 'en', [], { search });
      expect(turn.knowledgeTopic).not.toBe('espresso-pressure-bar');
    }
  });
  it('keeps a model follow-up in the pressure conversation without claiming to have read its manual', async () => {
    const first = await converseLocally('شلون أضبط القهوة جم بار؟', 'ar', [], { search });
    const second = await converseLocally('عندي بروفيتك درايف', 'ar', [first], { search });
    expect(second.knowledgeTopic).toBe('espresso-pressure-bar');
    expect(second.answer).toContain('دليل الشركة');
    expect(second.answer).not.toMatch(/9 بار|حسب دليلها/);
    expect(second.followUp).toContain('عداد');
    const changed = await converseLocally('شلون أضبط القهوة V60؟', 'ar', [second], { search });
    expect(changed.knowledgeTopic).not.toBe('espresso-pressure-bar');
  });
});
