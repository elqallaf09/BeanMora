import {CatalogComments,AccountFavorite} from './CatalogComments';
import { useContext } from 'react';
import { ScrollView, View, useWindowDimensions } from './native';
import type { RecipeItem } from './data';
import { copy, methods } from './copy';
import { coffeeStyles } from './CoffeeScreens';
import { SourceLink } from './SourceLink';
import { GuidedBrew } from './GuidedBrew';
import { RecipeVisual } from './RecipeVisual';
import { MethodGuide } from './MethodGuide';
import { SourceBrewDetails } from './SourceBrewDetails';
import { ManualRecipeFacts } from './ManualRecipeFacts';
import { Disclosure } from './Disclosure';
import {
  doseLabel,
  recipeTitle,
  timeLabel,
  waterLabel,
  temperatureLabel,
} from './manualBrew';
import { FlavorNotes } from './SensoryProfile';
import { catalogName } from './localizedContent';
import {
  Action,
  Icon,
  Language,
  Txt,
  colors,
  styles,
  type IconName,
} from './ui';

export function RecipeDetail({
  recipe,
  record,
  saved = false,
  toggleSaved,
  saving = false,
  saveError = false,
}: {
  recipe: RecipeItem;
  record: (seconds?: number) => void;
  saved?: boolean;
  toggleSaved?: () => void;
  saving?: boolean;
  saveError?: boolean;
}) {
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const t = copy[locale];
  const { width } = useWindowDimensions();
  const manual = recipe.sourceBrew.manual;
  const discovery = recipe.discovery;
  const sourcePours = !!recipe.sourceBrew.pours?.length;
  const grindTranslations: Record<string, string> = {
    'Medium-coarse': 'متوسط خشن',
    'Medium-fine': 'متوسط ناعم',
    'Like kosher salt': 'مثل الملح الخشن',
  };
  const grind =
    (ar ? manual?.grind_ar : undefined) ||
    (ar && recipe.grindSetting
      ? grindTranslations[recipe.grindSetting]
      : undefined) ||
    recipe.grindSetting;
  const values = (
    [
      {
        icon: recipe.method,
        value: methods[locale][recipe.method],
        label: ar ? 'طريقة التحضير' : 'Brew method',
      },
      {
        icon: 'bean',
        value:
          doseLabel(recipe) === '—' && recipe.method === 'moka_pot'
            ? ar
              ? 'سلة ممتلئة بلا كبس'
              : 'Full, loose basket'
            : doseLabel(recipe),
        label: t.dose,
      },
      {
        icon: 'drop',
        value: waterLabel(recipe, ar),
        label:
          recipe.method === 'espresso'
            ? ar
              ? 'ناتج الإسبريسو'
              : 'Espresso yield'
            : ar
              ? 'ماء التحضير'
              : 'Brew water',
      },
      {
        icon: 'gear',
        value: grind || '—',
        label: ar ? 'إعداد الطحنة' : 'Grind setting',
      },
      {
        icon: 'temp',
        value: temperatureLabel(recipe, ar),
        label: ar ? 'حرارة الماء' : 'Water temperature',
      },
      {
        icon: 'clock',
        value:
          timeLabel(recipe, ar) === '—' && recipe.method === 'moka_pot'
            ? ar
              ? 'حسب انتهاء التدفق'
              : 'Until flow ends'
            : timeLabel(recipe, ar),
        label: ar ? 'الوقت الإرشادي' : 'Guide time',
      },
    ] satisfies { icon: IconName; value: string; label: string }[]
  ).filter((f) => f.value !== '—');
  const provenance = [
    [ar ? 'صاحب الوصفة' : 'Recipe by', discovery?.creatorName || recipe.author],
    [ar ? 'بلد صاحب الوصفة' : 'Creator country', discovery?.creatorCountry],
    [ar ? 'منشأ الوصفة' : 'Recipe origin', discovery?.recipeCountry],
    [ar ? 'البن' : 'Coffee', discovery?.coffeeName],
    [ar ? 'المحمصة' : 'Roaster', discovery?.roasterName],
    [ar ? 'منشأ البن' : 'Coffee origin', discovery?.coffeeOrigin],
    [
      ar ? 'نوع البن' : 'Coffee type',
      discovery?.coffeeType
        ? catalogName(discovery.coffeeType.replaceAll('_', ' '), locale)
        : null,
    ],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const primary =
    recipe.sources.find((s) => s.url.includes('share-h5.xbloom.com')) ??
    recipe.sources[0];
  return (
    <ScrollView
      testID="recipe-detail"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[coffeeStyles.page, { maxWidth: 780, gap: 12 }]}
    >
      <View
        style={{
          height: width < 600 ? 150 : 170,
          borderRadius: 18,
          overflow: 'hidden',
        }}
      >
        <RecipeVisual recipe={recipe} />
      </View>
      <View style={{ gap: 3 }}>
        <View style={[styles.row, ar && { flexDirection: 'row-reverse' }]}>
          <Txt style={styles.muted}>
            {methods[locale][recipe.method]}
            {recipe.author ? ' · ' + recipe.author : ''}
          </Txt>
          {discovery?.servingStyle ? (
            <View style={[styles.metaPill, { backgroundColor: '#E2EFEB' }]}>
              <Txt style={{ fontSize: 12, color: colors.teal }}>
                {discovery.servingStyle === 'hot'
                  ? ar
                    ? 'حار'
                    : 'Hot'
                  : discovery.servingStyle === 'iced'
                    ? ar
                      ? 'مثلّج'
                      : 'Iced'
                    : ar
                      ? 'بارد'
                      : 'Cold'}
                {discovery.servingStyleInferred ? (ar ? ' · مقترح' : ' · Suggested') : ''}
              </Txt>
            </View>
          ) : null}
        </View>
        {discovery?.servingStyleInferred ? <Txt style={{ fontSize: 12, color: colors.muted }}>
          {ar ? 'نوع التقديم مقترح حسب طريقة التحضير؛ لم يحدده صاحب الوصفة.' : 'Serving style is suggested from the preparation method; the publisher did not specify it.'}
        </Txt> : null}
        <Txt heading style={[styles.title, { fontSize: 24, lineHeight: 32 }]}>
          {recipeTitle(recipe.title, ar)}
        </Txt>
        <FlavorNotes
          notes={
            discovery?.flavorNotes.length
              ? discovery.flavorNotes
              : recipe.flavors
          }
          max={8}
        />
      </View>
      {toggleSaved ? <View style={{ gap: 6 }}>
        <Action title={saved ? (ar ? 'إزالة الوصفة من المحفوظة' : 'Remove saved recipe') : (ar ? 'حفظ الوصفة على الجهاز' : 'Save recipe on device')}
          onPress={toggleSaved} selected={saved} disabled={saving} />
        {saveError ? <Txt style={styles.warning}>{ar ? 'تعذّر الحفظ. تحقّق من المساحة المتاحة وعدد الوصفات المحفوظة (حتى 50).' : 'Could not save. Check storage space and the saved recipe limit (50).'}</Txt> : null}
      </View> : null}
      <View
        testID="recipe-source-facts"
        style={{
          flexDirection: ar ? 'row-reverse' : 'row',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {values.map((n) => (
          <View
            key={n.icon}
            style={[
              styles.card,
              {
                flexBasis: width >= 600 ? '30%' : '46%',
                flexGrow: 1,
                minWidth: 116,
                marginBottom: 0,
                padding: 12,
                gap: 5,
              },
            ]}
          >
            <View style={[styles.row, ar && { flexDirection: 'row-reverse' }]}>
              <Icon name={n.icon} size={16} />
              <Txt style={{ fontSize: 11, color: colors.muted }}>{n.label}</Txt>
            </View>
            <Txt
              style={{
                fontSize: 17,
                lineHeight: 25,
                fontWeight: '700',
                writingDirection: /^\d/.test(n.value)
                  ? 'ltr'
                  : ar
                    ? 'rtl'
                    : 'ltr',
              }}
            >
              {n.value}
            </Txt>
          </View>
        ))}
      </View>
      <ManualRecipeFacts recipe={recipe} />
      {recipe.incomplete ? (
        <Txt style={styles.warning}>
          {manual?.parameter_only_source
            ? ar
              ? 'المصدر ينشر مقادير التحضير دون إجراء تفصيلي.'
              : 'The source publishes brewing amounts without a full procedure.'
            : ar
              ? 'بعض التفاصيل غير منشورة؛ افتح المصدر قبل التحضير.'
              : 'Some details are not published; check the source before brewing.'}
        </Txt>
      ) : null}
      <GuidedBrew key={recipe.id} recipe={recipe} record={record} />
      {sourcePours ? (
        <SourceBrewDetails recipe={recipe} />
      ) : (
        <View testID="recipe-instructions" style={{ gap: 8 }}>
          <Txt heading style={styles.subtitle}>
            {t.instructions}
          </Txt>
          {recipe.steps.length ? (
            recipe.steps.map((step) => (
              <View
                key={step.number}
                style={[styles.card, { padding: 12, marginBottom: 0, gap: 5 }]}
              >
                <Txt style={{ fontWeight: '700' }}>
                  {step.number}. {step.title}
                </Txt>
                <Txt>{step.description}</Txt>
              </View>
            ))
          ) : !recipe.pours.length ? (
            <Txt style={styles.warning}>{t.noSteps}</Txt>
          ) : null}
        </View>
      )}
      {primary ? (
        <SourceLink
          title={
            primary.url.includes('share-h5.xbloom.com')
              ? ar
                ? 'فتح الوصفة في xBloom'
                : 'Open recipe in xBloom'
              : ar
                ? 'فتح مصدر الوصفة'
                : 'Open recipe source'
          }
          url={primary.url}
        />
      ) : null}
      <Disclosure
        title={ar ? 'عن الوصفة وإعدادات المصدر' : 'Recipe and source details'}
        subtitle={
          ar
            ? 'الناشر، البن، ملاحظات التحضير والروابط'
            : 'Publisher, coffee, brewing notes and links'
        }
        testID="recipe-source-disclosure"
      >
        {provenance.map(([label, value]) => (
          <View key={label} style={{ gap: 2 }}>
            <Txt style={{ fontSize: 11, color: colors.muted }}>{label}</Txt>
            <Txt style={{ fontSize: 14, fontWeight: '700' }}>{value}</Txt>
          </View>
        ))}
        <SourceBrewDetails recipe={recipe} settingsOnly />
        {recipe.notes ? <Txt>{recipe.notes}</Txt> : null}
        {recipe.originalTitle && recipe.originalTitle !== recipe.title ? (
          <View testID="recipe-original-title">
            <Txt style={styles.muted}>
              {ar ? 'عنوان المصدر الأصلي' : 'Original source title'}
            </Txt>
            <Txt>{recipe.originalTitle}</Txt>
          </View>
        ) : null}
        {recipe.videoUrl ? (
          <SourceLink
            title={ar ? 'شاهد فيديو الوصفة' : 'Watch recipe video'}
            url={recipe.videoUrl}
          />
        ) : null}
        {recipe.sources.map((source) => (
          <View key={source.url} style={{ gap: 2 }}>
            <SourceLink
              title={
                source.url.includes('share-h5.xbloom.com')
                  ? ar
                    ? 'الوصفة في xBloom'
                    : 'Recipe in xBloom'
                  : catalogName(source.name, locale)
              }
              url={source.url}
            />
            {source.verifiedAt ? (
              <Txt style={styles.muted}>
                {ar ? 'آخر تحقق: ' : 'Last checked: '}
                {new Date(source.verifiedAt).toLocaleDateString(
                  locale + '-u-nu-latn',
                )}
              </Txt>
            ) : null}
          </View>
        ))}
      </Disclosure>
      <Disclosure title={ar ? 'دليل طريقة التحضير' : 'Brew method guide'}>
        <MethodGuide method={recipe.method} showPhoto={false} />
      </Disclosure>
      <AccountFavorite recipeId={recipe.id}/>
      <CatalogComments key={recipe.id} kind="recipe" id={recipe.id}/>
      <Action title={t.record} onPress={() => record()} selected />
    </ScrollView>
  );
}
