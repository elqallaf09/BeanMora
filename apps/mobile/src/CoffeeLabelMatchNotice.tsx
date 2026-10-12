import { useContext } from 'react';
import { View } from './native';
import { Language, Txt, colors } from './ui';
import { flavorLabel } from './sensory';
import type { RecipeItem } from './data';
export function CoffeeLabelMatchNotice({ recipe, compact = false }: { recipe: RecipeItem; compact?: boolean }) {
  const ar = useContext(Language) === 'ar';
  const match = recipe.labelMatch;
  if (!match) return null;
  const reasons = [
    match.same_origin ? (ar ? 'نفس منشأ البن' : 'Same coffee origin') : '',
    match.same_variety ? (ar ? 'نفس السلالة' : 'Same variety') : '',
    match.matching_notes.length ? (ar ? 'إيحاءات مشتركة: ' : 'Shared notes: ') + match.matching_notes.map(n => flavorLabel(n,ar)).join('، ') : '',
    !match.matching_notes.length && match.matching_families.length ? (ar ? 'عائلات نكهات متشابهة' : 'Similar flavor families') : '',
    match.same_process ? (ar ? 'نفس المعالجة' : 'Same processing') : '',
    match.same_roast ? (ar ? 'نفس التحميص' : 'Same roast level') : '',
  ].filter(Boolean);
  return <View testID="coffee-label-match-notice" style={{ backgroundColor: colors.chip, borderRadius: 12, padding: compact ? 8 : 12, gap: 4 }}>
    {!compact ? <>
    <Txt heading style={{ fontSize: 17, lineHeight: 24 }}>{match.match_kind === 'exact'
      ? ar ? 'وصفة لهذا البن' : 'A recipe for this coffee'
      : ar ? 'وصفة مقترحة لبيانات الكيس' : 'Recipe suggested for your label'}</Txt>
    {match.label.name ? <Txt>{match.label.name}</Txt> : null}
    </> : null}
    <Txt style={{ fontSize: 12, lineHeight: 19 }}>{reasons.join(' · ')}</Txt>
    {!compact && match.match_kind === 'similar' ? <Txt style={{ fontSize: 13, lineHeight: 20 }}>
      {ar ? 'وصفة لبن مشابه كنقطة بداية؛ عدّلها حسب طعم كوبك. بيانات الوصفة تبقى من مصدرها.'
        : 'A recipe for similar coffee as a starting point. Adjust to your taste. Parameters remain as published by the source.'}</Txt> : null}
  </View>;
}
