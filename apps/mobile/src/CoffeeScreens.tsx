import {CatalogComments} from './CatalogComments';
import { usePressMotion } from './Motion';
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Language,
  Txt,
  Icon,
  IconButton,
  Action,
  colors,
  styles,
  type IconName,
} from './ui';
import { catalogName, processLabel } from './localizedContent';
import { methods } from './copy';
import { METHODS, type Method } from './core/engine';
import type { Bundle, CoffeeItem, RecipeItem, CoffeeImageKind } from './data';
import { CoffeeSensory, FlavorNotes } from './SensoryProfile';
import { useCoffeeRecipes } from './useCoffeeRecipes';
import { SourceLink } from './SourceLink';
import { useBrewStarter } from './useBrewStarter';
import { recipeQuickFacts } from './recipeQuickFacts';
import { useContentMedia } from './useContentMedia';
import { catalogPhotoSource } from './catalogPhotoSource';

export const artwork = {
  hero: require('../assets/images/home-banner.jpg'),
  login: require('../assets/images/login-background.jpg'),
  bag: require('../assets/images/coffee-bag.jpg'),
  beans: require('../assets/images/coffee-beans.jpg'),
  cherries: require('../assets/images/coffee-cherries.jpg'),
  xbloom: require('../assets/images/xbloom.jpg'),
  grinder: require('../assets/images/grinder.jpg'),
  scale: require('../assets/images/scale.jpg'),
};
const flags: Record<string, string> = {
  Bolivia: '🇧🇴',
  Ethiopia: '🇪🇹',
  Colombia: '🇨🇴',
  Guatemala: '🇬🇹',
  Brazil: '🇧🇷',
  Kenya: '🇰🇪',
  Panama: '🇵🇦',
  'Costa Rica': '🇨🇷',
  'El Salvador': '🇸🇻',
  Yemen: '🇾🇪',
  Rwanda: '🇷🇼',
  Indonesia: '🇮🇩',
  Peru: '🇵🇪',
  Honduras: '🇭🇳',
  Ecuador: '🇪🇨',
  India: '🇮🇳',
  Uganda: '🇺🇬',
  Mexico: '🇲🇽',
};
export const originLabel = (origin: string, ar = false) =>
  [flags[origin], catalogName(origin, ar ? 'ar' : 'en')]
    .filter(Boolean)
    .join(' ');
export function CoffeePhoto({
  uri,
  uris = [],
  detail = false,
  kind = 'unclassified',
  fallback,
}: {
  uri?: string | null;
  uris?: string[];
  seed?: string;
  detail?: boolean;
  kind?: CoffeeImageKind;
  fallback?: ReactNode;
}) {
  const ar = useContext(Language) === 'ar';
  const [attempt, setAttempt] = useState(0);
  const candidates = [
    ...new Set(
      [uri, ...uris].filter((value): value is string => Boolean(value)),
    ),
  ];
  const identity = candidates.join('|');
  useEffect(() => setAttempt(0), [identity]);
  const current = useContentMedia(candidates[attempt] ?? null);
  const label =
    kind === 'origin_photo'
      ? ar
        ? 'صورة منشأ البن'
        : 'Coffee origin photo'
      : kind === 'product_artwork'
        ? ar
          ? 'صورة المنتج من المحمصة'
          : 'Roaster product artwork'
        : ar
          ? 'صورة عبوة البن'
          : 'Coffee product photo';
  return (
    <View style={s.photo}>
      {current ? (
        <>
          <Image
            key={current}
            testID="coffee-product-photo"
            accessibilityLabel={label}
            source={catalogPhotoSource(current)}
            resizeMode="contain"
            style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
            onError={() => setAttempt((n) => n + 1)}
          />
          {kind === 'product_artwork' || kind === 'origin_photo' ? (
            <View style={s.photoNote}>
              <Txt style={{ fontSize: 9, lineHeight: 14, color: '#FFF' }}>
                {label}
              </Txt>
            </View>
          ) : null}
        </>
      ) : (
        (fallback ?? (
          <View testID="coffee-photo-unavailable" style={[s.photoPlaceholder, { width: '100%', height: '100%' }]}>
            <Image source={artwork.bag} accessibilityLabel={ar ? 'صورة توضيحية للبن' : 'Illustrative coffee image'} resizeMode="cover" style={StyleSheet.absoluteFill} />
            <View style={[s.photoNote, { bottom: 6 }]}><Txt style={{ fontSize: 10, lineHeight: 16, color: '#FFF' }}>{ar ? 'صورة توضيحية' : 'Illustrative image'}</Txt></View>
          </View>
        ))
      )}
    </View>
  );
}
export function SectionTitle({
  title,
  onPress,
  action,
}: {
  title: string;
  onPress?: () => void;
  action?: string;
}) {
  const ar = useContext(Language) === 'ar';
  return (
    <View style={s.sectionHeading}>
      <Txt heading style={styles.subtitle}>
        {title}
      </Txt>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action ?? (ar ? 'عرض الكل' : 'View all')}
          onPress={onPress}
          style={s.sectionLink}
        >
          <Txt style={styles.muted}>
            {action ?? (ar ? 'عرض الكل' : 'View all')}
          </Txt>
          <Icon name="arrow" size={14} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}
