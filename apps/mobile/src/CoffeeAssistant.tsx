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
import { publicSupabase } from "./client";
import {
  assistantRecipeServingStyle,
  assistantSafeUrl,
} from "./core/coffee-assistant";
import {
  converseLocally,
  localAssistantSearchTerms,
  localAssistantSources,
  type LocalAssistantTurn,
} from "./core/local-coffee-assistant";
import methodGuides from "./methodGuides.json";
import { factLabels } from "./core/equipment-facts";
import { useReducedMotion } from "./Motion";

export type AssistantTurn = LocalAssistantTurn & { localization?: MessageTrace };
export function CoffeeAssistant({
  turns,
  setTurns,
  openItem,
}: {
  turns: AssistantTurn[];
  setTurns: (turns: AssistantTurn[]) => void;
  openItem: (kind: "equipment" | "recipe", id: string) => void;
}) {
  const i18nUi = useLabels();
  const locale = useContext(Language),
    ar = locale === "ar";
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  const list = useRef<ScrollView>(null);
  const reduced = useReducedMotion();
  const [expandedResults, setExpandedResults] = useState<
    Record<number, boolean>
  >({});
  const [expandedHistory, setExpandedHistory] = useState<
    Record<number, boolean>
  >({});
  useEffect(() => {
    if (!turns.length) return;
    const frame = requestAnimationFrame(() =>
      list.current?.scrollToEnd({ animated: !reduced }),
    );
    return () => cancelAnimationFrame(frame);
  }, [turns, reduced]);
  useEffect(
    () => () => {
      active.current?.abort();
    },
    [],
  );
  async function ask(message = question, displayQuestion = message) {
    const text = message.trim();
    if (!text || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    try {
      const trace = createMessageTrace(randomUUID());
      const turn = await converseLocally(assistantInput(locale, text), contentLocale(locale), turns, {
        translate: trace.label,
        translateValue: trace.value,
        guides: methodGuides,
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
      if (controller.signal.aborted) return;
      const localization = trace.snapshot(turn.answer, turn.suggestions, turn.followUp);
      const canonical = (text:string) => tracedMessage(localization,text,contentLocale(locale));
      setTurns([...turns, { ...turn, question: displayQuestion.trim().slice(0,1000), answer: canonical(turn.answer), suggestions: turn.suggestions?.map(canonical), followUp: turn.followUp ? canonical(turn.followUp) : undefined, localization }].slice(-6));
      setQuestion("");
      setExpandedResults({});
      setExpandedHistory({});
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
          <View key={index} style={{ gap: 12 }}>
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
            {index < turns.length - 1 ? (
              <Action
                compact
                title={
                  expandedHistory[index]
                    ? ar
                      ? "طي الإجابة"
                      : i18nUi("طي الإجابة", "Collapse answer")
                    : ar
                      ? "عرض الإجابة"
                      : i18nUi("عرض الإجابة", "Show answer")
                }
                onPress={() =>
                  setExpandedHistory((state) => ({
                    ...state,
                    [index]: !state[index],
                  }))
                }
              />
            ) : null}
            {index === turns.length - 1 || expandedHistory[index] ? (
              <View accessibilityLiveRegion="polite" style={{ gap: 10 }}>
                <Txt style={styles.muted}>
                  {ar ? "خبير القهوة" : i18nUi("خبير القهوة", "Coffee expert")}
                </Txt>
                <Txt>{turn.localization ? tracedMessage(turn.localization,turn.localization.answer,locale) : systemText(locale,turn.answer)}</Txt>
                {(expandedResults[index]
                  ? turn.matches
                  : turn.matches.slice(0, 3)
                ).map((match, resultIndex) => (
                  <View
                    key={match.document.kind + match.document.id}
                    testID="assistant-result"
                    style={styles.card}
                  >
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
                {localAssistantSources(turn).map((source) => (
                  <Action
                    key={source.url}
                    title={source.title}
                    onPress={() => void visit(source.url)}
                  />
                ))}
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
            ) : null}
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
                setTurns([]);
                setQuestion("");
                setError("");
                setExpandedResults({});
                setExpandedHistory({});
              }}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}
