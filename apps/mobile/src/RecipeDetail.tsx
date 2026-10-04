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
import { doseLabel, timeLabel } from './manualBrew';
import { Action, Icon, Language, Txt, styles, type IconName } from './ui';

export function RecipeDetail({ recipe, record }: { recipe: RecipeItem; record: (seconds?: number) => void }) {
  const locale = useContext(Language); const ar = locale === 'ar'; const t = copy[locale];
  const manual = recipe.sourceBrew.manual;
  const temperature = recipe.temperatureMin && recipe.temperatureMax ? `${recipe.temperatureMin}–${recipe.temperatureMax}°C` : recipe.temperature ? `${recipe.temperature}°C` : (ar ? manual?.temperature_note_ar : manual?.temperature_note) || '—';
  const values: { icon: IconName; value: string; label: string }[] = [
    { icon: 'bean', value: doseLabel(recipe) === '—' && recipe.method === 'moka_pot' ? (ar ? 'سلة ممتلئة بلا كبس' : 'Full, loose basket') : doseLabel(recipe), label: t.dose },
    { icon: 'drop', value: recipe.water ? `${recipe.water} ${recipe.waterUnit}` : (ar ? manual?.water_note_ar : manual?.water_note) || '—', label: ar ? 'ماء التحضير' : 'Brew water' },
    { icon: 'temp', value: temperature, label: ar ? 'حرارة الماء' : 'Water temperature' },
    { icon: 'clock', value: timeLabel(recipe, ar) === '—' && recipe.method === 'moka_pot' ? (ar ? 'حسب انتهاء التدفق' : 'Until flow ends') : timeLabel(recipe, ar), label: ar ? 'الوقت الإرشادي' : 'Guide time' },
  ];
  const grindTranslations: Record<string, string> = { 'Medium-coarse': 'متوسط خشن', 'Medium-fine': 'متوسط ناعم', 'Like kosher salt': 'مثل الملح الخشن' };
  const grind = (ar ? manual?.grind_ar : undefined) || (ar && recipe.grindSetting ? grindTranslations[recipe.grindSetting] : undefined) || recipe.grindSetting;
  return <ScrollView testID="recipe-detail" showsVerticalScrollIndicator={false} contentContainerStyle={[coffeeStyles.page, { maxWidth: 780 }]}>
    <View style={{ height: 190, borderRadius: 18, overflow: 'hidden' }}><RecipeVisual recipe={recipe}/></View>
    <Txt style={styles.muted}>{methods[locale][recipe.method]}{recipe.author ? ` · ${recipe.author}` : ''}</Txt>
    <Txt heading style={styles.title}>{recipe.title}</Txt>
    <Txt style={styles.muted}>{ar ? 'مقادير وصفة المصدر' : 'Source recipe amounts'}</Txt>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{values.map(n => <View key={n.icon} style={[styles.card, { flexBasis: '46%', flexGrow: 1, minWidth: 116, marginBottom: 0 }]}><View style={styles.row}><Icon name={n.icon} size={20}/><Txt style={styles.muted}>{n.label}</Txt></View><Txt style={{ fontSize: 20, lineHeight: 30, fontWeight: '700' }}>{n.value}</Txt></View>)}</View>
    {grind || manual?.model || manual?.heat ? <View style={styles.card}><Txt>{ar ? 'الطحنة: ' : 'Grind: '}{grind || (ar ? 'لم يحددها المصدر' : 'Unspecified by source')}</Txt>{recipe.dose && recipe.waterUnit === 'g' && recipe.water ? <Txt>{ar ? 'النسبة: ' : 'Ratio: '}1:{Math.round(recipe.water / recipe.dose * 100) / 100}</Txt> : null}{manual?.model ? <Txt>{ar ? 'الموديل أو السعة: ' : 'Model or size: '}{ar ? manual.model_ar || manual.model : manual.model}</Txt> : null}{manual?.heat ? <Txt>{ar ? 'النار: ' : 'Heat: '}{ar ? manual.heat_ar || manual.heat : manual.heat}</Txt> : null}</View> : null}
    {recipe.incomplete ? <Txt style={styles.warning}>{ar ? 'المصدر لا يحدد بعض المقادير؛ اتبع التعليمات المكتوبة ورابطه.' : 'Some quantities are unspecified; follow the written instructions and source.'}</Txt> : null}
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
