import { describe, expect, it, vi } from 'vitest';
import { converseLocally } from './local-coffee-assistant';
import { ESPRESSO_CONTROLS_TOPIC } from './espresso-control-advice';
import { assistantInput } from '../../apps/mobile/src/assistantInput';
import { localeLabel, type Locale } from '../../apps/mobile/src/localeText';

const empty = { search: async () => ({ documents: [], rates: [] }) };
const offline = { search: async () => { throw new Error('Feature advice must not depend on a catalog match'); } };
const localizedQuestions: [Locale, string, string][] = [
  ['fr', 'Je veux une machine espresso avec contrôle de la température et de la pression', 'température'],
  ['it', 'Voglio una macchina espresso con controllo della temperatura e della pressione', 'temperatura'],
  ['es', 'Quiero una máquina espresso con control de temperatura y presión', 'temperatura'],
  ['pt-BR', 'Quero uma máquina espresso com controle de temperatura e pressão', 'temperatura'],
  ['ja', '温度と圧力を調整できるエスプレッソマシンが欲しい', '温度'],
  ['zh-CN', '我想要可以控制温度和压力的意式咖啡机', '温度'],
];
describe('espresso machine control requirements', () => {
  it.each(localizedQuestions)('understands and answers the control request in %s', async (locale, question, temperature) => {
    const turn = await converseLocally(assistantInput(locale, question), 'en', [], {
      ...offline, translate: (ar, en) => localeLabel(locale, ar, en),
    });
    expect(turn.knowledgeTopic).toBe(ESPRESSO_CONTROLS_TOPIC);
    expect(turn.answer).toContain(temperature);
    expect(turn.answer).toContain('Profitec DRIVE');
    expect(turn.answer).not.toMatch(/You need adjustable|not confirmed offers|تحتاج ماكينة/);
    expect(turn.followUp).not.toBe('What is your budget and currency?');
  });
  it.each([
    'ابي مكينة اسبريسو اقدر اتحكم بالحرارة والضغط',
    'أبي ماكينة إسبريسو أقدر أتحكم بالحرارة والضغط',
    'أريد ماكينة إسبريسو مع تحكم بالحرارة والضغط',
    'أبي أشتري مكينة اسبريسو اقدر اتحكم بالحرارة والضغط',
    'I want an espresso machine with adjustable temperature and pressure',
    'Find an espresso machine with temperature and flow control',
    'Buy an espresso machine with PID and pressure profiling',
  ])('answers the requirements rather than looking for a product named %s', async question => {
    const locale = /[\u0600-\u06FF]/.test(question) ? 'ar' : 'en';
    const turn = await converseLocally(question, locale, [], offline);
    expect(turn).toMatchObject({ intent: 'knowledge', knowledgeTopic: ESPRESSO_CONTROLS_TOPIC, matches: [], query: { kind: 'equipment', category: 'espresso_machine', terms: [] } });
    expect(turn.answer).toContain('PID');
    expect(turn.answer).toContain('Profitec DRIVE');
    expect(turn.answer).toContain('Decent DE1');
    expect(turn.answer).toContain(locale === 'ar' ? 'ليس ضبطًا مباشرًا للضغط' : 'not direct pressure control');
    expect(turn.answer).toContain(locale === 'ar' ? 'ليست عروضًا مؤكدة' : 'not confirmed offers');
    expect(turn.followUp).toContain(locale === 'ar' ? 'ميزانيتك' : 'budget');
    expect(turn.sources?.map(s => new URL(s.url).hostname)).toEqual(['www.profitec-espresso.com', 'en.decentespresso.com']);
  });
  it('retains budget and feature context on a short follow-up without inventing a priced match', async () => {
    const first = await converseLocally('ابي مكينة اسبريسو اقدر اتحكم بالحرارة والضغط', 'ar', [], offline);
    const budget = await converseLocally('٣٠٠ دينار', 'ar', [first], offline);
    expect(budget.query).toMatchObject({ amount: 300, currency: 'KWD', category: 'espresso_machine', terms: [] });
    expect(budget.knowledgeTopic).toBe(ESPRESSO_CONTROLS_TOPIC);
    expect(budget.matches).toEqual([]);
    expect(budget.answer).toContain('ليست عروضًا مؤكدة ضمن ميزانيتك');
    expect(budget.followUp).not.toContain('كم ميزانيتك');
    const more = await converseLocally('اشرح أكثر', 'ar', [budget], offline);
    expect(more.answer).toContain('حفظ منحنى');
    expect(more.answer).not.toBe(budget.answer);
  });
  it('asks for currency before using an ambiguous budget', async () => {
    const first = await converseLocally('I want an espresso machine with temperature and pressure control', 'en', [], offline);
    const amount = await converseLocally('300', 'en', [first], offline);
    expect(amount.query.clarification).toBe('currency');
    expect(amount.answer).toContain('Which budget currency');
    const currency = await converseLocally('KWD', 'en', [amount], offline);
    expect(currency.query).toMatchObject({ amount: 300, currency: 'KWD', clarification: null });
    expect(currency.answer).toContain('not confirmed offers');
  });
  it.each([
    'I want a Profitec GO espresso machine with temperature and pressure control',
    'Find a ZX900 espresso machine with temperature and pressure control',
    'أبي مكينة اسبريسو بدون تحكم بالحرارة والضغط',
    'أبي طاحونة اسبريسو',
    'أبي وصفة اسبريسو',
    'My espresso is sour',
    'What does 9 bar mean?',
  ])('keeps names, negation and other intents out of generic advice: %s', async question => {
    const turn = await converseLocally(question, 'en', [], empty);
    expect(turn.knowledgeTopic).not.toBe(ESPRESSO_CONTROLS_TOPIC);
  });
  it('starts a new topic after advice without retaining a stale equipment budget', async () => {
    const first = await converseLocally('I want an espresso machine with temperature and pressure control under 300 KWD', 'en', [], offline);
    const lookup = vi.fn(empty.search);
    const next = await converseLocally('Find an iced V60 recipe', 'en', [first], { search: lookup });
    expect(next.query).toMatchObject({ kind: 'recipe', methods: ['v60'], amount: null, currency: null });
    expect(lookup).toHaveBeenCalled();
    expect(next.knowledgeTopic).not.toBe(ESPRESSO_CONTROLS_TOPIC);
  });
});
