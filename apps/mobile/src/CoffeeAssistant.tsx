import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLabels } from './ui';
import { contentLocale } from "./localeText";
import { systemText } from './localeText';
import { randomUUID } from 'expo-crypto';
import { createMessageTrace, tracedMessage, type MessageTrace } from './messageTrace';
import { assistantInput } from './assistantInput';
import { assistantCatalogSummary, assistantCatalogFact } from './assistantCatalogText';
import { useContext, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, View } from "./native";
import { Action, Field, Language, Txt, colors, styles } from "./ui";
import { publicSupabase, supabase, catalogScope } from "./client";
import { CoffeeAssistantError, readCoffeeConsent, saveCoffeeConsent, converseRemotely, type ConsentChoice, type AssistantFailure, type CoffeeAssistantTurn } from './coffeeAssistantRemote';
import { CoffeeConsentChoice } from './CoffeeConsentChoice';
import { assistantPreferenceKey, defaultAssistantPreference, readAssistantPreference, resolveCoffeeAnswer, saveAssistantAvailability, saveAssistantPreference, type AssistantPreference } from './coffeeAssistantPolicy';
import { loadCoffeeLessonContent } from './coffeeLessonContent';
import {
  assistantRecipeServingStyle,
  assistantSafeUrl,
} from "./core/coffee-assistant";
import {
  converseLocally,
  localAssistantSearchTerms,
  localAssistantSources,
} from "./core/local-coffee-assistant";
import methodGuides from "./methodGuides.json";
import { factLabels } from "./core/equipment-facts";
import { useReducedMotion } from "./Motion";

