import { useContext } from 'react';
import { ScrollView, View } from 'react-native';
import type { RecipeItem } from './data';
import { copy, methods } from './copy';
import { coffeeStyles } from './CoffeeScreens';
import { SourceLink } from './SourceLink';
import { GuidedBrew } from './GuidedBrew';
import { RecipeVisual } from './RecipeVisual';
import { MethodGuide } from './MethodGuide';
import { SourceBrewDetails } from './SourceBrewDetails';
import { ManualRecipeFacts } from './ManualRecipeFacts';
import { doseLabel, recipeTitle, timeLabel, waterLabel, temperatureLabel } from './manualBrew';
import { FlavorNotes } from './SensoryProfile';
import { Action, Icon, Language, Txt, colors, styles, type IconName } from './ui';

export function RecipeDetail({ recipe, record }: { recipe: RecipeItem; record: (seconds?: number) => void }) {
  const locale = useContext(Language); const ar = locale === 'ar'; const t = copy[locale];
  const manual = recipe.sourceBrew.manual;
  const discovery = recipe.discovery;
  const grindTranslations: Record<string, string> = { 'Medium-coarse': 'متوسط خشن', 'Medium-fine': 'متوسط ناعم', 'Like kosher salt': 'مثل الملح الخشن' };
  const grind = (ar ? manual?.grind_ar : undefined) || (ar && recipe.grindSetting ? grindTranslations[recipe.grindSetting] : undefined) || recipe.grindSetting;
  const temperature = temperatureLabel(recipe, ar);
  const values: { icon: IconName; value: string; label: string }[] = [
    { icon: recipe.method, value: methods[locale][recipe.method], label: ar ? 'طريقة التحضير' : 'Brew method' },
    { icon: 'bean', value: doseLabel(recipe) === '—' && recipe.method === 'moka_pot' ? (ar ? 'سلة ممتلئة بلا كبس' : 'Full, loose basket') : doseLabel(recipe), label: t.dose },
    { icon: 'drop', value: waterLabel(recipe, ar), label: recipe.method === 'espresso' ? ar ? 'ناتج الإسبريسو' : 'Espresso yield' : ar ? 'ماء التحضير' : 'Brew water' },
    { icon: 'gear', value: grind || '—', label: ar ? 'إعداد الطحنة' : 'Grind setting' },
    { icon: 'temp', value: temperature, label: ar ? 'حرارة الماء' : 'Water temperature' },
    { icon: 'clock', value: timeLabel(recipe, ar) === '—' && recipe.method === 'moka_pot' ? (ar ? 'حسب انتهاء التدفق' : 'Until flow ends') : timeLabel(recipe, ar), label: ar ? 'الوقت الإرشادي' : 'Guide time' },
  ];
  const typeNames: Record<string, string> = ar ? { single_origin: 'منشأ واحد', blend: 'خلطة', decaf: 'منزوع الكافيين', arabica: 'أرابيكا', robusta: 'روبوستا' } : { single_origin: 'Single origin', blend: 'Blend', decaf: 'Decaf', arabica: 'Arabica', robusta: 'Robusta' };
  const provenance = [
    [ar ? 'صاحب الوصفة' : 'Recipe by', discovery?.creatorName || recipe.author],
    [ar ? 'بلد صاحب الوصفة' : 'Creator’s base country', discovery?.creatorCountry],
    [ar ? 'منشأ الوصفة' : 'Recipe origin', discovery?.recipeCountry],
    [ar ? 'البن' : 'Coffee', discovery?.coffeeName],
    [ar ? 'المحمصة' : 'Roaster', discovery?.roasterName],
    [ar ? 'منشأ البن' : 'Coffee origin', discovery?.coffeeOrigin],
    [ar ? 'نوع البن' : 'Coffee type', discovery?.coffeeType ? typeNames[discovery.coffeeType] || discovery.coffeeType : null],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  return <ScrollView testID="recipe-detail" showsVerticalScrollIndicator={false} contentContainerStyle={[coffeeStyles.page, { maxWidth: 780 }]}>
    <View style={{ height: 220, borderRadius: 20, overflow: 'hidden' }}><RecipeVisual recipe={recipe}/></View>
    <View style={[styles.row, ar && { flexDirection: 'row-reverse' }]}><Txt style={styles.muted}>{methods[locale][recipe.method]}{recipe.author ? ` · ${recipe.author}` : ''}</Txt>{discovery?.servingStyle ? <View style={[styles.metaPill, { backgroundColor: '#E2EFEB' }]}><Txt style={{ fontSize: 12, color: colors.teal }}>{discovery.servingStyle === 'hot' ? ar ? 'حار' : 'Hot' : discovery.servingStyle === 'iced' ? ar ? 'مثلّج' : 'Iced' : ar ? 'بارد' : 'Cold'}</Txt></View> : null}</View>
    <Txt heading style={styles.title}>{recipeTitle(recipe.title, ar)}</Txt>
    <FlavorNotes notes={discovery?.flavorNotes.length ? discovery.flavorNotes : recipe.flavors} max={8}/>
    <Txt style={styles.muted}>{ar ? 'مقادير وصفة المصدر' : 'Source recipe amounts'}</Txt>
    <View testID="recipe-source-facts" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{values.map(n => <View key={n.icon} style={[styles.card, { flexBasis: '46%', flexGrow: 1, minWidth: 116, marginBottom: 0 }]}><View style={styles.row}><Icon name={n.icon} size={20}/><Txt style={styles.muted}>{n.label}</Txt></View><Txt style={{ fontSize: 20, lineHeight: 30, fontWeight: '700', writingDirection: /^\d/.test(n.value) ? 'ltr' : ar ? 'rtl' : 'ltr' }}>{n.value}</Txt></View>)}</View>
    <ManualRecipeFacts recipe={recipe}/>
    {provenance.length ? <View style={[styles.card, { gap: 10 }]}><Txt heading style={styles.subtitle}>{ar ? 'عن الوصفة والبن' : 'Recipe & coffee'}</Txt>{provenance.map(([label, value]) => <View key={label} style={{ gap: 2 }}><Txt style={{ fontSize: 11, color: colors.muted }}>{label}</Txt><Txt style={{ fontSize: 14, fontWeight: '700' }}>{value}</Txt></View>)}</View> : null}
    {recipe.incomplete ? <Txt style={styles.warning}>{manual?.parameter_only_source ? ar ? 'المصدر ينشر مواصفات التحضير دون إجراء تفصيلي؛ الخطوات أدناه تلخّص الأرقام المنشورة.' : 'The source publishes brewing specifications without a full procedure; the steps below summarize those specifications.' : ar ? 'بعض تفاصيل التحضير غير محددة في المصدر؛ راجع التعليمات المكتوبة ورابطه.' : 'Some brewing details are unspecified; review the written instructions and source.'}</Txt> : null}
    {recipe.notes ? <Txt>{recipe.notes}</Txt> : null}
    <MethodGuide method={recipe.method} showPhoto={false}/>
    <GuidedBrew key={recipe.id} recipe={recipe} record={record}/>
    {recipe.method === 'xbloom' && recipe.xBloom ? <View style={styles.card}><Txt heading style={styles.subtitle}>xBloom</Txt><Txt>{ar ? 'ملف التحضير المتوافق' : 'Compatible brew profile'}: {recipe.xBloom.deviceModel}</Txt>{recipe.xBloom.grindSetting ? <Txt>{ar ? 'الطحنة' : 'Grind'}: {recipe.xBloom.grindSetting}</Txt> : null}{Array.isArray(recipe.xBloom.pours) ? recipe.xBloom.pours.map((p: any, i: number) => <Txt key={i}>{ar ? 'الصبة ' : 'Pour '}{i + 1}: {[p?.water_grams ?? p?.grams ?? p?.amount, p?.duration_seconds ?? p?.seconds].filter(v => v != null).join(' · ')}</Txt>) : null}</View> : null}
    <SourceBrewDetails recipe={recipe}/>
    <Txt heading style={styles.subtitle}>{t.instructions}</Txt>
    {recipe.steps.length ? recipe.steps.map(step => <View key={step.number} style={styles.card}><Txt style={{ fontWeight: '700' }}>{step.number}. {step.title}</Txt><Txt>{step.description}</Txt></View>) : <Txt style={styles.warning}>{t.noSteps}</Txt>}
    {recipe.videoUrl ? <SourceLink title={recipe.videoUrl.includes('youtube.com') ? (ar ? 'شاهد فيديو هذه الوصفة' : 'Watch this recipe video') : (ar ? 'فتح رابط الوصفة' : 'Open recipe link')} url={recipe.videoUrl}/> : null}
    {recipe.sources.length ? <View style={{ gap: 10 }}><Txt heading style={styles.subtitle}>{ar ? 'مصادر الوصفة' : 'Recipe sources'}</Txt>{recipe.sources.map(source => <View key={source.url} style={styles.card}><SourceLink title={source.url.includes('share-h5.xbloom.com') ? (ar ? 'فتح الوصفة في xBloom' : 'Open recipe in xBloom') : source.name} url={source.url}/>{source.verifiedAt ? <Txt style={styles.muted}>{ar ? 'آخر تحقق: ' : 'Last checked: '}{new Date(source.verifiedAt).toLocaleDateString(locale + '-u-nu-latn')}</Txt> : null}</View>)}</View> : null}
    <Action title={t.record} onPress={() => record()} selected/>
  </ScrollView>;
}
