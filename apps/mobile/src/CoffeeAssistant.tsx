import { contentLocale } from './localeText';
import { useContext, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, View } from "./native";
import { Action, Field, Icon, Language, Txt, colors, styles } from "./ui";
import { publicSupabase } from "./client";
import { assistantSafeUrl } from "./core/coffee-assistant";
import {
  converseLocally,
  localAssistantSearchTerms,
  localAssistantSources,
  type LocalAssistantTurn,
} from "./core/local-coffee-assistant";
import methodGuides from "./methodGuides.json";
import { factLabels } from "./core/equipment-facts";
import { useReducedMotion } from "./Motion";
import { SelectionMenu } from './SelectionMenu';
import { coffeeCourseGroups, coffeeLearningTopics } from './core/coffee-knowledge';

export type AssistantTurn = LocalAssistantTurn;
export function CoffeeAssistant({
  turns,
  setTurns,
  openItem,
}: {
  turns: AssistantTurn[];
  setTurns: (turns: AssistantTurn[]) => void;
  openItem: (kind: "equipment" | "recipe", id: string) => void;
}) {
  const locale = useContext(Language),
    ar = locale === "ar";
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const learningTopics = coffeeLearningTopics(contentLocale(locale));
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
  async function ask(message = question) {
    const text = message.trim();
    if (!text || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    try {
      const turn = await converseLocally(text, contentLocale(locale), turns, {
        guides: methodGuides,
        search: async (query) => {
          if (!publicSupabase) throw new Error("CATALOG_UNAVAILABLE");
          const [result, exchange] = await Promise.all([
            publicSupabase
              .rpc("search_coffee_assistant", {
                p_terms: localAssistantSearchTerms(query),
                p_kind: query.kind,
                p_methods: query.methods,
                p_category: query.category,
                p_limit: query.kind === "equipment" ? 200 : 60,
              })
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
      setTurns([...turns, turn].slice(-6));
      setQuestion("");
      setExpandedResults({});
      setExpandedHistory({});
    } catch {
      if (!controller.signal.aborted) {
        setError(
          ar
            ? "تعذّر الوصول لبيانات الكتالوغ الآن. تقدر تستخدم حساب النسب وإرشادات التحضير بدون اتصال. سؤالك محفوظ لإعادة المحاولة."
            : "Catalog data is unavailable right now. Ratio calculations and brewing guidance still work offline. Your question is kept for retry.",
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
      setError(ar ? "تعذّر فتح الرابط." : "Could not open the link.");
    }
  }
  return (
    <View testID="coffee-assistant" style={{ flex: 1 }}>
      <ScrollView
        ref={list}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 18,
          gap: 16,
          width: "100%",
          maxWidth: 820,
          alignSelf: "center",
        }}
      >
        <View style={{ gap: 8 }}>
          <View
            style={[
              styles.row,
              {
                justifyContent: "space-between",
                flexDirection: ar ? "row-reverse" : "row",
              },
            ]}
          >
            <Txt heading style={styles.title}>
              {ar ? "خبير القهوة" : "Coffee expert"}
            </Txt>
            <Icon name="star" color={colors.copper} size={30} />
          </View>
          {!turns.length ? (
            <Txt style={styles.muted}>
              {ar
                ? "من اختيار البن إلى ضبط كوبك."
                : "From choosing beans to dialing in your cup."}
            </Txt>
          ) : null}
        </View>
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
                  "My V60 tastes sour",
                  "Best water for coffee?",
                  "How should I store beans?",
                  "Espresso machine under 480 USD",
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
        <SelectionMenu compact disabled={busy}
          label={ar ? 'مكتبة المعرفة' : 'Knowledge library'} value=""
          items={learningTopics.map(topic => ({ id: topic.id, name: topic.title, note: coffeeCourseGroups[topic.group][ar ? 0 : 1] }))}
          onChange={id => {
            const topic = learningTopics.find(topic => topic.id === id);
            if (topic) void ask(topic.title);
          }} />
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
                      : "Collapse answer"
                    : ar
                      ? "عرض الإجابة"
                      : "Show answer"
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
                  {ar ? "خبير القهوة" : "Coffee expert"}
                </Txt>
                <Txt>{turn.answer}</Txt>
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
                    <Txt numberOfLines={2} style={styles.muted}>
                      {(ar
                        ? match.document.summary_ar
                        : match.document.summary_en
                      )?.slice(0, 180)}
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
                          {factLabels[key][ar ? 0 : 1]}:{" "}
                          {String(
                            Array.isArray(value) ? value[ar ? 0 : 1] : value,
                          )}
                        </Txt>
                      ))}
                    {match.price ? (
                      <View style={{ gap: 5 }}>
                        <Txt heading>
                          {match.price.offer.currency !== match.price.currency
                            ? ar
                              ? "تقريبًا "
                              : "Approx. "
                            : ""}
                          {match.price.converted.toLocaleString("en-US", {
                            maximumFractionDigits:
                              match.price.currency === "KWD" ? 3 : 2,
                          })}{" "}
                          {match.price.currency}
                        </Txt>
                        <Txt style={styles.muted}>
                          {match.price.offer.availability === "out_of_stock"
                            ? ar
                              ? "غير متوفر لدى البائع"
                              : "Out of stock at seller"
                            : match.price.offer.availability === "in_stock"
                              ? ar
                                ? "متوفر حسب آخر تحقق"
                                : "In stock at last check"
                              : ar
                                ? "التوفر يحتاج تأكيدًا من البائع"
                                : "Confirm availability with the seller"}
                          {" · "}
                          {match.price.offer.region}
                        </Txt>
                        <Txt style={styles.muted}>
                          {ar ? "آخر تحقق: " : "Last checked: "}
                          {new Date(
                            match.price.offer.checked_at,
                          ).toLocaleDateString("en-GB")}
                          {ar
                            ? " · السعر قبل الشحن والرسوم"
                            : " · Before shipping and duties"}
                        </Txt>
                        <Action
                          title={
                            ar
                              ? "السعر وموقع البائع"
                              : "Price and seller website"
                          }
                          onPress={() => void visit(match.price?.offer.url)}
                        />
                      </View>
                    ) : match.document.kind === "equipment" ? (
                      <Txt style={styles.muted}>
                        {ar
                          ? "لا يتوفر سعر حديث موثق لهذا الخيار."
                          : "No recent verified price for this option."}
                      </Txt>
                    ) : null}
                    <View style={styles.row}>
                      {match.document.kind === "equipment" ||
                      match.document.kind === "recipe" ? (
                        <Action
                          compact
                          title={ar ? "عرض التفاصيل" : "View details"}
                          onPress={() =>
                            openItem(
                              match.document.kind as "equipment" | "recipe",
                              match.document.id,
                            )
                          }
                        />
                      ) : null}
                      {assistantSafeUrl(match.document.source_url) ? (
                        <Action
                          compact
                          title={ar ? "المصدر الأصلي" : "Original source"}
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
                          : "Show less"
                        : ar
                          ? "نتائج إضافية"
                          : "More results"
                    }
                    onPress={() =>
                      setExpandedResults((state) => ({
                        ...state,
                        [index]: !state[index],
                      }))
                    }
                  />
                ) : null}
                {turn.followUp ? <Txt>{turn.followUp}</Txt> : null}
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
                    {turn.suggestions?.map((suggestion) => (
                      <Action
                        compact
                        key={suggestion}
                        title={suggestion}
                        disabled={busy}
                        onPress={() => void ask(suggestion)}
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
              {ar ? "جارٍ البحث عن الخيارات…" : "Finding your options…"}
            </Txt>
            <Action title={ar ? "إلغاء" : "Cancel"} onPress={cancel} />
          </View>
        ) : null}
        {error ? <Txt style={styles.error}>{error}</Txt> : null}
      </ScrollView>
      <View
        style={{
          width: "100%",
          maxWidth: 820,
          alignSelf: "center",
          backgroundColor: colors.paper,
          borderTopWidth: 1,
          borderColor: colors.line,
          padding: 14,
          gap: 8,
        }}
      >
        <Field
          label={ar ? "سؤالك عن القهوة" : "Your coffee question"}
          placeholder={ar ? "اسأل خبير القهوة…" : "Ask the coffee expert…"}
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
            title={ar ? "إرسال" : "Send"}
            selected
            disabled={busy || !question.trim()}
            onPress={() => void ask()}
          />
          {turns.length ? (
            <Action
              compact
              title={ar ? "محادثة جديدة" : "New conversation"}
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
