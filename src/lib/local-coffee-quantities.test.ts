import { describe, expect, it } from 'vitest';
import { converseLocally, type LocalAssistantTurn } from './local-coffee-assistant';

const ask = (question: string, history: LocalAssistantTurn[] = []) => converseLocally(question, 'ar', history, {
  search: async () => { throw new Error('Quantity answers must work offline'); },
});

describe('coffee water and ice quantities', () => {
  it.each([
    '15 جرام قهوه\nكم ماء وكم ثلج لل v60',
    '١٥ غرام قهوة كم ماي وكم ثلج للـV60؟',
    '۱۵ غرام قهوة كم ماء وكم ثلج لv60',
    'كم ماء ساخن وثلج لـV60 بجرعة 15 غرام قهوة؟',
    'V60 15g coffee how much water and ice?',
    'How much hot water and ice for 15 grams of coffee in a V60?',
  ])('answers the quantity request: %s', async question => {
    const turn = await ask(question);
    expect(turn.intent).toBe('calculate');
    expect(turn.calculation).toMatchObject({ dose: 15, ratio: 15, method: 'v60', servingStyle: 'iced' });
    expect(turn.answer).toContain('135 g');
    expect(turn.answer).toContain('90 g');
    expect(turn.answer).toContain('225 g');
    expect(turn.answer).not.toMatch(/TDS|العسر/);
    expect(turn.sources?.[0].url).toContain('beanrockcoffee.com');
  });
  it('keeps ice in the total across dose and ratio follow-ups', async () => {
    const first = await ask('15g coffee how much water and ice for V60');
    const second = await ask('خلها 20 غرام', [first]);
    expect(second.answer).toContain('180 g');
    expect(second.answer).toContain('120 g');
    const third = await ask('غير النسبة إلى 1:16', [first, second]);
    expect(third.answer).toContain('192 g');
    expect(third.answer).toContain('128 g');
    expect(third.answer).toContain('320 g');
  });
  it.each(['خلها حارة', 'بدون ثلج', 'make it hot', 'without ice'])('clears ice when requested: %s', async question => {
    const first = await ask('15g coffee how much water and ice for V60');
    const hot = await ask(question, [first]);
    expect(hot.calculation?.servingStyle).toBe('hot');
    expect(hot.answer).toContain('225 g');
    expect(hot.answer).not.toContain('90 g');
  });
  it('asks for a missing coffee dose then finishes the same calculation', async () => {
    const first = await ask('كم ماء وثلج للV60');
    expect(first.calculation?.dose).toBeNull();
    expect(first.answer).toContain('كم غرام بن');
    const second = await ask('15 غرام', [first]);
    expect(second.answer).toContain('135 g');
  });
  it('asks for a missing method then finishes the same calculation', async () => {
    const first = await ask('15 غرام كم ماء وثلج');
    expect(first.calculation?.method).toBeNull();
    const second = await ask('V60', [first]);
    expect(second.answer).toContain('135 g');
  });
  it.each(['0', '-15', '1001'])('rejects invalid doses: %s', async dose => {
    const turn = await ask(`${dose} g coffee how much water and ice for V60`);
    expect(turn.answer).toContain('أكبر من صفر');
    expect(turn.answer).not.toContain('60%');
  });
  it('supports decimal and Arabic digit quantities', async () => {
    const turn = await ask('١٥٫٥ غرام قهوة كم ماء وثلج للـV60 بنسبة ١:١٦');
    expect(turn.answer).toContain('148.8 g');
    expect(turn.answer).toContain('99.2 g');
    expect(turn.answer).toContain('248 g');
  });
  it.each(['espresso', 'moka pot', 'cold brew', 'xBloom'])('does not apply V60 ice splits to %s', async method => {
    const turn = await ask(`15g coffee how much water and ice for ${method}`);
    expect(turn.answer).not.toContain('135 g');
    expect(turn.answer).toContain('اذكر طريقة التحضير');
  });
  it.each(['ما هو عسر الماء للقهوة؟', 'اشرح TDS للماء', 'What is the best water for V60?'])('preserves water quality lessons: %s', async question => {
    expect((await ask(question)).intent).toBe('knowledge');
  });
  it('does not mistake the weight of ice for coffee', async () => {
    expect((await ask('90 g ice how much water for V60')).calculation?.dose).toBeNull();
    expect((await ask('ice 90 g coffee 15 g how much water for V60')).calculation?.dose).toBe(15);
  });
  it('does not reuse an espresso ratio for a new iced V60', async () => {
    const first = await ask('احسب اسبرسو 18 g 1:2');
    const second = await ask('15g coffee how much water and ice for V60', [first]);
    expect(second.calculation?.ratio).toBe(15);
  });
  it('keeps cold brew ratio arithmetic separate from flash-chilled coffee', async () => {
    const turn = await ask('calculate cold brew 30g coffee 1:8');
    expect(turn.answer).toContain('240 g');
    expect(turn.calculation?.servingStyle).toBeUndefined();
  });
});