export function MethodPicker({
  value,
  onChange,
  allowed = METHODS,
  all = true,
}: {
  value?: Method;
  onChange: (method?: Method) => void;
  allowed?: readonly Method[];
  all?: boolean;
}) {
  const locale = useContext(Language);
  const items = all ? [undefined, ...allowed] : [...allowed];
  return (
    <View testID="method-picker" style={[s.methodRail, { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }]}>
      {items.map((m) => {
        const title = m ? methods[locale][m] : locale === 'ar' ? 'الكل' : 'All';
        const active = value === m;
        return (
          <Pressable
            key={m ?? 'all'}
            accessibilityRole="button"
            accessibilityLabel={
              m ? title : locale === 'ar' ? 'كل طرق التحضير' : 'All methods'
            }
            accessibilityState={{ selected: active }}
            onPress={() => onChange(m)}
            style={[s.method, { width: '23%', minWidth: 64, minHeight: 60, paddingHorizontal: 3, paddingVertical: 7 }, active && s.methodActive]}
          >
            <Icon
              name={m ?? 'bean'}
              size={20}
              color={active ? '#FFF' : colors.ink}
            />
            <Txt
              numberOfLines={1}
              style={{
                fontSize: 11,
                lineHeight: 20,
                fontWeight: '700',
                color: active ? '#FFF' : colors.ink,
                textAlign: 'center',
              }}
            >
              {title}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
export function CoffeeCard({
  item,
  width,
  saved,
  open,
  save,
}: {
  item: CoffeeItem;
  width: number;
  saved: boolean;
  open: () => void;
  save: () => void;
}) {
  const ar = useContext(Language) === 'ar';
  const motion = usePressMotion();
  return (
    <Animated.View style={[s.coffeeCard, { width }, motion.style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.name}
        onPress={open}
        onPressIn={motion.pressIn}
        onPressOut={motion.pressOut}
        style={{ flex: 1 }}
      >
        <View
          style={{
            height: item.imageUrl || item.images.length
              ? Math.max(120, Math.min(185, width * 0.8))
              : 86,
            overflow: 'hidden',
            borderRadius: 13,
          }}
        >
          <CoffeePhoto
            uri={item.imageUrl}
            uris={item.images}
            kind={item.imageKind}
          />
        </View>
        <View style={s.coffeeCopy}>
          <Txt numberOfLines={1} style={s.coffeeFlavors}>
            {item.roaster}
          </Txt>
          <Txt numberOfLines={2} style={s.coffeeName}>
            {item.name}
          </Txt>
          <FlavorNotes notes={item.flavors} compact max={2} />
        </View>
      </Pressable>
      <View style={s.coffeeFooter}>
        <Txt
          numberOfLines={1}
          style={{
            fontSize: 11,
            lineHeight: 18,
            flex: 1,
            fontFamily: undefined,
            writingDirection: 'ltr',
            textAlign: 'left',
          }}
        >
          {originLabel(item.origin, ar) || item.roaster}
        </Txt>
        <IconButton
          name="heart"
          label={
            (saved
              ? ar
                ? 'إزالة من المفضلة: '
                : 'Unsave: '
              : ar
                ? 'حفظ في المفضلة: '
                : 'Save: ') + item.name
          }
          onPress={save}
          selected={saved}
          size={20}
        />
      </View>
    </Animated.View>
  );
}
export function Home({
  intro,
  data,
  coffees,
  method,
  setMethod,
  openCoffee,
  browse,
  brew,
  personalize,
  bags,
  tools,
  saved,
  save,
  refresh,
  refreshing,
}: {
  intro?: ReactNode;
  data: Bundle | null;
  coffees: CoffeeItem[];
  method?: Method;
  setMethod: (method?: Method) => void;
  openCoffee: (item: CoffeeItem) => void;
  browse: () => void;
  brew: () => void;
  personalize: () => void;
  bags: () => void;
  tools: (category: 'all' | 'xbloom' | 'grinder' | 'scale') => void;
  saved: string[];
  save: (item: CoffeeItem) => void;
  refresh: () => void;
  refreshing: boolean;
}) {
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const { width } = useWindowDimensions();
  const [pulling, setPulling] = useState(false);
  useEffect(() => {
    if (!refreshing) setPulling(false);
  }, [refreshing]);
  const available = Math.min(width, 1120) - 36;
  // Preserve readable cards on portrait tablets instead of squeezing four in.
  const cols = available >= 1000 ? 4 : available >= 720 ? 3 : 2;
  const cardWidth = (available - (cols - 1) * 12) / cols;
  const stats: {
    icon: IconName;
    value: number | string;
    title: string;
    note: string;
  }[] = [
    {
      icon: 'bean',
      value: data
        ? new Set(data.coffees.map((c) => c.beanId ?? c.kind + c.id)).size
        : '—',
      title: ar ? 'نوع بن' : 'Coffees',
      note: ar ? 'من مختلف أنحاء العالم' : 'From around the world',
    },
    {
      icon: 'espresso',
      value: data?.recipeTotal ?? '—',
      title: ar ? 'وصفة' : 'Recipes',
      note: ar ? 'وصفات متنوعة بعناية' : 'Explore your next cup',
    },
    {
      icon: 'xbloom',
      value: METHODS.length,
      title: ar ? 'طريقة تحضير' : 'Brew methods',
      note: ar ? 'من إسبريسو إلى كولد برو' : 'From espresso to cold brew',
    },
    {
      icon: 'globe',
      value: data
        ? new Set(data.coffees.map((c) => c.origin).filter(Boolean)).size
        : '—',
      title: ar ? 'دولة' : 'Origins',
      note: ar ? 'حبوب من مختلف المزارع' : 'Discover coffee origins',
    },
  ];
  const journey: {
    icon: IconName;
    title: string;
    note: string;
    press: () => void;
    accent?: boolean;
  }[] = [
    {
      icon: 'play',
      title: ar ? 'حضّر قهوتي' : 'Brew my coffee',
      note: ar
        ? 'اختر البن والطريقة وابدأ التحضير'
        : 'Pick your coffee and start brewing',
      press: brew,
      accent: true,
    },
    {
      icon: 'bean',
      title: ar ? 'أكياسي' : 'My bags',
      note: ar
        ? 'ارجع للبن المحفوظ وإعداداتك'
        : 'Your saved coffees and settings',
      press: bags,
    },
    {
      icon: 'search',
      title: ar ? 'اكتشف' : 'Discover',
      note: ar
        ? 'ابحث بين البن والوصفات والمحامص'
        : 'Search coffees, recipes and roasters',
      press: browse,
    },
    {
      icon: 'star',
      title: ar ? 'أفضل إعداد' : 'Best setup',
      note: ar
        ? 'اقتراحات مبنية على تفضيلاتك'
        : 'Recommendations for your next cup',
      press: personalize,
    },
  ];
  return (
    <ScrollView
      testID="home-scroll"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing && pulling}
          onRefresh={() => {
            setPulling(true);
            refresh();
          }}
          tintColor={colors.brown}
        />
      }
      style={{ flex: 1, minHeight: 0 }}
      contentContainerStyle={s.homeContent}
    >
      {intro}
      <View style={s.page}>
        <ImageBackground
          testID="home-hero"
          source={artwork.hero}
          style={[
            s.hero,
            {
              minHeight: Math.max(180, Math.min(280, available / 3.1)),
              paddingVertical: width < 500 ? 22 : 18,
            },
          ]}
          imageStyle={{ borderRadius: 18, width: '100%', height: '100%' }}
        >
          <View style={s.heroShade} />
          <View
            style={[
              s.heroCopy,
              {
                width: width < 500 ? '72%' : '55%',
                paddingHorizontal: width < 500 ? 16 : 25,
              },
            ]}
          >
            <Txt
              heading
              style={[
                s.heroTitle,
                {
                  fontSize: width < 500 ? 24 : 34,
                  lineHeight: width < 500 ? 34 : 45,
                },
              ]}
            >
              {ar ? 'اكتشف عالم القهوة.' : 'Discover the world of coffee.'}
            </Txt>
            <Txt style={s.heroDescription}>
              {ar
                ? 'من الحبوب إلى الكوب، تجربة أفضل كل يوم.'
                : 'From bean to cup, a better experience every day.'}
            </Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ar ? 'استكشف الآن' : 'Explore now'}
              onPress={browse}
              style={s.heroButton}
            >
              <Txt
                style={{
                  color: '#FFF',
                  fontSize: 14,
                  fontWeight: '700',
                  flexShrink: 1,
                  textAlign: 'center',
                }}
              >
                {ar ? 'استكشف الآن' : 'Explore now'}
              </Txt>
              <Icon name="arrow" color="#FFF" size={17} />
            </Pressable>
          </View>
          {width >= 650 ? (
            <Txt style={s.heroSignature}>
              More{'\n'}Than{'\n'}Coffee
            </Txt>
          ) : null}
        </ImageBackground>
        <View style={s.stats}>
          {stats.map((stat) => (
            <View
              key={stat.icon}
              style={[s.stat, width < 500 && { paddingHorizontal: 6 }]}
            >
              {width >= 600 ? (
                <View style={s.statIcon}>
                  <Icon name={stat.icon} size={23} />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Txt style={s.statNumber}>{stat.value}</Txt>
                <Txt numberOfLines={2} style={s.statTitle}>
                  {stat.title}
                </Txt>
                {width >= 600 ? (
                  <Txt numberOfLines={1} style={s.statNote}>
                    {stat.note}
                  </Txt>
                ) : null}
              </View>
            </View>
          ))}
        </View>
        <View style={s.journeyWrap}>
          <View style={s.journeyHeader}>
            <View style={{ flex: 1 }}>
              <Txt heading style={s.journeyTitle}>
                {ar ? 'رحلتك مع القهوة' : 'Your coffee journey'}
              </Txt>
              <Txt style={s.journeyIntro}>
                {ar
                  ? 'ابدأ من البن الذي عندك، ثم ارجع لأفضل نتيجة وصلت لها.'
                  : 'Start with the coffee you have, then return to your best result.'}
              </Txt>
            </View>
            <View style={s.journeyBadge}>
              <Icon name="bean" size={22} color={colors.copper} />
            </View>
          </View>
          <View style={s.journeyGrid}>
            {journey.map((item) => (
              <Pressable
                key={item.title}
                accessibilityRole="button"
                accessibilityLabel={item.title + ' — ' + item.note}
                onPress={item.press}
                style={[
                  s.journeyCard,
                  available < 340 && { width: '100%' },
                  item.accent && s.journeyCardAccent,
                ]}
              >
                <View
                  style={[
                    s.journeyIcon,
                    item.accent && { backgroundColor: '#FFFFFF24' },
                  ]}
                >
                  <Icon
                    name={item.icon}
                    size={23}
                    color={item.accent ? '#FFF' : colors.copper}
                    filled={item.icon === 'star'}
                  />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Txt
                    style={[
                      s.journeyCardTitle,
                      item.accent && { color: '#FFF' },
                    ]}
                  >
                    {item.title}
                  </Txt>
                  <Txt
                    style={[
                      s.journeyCardNote,
                      item.accent && { color: '#F8EEE5' },
                    ]}
                  >
                    {item.note}
                  </Txt>
                </View>
                <Icon
                  name="arrow"
                  size={18}
                  color={item.accent ? '#FFF' : colors.teal}
                />
              </Pressable>
            ))}
          </View>
        </View>
        <View style={s.section}>
          <SectionTitle
            title={ar ? 'اختر طريقة التحضير' : 'Choose your brew method'}
            onPress={brew}
          />
          <MethodPicker value={method} onChange={setMethod} />
        </View>
        <View style={s.section}>
          <SectionTitle
            title={ar ? 'أحدث الحبوب' : 'Latest beans'}
            onPress={browse}
          />
          {refreshing && !data ? (
            <View style={s.grid}>
              {Array.from({ length: cols }, (_, i) => (
                <View key={i} style={[s.skeleton, { width: cardWidth }]}>
                  <View style={s.skeletonPhoto} />
                  <View style={s.skeletonText} />
                </View>
              ))}
            </View>
          ) : coffees.length ? (
            <View style={s.grid}>
              {coffees.slice(0, 4).map((c) => (
                <CoffeeCard
                  key={c.kind + c.id}
                  item={c}
                  width={cardWidth}
                  saved={saved.includes(c.beanId ?? c.id)}
                  open={() => openCoffee(c)}
                  save={() => save(c)}
                />
              ))}
            </View>
          ) : (
            <Txt style={styles.muted}>
              {ar
                ? 'لا توجد حبوب مطابقة لطريقة التحضير.'
                : 'No coffees match this brew method.'}
            </Txt>
          )}
        </View>
        <View style={s.section}>
          <SectionTitle
            title={ar ? 'أدوات وتوصيات' : 'Tools and recommendations'}
            onPress={() => tools('all')}
          />
          <View
            testID="home-tools"
            style={[s.tools, width >= 600 && s.toolsWide]}
          >
            {[
              {
                title: 'xBloom',
                description: ar
                  ? 'تحكم كامل في الوصفة'
                  : 'A recipe for every cup',
                image: artwork.xbloom,
                press: () => tools('xbloom'),
              },
              {
                title: ar ? 'طاحونة القهوة' : 'Coffee grinder',
                description: ar
                  ? 'طحن مثالي كل مرة'
                  : 'Find your perfect grind',
                image: artwork.grinder,
                press: () => tools('grinder'),
              },
              {
                title: ar ? 'ميزان القهوة' : 'Coffee scale',
                description: ar
                  ? 'دقة تصنع الفرق'
                  : 'Precision makes the difference',
                image: artwork.scale,
                press: () => tools('scale'),
              },
            ].map((tool) => (
              <Pressable
                key={tool.title}
                accessibilityRole="button"
                accessibilityLabel={tool.title}
                onPress={tool.press}
                style={[
                  s.tool,
                  width >= 600
                    ? s.toolWide
                    : { flexDirection: ar ? 'row-reverse' : 'row' },
                ]}
              >
                <Image
                  source={tool.image}
                  resizeMode="contain"
                  accessible={false}
                  style={s.toolImage}
                />
                <View style={s.toolCopy}>
                  <Txt
                    style={{ fontSize: 15, fontWeight: '700' }}
                  >
                    {tool.title}
                  </Txt>
                  <Txt
                    style={{
                      fontSize: 13,
                      color: colors.muted,
                      lineHeight: 21,
                    }}
                  >
                    {tool.description}
                  </Txt>
                  <Txt
                    style={{
                      fontSize: 12,
                      marginTop: 8,
                      textDecorationLine: 'underline',
                    }}
                  >
                    {ar ? 'عرض الآن' : 'View now'}
                  </Txt>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
        {data?.warnings ? (
          <Txt style={styles.warning}>
            {ar
              ? 'تعذّر تحميل بعض البيانات. اسحب لتحديثها.'
              : 'Some data could not be loaded. Pull to refresh.'}
          </Txt>
        ) : null}
      </View>
    </ScrollView>
  );
}
export function CoffeeDetail({
  item,
  recipes,
  openRecipe,
  addToBags,
  browseRecipes,
}: {
  item: CoffeeItem;
  recipes: RecipeItem[];
  openRecipe: (r: RecipeItem) => void;
  addToBags?: (item: CoffeeItem) => void;
  browseRecipes?: (method: Method) => void;
}) {
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const { width } = useWindowDimensions();
  const linked = useCoffeeRecipes(item, recipes, locale);
  const related = linked.recipes;
  const allowed = METHODS.filter(
    (m) => item.methods.includes(m) || related.some((r) => r.method === m),
  );
  if (!allowed.length) allowed.push('v60');
  const [method, setMethod] = useState<Method>(
    allowed.includes('xbloom') ? 'xbloom' : (allowed[0] ?? 'v60'),
  );
  const methodChosen = useRef(false);
  const [photo, setPhoto] = useState(0);
  const exactRecipe = related.find((r) => r.method === method);
  const starter = useBrewStarter(method, !linked.busy && !exactRecipe, locale);
  const recipe = exactRecipe ?? starter.recipe;
  const methodKey = allowed.join('|');
  useEffect(() => setPhoto(0), [item.kind, item.id]);
  useEffect(() => {
    const available = methodKey.split('|').filter(Boolean) as Method[];
    if (available.length && !available.includes(method))
      setMethod(available.includes('xbloom') ? 'xbloom' : available[0]);
  }, [methodKey, method]);
  useEffect(() => {
    if (
      !methodChosen.current &&
      !linked.busy &&
      related.length &&
      !related.some((r) => r.method === method)
    ) {
      setMethod(
        related.find((r) => r.method === 'xbloom')?.method ?? related[0].method,
      );
    }
  }, [linked.busy, related, method]);
  const process: Record<string, string> = {
    natural: ar ? 'معالجة طبيعية' : 'Natural',
    washed: ar ? 'مغسول' : 'Washed',
    honey: ar ? 'عسلي' : 'Honey',
    anaerobic: ar ? 'لاهوائي' : 'Anaerobic',
  };
  const numbers = recipe ? recipeQuickFacts(recipe, ar) : [];
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[s.page, { maxWidth: 780, gap: 18 }]}
    >
      <View
        style={[
          s.detailPhoto,
          { height: Math.min(360, (Math.min(width, 780) - 36) * 0.83) },
        ]}
      >
        <CoffeePhoto
          uri={item.images[photo]}
          uris={item.images}
          kind={item.imageKind}
          detail
        />
        {item.images.length > 1 ? (
          <View style={s.galleryDots}>
            {item.images.map((_, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={(ar ? 'صورة ' : 'Photo ') + (i + 1)}
                onPress={() => setPhoto(i)}
                style={[
                  s.dot,
                  {
                    backgroundColor: i === photo ? colors.teal : '#C8BBB0',
                  },
                ]}
              />
            ))}
          </View>
        ) : null}
        {item.images.length ? (
          <Txt style={s.photoCount}>
            {photo + 1}/{item.images.length}
          </Txt>
        ) : null}
      </View>
      <View style={s.detailTitleRow}>
        <View style={{ flex: 1 }}>
          <Txt heading style={styles.title}>
            {item.name}
          </Txt>
          <Txt style={styles.muted}>
            {[item.roaster, processLabel(item.process, locale)]
              .filter(Boolean)
              .join(' – ')}
          </Txt>
        </View>
        {item.origin ? (
          <Txt
            style={[
              styles.muted,
              { fontFamily: undefined, writingDirection: 'ltr' },
            ]}
          >
            {originLabel(item.origin, ar)}
          </Txt>
        ) : null}
      </View>
      <CoffeeSensory
        notes={item.flavors}
        sensory={item.sensory}
        roast={item.roast}
        sourceUrl={item.sourceUrl}
      />
      {item.description ? (
        <Txt style={{ fontSize: 14, lineHeight: 27 }}>{item.description}</Txt>
      ) : null}
      {item.details?<View style={{gap:6}}>{[[ar?'المنطقة':'Region',item.details.region],[ar?'المزرعة':'Farm',item.details.farm],[ar?'الارتفاع':'Altitude',item.details.altitude?item.details.altitude+(ar?' متر':' m'):null],[ar?'وزن الكيس':'Bag weight',item.details.weight?item.details.weight+(ar?' غ':' g'):null],[ar?'تاريخ التحميص':'Roast date',item.details.roastDate]].filter(([,value])=>value).map(([label,value])=><Txt key={label}>{label}: {value}</Txt>)}</View>:null}
      {item.roasterSite?<SourceLink title={ar?'موقع المحمصة':'Roaster website'} url={item.roasterSite}/>:null}
      {item.variety ? (
        <View style={styles.metaPill}>
          <Txt style={styles.metaText}>
            {ar ? 'السلالة: ' : 'Variety: '}
            {catalogName(item.variety, locale)}
          </Txt>
        </View>
      ) : null}
      {addToBags ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ar ? 'أضف إلى أكياسي' : 'Add to My Bags'}
          onPress={() => addToBags(item)}
          style={s.inventoryButton}
        >
          <Icon name="plus" size={18} color={colors.teal} />
          <Txt style={s.inventoryButtonText}>
            {ar ? 'أضف إلى أكياسي' : 'Add to My Bags'}
          </Txt>
          <Icon name="arrow" size={17} color={colors.teal} />
        </Pressable>
      ) : null}
      <View style={s.section}>
        <SectionTitle
          title={ar ? 'اختر طريقة التحضير' : 'Choose your brew method'}
        />
        <MethodPicker
          value={method}
          onChange={(m) => {
            if (m) {
              methodChosen.current = true;
              setMethod(m);
            }
          }}
          allowed={allowed}
          all={false}
        />
        {linked.busy || starter.busy ? (
          <View accessibilityLiveRegion="polite">
            <Txt style={styles.muted}>
              {ar ? 'جاري تحميل وصفات التحضير…' : 'Loading brew recipes…'}
            </Txt>
          </View>
        ) : null}
      </View>
      {recipe ? (
        <>
          <View style={s.infoSection}>
            <Txt heading style={s.infoHeading}>
              {exactRecipe
                ? ar
                  ? 'مقادير الوصفة المختارة'
                  : 'Selected recipe'
                : ar
                  ? 'وصفة بداية عامة'
                  : 'General starting recipe'}
            </Txt>
            <View style={s.brewStats}>
              {numbers.map((n) => (
                <View key={n.key} style={s.brewStat}>
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 7,
                      alignItems: 'flex-start',
                      width: '100%',
                    }}
                  >
                    <Icon name={n.icon} size={21} />
                    <Txt
                      style={{
                        fontFamily: undefined,
                        fontWeight: '700',
                        fontSize: 14,
                        lineHeight: 21,
                        flex: 1,
                        writingDirection: /^\d/.test(n.value)
                          ? 'ltr'
                          : undefined,
                      }}
                    >
                      {n.value}
                    </Txt>
                  </View>
                  <Txt style={{ fontSize: 11, color: colors.muted }}>
                    {n.label}
                  </Txt>
                </View>
              ))}
            </View>
          </View>
          {!exactRecipe ? (
            <View testID="coffee-general-recipe">
              <Txt style={styles.muted}>
                {ar
                  ? 'دليل عام من ' +
                    (recipe.author || recipe.sources[0]?.name || 'المصدر') +
                    ' يصلح كنقطة بداية مع أنواع بن مختلفة. عدّل الاستخلاص حسب طعم كوبك.'
                  : 'A general guide from ' +
                    (recipe.author ||
                      recipe.sources[0]?.name ||
                      'the publisher') +
                    ' for starting with different coffees. Adjust extraction to your taste.'}
              </Txt>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => openRecipe(recipe)}
            style={s.brewButton}
          >
            <Icon name="play" color="#FFF" size={18} />
            <Txt style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>
              {(ar ? 'ابدأ التحضير مع ' : 'Start brewing with ') +
                methods[locale][method]}
            </Txt>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={recipe.title}
            onPress={() => openRecipe(recipe)}
            style={s.recommended}
          >
            <View style={s.statIcon}>
              <Icon name={method} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: '700' }}>
                {exactRecipe
                  ? ar
                    ? 'وصفة ' + methods[locale][method] + ' لهذا البن'
                    : methods[locale][method] + ' recipe for this coffee'
                  : ar
                    ? 'دليل التحضير العام'
                    : 'General brewing guide'}
              </Txt>
              <Txt numberOfLines={2} style={styles.muted}>
                {recipe.title}
              </Txt>
            </View>
            <Icon name="arrow" size={20} />
          </Pressable>
        </>
      ) : !linked.busy && !starter.busy ? (
        <View
          testID="coffee-browse-recipes"
          style={[
            styles.card,
            { gap: 12, backgroundColor: '#EFF7F5', borderColor: '#BFD9D7' },
          ]}
        >
          <Txt heading style={styles.subtitle}>
            {ar ? 'اختَر وصفة لكوبك' : 'Choose a recipe for your cup'}
          </Txt>
          <Txt style={styles.muted}>
            {linked.error || starter.error
              ? ar
                ? 'تعذّر تحميل الوصفات. يمكنك إعادة المحاولة أو استكشاف المكتبة.'
                : 'Recipes could not be loaded. Retry or explore the library.'
              : ar
                ? 'استكشف إعدادات ' +
                  methods[locale][method] +
                  ' واختَر وصفة تناسب البن وطعم كوبك.'
                : 'Explore ' +
                  methods[locale][method] +
                  ' settings and choose a recipe for your coffee and taste.'}
          </Txt>
          {browseRecipes ? (
            <Action
              title={
                (ar ? 'استكشف وصفات ' : 'Explore ') +
                methods[locale][method] +
                (ar ? '' : ' recipes')
              }
              onPress={() => browseRecipes(method)}
              selected
            />
          ) : null}
          {starter.error ? (
            <Action
              title={ar ? 'إعادة المحاولة' : 'Try again'}
              onPress={starter.retry}
            />
          ) : null}
        </View>
      ) : null}
      {related
        .filter((r) => r.method === method && r.id !== recipe?.id)
        .map((r) => (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            accessibilityLabel={r.title}
            onPress={() => openRecipe(r)}
            style={s.recommended}
          >
            <Icon name={r.method} color={colors.teal} />
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: '700' }}>{r.title}</Txt>
              <Txt style={styles.muted}>{r.author ?? item.roaster}</Txt>
            </View>
            <Icon name="arrow" size={18} />
          </Pressable>
        ))}
      {linked.error ? (
        <View testID="coffee-recipes-error" style={styles.card}>
          <Txt style={styles.warning}>
            {ar
              ? 'تعذّر تحميل بقية وصفات هذا البن.'
              : 'Could not load the remaining recipes for this coffee.'}
          </Txt>
          <Action
            title={ar ? 'إعادة المحاولة' : 'Try again'}
            onPress={linked.retry}
            disabled={linked.busy}
          />
        </View>
      ) : linked.more ? (
        <Action
          title={
            ar ? 'عرض المزيد من وصفات هذا البن' : 'More recipes for this coffee'
          }
          onPress={linked.loadMore}
          disabled={linked.busy}
        />
      ) : null}
      {item.sourceUrl ? (
        <SourceLink
          title={ar ? 'فتح مصدر البيانات' : 'Open data source'}
          url={item.sourceUrl}
        />
      ) : null}
      {item.imageSourceUrl && item.imageSourceUrl !== item.sourceUrl ? (
        <SourceLink
          title={ar ? 'مصدر صورة البن' : 'Coffee photo source'}
          url={item.imageSourceUrl}
        />
      ) : null}
      <CatalogComments key={item.kind+item.id} kind={item.kind==='product'?'product':'bean'} id={item.id}/>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  homeContent: { paddingTop: 4 },
  page: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 18,
  },
  hero: {
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: colors.brown,
  },
  heroShade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(22,12,6,0.2)',
  },
  heroCopy: {
    paddingHorizontal: 25,
    gap: 7,
    alignItems: 'center',
    zIndex: 1,
  },
  heroTitle: { color: '#FFF', fontWeight: '700', textAlign: 'center' },
  heroDescription: {
    color: '#FFFDF7',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
  heroButton: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFF6E8',
    borderRadius: 999,
    paddingHorizontal: 14,
    maxWidth: '100%',
    minHeight: 43,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    backgroundColor: '#48301F88',
  },
  heroSignature: {
    position: 'absolute',
    right: 24,
    bottom: 25,
    color: '#FFF',
    fontSize: 22,
    lineHeight: 30,
    fontStyle: 'italic',
    fontFamily: 'cursive',
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    minHeight: 84,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontFamily: undefined,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  statTitle: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  statNote: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.muted,
    textAlign: 'center',
  },
  journeyWrap: {
    gap: 12,
    backgroundColor: '#F2E7D8',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2D2C0',
  },
  journeyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  journeyTitle: { fontSize: 20, lineHeight: 29, fontWeight: '800' },
  journeyIntro: {
    fontSize: 12,
    lineHeight: 20,
    color: colors.muted,
    marginTop: 2,
  },
  journeyBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF9F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  journeyCard: {
    width: '48%',
    minWidth: 145,
    minHeight: 105,
    backgroundColor: colors.paper,
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 9,
    justifyContent: 'space-between',
  },
  journeyCardAccent: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  journeyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F4E8DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyCardTitle: { fontSize: 15, lineHeight: 22, fontWeight: '800' },
  journeyCardNote: { fontSize: 13, lineHeight: 21, color: colors.muted },
  section: { gap: 10 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionLink: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    minHeight: 40,
  },
  methodRail: { gap: 8, paddingBottom: 2 },
  method: {
    width: 76,
    height: 82,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  methodActive: {
    backgroundColor: colors.brown,
    borderColor: colors.brown,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'stretch',
  },
  coffeeCard: {
    borderRadius: 15,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    minWidth: 0,
  },
  photo: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#F9F5EC',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 12,
  },
  photoNote: {
    position: 'absolute',
    top: 6,
    left: 7,
    borderRadius: 10,
    backgroundColor: '#21170D99',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coffeeCopy: { paddingHorizontal: 9, paddingTop: 8, gap: 4 },
  coffeeName: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'left',
    writingDirection: 'auto',
    minHeight: 46,
  },
  coffeeFlavors: { fontSize: 11, lineHeight: 18, color: colors.muted },
  coffeeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 9,
    paddingRight: 2,
    minHeight: 36,
  },
  tools: { gap: 12 },
  toolsWide: { flexDirection: 'row' },
  tool: {
    minWidth: 0,
    minHeight: 128,
    padding: 12,
    gap: 12,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#E8DDCE',
    overflow: 'hidden',
  },
  toolWide: { flex: 1, alignItems: 'stretch' },
  // Keep the complete product in normal layout flow. Absolute positioning and
  // percentage heights can clip these images on native iOS inside flex cards.
  toolImage: {
    width: 104,
    height: 104,
    flexShrink: 0,
    alignSelf: 'center',
  },
  toolCopy: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 4,
  },
  skeleton: {
    height: 182,
    borderRadius: 15,
    backgroundColor: colors.paper,
    padding: 8,
    gap: 10,
  },
  skeletonPhoto: {
    height: 104,
    borderRadius: 12,
    backgroundColor: '#E6DFD1',
  },
  skeletonText: {
    height: 18,
    borderRadius: 6,
    backgroundColor: '#E6DFD1',
    width: '75%',
  },
  detailPhoto: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#DDD0BD',
  },
  galleryDots: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  photoCount: {
    position: 'absolute',
    right: 14,
    bottom: 10,
    backgroundColor: '#21170D99',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    color: '#FFF',
    fontFamily: undefined,
  },
  detailTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoSection: { gap: 0 },
  infoHeading: {
    alignSelf: 'flex-start',
    fontSize: 20,
    fontWeight: '700',
    backgroundColor: colors.paper,
    paddingHorizontal: 15,
    paddingTop: 10,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  brewStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    paddingVertical: 4,
    backgroundColor: colors.paper,
  },
  brewStat: {
    width: '50%',
    minWidth: 0,
    padding: 12,
    alignItems: 'flex-start',
    gap: 5,
  },
  inventoryButton: {
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#BFD9D7',
    backgroundColor: '#EFF7F5',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  inventoryButtonText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '800',
    color: colors.teal,
  },
  brewButton: {
    backgroundColor: colors.teal,
    borderRadius: 15,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 12,
  },
  recommended: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
});
export const coffeeStyles = s;
