import { useLabels } from './ui';
import { useContext } from 'react';
import { View } from './native';
import { Language, Txt, colors } from './ui';
import { flavorDisplay } from './sensory';
import type { RecipeItem } from './data';
export function CoffeeLabelMatchNotice({ recipe, compact = false }: { recipe: RecipeItem; compact?: boolean }) {
  const i18nUi = useLabels();
  const locale = useContext(Language), ar = locale === 'ar';
  const match = recipe.labelMatch;
  if (!match) return null;
  const reasons = [
    match.same_origin ? (ar ? 'نفس منشأ البن' : i18nUi('نفس منشأ البن', 'Same coffee origin')) : '',
    match.same_variety ? (ar ? 'نفس السلالة' : i18nUi('نفس السلالة', 'Same variety')) : '',
    match.matching_notes.length ? (ar ? 'إيحاءات مشتركة: ' : i18nUi('إيحاءات مشتركة: ', 'Shared notes: ')) + match.matching_notes.map(n => flavorDisplay(n,locale)).join('، ') : '',
    !match.matching_notes.length && match.matching_families.length ? (ar ? 'عائلات نكهات متشابهة' : i18nUi('عائلات نكهات متشابهة', 'Similar flavor families')) : '',
    match.same_process ? (ar ? 'نفس المعالجة' : i18nUi('نفس المعالجة', 'Same processing')) : '',
    match.same_roast ? (ar ? 'نفس التحميص' : i18nUi('نفس التحميص', 'Same roast level')) : '',
  ].filter(Boolean);
  return <View testID="coffee-label-match-notice" style={{ backgroundColor: colors.chip, borderRadius: 12, padding: compact ? 8 : 12, gap: 4 }}>
    {!compact ? <>
    <Txt heading style={{ fontSize: 17, lineHeight: 24 }}>{match.match_kind === 'exact'
      ? ar ? 'وصفة لهذا البن' : i18nUi('وصفة لهذا البن', 'A recipe for this coffee')
      : ar ? 'وصفة مقترحة لبيانات الكيس' : i18nUi('وصفة مقترحة لبيانات الكيس', 'Recipe suggested for your label')}</Txt>
    {match.label.name ? <Txt>{match.label.name}</Txt> : null}
    </> : null}
    <Txt style={{ fontSize: 12, lineHeight: 19 }}>{reasons.join(' · ')}</Txt>
    {!compact && match.match_kind === 'similar' ? <Txt style={{ fontSize: 13, lineHeight: 20 }}>
      {ar ? 'وصفة لبن مشابه كنقطة بداية؛ عدّلها حسب طعم كوبك. بيانات الوصفة تبقى من مصدرها.'
        : i18nUi('وصفة لبن مشابه كنقطة بداية؛ عدّلها حسب طعم كوبك. بيانات الوصفة تبقى من مصدرها.', 'A recipe for similar coffee as a starting point. Adjust to your taste. Parameters remain as published by the source.')}</Txt> : null}
  </View>;
}
