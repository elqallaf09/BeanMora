import { describe, expect, it } from 'vitest';
import { converseLocally, type LocalAssistantTurn } from './local-coffee-assistant';

const ask = (question: string, history: LocalAssistantTurn[] = []) => converseLocally(question, 'ar', history, {
  search: async () => { throw new Error('Quantity answers must work offline'); },
});

describe('coffee water and ice quantities', () => {
  it.each(['مثلج v60', 'v-60 مثلج', 'ابيها بالـV60 مثلجة', 'متلج V60', 'iced V60'])('continues the reported preparation question: %s', async followUp => {
    const first = await ask('١٥ غرام قهوة ل v-60 شلون اسويها و جم احط ماي؟');
    expect(first.calculation).toMatchObject({ dose: 15, method: 'v60', ratio: null });
    expect(first.answer).toContain('هل تريده حارًا أم بالثلج');
    expect(first.answer).not.toContain('حدد وزن البن');
    const second = await ask(followUp, [first]);
    expect(second.calculation).toMatchObject({ dose: 15, ratio: 15, method: 'v60', servingStyle: 'iced' });
    expect(second.answer).toContain('الماء الساخن: 135 g');
    expect(second.answer).toContain('الثلج: 90 g');
    expect(second.answer).toContain('طريقة التحضير');
    expect(second.answer).toContain('0:00 — 37.5 g');
    expect(second.answer).toContain('0:45 — 52.5 g');
    expect(second.answer).toContain('1:30 — 45 g');
    expect(second.matches).toEqual([]);
  });
  it('asks for a fresh dose when iced V60 is the first message', async () => {
    const first = await ask('مثلج V60');
    expect(first.calculation).toMatchObject({ dose: null, method: 'v60', servingStyle: 'iced' });
    expect(first.answer).toContain('كم غرام بن');
    const second = await ask('15', [first]);
    expect(second.answer).toContain('الماء الساخن: 135 g');
  });
  it('gives a practical hot answer and preserves an explicitly chosen ratio when switching serving', async () => {
    const first = await ask('15 غرام V60 شلون اسويها؟');
    const hot = await ask('حار V60', [first]);
    expect(hot.answer).toContain('الماء الساخن: 225 g');
    expect(hot.answer).toContain('طريقة التحضير');
    expect(hot.sources?.[0].url).toContain('v60-4-6-method');
    const ratio = await ask('غير النسبة إلى 1:16', [hot]);
    const iced = await ask('مثلج v-60', [ratio]);
    expect(iced.calculation?.ratio).toBe(16);
    expect(iced.answer).toContain('الماء الساخن: 144 g');
    expect(iced.answer).toContain('الثلج: 96 g');
  });
  it('shows batch totals without single-cup pouring instructions for the 150 g reading of the screenshot', async () => {
    const first = await ask('150 غرام قهوة ل v-60 شلون اسويها و جم احط ماي؟');
    const iced = await ask('مثلج v60', [first]);
    expect(iced.answer).toContain('الماء الساخن: 1350 g');
    expect(iced.answer).toContain('الثلج: 900 g');
    expect(iced.answer).toContain('قسّمها إلى دفعات');
    expect(iced.answer).not.toContain('0:00');
  });
  it('does not turn a new recommendation into a continuation of the calculation', async () => {
    const first = await ask('15 g V60 iced');
    const next = await converseLocally('رشح لي بن للقهوة الباردة 15 غرام', 'ar', [first], {
      search: async () => ({ documents: [], rates: [] }),
    });
    expect(next.intent).toBe('search');
    expect(next.calculation).toBeUndefined();
  });
  it.each([
    '١٥ غرام بن ابيها قهوه باردة جم ماي احط و جم ثلج؟',
    '15 غرام بن + قهوة بالثلج',
    '15 جم بن أبيها باردة',
    '15 غرام بن أبغيها قهوة باردة',
    '15 غرام بن أبغاها بالثلج',
    '15 غرام بن أباها باردة',
  ])('keeps the reported Gulf brew description and asks only for the brewer: %s', async question => {
    const first = await ask(question);
    expect(first.intent).toBe('calculate');
    expect(first.calculation).toMatchObject({ dose: 15, method: null, servingStyle: 'iced' });
    expect(first.answer).toContain('15 g');
    expect(first.answer).toContain('ما طريقة التحضير');
    expect(first.answer).not.toMatch(/كم غرام|هل تريده|ضغط|لم أجد بن/);
    const second = await ask('استخدم V60', [first]);
    expect(second.calculation).toMatchObject({ dose: 15, method: 'v60', servingStyle: 'iced' });
    expect(second.answer).toContain('135 g');
    expect(second.answer).toContain('90 g');
  });
  it.each([
    '15 غرام بن للV60 جم ماي وجم ثلج؟',
    '15 غرام بن V60 جم أحط ماي وثلج؟',
    '15 غرام بن V60 شكثر أحط ماي وثلج؟',
    '15 غرام بن V60 اشكثر ماي وثلج يحتاج؟',
    '15 غرام بن V60 كم أحط موية وثلج؟',
    '15 غرام بن V60 كم مويا وثلج أحط؟',
    '15 غرام بن V60 كم أضيف من المويه والثلج؟',
    '15 غرام بن V60 الماي جم أحط وثلج؟',
    '15 غرام بن V60 كم يحتاج ماي وثلج؟',
    '15 غرام بن V60 كم غرام من الماي والثلج؟',
  ])('calculates Gulf quantity phrasing offline: %s', async question => {
    const turn = await ask(question);
    expect(turn.intent).toBe('calculate');
    expect(turn.calculation?.dose).toBe(15);
    expect(turn.answer).toContain('135 g');
    expect(turn.answer).toContain('90 g');
    expect(turn.knowledgeTopic).toBeUndefined();
  });
  it('keeps a missing-dose question through a Gulf brewer follow-up', async () => {
    const first = await ask('غرام بن ابيها قهوه باردة جم ماي احط و جم ثلج؟');
    expect(first.calculation).toMatchObject({ dose: null, method: null, servingStyle: 'iced' });
    expect(first.answer).toContain('كم غرام بن');
    const method = await ask('على V60', [first]);
    expect(method.answer).toContain('كم غرام بن');
    const final = await ask('١٥ جم', [method]);
    expect(final.calculation?.dose).toBe(15);
    expect(final.answer).toContain('135 g');
    expect(final.answer).toContain('90 g');
  });
  it('accepts a Gulf brewer reply with an attached preposition', async () => {
    const first = await ask('15 غرام بن + قهوة بالثلج');
    const second = await ask('بالV60', [first]);
    expect(second.answer).toContain('135 g');
    expect(second.calculation?.method).toBe('v60');
  });
  it('keeps جم as a gram unit when it follows a number', async () => {
    const turn = await ask('15 جم ماي');
    expect(turn.intent).toBe('knowledge');
    expect(turn.knowledgeTopic).toBe('water');
  });
  it('does not mistake the 60 in V60 for a gram quantity', async () => {
    const turn = await ask('V60 جم ماي وثلج؟');
    expect(turn.calculation?.dose).toBeNull();
    expect(turn.answer).toContain('كم غرام بن');
  });
  it.each(['أبي وصفة باردة 15 غرام بن', 'رشح لي بن للقهوة الباردة 15 غرام'])('preserves explicit catalog requests with a dose: %s', async question => {
    let searched = false;
    const turn = await converseLocally(question, 'ar', [], { search: async () => { searched = true; return { documents: [], rates: [] }; } });
    expect(searched).toBe(true);
    expect(turn.intent).toBe('search');
  });
  it.each(['حامضة', 'مرة'])('preserves a measured cold-cup taste complaint: %s', async symptom => {
    const turn = await ask(`15 غرام قهوة V60 باردة ${symptom}`);
    expect(turn.intent).toBe('coach');
  });
  it.each(['موية 135 غرام', '135 جم مويا', 'الماي 135 غرام', 'ثلج 90 جم'])('never treats a Gulf water/ice weight as a coffee dose: %s', async weight => {
    const turn = await ask(`${weight} V60 جم ماي وثلج؟`);
    expect(turn.calculation?.dose).toBeNull();
    expect(turn.answer).toContain('كم غرام بن');
  });
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
