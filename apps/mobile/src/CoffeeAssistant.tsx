import { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, View } from './native';
import { Action, Field, Icon, Language, Txt, colors, styles } from './ui';
import { assistantApi, publicSupabase } from './client';
import { assistantReply, assistantSafeUrl, assistantSearchTerms, assistantTermLabel, parseAssistantQuery, rankAssistantDocuments, type AssistantDocument, type AssistantMatch, type AssistantQuery, type CatalogRate } from './core/coffee-assistant';
import { factLabels } from './core/equipment-facts';

export interface AssistantTurn { question: string; answer: string; query: AssistantQuery; matches: AssistantMatch[]; mode: 'catalog' | 'ai'; followUp?: string }
export function CoffeeAssistant({ userId, login, turns, setTurns, openItem }: {
  userId: string | null; login: () => void; turns: AssistantTurn[]; setTurns: (turns: AssistantTurn[]) => void;
  openItem: (kind: 'equipment' | 'recipe', id: string) => void;
}) {
  const locale = useContext(Language), ar = locale === 'ar';
  const [question, setQuestion] = useState('');
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const list = useRef<ScrollView>(null);
  useEffect(() => {
    const status = new AbortController();
    void assistantApi(undefined, status.signal).then(result => { if (!status.signal.aborted) setEnabled((result as { conversation_enabled?: unknown }).conversation_enabled === true); }).catch(() => { if (!status.signal.aborted) setEnabled(false); });
    return () => { status.abort(); active.current?.abort(); };
  }, []);
  const previous = turns.at(-1);
  async function ask(message = question) {
    const text = message.trim();
    if (!text || active.current || !publicSupabase) return;
    const controller = new AbortController(); active.current = controller;
    setBusy(true); setError('');
    try {
      let turn: AssistantTurn | undefined;
      if (enabled && userId) {
        const result = await assistantApi({ question: text, locale, history: turns.slice(-6).map(item => ({ question: item.question, resultIds: item.matches.map(match => match.document.id) })) }, controller.signal) as Partial<AssistantTurn>;
        if (result.mode === 'ai' && typeof result.answer === 'string' && result.query && Array.isArray(result.matches)) turn = { question: text, answer: result.answer, query: result.query, matches: result.matches.slice(0,6), mode: 'ai', followUp: result.followUp };
      }
      if (!turn) {
        const query = parseAssistantQuery(text, previous?.query);
        let documents: AssistantDocument[] = [], rates: CatalogRate[] = [];
        if (!query.clarification) {
          const [result, exchange] = await Promise.all([
            publicSupabase.rpc('search_coffee_assistant', { p_terms: assistantSearchTerms(query), p_kind: query.kind, p_methods: query.methods, p_category: query.category, p_limit: query.kind === 'equipment' ? 200 : 60 }).abortSignal(controller.signal),
            publicSupabase.from('catalog_currency_rates').select('currency,kwd_per_unit,observed_at,source_url').abortSignal(controller.signal),
          ]);
          if (result.error) throw new Error('CATALOG_UNAVAILABLE');
          documents = result.data ?? []; rates = exchange.error ? [] : exchange.data ?? [];
        }
        const matches = rankAssistantDocuments(documents, query, rates);
        turn = { question: text, query, matches, answer: assistantReply(query, matches, locale), mode: 'catalog' };
      }
      if (controller.signal.aborted) return;
      setTurns([...turns, turn].slice(-6)); setQuestion('');
    } catch (reason) {
      if (!controller.signal.aborted) {
        const code = reason instanceof Error ? reason.message : '';
        setError(code === 'RATE_LIMIT' ? (ar ? 'وصلت لحد المحادثة مؤقتًا. حاول لاحقًا.' : 'Conversation limit reached. Try again later.') : code === 'SIGN_IN_REQUIRED' ? (ar ? 'سجّل دخولك مرة ثانية للمحادثة.' : 'Sign in again to use conversation.') : (ar ? 'تعذّر إكمال الطلب. سؤالك محفوظ هنا؛ حاول مرة ثانية.' : 'Could not complete your request. Your question is kept here; try again.'));
        setQuestion(text);
      }
    } finally {
      if (active.current === controller) { active.current = null; setBusy(false); }
    }
  }
  function cancel() { active.current?.abort(); active.current = null; setBusy(false); }
  async function visit(value: unknown) {
    const url = assistantSafeUrl(value);
    if (!url) return;
    try { await Linking.openURL(url); } catch { setError(ar ? 'تعذّر فتح الرابط.' : 'Could not open the link.'); }
  }
  return <View testID="coffee-assistant" style={{ flex: 1 }}>
    <ScrollView ref={list} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 16, width: '100%', maxWidth: 820, alignSelf: 'center' }}>
      <View style={{ gap: 8 }}>
        <View style={[styles.row, { justifyContent: 'space-between', flexDirection: ar ? 'row-reverse' : 'row' }]}>
          <Txt heading style={styles.title}>{ar ? 'مساعد القهوة' : 'Coffee assistant'}</Txt>
          <Icon name="star" color={colors.copper} size={30} />
        </View>
        <Txt>{ar ? 'من اختيار معدتك إلى وصفتك القادمة، ابحث في بيانات BeanMora ومصادرها.' : 'From your next machine to your next recipe, explore BeanMora’s catalog and sources.'}</Txt>
        <Txt style={styles.muted}>{enabled && userId ? (ar ? 'محادثة ذكية مرتبطة بالكتالوغ' : 'AI conversation grounded in the catalog') : enabled === null ? (ar ? 'جارٍ التحقق من المحادثة…' : 'Checking conversation availability…') : enabled ? (ar ? 'البحث متاح للجميع. سجّل الدخول للمحادثة الذكية.' : 'Catalog search is available to everyone. Sign in for AI conversation.') : (ar ? 'بحث وترشيح من الكتالوغ. المحادثة الذكية غير مفعّلة حاليًا.' : 'Catalog search and recommendations. AI conversation is not enabled yet.')}</Txt>
        {enabled && !userId ? <Action title={ar ? 'تسجيل الدخول للمحادثة' : 'Sign in to chat'} onPress={login} /> : null}
      </View>
      {!turns.length ? <View style={{ gap: 8 }}>
        <Txt heading>{ar ? 'جرّب تسأل' : 'Try asking'}</Txt>
        {(ar ? ['أبي ماكينة إسبريسو تحت 480 دولار', 'عندي بن بإيحاء فراولة وكولا، أبي وصفة', 'محامص في الكويت'] : ['Espresso machine under 480 USD', 'Recipe with strawberry and cola notes', 'Roasters in Kuwait']).map(example => <Action key={example} title={example} disabled={busy} onPress={() => { setQuestion(example); void ask(example); }} />)}
      </View> : null}
      {turns.map((turn, index) => <View key={index} style={{ gap: 12 }}>
        <View style={[styles.card, { backgroundColor: colors.chip, alignSelf: ar ? 'flex-start' : 'flex-end', maxWidth: '94%' }]}><Txt>{turn.question}</Txt></View>
        <View accessibilityLiveRegion="polite" style={{ gap: 10 }}>
          <Txt style={styles.muted}>{turn.mode === 'ai' ? (ar ? 'محادثة ذكية' : 'AI conversation') : (ar ? 'نتيجة من الكتالوغ' : 'Catalog result')}</Txt>
          <Txt>{turn.answer}</Txt>
          {turn.matches.map(match => <View key={match.document.kind + match.document.id} testID="assistant-result" style={styles.card}>
            <Txt heading style={styles.subtitle}>{ar ? match.document.title_ar || match.document.title_en : match.document.title_en || match.document.title_ar}</Txt>
            <Txt>{(ar ? match.document.summary_ar : match.document.summary_en)?.slice(0,360)}</Txt>
            {match.matchedTerms.length ? <Txt style={styles.muted}>{match.allTerms ? (ar ? 'يطابق الإيحاءات المطلوبة: ' : 'Matches all requested notes: ') : (ar ? 'مطابقة جزئية: ' : 'Partial match: ')}{match.matchedTerms.map(term => assistantTermLabel(term, locale)).join(' · ')}</Txt> : null}
            {Object.entries(match.document.facts ?? {}).filter(([key,value]) => key in factLabels && (typeof value === 'string' || typeof value === 'number' || (Array.isArray(value) && value.length === 2 && value.every(item => typeof item === 'string')))).slice(0,4).map(([key,value]) => <Txt key={key}>{factLabels[key][ar ? 0 : 1]}: {String(Array.isArray(value) ? value[ar ? 0 : 1] : value)}</Txt>)}
            {match.price ? <View style={{ gap: 5 }}>
              <Txt heading>{match.price.offer.currency !== match.price.currency ? (ar ? 'تقريبًا ' : 'Approx. ') : ''}{match.price.converted.toLocaleString('en-US',{ maximumFractionDigits: match.price.currency === 'KWD' ? 3 : 2 })} {match.price.currency}</Txt>
              <Txt style={styles.muted}>{match.price.offer.availability === 'out_of_stock' ? (ar ? 'غير متوفر لدى البائع' : 'Out of stock at seller') : match.price.offer.availability === 'in_stock' ? (ar ? 'متوفر حسب آخر تحقق' : 'In stock at last check') : (ar ? 'التوفر يحتاج تأكيدًا من البائع' : 'Confirm availability with the seller')}{' · '}{match.price.offer.region}</Txt>
              <Txt style={styles.muted}>{ar ? 'آخر تحقق: ' : 'Last checked: '}{new Date(match.price.offer.checked_at).toLocaleDateString('en-GB')}{ar ? ' · السعر قبل الشحن والرسوم' : ' · Before shipping and duties'}</Txt>
              <Action title={ar ? 'السعر وموقع البائع' : 'Price and seller website'} onPress={() => void visit(match.price?.offer.url)} />
            </View> : match.document.kind === 'equipment' ? <Txt style={styles.muted}>{ar ? 'لا يتوفر سعر حديث موثق لهذا الخيار.' : 'No recent verified price for this option.'}</Txt> : null}
            <View style={styles.row}>
              {match.document.kind === 'equipment' || match.document.kind === 'recipe' ? <Action title={ar ? 'عرض التفاصيل' : 'View details'} onPress={() => openItem(match.document.kind as 'equipment'|'recipe', match.document.id)} /> : null}
              {assistantSafeUrl(match.document.source_url) ? <Action title={ar ? 'المصدر الأصلي' : 'Original source'} onPress={() => void visit(match.document.source_url)} /> : null}
            </View>
          </View>)}
          {turn.followUp ? <Txt>{turn.followUp}</Txt> : null}
        </View>
      </View>)}
      {busy ? <View accessibilityLiveRegion="polite" style={styles.row}><ActivityIndicator color={colors.brown} /><Txt>{ar ? 'جارٍ البحث عن الخيارات…' : 'Finding your options…'}</Txt><Action title={ar ? 'إلغاء' : 'Cancel'} onPress={cancel} /></View> : null}
      {error ? <Txt style={styles.error}>{error}</Txt> : null}
      <View style={[styles.card, { gap: 10 }]}>
        <Field label={ar ? 'سؤالك عن القهوة' : 'Your coffee question'} placeholder={ar ? 'المعدة، الميزانية وعملتها، أو إيحاءات بنّك…' : 'Equipment, budget and currency, or your tasting notes…'} value={question} onChangeText={setQuestion} multiline maxLength={1000} editable={!busy} style={{ minHeight: 86 }} />
        <Action title={ar ? 'إرسال' : 'Send'} selected disabled={busy || !question.trim()} onPress={() => void ask()} />
        {turns.length ? <Action title={ar ? 'محادثة جديدة' : 'New conversation'} disabled={busy} onPress={() => { setTurns([]); setQuestion(''); setError(''); }} /> : null}
      </View>
    </ScrollView>
  </View>;
}