export type AssistantTurn = CoffeeAssistantTurn & { localization?: MessageTrace };
function AnswerText({ text }: { text: string }) {
  const ar = useContext(Language) === 'ar';
  return <View style={{ gap: 14 }}>{text.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => {
    const lines = paragraph.split('\n');
    const amounts = lines.map(line => line.match(/^(.+?[:：])\s+(\d[\d\s.,:–/-]*(?:g|ml|°C|s)?)$/));
    if (lines.length > 1 && amounts.every(Boolean)) return <View key={index} style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
      {amounts.map((amount, i) => <View key={i} style={{ flexBasis: 100, flexGrow: 1, backgroundColor: colors.chip, borderRadius: 12, padding: 10, gap: 5 }}>
        <Txt style={{ fontSize: 13, lineHeight: 19 }}>{amount![1]} </Txt>
        <Txt style={{ fontSize: 19, fontWeight: '700', writingDirection: 'ltr', textAlign: ar ? 'right' : 'left' }}>{amount![2]}</Txt>
      </View>)}
    </View>;
    const heading = lines[0].length < 80 && !/[:：]|^\d+[.)]/.test(lines[0]) && (index === 0 || lines.length > 1);
    return <View key={index} style={{ gap: 5 }}>{lines.map((line, lineIndex) =>
      <Txt key={lineIndex} heading={heading && lineIndex === 0} style={{ lineHeight: 25, ...(heading && lineIndex === 0 ? { fontWeight: '700' } : {}), ...(/^\d+:\d+ —|^\d[\d.,]*(?:[–-]\d[\d.,]*)?\s+(?:KWD|USD|SAR)$/.test(line) ? { writingDirection: 'ltr', textAlign: ar ? 'right' : 'left' } as const : {}) }}>{line}</Txt>
    )}</View>;
  })}</View>;
}
export function CoffeeAssistant({
  turns,
  setTurns,
  openItem,
  signedIn = false,
}: {
  turns: AssistantTurn[];
  setTurns: (turns: AssistantTurn[]) => void;
  openItem: (kind: "equipment" | "recipe", id: string) => void;
  signedIn?: boolean;
}) {
  const i18nUi = useLabels();
  const locale = useContext(Language),
    ar = locale === "ar";
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [aiNotice, setAiNotice] = useState<AssistantFailure | ''>('');
  const [consentPrompt, setConsentPrompt] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const consentWrite = useRef<AbortController | null>(null);
  const remoteHistory = useRef<{ generation: string; turns: CoffeeAssistantTurn[] } | null>(null);
  const member = useRef<string | null>(null);
  const preference = useRef<AssistantPreference>(defaultAssistantPreference());
  const active = useRef<AbortController | null>(null);
  const list = useRef<ScrollView>(null);
  const revealedTurn = useRef<AssistantTurn | null>(null);
  const scrollFrame = useRef<number | null>(null);
  const reduced = useReducedMotion();
  const [expandedResults, setExpandedResults] = useState<
    Record<number, boolean>
  >({});
  useEffect(
    () => () => {
      active.current?.abort();
      consentWrite.current?.abort();
      if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    },
    [],
  );
  // Observe identity itself: an account switch may leave signedIn === true.
  useEffect(() => {
    let stopped = false, sessionEvents = 0;
    const accept = (id: string | null) => {
      if (stopped) return;
      if (member.current !== id) {
        active.current?.abort(); active.current = null;
        consentWrite.current?.abort(); consentWrite.current = null;
        remoteHistory.current = null;
        setConsentPrompt(false); setConsentSaving(false);
        setBusy(false); setAiNotice('');
        preference.current = defaultAssistantPreference();
        if (member.current) { setTurns([]); setQuestion(''); }
        member.current = id;
      }
    };
    if (!signedIn || !supabase) { accept(null); return; }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionEvents++;
      accept(session && !session.user.is_anonymous ? session.user.id : null);
    });
    const revision = sessionEvents;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (revision === sessionEvents) accept(session && !session.user.is_anonymous ? session.user.id : null);
    }).catch(() => { if (revision === sessionEvents) accept(null); });
    return () => { stopped = true; subscription.unsubscribe(); };
  }, [signedIn]);

  function persistPreference(owner: string, next: AssistantPreference) {
    if (member.current !== owner) return;
    preference.current = next;
    void saveAssistantAvailability(AsyncStorage, assistantPreferenceKey(catalogScope, owner), next);
  }
  const aiNoticeText = aiNotice === 'credits'
    ? i18nUi('المساعدة الذكية غير متاحة حاليًا بسبب حد الاستخدام. دليل القهوة متاح، ونتحقق تلقائيًا مع سؤالك القادم بعد فترة انتظار.', 'AI is currently unavailable because of a usage limit. The coffee guide is available; a later question checks again automatically after a waiting period.')
    : aiNotice === 'rate'
      ? i18nUi('وصلنا إلى حد الطلبات مؤقتًا. دليل القهوة يجاوبك الآن، وتعود المساعدة الذكية بعد الانتظار.', 'The request limit was reached temporarily. The coffee guide answers now; AI resumes after the waiting period.')
      : aiNotice === 'signin'
        ? i18nUi('سجّل الدخول مجددًا لاستخدام المساعدة الذكية. دليل القهوة متاح.', 'Sign in again to use AI assistance. The coffee guide is available.')
        : aiNotice === 'disabled'
          ? i18nUi('الإجابات الذكية غير متاحة على الخدمة حاليًا. يعرض خبير القهوة إجابة من الدليل، ويتحقق تلقائيًا مع سؤال لاحق.', 'Online AI answers are not currently enabled by the service. Coffee Expert uses the guide and checks automatically on a later question.')
        : aiNotice === 'unavailable'
          ? i18nUi('تعذّر الاتصال بالمساعدة الذكية مؤقتًا. رجعنا إلى دليل القهوة.', 'AI assistance is temporarily unavailable. We switched to the coffee guide.') : '';
  async function chooseConsent(choice: ConsentChoice) {
    const owner = member.current;
    if (!owner || consentWrite.current) return;
    const write = new AbortController();
    consentWrite.current = write;
    remoteHistory.current = null;
    setConsentSaving(true);
    setError('');
    try {
      if (choice === 'guide') void saveAssistantPreference(AsyncStorage, assistantPreferenceKey(catalogScope, owner), { ...defaultAssistantPreference(), optedOut: true });
      const session = (await supabase?.auth.getSession())?.data.session;
      if (write.signal.aborted || member.current !== owner || session?.user.id !== owner || session.user.is_anonymous) return;
      await saveCoffeeConsent({ url: catalogScope, publicKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
        accessToken: session.access_token, signal: write.signal }, choice, 'unset');
      if (!write.signal.aborted && member.current === owner) setConsentPrompt(false);
    } catch {
      if (!write.signal.aborted && member.current === owner && choice === 'allow') setConsentPrompt(false);
      if (!write.signal.aborted && member.current === owner) setError(i18nUi('تعذّر حفظ اختيارك. لا يزال دليل القهوة متاحًا.', 'Your choice could not be saved. The coffee guide is still available.'));
    } finally {
      if (consentWrite.current === write) { consentWrite.current = null; setConsentSaving(false); }
    }
  }
  async function ask(message = question, displayQuestion = message) {
    const text = message.trim();
    if (!text || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    try {
      const owner = member.current;
      const trace = createMessageTrace(randomUUID());
      const normalized = assistantInput(locale, text);
      const localHistory = turns.map(previous => ({ ...previous, mode: 'local' as const }));
      // Classification is offline and bounded; it cannot block the remote answer
      // behind a slow catalog call or a failed lesson download.
      const draft = await converseLocally(normalized, contentLocale(locale), localHistory, {
        guides: methodGuides, search: async () => ({ documents: [], rates: [] }),
      });
      const localAnswer = () => converseLocally(normalized, contentLocale(locale), localHistory, {
        translate: trace.label,
        translateValue: trace.value,
        guides: methodGuides,
        loadLessons: () => loadCoffeeLessonContent(controller.signal),
        search: async (query) => {
          if (!publicSupabase) throw new Error("CATALOG_UNAVAILABLE");
          const [result, exchange] = await Promise.all([
            publicSupabase
              .rpc(
                query.kind === "recipe"
                  ? "search_coffee_assistant_recipes"
                  : "search_coffee_assistant",
                {
                  p_terms: localAssistantSearchTerms(query),
                  p_methods: query.methods,
                  ...(query.kind === "recipe"
                    ? { p_serving_style: query.servingStyle ?? null }
                    : { p_kind: query.kind, p_category: query.category }),
                  p_limit: query.kind === "equipment" ? 200 : 60,
                },
              )
              .abortSignal(controller.signal),
            query.kind === "equipment"
              ? publicSupabase
                  .from("catalog_currency_rates")
                  .select("currency,kwd_per_unit,observed_at,source_url")
                  .abortSignal(controller.signal)
              : Promise.resolve({ data: [], error: null }),
          ]);
          if (result.error) throw new Error("CATALOG_UNAVAILABLE");
          return {
            documents: result.data ?? [],
            rates: exchange.error ? [] : (exchange.data ?? []),
          };
        },
      });
      // Settings and stored preferences are read for each submitted question.
      // A stale readiness result must never leave the expert permanently offline.
      if (owner) {
        const saved = await readAssistantPreference(AsyncStorage, assistantPreferenceKey(catalogScope, owner));
        if (controller.signal.aborted || member.current !== owner) return;
        preference.current = saved;
        if (saved.optedOut) setAiNotice('');
        else if (saved.creditPaused && saved.retryAt > Date.now()) setAiNotice('credits');
      }
      const turn = await resolveCoffeeAnswer({
        draft, available: signedIn && !!owner, preference: preference.current,
        signal: controller.signal,
        remote: async () => {
          const session = (await supabase?.auth.getSession())?.data.session;
          if (controller.signal.aborted || member.current !== owner) throw Object.assign(new Error('Request cancelled'), { name: 'AbortError' });
          if (!session || session.user.is_anonymous || session.user.id !== owner) throw new CoffeeAssistantError('signin');
          if (consentWrite.current) return null;
          const consent = await readCoffeeConsent({
            url: catalogScope, publicKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
            accessToken: session.access_token, signal: controller.signal,
          });
          if (controller.signal.aborted || member.current !== owner) throw Object.assign(new Error('Request cancelled'), { name: 'AbortError' });
          if (consentWrite.current) return null;
          if (!consent.generation || !consent.available) {
            remoteHistory.current = null;
            setConsentPrompt(consent.available && consent.choice === 'unset');
            if (!consent.available) throw new CoffeeAssistantError('disabled');
            return null;
          }
          // Settings may change during readiness. Honor existing local opt-outs.
          const latest = await readAssistantPreference(AsyncStorage, assistantPreferenceKey(catalogScope, owner));
          if (controller.signal.aborted || member.current !== owner) throw Object.assign(new Error('Request cancelled'), { name: 'AbortError' });
          if (latest.optedOut || consentWrite.current) return null;
          setConsentPrompt(false);
          const history = remoteHistory.current?.generation === consent.generation ? remoteHistory.current.turns : [];
          const answer = await converseRemotely(draft, history, locale, {
            url: catalogScope, publicKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
            accessToken: session.access_token, signal: controller.signal, question: displayQuestion, consentGeneration: consent.generation,
          });
          if (!controller.signal.aborted && member.current === owner && !consentWrite.current && answer?.mode === 'ai') {
            remoteHistory.current = { generation: consent.generation, turns: [...history, { ...answer, question: displayQuestion }].slice(-6) };
          }
          return answer;
        },
        local: localAnswer,
        onFallback: (reason, next) => {
          if (controller.signal.aborted || !owner || member.current !== owner) return;
          persistPreference(owner, next);
          setAiNotice(reason);
        },
        onRecovered: (next) => {
          if (controller.signal.aborted || !owner || member.current !== owner) return;
          persistPreference(owner, next);
          setAiNotice('');
        },
      });
      const usedAi = turn.mode === 'ai';
      if (usedAi && !controller.signal.aborted) setAiNotice('');
      if (controller.signal.aborted) return;
      const localization = usedAi ? undefined : trace.snapshot(turn.answer, turn.suggestions, turn.followUp);
      const canonical = (text:string) => localization ? tracedMessage(localization,text,contentLocale(locale)) : text;
      setTurns([...turns, { ...turn, question: displayQuestion.trim().slice(0,1000), answer: canonical(turn.answer), suggestions: turn.suggestions?.map(canonical), followUp: turn.followUp ? canonical(turn.followUp) : undefined, localization }].slice(-6));
      setQuestion("");
      setExpandedResults({});
    } catch {
      if (!controller.signal.aborted) {
        setError(
          ar
            ? "تعذّر الوصول لبيانات الكتالوغ الآن. تقدر تستخدم حساب النسب وإرشادات التحضير بدون اتصال. سؤالك محفوظ لإعادة المحاولة."
            : i18nUi("تعذّر الوصول لبيانات الكتالوغ الآن. تقدر تستخدم حساب النسب وإرشادات التحضير بدون اتصال. سؤالك محفوظ لإعادة المحاولة.", "Catalog data is unavailable right now. Ratio calculations and brewing guidance still work offline. Your question is kept for retry."),
        );
        setQuestion(text);
      }
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }
  function cancel() {
    active.current?.abort();
    active.current = null;
    setBusy(false);
  }
  async function visit(value: unknown) {
    const url = assistantSafeUrl(value);
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      setError(ar ? "تعذّر فتح الرابط." : i18nUi("تعذّر فتح الرابط.", "Could not open the link."));
    }
  }
  return (
    <View testID="coffee-assistant" style={{ flex: 1 }}>
      <ScrollView
        ref={list}
        style={{ flexGrow: turns.length ? 1 : 0, flexShrink: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 18,
          gap: 16,
          width: "100%",
          maxWidth: 720,
          alignSelf: "center",
        }}
      >
        {signedIn && consentPrompt ? <CoffeeConsentChoice firstQuestion disabled={busy || consentSaving} onChoice={choice => void chooseConsent(choice)} /> : null}
        {signedIn && aiNoticeText ? <View accessibilityLiveRegion="polite"><Txt style={styles.muted}>{aiNoticeText}</Txt></View> : null}
        {!turns.length ? (
          <View
            style={{
              flexDirection: ar ? "row-reverse" : "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {(ar
              ? [
                  "قهوتي V60 حامضة",
                  "أفضل ماء للقهوة؟",
                  "شلون أخزن البن؟",
                  "أبي ماكينة إسبريسو تحت 480 دولار",
                ]
              : [
                  i18nUi("قهوتي V60 حامضة", "My V60 tastes sour"),
                  i18nUi("أفضل ماء للقهوة؟", "Best water for coffee?"),
                  i18nUi("شلون أخزن البن؟", "How should I store beans?"),
                  i18nUi("أبي ماكينة إسبريسو تحت 480 دولار", "Espresso machine under 480 USD"),
                ]
            ).map((example) => (
              <Action
                compact
                key={example}
                title={example}
                disabled={busy}
                onPress={() => {
                  setQuestion(example);
                  void ask(example);
                }}
              />
            ))}
          </View>
        ) : null}
        {turns.map((turn, index) => (
          <View key={turn.localization?.nonce ?? `${index}:${turn.question}`} testID="assistant-turn" style={{ gap: 12 }} onLayout={(event) => {
            if (index !== turns.length - 1 || revealedTurn.current === turn) return;
            revealedTurn.current = turn;
            const y = event.nativeEvent.layout.y;
            if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
            scrollFrame.current = requestAnimationFrame(() => list.current?.scrollTo({ y, animated: !reduced }));
          }}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.chip,
                  alignSelf: ar ? "flex-start" : "flex-end",
                  maxWidth: "94%",
                },
              ]}
            >
              <Txt>{turn.question}</Txt>
            </View>
              <View testID={index === turns.length - 1 ? 'assistant-latest-answer' : 'assistant-history-answer'} accessibilityLiveRegion={index === turns.length - 1 ? 'polite' : 'none'} style={[styles.card, { gap: 14 }]}>
                <Txt style={styles.muted}>
                  {turn.mode === 'ai' ? i18nUi('خبير القهوة · بمساعدة الذكاء الاصطناعي', 'Coffee expert · AI assisted') : i18nUi('خبير القهوة · دليل القهوة المحلي', 'Coffee expert · Local coffee guide')}
                </Txt>
                <AnswerText text={turn.localization ? tracedMessage(turn.localization,turn.localization.answer,locale) : systemText(locale,turn.answer)} />
                {(expandedResults[index]
                  ? turn.matches
                  : turn.matches.slice(0, 3)
                ).map((match, resultIndex) => (
                  <View
                    key={match.document.kind + match.document.id}
                    testID="assistant-result"
                    style={styles.card}
                  >
                    {turn.equipmentAdvice ? <Txt style={styles.muted}>{i18nUi('مقارنة مواصفات — السعر والتوفر غير مؤكدين', 'Specification comparison — price and stock unconfirmed')}</Txt> : null}
                    <Txt heading style={styles.subtitle}>
                      {resultIndex + 1}.{" "}
                      {ar
                        ? match.document.title_ar || match.document.title_en
                        : match.document.title_en || match.document.title_ar}
                    </Txt>
                    {match.document.kind === "recipe" &&
                    assistantRecipeServingStyle(match.document) ? (
                      <Txt style={styles.muted}>
                        {assistantRecipeServingStyle(match.document) === "hot"
                          ? ar
                            ? "حار"
                            : i18nUi("حار", "Hot")
                          : ar
                            ? "بارد"
                            : i18nUi("بارد", "Cold")}
                      </Txt>
                    ) : null}
                    <Txt numberOfLines={2} style={styles.muted}>
                      {assistantCatalogSummary(locale, match.document.summary_ar, match.document.summary_en).slice(0, 180)}
                    </Txt>

                    {Object.entries(match.document.facts ?? {})
                      .filter(
                        ([key, value]) =>
                          key in factLabels &&
                          (typeof value === "string" ||
                            typeof value === "number" ||
                            (Array.isArray(value) &&
                              value.length === 2 &&
                              value.every((item) => typeof item === "string"))),
                      )
                      .slice(0, 4)
                      .map(([key, value]) => (
                        <Txt key={key}>
                          {i18nUi(factLabels[key][0],factLabels[key][1])}:{" "}
                          {assistantCatalogFact(locale,key,value)}
                        </Txt>
                      ))}
                    {match.price ? (
                      <View style={{ gap: 5 }}>
                        <Txt heading>
                          {match.price.offer.currency !== match.price.currency
                            ? ar
                              ? "تقريبًا "
                              : i18nUi("تقريبًا ", "Approx. ")
                            : ""}
                          {match.price.converted.toLocaleString(ar || locale==='en' ? 'en-US' : locale+'-u-nu-latn', {
                            maximumFractionDigits:
                              match.price.currency === "KWD" ? 3 : 2,
                          })}{" "}
                          {match.price.currency}
                        </Txt>
                        <Txt style={styles.muted}>
                          {match.price.offer.availability === "out_of_stock"
                            ? ar
                              ? "غير متوفر لدى البائع"
                              : i18nUi("غير متوفر لدى البائع", "Out of stock at seller")
                            : match.price.offer.availability === "in_stock"
                              ? ar
                                ? "متوفر حسب آخر تحقق"
                                : i18nUi("متوفر حسب آخر تحقق", "In stock at last check")
                              : ar
                                ? "التوفر يحتاج تأكيدًا من البائع"
                                : i18nUi("التوفر يحتاج تأكيدًا من البائع", "Confirm availability with the seller")}
                          {" · "}
                          {match.price.offer.region}
                        </Txt>
                        <Txt style={styles.muted}>
                          {ar ? "آخر تحقق: " : i18nUi("آخر تحقق: ", "Last checked: ")}
                          {new Date(
                            match.price.offer.checked_at,
                          ).toLocaleDateString(ar || locale==='en' ? 'en-GB' : locale+'-u-nu-latn')}
                          {ar
                            ? " · السعر قبل الشحن والرسوم"
                            : i18nUi(" · السعر قبل الشحن والرسوم", " · Before shipping and duties")}
                        </Txt>
                        <Action
                          title={
                            turn.query.purchaseIntent
                              ? ar
                                ? "موقع البائع"
                                : i18nUi("موقع البائع", "Seller website")
                              : ar
                                ? "السعر وموقع البائع"
                                : i18nUi("السعر وموقع البائع", "Price and seller website")
                          }
                          onPress={() => void visit(match.price?.offer.url)}
                        />
                      </View>
                    ) : match.document.kind === "equipment" ? (
                      <Txt style={styles.muted}>
                        {ar
                          ? "لا يتوفر سعر حديث موثق لهذا الخيار."
                          : i18nUi("لا يتوفر سعر حديث موثق لهذا الخيار.", "No recent verified price for this option.")}
                      </Txt>
                    ) : null}
                    {(match.purchaseLinks ?? [])
                      .filter(
                        (link) =>
                          link.url !== assistantSafeUrl(match.price?.offer.url),
                      )
                      .map((link) => (
                        <Action
                          key={link.url}
                          title={
                            (ar ? "موقع البائع: " : i18nUi("موقع البائع: ", "Seller website: ")) +
                            link.seller
                          }
                          onPress={() => void visit(link.url)}
                        />
                      ))}
                    <View style={styles.row}>
                      {match.document.kind === "equipment" ||
                      match.document.kind === "recipe" ? (
                        <Action
                          compact
                          title={ar ? "عرض التفاصيل" : i18nUi("عرض التفاصيل", "View details")}
                          onPress={() =>
                            openItem(
                              match.document.kind as "equipment" | "recipe",
                              match.document.id,
                            )
                          }
                        />
                      ) : null}
                      {!turn.query.purchaseIntent &&
                      assistantSafeUrl(match.document.source_url) ? (
                        <Action
                          compact
                          title={ar ? "المصدر الأصلي" : i18nUi("المصدر الأصلي", "Original source")}
                          onPress={() => void visit(match.document.source_url)}
                        />
                      ) : null}
                    </View>
                  </View>
                ))}
                {turn.matches.length > 3 ? (
                  <Action
                    compact
                    title={
                      expandedResults[index]
                        ? ar
                          ? "عرض أقل"
                          : i18nUi("عرض أقل", "Show less")
                        : ar
                          ? "نتائج إضافية"
                          : i18nUi("نتائج إضافية", "More results")
                    }
                    onPress={() =>
                      setExpandedResults((state) => ({
                        ...state,
                        [index]: !state[index],
                      }))
                    }
                  />
                ) : null}
                {turn.followUp ? <Txt>{turn.localization?.followUp ? tracedMessage(turn.localization,turn.localization.followUp,locale) : systemText(locale,turn.followUp)}</Txt> : null}
                <View style={styles.row}>{localAssistantSources({ ...turn, mode: 'local' }).map((source) => (
                  <Action
                    compact
                    key={source.url}
                    title={source.title}
                    onPress={() => void visit(source.url)}
                  />
                ))}</View>
                {index === turns.length - 1 ? (
                  <View
                    style={{
                      gap: 8,
                      flexDirection: ar ? "row-reverse" : "row",
                      flexWrap: "wrap",
                    }}
                  >
                    {turn.suggestions?.map((suggestion, suggestionIndex) => (
                      <Action
                        compact
                        key={suggestion}
                        title={turn.localization?.suggestions?.[suggestionIndex] ? tracedMessage(turn.localization,turn.localization.suggestions[suggestionIndex],locale) : systemText(locale,suggestion)}
                        disabled={busy}
                        onPress={() => void ask(suggestion, turn.localization?.suggestions?.[suggestionIndex] ? tracedMessage(turn.localization,turn.localization.suggestions[suggestionIndex],locale) : systemText(locale,suggestion))}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
          </View>
        ))}
        {busy ? (
          <View accessibilityLiveRegion="polite" style={styles.row}>
            <ActivityIndicator color={colors.brown} />
            <Txt>
              {ar ? "جارٍ البحث عن الخيارات…" : i18nUi("جارٍ البحث عن الخيارات…", "Finding your options…")}
            </Txt>
            <Action title={ar ? "إلغاء" : i18nUi("إلغاء", "Cancel")} onPress={cancel} />
          </View>
        ) : null}
        {error ? <Txt style={styles.error}>{error}</Txt> : null}
      </ScrollView>
      <View
        testID="assistant-composer"
        style={{
          width: "100%",
          maxWidth: 720,
          alignSelf: "center",
          backgroundColor: colors.paper,
          borderWidth: 1,
          borderRadius: 18,
          borderColor: colors.line,
          padding: 14,
          marginBottom: 14,
          gap: 8,
        }}
      >
        <Field
          label={ar ? "سؤالك عن القهوة" : i18nUi("سؤالك عن القهوة", "Your coffee question")}
          placeholder={ar ? "اسأل خبير القهوة…" : i18nUi("اسأل خبير القهوة…", "Ask the coffee expert…")}
          value={question}
          onChangeText={setQuestion}
          multiline
          maxLength={1000}
          editable={!busy}
          style={{ minHeight: 52, maxHeight: 110 }}
        />
        <View style={{ flexDirection: ar ? "row-reverse" : "row", gap: 8 }}>
          <Action
            compact
            title={ar ? "إرسال" : i18nUi("إرسال", "Send")}
            selected
            disabled={busy || !question.trim()}
            onPress={() => void ask()}
          />
          {turns.length ? (
            <Action
              compact
              title={ar ? "محادثة جديدة" : i18nUi("محادثة جديدة", "New conversation")}
              disabled={busy}
              onPress={() => {
                remoteHistory.current = null;
                setTurns([]);
                setQuestion("");
                setError("");
                setExpandedResults({});
              }}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}
