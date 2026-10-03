import { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { supabase } from "./client";
import {
  countryLabel,
  categoryLabel,
  equipmentKind,
  loadEquipment,
  loadRoasters,
  validateReview,
  XBLOOM_RESOURCES,
  type EquipmentItem,
  type EquipmentReview,
  type RoasterItem,
} from "./catalog";
import { searchText } from "./guards";
import type { CoffeeItem, RecipeItem } from "./data";
import {
  CoffeeCard,
  CoffeePhoto,
  SectionTitle,
  coffeeStyles,
} from "./CoffeeScreens";
import { methods } from "./copy";
import { RecipeCatalog } from "./RecipeCatalog";
import { CatalogPhoto } from "./CatalogPhoto";
import { categoryGuide } from "./equipmentGuides";
import { isMethod } from "./core/engine";
import {
  Action,
  Field,
  Icon,
  Language,
  Txt,
  colors,
  styles,
  type IconName,
} from "./ui";

export function SourceLink({ title, url }: { title: string; url: string }) {
  const ar = useContext(Language) === "ar";
  const [failed, setFailed] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <Action
        title={title}
        onPress={() => {
          setFailed(false);
          void Linking.openURL(url).catch(() => setFailed(true));
        }}
      />
      {failed ? (
        <Txt style={styles.error}>
          {ar
            ? "تعذّر فتح الرابط. حاول مرة ثانية."
            : "Could not open the link. Try again."}
        </Txt>
      ) : null}
    </View>
  );
}
function Chips({
  items,
  value,
  set,
}: {
  items: { id: string; name: string }[];
  value: string;
  set: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
    >
      {items.map((item) => (
        <Action
          key={item.id}
          title={item.name}
          onPress={() => set(item.id)}
          selected={value === item.id}
        />
      ))}
    </ScrollView>
  );
}
function Empty({
  error,
  busy,
  retry,
}: {
  error: boolean;
  busy: boolean;
  retry: () => void;
}) {
  const ar = useContext(Language) === "ar";
  return (
    <View style={styles.card}>
      {busy ? <ActivityIndicator color={colors.brown} /> : null}
      <Txt style={error ? styles.error : styles.muted}>
        {busy
          ? ar
            ? "جارٍ التحميل…"
            : "Loading…"
          : error
            ? ar
              ? "تعذّر تحميل البيانات."
              : "Could not load data."
            : ar
              ? "لا توجد نتائج مطابقة حالياً."
              : "No matching results yet."}
      </Txt>
      {error ? (
        <Action title={ar ? "حاول مرة ثانية" : "Try again"} onPress={retry} />
      ) : null}
    </View>
  );
}
function ToolSymbol({
  item,
  size = 36,
}: {
  item: EquipmentItem;
  size?: number;
}) {
  const kind = equipmentKind(item);
  const icon: IconName =
    kind === "moka_pot"
      ? "moka_pot"
      : kind === "xbloom"
        ? "xbloom"
        : kind === "aeropress"
          ? "aeropress"
          : kind === "chemex"
            ? "chemex"
            : kind === "v60_dripper"
              ? "v60"
              : kind === "espresso_machine"
                ? "espresso"
                : "gear";
  return (
    <View style={[s.symbol, { width: size + 40, height: size + 40 }]}>
      <Icon name={icon} size={size} />
    </View>
  );
}
export function EquipmentDirectory({
  category,
  open,
}: {
  category: string;
  open: (item: EquipmentItem) => void;
}) {
  const locale = useContext(Language);
  const ar = locale === "ar";
  const { width } = useWindowDimensions();
  const [rows, setRows] = useState<EquipmentItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [filter, setFilter] = useState(category);
  const [search, setSearch] = useState("");
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError(false);
    if (supabase)
      void loadEquipment(supabase)
        .then((v) => {
          if (active) setRows(v);
        })
        .catch(() => {
          if (active) setError(true);
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    return () => {
      active = false;
    };
  }, [revision]);
  const kinds = ["all", ...new Set(rows.map(equipmentKind))];
  const visible = rows.filter(
    (row) =>
      (filter === "all" || equipmentKind(row) === filter) &&
      searchText(
        [row.name, categoryLabel(equipmentKind(row), locale)].join(" "),
      ).includes(searchText(search)),
  );
  const cols = width >= 850 ? 3 : width >= 600 ? 2 : 1;
  const cardWidth = (Math.min(width, 1120) - 36 - (cols - 1) * 12) / cols;
  return (
    <ScrollView
      testID="equipment-scroll"
      contentContainerStyle={coffeeStyles.page}
      refreshControl={
        <RefreshControl
          refreshing={busy}
          onRefresh={() => setRevision((r) => r + 1)}
        />
      }
    >
      <Txt style={s.eyebrow}>BEANMORA · GEAR</Txt>
      <Txt heading style={styles.title}>
        {ar ? "أدوات القهوة" : "Coffee equipment"}
      </Txt>
      <Txt style={styles.muted}>
        {ar
          ? "اختر أداتك، تعرّف على مميزاتها وحدودها، واقرأ تجارب المشتركين."
          : "Meet your next tool. Explore its strengths, tradeoffs and member experiences."}
      </Txt>
      <Field
        label={ar ? "ابحث عن أداة" : "Find equipment"}
        value={search}
        onChangeText={setSearch}
        placeholder={ar ? "موكا بوت، ميزان، طاحونة…" : "Moka, scale, grinder…"}
      />
      <Chips
        items={kinds.map((id) => ({ id, name: categoryLabel(id, locale) }))}
        value={filter}
        set={setFilter}
      />
      <View style={s.grid}>
        {visible.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            onPress={() => open(item)}
            style={[styles.card, { width: cardWidth, marginBottom: 0 }]}
          >
            <View style={s.cardTop}>
              <View style={{ width: 100 }}>
                <CatalogPhoto
                  uri={item.imageUrl}
                  height={100}
                  icon={
                    equipmentKind(item) === "moka_pot"
                      ? "moka_pot"
                      : equipmentKind(item) === "xbloom"
                        ? "xbloom"
                        : "gear"
                  }
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Txt style={s.eyebrow}>
                  {categoryLabel(equipmentKind(item), locale)}
                </Txt>
                <Txt style={s.cardName}>{item.name}</Txt>
              </View>
              <Icon name="arrow" size={18} />
            </View>
            <Txt numberOfLines={2} style={styles.muted}>
              {item.description ||
                (ar
                  ? "افتح التفاصيل وتجارب المشتركين."
                  : "Explore details and member reviews.")}
            </Txt>
            <Txt style={s.linkText}>
              {ar
                ? "المميزات · السلبيات · الآراء"
                : "Strengths · Tradeoffs · Reviews"}
            </Txt>
          </Pressable>
        ))}
      </View>
      {!visible.length ? (
        <Empty
          busy={busy}
          error={error}
          retry={() => setRevision((r) => r + 1)}
        />
      ) : error ? (
        <Empty busy={false} error retry={() => setRevision((r) => r + 1)} />
      ) : null}
    </ScrollView>
  );
}
interface Guide {
  intro: string;
  pros: string[];
  cons: string[];
  care: string;
}
function guide(item: EquipmentItem, ar: boolean): Guide {
  const kind = equipmentKind(item);
  const general = categoryGuide(item, ar);
  if (general) return general;
  if (kind === "moka_pot")
    return ar
      ? {
          intro:
            "موكا بوت لتحضير قهوة ممتلئة على الموقد. تناسب من يحب التحضير اليدوي وكوباً مركزاً.",
          pros: [
            "تعمل على مواقد الغاز والكهرباء دون آلة قهوة كهربائية.",
            "تنظيف يومي بسيط بالماء وفق دليل Bialetti.",
          ],
          cons: [
            "Moka Express تحتاج صفيحة Bialetti المخصصة للعمل على الحث الحراري.",
            "لا تُغسل في غسالة الصحون، وتحتاج متابعة حرارة الموقد.",
          ],
          care: "املأ الماء حتى مستوى صمام الأمان دون تجاوزه. استخدم طحن الموكا دون كبس البن، وحضّر على حرارة منخفضة. اترك الأداة تبرد قبل تنظيفها بالماء.",
        }
      : {
          intro:
            "A stovetop brewer for a full-bodied, concentrated cup and a hands-on routine.",
          pros: [
            "Works on gas and electric hobs without an electric coffee machine.",
            "Simple daily water rinse following Bialetti instructions.",
          ],
          cons: [
            "Moka Express needs the Bialetti induction plate on induction hobs.",
            "Not dishwasher safe; hob heat needs attention.",
          ],
          care: "Keep water at the safety-valve level. Use moka-ground coffee without tamping and low hob heat. Let the brewer cool before rinsing with water.",
        };
  if (kind === "xbloom")
    return ar
      ? {
          intro:
            "تحضير قهوة مقطّرة آلياً، مع إدارة الوصفات في تطبيق xBloom الرسمي.",
          pros: [
            "إعادة استخدام إعدادات الوصفة لكل كوب.",
            "استخدام حبوبك الخاصة مع القطّارة المناسبة للجهاز.",
          ],
          cons: [
            "تحقق من موديل الجهاز قبل استخدام رابط وصفة.",
            "تعتمد الميزات المتقدمة على الجهاز وتطبيق الشركة.",
          ],
          care: "اتبع تعليمات التنظيف والصيانة الخاصة بموديلك. اقرأ المصدر لمعرفة الملحقات المطلوبة.",
        }
      : {
          intro:
            "Automated pour-over, with recipes managed in the official xBloom app.",
          pros: [
            "Repeat recipe settings for your next cup.",
            "Brew your own beans with the dripper appropriate to your model.",
          ],
          cons: [
            "Check the machine model before using a recipe link.",
            "Advanced functions depend on the machine and manufacturer app.",
          ],
          care: "Follow your model’s cleaning instructions and check the manufacturer source for required accessories.",
        };
  const groups: Record<string, [Guide, Guide]> = {
    grinder: [
      {
        intro:
          "الطاحونة أساس ضبط الاستخلاص. اختيارها يعتمد على طريقة تحضيرك ونطاق الطحن.",
        pros: ["تعديل الطحن لمواءمة وصفاتك.", "طحن البن عند التحضير."],
        cons: [
          "لا تنتقل أرقام الطحن مباشرة بين موديلات مختلفة.",
          "تحقق من ملاءمة الموديل للإسبريسو أو الترشيح قبل الاختيار.",
        ],
        care: "راجع تعليمات الموديل لتنظيف الشفرات وتجنب استخدام الماء إذا لم يسمح به المصنع.",
      },
      {
        intro:
          "Choose a grinder around your brew method and the model’s grind range.",
        pros: ["Adjust grind for your recipe.", "Grind beans when you brew."],
        cons: [
          "Grind numbers do not transfer between models.",
          "Check espresso or filter suitability for the exact model.",
        ],
        care: "Follow the model’s burr-cleaning instructions; do not use water unless the manufacturer permits it.",
      },
    ],
    scale: [
      {
        intro: "الميزان يساعدك على تكرار جرعة البن وكمية الماء بدقة.",
        pros: [
          "قياس البن والماء بدلاً من التقدير.",
          "متابعة النسبة بين الماء والبن.",
        ],
        cons: [
          "دقة القياس ومقاومة الماء تختلف حسب الموديل.",
          "تحقق من مساحة الميزان وملاءمته لوعاء التحضير.",
        ],
        care: "لا تعتبر الميزان مقاوماً للماء إلا إذا صرّح المصنع بذلك.",
      },
      {
        intro: "A scale helps repeat your coffee dose and water amount.",
        pros: [
          "Measure coffee and water instead of estimating.",
          "Track the water-to-coffee ratio.",
        ],
        cons: [
          "Resolution and water resistance vary by model.",
          "Check size and fit for your brewing vessel.",
        ],
        care: "Do not assume water resistance unless specified by the manufacturer.",
      },
    ],
  };
  if (groups[kind]) return groups[kind][ar ? 0 : 1];
  return ar
    ? {
        intro:
          "دليل عام لاختيار الأداة؛ مواصفات هذا الموديل موضحة في المصدر أدناه.",
        pros: [
          "اختيار إعدادات تتناسب مع أسلوب التحضير.",
          "إعادة التجربة وتعديل متغير واحد كل مرة.",
        ],
        cons: [
          "تختلف متطلبات الملحقات والتنظيف حسب الموديل.",
          "تحتاج تجربة للطحن والنسبة للوصول إلى مذاقك المفضل.",
        ],
        care: "اتبع تعليمات المصنع، وراجع الفلاتر والملحقات المناسبة لهذا الموديل.",
      }
    : {
        intro:
          "A general selection guide; exact model specifications are available in the source below.",
        pros: [
          "Choose settings for your brewing style.",
          "Repeat a brew and change one variable at a time.",
        ],
        cons: [
          "Accessories and cleaning needs vary by model.",
          "Dialing in grind and ratio takes experimentation.",
        ],
        care: "Follow the manufacturer instructions and check the filters and accessories for this model.",
      };
}
export function EquipmentDetail({
  item,
  recipes,
  userId,
  login,
  openRecipe,
}: {
  item: EquipmentItem;
  recipes: RecipeItem[];
  userId: string | null;
  login: () => void;
  openRecipe: (r: RecipeItem) => void;
}) {
  const locale = useContext(Language);
  const ar = locale === "ar";
  const g = guide(item, ar);
  const related = recipes.filter(
    (r) =>
      r.equipment.some((e) => e.modelId === item.id) ||
      item.methods.includes(r.method),
  );
  return (
    <ScrollView
      testID="equipment-detail-scroll"
      contentContainerStyle={[coffeeStyles.page, { maxWidth: 780 }]}
    >
      <View style={s.toolHero}>
        <CatalogPhoto
          uri={item.imageUrl}
          height={220}
          icon={
            equipmentKind(item) === "moka_pot"
              ? "moka_pot"
              : equipmentKind(item) === "xbloom"
                ? "xbloom"
                : "gear"
          }
        />
        <Txt style={s.eyebrow}>
          {categoryLabel(equipmentKind(item), locale)}
        </Txt>
        <Txt heading style={styles.title}>
          {item.name}
        </Txt>
      </View>
      <Txt>{g.intro}</Txt>
      <Txt style={s.editorial}>
        {ar
          ? "دليل BeanMora · المميزات والسلبيات تقييم تحريري، وآراء المشتركين أدناه."
          : "BeanMora guide · Strengths and tradeoffs are editorial; member opinions appear below."}
      </Txt>
      {[
        {
          title: ar ? "المميزات" : "Strengths",
          entries: g.pros,
          color: "#EAF0E7",
        },
        {
          title: ar ? "السلبيات وما يجب مراعاته" : "Tradeoffs",
          entries: g.cons,
          color: "#F4EAE0",
        },
      ].map((block) => (
        <View
          key={block.title}
          style={[styles.card, { backgroundColor: block.color }]}
        >
          <Txt heading style={styles.subtitle}>
            {block.title}
          </Txt>
          {block.entries.map((text) => (
            <Txt key={text}>• {text}</Txt>
          ))}
        </View>
      ))}
      <View style={styles.card}>
        <Txt heading style={styles.subtitle}>
          {ar ? "الاستخدام والعناية" : "Use and care"}
        </Txt>
        <Txt>{g.care}</Txt>
      </View>
      {item.description ? (
        <View style={styles.card}>
          <Txt heading style={styles.subtitle}>
            {ar ? "تفاصيل الموديل" : "Model details"}
          </Txt>
          <Txt>{item.description}</Txt>
          {Object.entries(item.specifications)
            .slice(0, 16)
            .map(([key, val]) => (
              <Txt key={key} style={styles.muted}>
                {key.replaceAll("_", " ")}:{" "}
                {typeof val === "object" ? JSON.stringify(val) : String(val)}
              </Txt>
            ))}
        </View>
      ) : null}
      {item.sourceUrl ? (
        <SourceLink
          title={
            ar ? "مواصفات الأداة من المصدر" : "Manufacturer specifications"
          }
          url={item.sourceUrl}
        />
      ) : null}
      {item.verifiedAt ? (
        <Txt style={s.editorial}>
          {ar ? "آخر تحقق من المصدر: " : "Source checked: "}
          {new Date(item.verifiedAt).toLocaleDateString(locale + "-u-nu-latn")}
        </Txt>
      ) : null}
      <SectionTitle
        title={
          ar ? "وصفات مناسبة لطريقة الأداة" : "Recipes for this brew method"
        }
      />
      {related.length ? (
        related
          .slice(0, 8)
          .map((r) => (
            <Action key={r.id} title={r.title} onPress={() => openRecipe(r)} />
          ))
      ) : (
        <Txt style={styles.muted}>
          {ar
            ? "لا توجد وصفة مسجلة لهذه الأداة بعد."
            : "No recipe is listed for this tool yet."}
        </Txt>
      )}
      <EquipmentReviews
        key={item.id + (userId ?? "guest")}
        modelId={item.id}
        userId={userId}
        login={login}
      />
    </ScrollView>
  );
}
function EquipmentReviews({
  modelId,
  userId,
  login,
}: {
  modelId: string;
  userId: string | null;
  login: () => void;
}) {
  const locale = useContext(Language);
  const ar = locale === "ar";
  const [reviews, setReviews] = useState<EquipmentReview[]>([]);
  const [own, setOwn] = useState<EquipmentReview | null>(null);
  const [summary, setSummary] = useState<{
    review_count: number;
    average_rating: number | null;
  } | null>(null);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [limit, setLimit] = useState(30);
  const [revision, setRevision] = useState(0);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [experience, setExperience] =
    useState<EquipmentReview["experience"]>("used");
  const [writing, setWriting] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef(true);
  const inFlight = useRef(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    let current = true;
    setBusy(true);
    setFailed(false);
    if (!supabase) return;
    const fields =
      "id,user_id,rating,review_text,pros,cons,experience,status,created_at";
    void Promise.all([
      supabase
        .from("equipment_reviews")
        .select(fields)
        .eq("equipment_model_id", modelId)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .order("id")
        .limit(limit),
      supabase.rpc("equipment_review_summary", { p_equipment_id: modelId }),
      userId
        ? supabase
            .from("equipment_reviews")
            .select(fields)
            .eq("equipment_model_id", modelId)
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])
      .then(([r, s, o]) => {
        if (!current) return;
        if (r.error || s.error || o.error) {
          setFailed(true);
          return;
        }
        setReviews(r.data ?? []);
        setSummary(s.data?.[0] ?? null);
        setOwn(o.data);
        if (o.data) {
          setRating(o.data.rating);
          setText(o.data.review_text);
          setPros(o.data.pros);
          setCons(o.data.cons);
          setExperience(o.data.experience);
        }
      })
      .catch(() => {
        if (current) setFailed(true);
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, [modelId, userId, revision, limit]);
  async function auth() {
    if (!supabase || !userId) throw new Error("member required");
    const { data, error } = await supabase.auth.getUser();
    if (
      error ||
      data.user?.id !== userId ||
      data.user.is_anonymous ||
      !active.current
    )
      throw new Error("identity changed");
    return supabase;
  }
  async function write(remove = false) {
    if (inFlight.current || busy || failed) return;
    if (!remove && !validateReview(rating, text, pros, cons)) {
      setMessage(
        ar
          ? "اختر تقييماً واكتب رأياً من 10 إلى 2000 حرف."
          : "Choose a rating and write 10–2000 characters.",
      );
      return;
    }
    inFlight.current = true;
    setWriting(true);
    setMessage("");
    try {
      const db = await auth();
      const payload = {
        rating,
        review_text: text.trim(),
        pros: pros.trim(),
        cons: cons.trim(),
        experience,
      };
      const r =
        remove && own
          ? await db
              .from("equipment_reviews")
              .delete()
              .eq("id", own.id)
              .eq("user_id", userId!)
              .select("id")
              .single()
          : own
            ? await db
                .from("equipment_reviews")
                .update(payload)
                .eq("id", own.id)
                .eq("user_id", userId!)
                .select("id")
                .single()
            : await db
                .from("equipment_reviews")
                .insert({
                  ...payload,
                  equipment_model_id: modelId,
                  user_id: userId,
                })
                .select("id")
                .single();
      if (r.error || !r.data?.id)
        throw r.error || new Error("no confirmed write");
      if (active.current) {
        if (remove) {
          setOwn(null);
          setRating(0);
          setText("");
          setPros("");
          setCons("");
        }
        setMessage(
          ar
            ? remove
              ? "تم حذف رأيك."
              : "تم حفظ رأيك."
            : remove
              ? "Your review was deleted."
              : "Your review was saved.",
        );
        setRevision((v) => v + 1);
      }
    } catch {
      if (active.current)
        setMessage(
          ar
            ? "تعذّر تأكيد الحفظ. حاول مرة ثانية."
            : "Save was not confirmed. Try again.",
        );
    } finally {
      inFlight.current = false;
      if (active.current) setWriting(false);
    }
  }
  async function report() {
    if (inFlight.current || reportText.trim().length < 3 || !reportId) return;
    inFlight.current = true;
    setWriting(true);
    try {
      const db = await auth();
      const r = await db
        .from("reports")
        .insert({
          reporter_id: userId,
          target_type: "equipment_review",
          target_id: reportId,
          reason: "other",
          details: reportText.trim().slice(0, 1000),
        });
      if (r.error) throw r.error;
      if (active.current) {
        setReportId(null);
        setReportText("");
        setMessage(
          ar
            ? "وصل البلاغ لفريق المراجعة."
            : "Your report was sent for review.",
        );
      }
    } catch {
      if (active.current)
        setMessage(ar ? "تعذّر إرسال البلاغ." : "Could not send the report.");
    } finally {
      inFlight.current = false;
      if (active.current) setWriting(false);
    }
  }
  const experiences = {
    owner: ar ? "أملك الأداة" : "I own it",
    used: ar ? "جرّبت الأداة" : "I have used it",
    interested: ar ? "مهتم بالأداة" : "Interested in it",
  };
  return (
    <View style={{ gap: 14 }}>
      <SectionTitle title={ar ? "آراء المشتركين" : "Member reviews"} />
      {summary && !failed ? (
        <View style={s.reviewSummary}>
          <Icon name="star" filled color="#B88836" />
          <Txt style={{ fontSize: 20, fontWeight: "700" }}>
            {summary.average_rating ?? "—"}
          </Txt>
          <Txt style={styles.muted}>
            {summary.review_count} {ar ? "رأي" : "reviews"}
          </Txt>
        </View>
      ) : null}
      {failed || busy ? (
        <Empty
          busy={busy}
          error={failed}
          retry={() => setRevision((r) => r + 1)}
        />
      ) : !reviews.length ? (
        <Txt style={styles.muted}>
          {ar
            ? "لا توجد آراء منشورة بعد. شارك أول تجربة."
            : "No published opinions yet. Share the first experience."}
        </Txt>
      ) : (
        reviews.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={s.cardTop}>
              <Txt style={{ flex: 1, fontWeight: "700" }}>
                {r.user_id === userId
                  ? ar
                    ? "رأيك"
                    : "Your review"
                  : ar
                    ? "عضو BeanMora"
                    : "BeanMora member"}
              </Txt>
              <Icon name="star" size={16} filled color="#B88836" />
              <Txt>{r.rating}/5</Txt>
            </View>
            <Txt style={s.editorial}>
              {experiences[r.experience]} ·{" "}
              {new Date(r.created_at).toLocaleDateString(locale + "-u-nu-latn")}
            </Txt>
            <Txt>{r.review_text}</Txt>
            {r.pros ? (
              <Txt>
                {ar ? "المميزات: " : "Strengths: "}
                {r.pros}
              </Txt>
            ) : null}
            {r.cons ? (
              <Txt>
                {ar ? "السلبيات: " : "Tradeoffs: "}
                {r.cons}
              </Txt>
            ) : null}
            {r.user_id !== userId ? (
              <Action
                title={ar ? "الإبلاغ عن هذا الرأي" : "Report this review"}
                onPress={() => (userId ? setReportId(r.id) : login())}
              />
            ) : null}
          </View>
        ))
      )}
      {!busy && !failed && summary && reviews.length < summary.review_count ? (
        <Action
          title={ar ? "المزيد من الآراء" : "More reviews"}
          onPress={() => setLimit((v) => v + 30)}
        />
      ) : null}
      {reportId ? (
        <View style={styles.card}>
          <Field
            label={ar ? "سبب البلاغ" : "Report reason"}
            value={reportText}
            onChangeText={setReportText}
            maxLength={1000}
            multiline
          />
          <Action
            title={ar ? "إرسال البلاغ" : "Send report"}
            onPress={() => void report()}
            disabled={writing || reportText.trim().length < 3}
          />
          <Action
            title={ar ? "إلغاء" : "Cancel"}
            onPress={() => setReportId(null)}
          />
        </View>
      ) : null}
      {userId ? (
        <View style={styles.card}>
          <Txt heading style={styles.subtitle}>
            {ar
              ? own
                ? "عدّل رأيك"
                : "شارك تجربتك"
              : own
                ? "Edit your review"
                : "Share your experience"}
          </Txt>
          <Txt style={s.editorial}>
            {ar
              ? "نوع التجربة تصريح منك؛ لا يعني شراءً موثّقاً. رأي واحد لكل أداة ويمكن تعديله."
              : "Experience is self-reported, not a verified purchase. One editable opinion per model."}
          </Txt>
          {own?.status === "hidden" ? (
            <Txt style={styles.warning}>
              {ar
                ? "رأيك مخفي بعد المراجعة. يمكنك حذفه."
                : "Your review is hidden after moderation. You can delete it."}
            </Txt>
          ) : (
            <>
              <View style={s.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityLabel={(ar ? "تقييم " : "Rate ") + n + "/5"}
                    accessibilityState={{ selected: rating === n }}
                    onPress={() => setRating(n)}
                    style={s.star}
                  >
                    <Icon
                      name="star"
                      filled={rating >= n}
                      size={28}
                      color="#B88836"
                    />
                  </Pressable>
                ))}
              </View>
              <Chips
                items={Object.entries(experiences).map(([id, name]) => ({
                  id,
                  name,
                }))}
                value={experience}
                set={(v) => setExperience(v as EquipmentReview["experience"])}
              />
              <Field
                label={ar ? "رأيك وتجربتك" : "Your review"}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={2000}
                style={{ minHeight: 100 }}
              />
              <Field
                label={
                  ar
                    ? "المميزات من تجربتك (اختياري)"
                    : "Your strengths (optional)"
                }
                value={pros}
                onChangeText={setPros}
                maxLength={500}
              />
              <Field
                label={
                  ar
                    ? "السلبيات من تجربتك (اختياري)"
                    : "Your tradeoffs (optional)"
                }
                value={cons}
                onChangeText={setCons}
                maxLength={500}
              />
              <Action
                title={
                  ar
                    ? writing
                      ? "جارٍ الحفظ…"
                      : "حفظ رأيي"
                    : writing
                      ? "Saving…"
                      : "Save my review"
                }
                onPress={() => void write()}
                disabled={writing || busy || failed}
                selected
              />
            </>
          )}
          {own ? (
            <Action
              title={ar ? "حذف رأيي" : "Delete my review"}
              onPress={() => void write(true)}
              disabled={writing || busy || failed}
            />
          ) : null}
        </View>
      ) : (
        <Action
          title={ar ? "سجّل دخولك لكتابة رأيك" : "Sign in to write a review"}
          onPress={login}
          selected
        />
      )}
      {message ? <Txt style={styles.muted}>{message}</Txt> : null}
    </View>
  );
}
export function RoasterDirectory({
  open,
  coffees = [],
}: {
  open: (r: RoasterItem) => void;
  coffees?: CoffeeItem[];
}) {
  const locale = useContext(Language);
  const ar = locale === "ar";
  const [rows, setRows] = useState<RoasterItem[]>([]);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError(false);
    if (supabase)
      void loadRoasters(supabase, locale)
        .then((r) => {
          if (active) setRows(r);
        })
        .catch(() => {
          if (active) setError(true);
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    return () => {
      active = false;
    };
  }, [locale, revision]);
  const visible = rows.filter(
    (r) =>
      (country === "all" || country === r.country) &&
      searchText(
        [r.name, r.description, countryLabel(r.country, locale)].join(" "),
      ).includes(searchText(search)),
  );
  return (
    <ScrollView
      testID="roasters-scroll"
      contentContainerStyle={coffeeStyles.page}
      refreshControl={
        <RefreshControl
          refreshing={busy}
          onRefresh={() => setRevision((v) => v + 1)}
        />
      }
    >
      <Txt style={s.eyebrow}>BEANMORA · ROASTERIES</Txt>
      <Txt heading style={styles.title}>
        {ar ? "المحامص" : "Roasteries"}
      </Txt>
      <Txt style={styles.muted}>
        {ar
          ? "اكتشف المحامص وحبوبها ومصادر معلوماتها في مكان واحد."
          : "Explore roasters, their coffees and the sources behind each listing."}
      </Txt>
      <Field
        label={ar ? "ابحث عن محمصة" : "Find a roaster"}
        value={search}
        onChangeText={setSearch}
        placeholder={ar ? "اسم المحمصة أو البلد…" : "Roaster name or country…"}
      />
      <Chips
        items={[
          "all",
          ...new Set(rows.map((r) => r.country).filter(Boolean)),
        ].map((id) => ({
          id,
          name:
            id === "all"
              ? ar
                ? "كل الدول"
                : "All countries"
              : countryLabel(id, locale),
        }))}
        value={country}
        set={setCountry}
      />
      {visible.map((r) => (
        <Pressable
          key={r.id}
          accessibilityRole="button"
          accessibilityLabel={r.name}
          onPress={() => open(r)}
          style={styles.card}
        >
          <View style={s.cardTop}>
            <View style={{ width: 74, height: 74 }}>
              <CoffeePhoto
                uri={coffees.find((c) => c.roasterId === r.id)?.imageUrl}
                seed={r.id}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Txt style={s.cardName}>{r.name}</Txt>
              <Txt style={styles.muted}>{countryLabel(r.country, locale)}</Txt>
            </View>
            <Icon name="arrow" size={18} />
          </View>
          <Txt numberOfLines={2} style={styles.muted}>
            {r.description}
          </Txt>
          <Txt style={s.linkText}>
            {ar ? "عن المحمصة · الحبوب · الوصفات" : "About · Coffees · Recipes"}
          </Txt>
        </Pressable>
      ))}
      {!visible.length || error ? (
        <Empty
          busy={busy}
          error={error}
          retry={() => setRevision((v) => v + 1)}
        />
      ) : null}
    </ScrollView>
  );
}
export function RoasterDetail({
  item,
  coffees,
  recipes,
  openCoffee,
  openRecipe,
  saveCoffee,
  saved,
  loading,
}: {
  item: RoasterItem;
  coffees: CoffeeItem[];
  recipes: RecipeItem[];
  openCoffee: (c: CoffeeItem) => void;
  openRecipe: (r: RecipeItem) => void;
  saveCoffee: (c: CoffeeItem) => void;
  saved: string[];
  loading: boolean;
}) {
  const locale = useContext(Language);
  const ar = locale === "ar";
  const { width } = useWindowDimensions();
  const items = coffees.filter((c) => c.roasterId === item.id);
  const related = recipes.filter((r) =>
    items.some((c) => r.beanId === (c.beanId ?? c.id) || r.productId === c.id),
  );
  const cols = width >= 600 ? 3 : 2;
  const cardWidth = (Math.min(width, 780) - 36 - (cols - 1) * 12) / cols;
  return (
    <ScrollView contentContainerStyle={[coffeeStyles.page, { maxWidth: 780 }]}>
      <View style={s.roasterHero}>
        <Icon name="bean" size={42} color="#FFF" />
        <Txt heading style={[styles.title, { color: "#FFF" }]}>
          {item.name}
        </Txt>
        <Txt style={{ color: "#EEE4D5" }}>
          {countryLabel(item.country, locale)}
        </Txt>
      </View>
      {item.description ? <Txt>{item.description}</Txt> : null}
      <View style={styles.detailMetaRow}>
        {item.verified ? (
          <Txt style={styles.metaPill}>
            {ar ? "محمصة موثّقة" : "Verified roaster"}
          </Txt>
        ) : null}
        {item.physicalStore === true ? (
          <Txt style={styles.metaPill}>
            {ar ? "لديها متجر فعلي" : "Physical store"}
          </Txt>
        ) : null}
        {item.shipsToGcc === true ? (
          <Txt style={styles.metaPill}>
            {ar ? "تشحن لدول الخليج" : "Ships to GCC"}
          </Txt>
        ) : null}
      </View>
      {item.websiteUrl ? (
        <SourceLink
          title={ar ? "موقع المحمصة" : "Roaster website"}
          url={item.websiteUrl}
        />
      ) : null}
      {item.instagramUrl ? (
        <SourceLink title="Instagram" url={item.instagramUrl} />
      ) : null}
      {item.locations
        .filter((l) => l.address)
        .map((l, i) => (
          <View key={i} style={styles.card}>
            <Txt heading>{l.label || (ar ? "الموقع" : "Location")}</Txt>
            <Txt>{l.address}</Txt>
            {Number.isFinite(l.latitude) &&
            Number.isFinite(l.longitude) &&
            l.latitude !== null &&
            l.longitude !== null ? (
              <SourceLink
                title={ar ? "فتح الخريطة" : "Open map"}
                url={`https://www.google.com/maps/search/?api=1&query=${l.latitude},${l.longitude}`}
              />
            ) : null}
          </View>
        ))}
      <SectionTitle title={ar ? "حبوب المحمصة" : "Roaster coffees"} />
      {loading ? (
        <ActivityIndicator color={colors.brown} />
      ) : items.length ? (
        <View style={s.grid}>
          {items.map((c) => (
            <CoffeeCard
              key={c.kind + c.id}
              item={c}
              width={cardWidth}
              open={() => openCoffee(c)}
              save={() => saveCoffee(c)}
              saved={saved.includes(c.beanId ?? c.id)}
            />
          ))}
        </View>
      ) : (
        <Txt style={styles.muted}>
          {ar
            ? "لم تُضف حبوب منشورة لهذه المحمصة بعد."
            : "No published coffees are listed for this roaster yet."}
        </Txt>
      )}
      <SectionTitle
        title={ar ? "وصفات مرتبطة بحبوبها" : "Linked coffee recipes"}
      />
      {related.length ? (
        related.map((r) => (
          <Action key={r.id} title={r.title} onPress={() => openRecipe(r)} />
        ))
      ) : (
        <Txt style={styles.muted}>
          {ar
            ? "لا توجد وصفات مرتبطة مسجلة حالياً."
            : "No linked recipes are listed yet."}
        </Txt>
      )}
      {item.sourceUrl ? (
        <SourceLink
          title={ar ? "مصدر معلومات المحمصة" : "Roaster data source"}
          url={item.sourceUrl}
        />
      ) : null}
      {item.verifiedAt ? (
        <Txt style={s.editorial}>
          {ar ? "آخر تحقق: " : "Last checked: "}
          {new Date(item.verifiedAt).toLocaleDateString(locale + "-u-nu-latn")}
        </Txt>
      ) : null}
    </ScrollView>
  );
}
export function XBLOOMHub({
  openRecipe,
  tools,
}: {
  recipes: RecipeItem[];
  openRecipe: (r: RecipeItem) => void;
  tools: () => void;
  loading: boolean;
}) {
  const locale = useContext(Language);
  const ar = locale === "ar";
  return (
    <RecipeCatalog
      method="xbloom"
      locked
      open={openRecipe}
      header={
        <View style={{ gap: 16 }}>
          <View style={s.roasterHero}>
            <Icon name="xbloom" size={44} color="#FFF" />
            <Txt heading style={[styles.title, { color: "#FFF" }]}>
              {ar ? "عالم xBloom" : "Your xBloom corner"}
            </Txt>
            <Txt style={{ color: "#EEE4D5" }}>
              {ar
                ? "وصفات ومصادر تساعدك على تحضير كوبك القادم."
                : "Recipes and resources for your next cup."}
            </Txt>
          </View>
          <SectionTitle title={ar ? "روابط مفيدة" : "Useful links"} />
          {XBLOOM_RESOURCES.map((r) => (
            <View key={r.url} style={styles.card}>
              <SourceLink title={ar ? r.ar : r.en} url={r.url} />
              <Txt style={styles.muted}>{ar ? r.noteAr : r.noteEn}</Txt>
            </View>
          ))}
          <Action
            title={
              ar
                ? "قارن أدوات xBloom وتجارب المشتركين"
                : "Explore xBloom tools and member reviews"
            }
            onPress={tools}
          />
          <Txt style={s.editorial}>
            {ar
              ? "افتح روابط المشاركة في تطبيق xBloom الرسمي. توافق الوصفة يعتمد على موديل الجهاز؛ راجع الطحنة ونمط الصب في المصدر."
              : "Open sharing links in the official xBloom app. Check the model, grind setting and pouring pattern in the source."}
          </Txt>
        </View>
      }
    />
  );
}
export function recipeMethodName(method: string, locale: "ar" | "en") {
  return isMethod(method) ? methods[locale][method] : method;
}
const s = StyleSheet.create({
  eyebrow: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
  },
  cardName: { fontSize: 18, fontWeight: "700", lineHeight: 26 },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  symbol: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#E9DFD0",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnail: {
    width: 86,
    height: 86,
    borderRadius: 14,
    backgroundColor: "#EEE8DD",
  },
  linkText: { color: colors.brown, fontSize: 12, fontWeight: "700" },
  editorial: { fontSize: 12, lineHeight: 21, color: colors.muted },
  toolHero: {
    alignItems: "center",
    gap: 12,
    padding: 24,
    borderRadius: 24,
    backgroundColor: "#ECE3D6",
  },
  roasterHero: {
    backgroundColor: colors.brown,
    padding: 26,
    borderRadius: 22,
    gap: 10,
  },
  reviewSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#EFE6D8",
    padding: 16,
    borderRadius: 16,
  },
  stars: { flexDirection: "row", gap: 7 },
  star: {
    minWidth: 44,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
