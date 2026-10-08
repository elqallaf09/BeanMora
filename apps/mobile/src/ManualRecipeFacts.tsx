import { useContext } from 'react';
import { View } from './native';
import type { RecipeItem } from './data';
import { manualRecipeFacts, roastAgeLabel } from './manualBrew';
import { Language, Txt, colors, styles } from './ui';

/** Extra source amounts, with separate ice, milk, and age-dependent espresso output. */
export function ManualRecipeFacts({ recipe }: { recipe: RecipeItem }) {
  const ar = useContext(Language) === 'ar';
  const manual = recipe.sourceBrew.manual;
  const facts = manualRecipeFacts(recipe, ar);
  const ages = recipe.method === 'espresso' ? manual?.yield_by_roast_age : undefined;
  if (!facts.length && !ages?.length) return null;
  const scalarBasis = ar ? manual?.scalar_yield_basis_ar || manual?.scalar_yield_basis : manual?.scalar_yield_basis;

  return <View testID="recipe-supplemental-facts" style={[styles.card, { gap: 16 }]}>
    {facts.map(fact => <View key={fact.key} testID={`recipe-fact-${fact.key}`} style={{ gap: 3 }}>
      <Txt style={styles.muted}>{fact.label}</Txt>
      <Txt style={{ fontSize: 16, lineHeight: 24, fontWeight: '700', writingDirection: /^\d/.test(fact.value) ? 'ltr' : ar ? 'rtl' : 'ltr' }}>{fact.value}</Txt>
      {fact.note ? <Txt style={styles.muted}>{fact.note}</Txt> : null}
    </View>)}
    {ages?.length ? <View testID="recipe-roast-age-yields" style={{ gap: 10 }}>
      <Txt heading style={styles.subtitle}>{ar ? 'ناتج الإسبريسو حسب عمر التحميص' : 'Espresso yield by roast age'}</Txt>
      <Txt style={styles.muted}>{ar ? 'الأيام محسوبة من تاريخ التحميص؛ علامة الذروة كما وردت في المصدر.' : 'Days are counted from the roast date; peak windows are marked by the source.'}</Txt>
      <View style={[styles.row, { flexDirection: ar ? 'row-reverse' : 'row', paddingHorizontal: 10 }]}>
        <Txt style={[styles.muted, { flex: 1 }]}>{ar ? 'بعد التحميص' : 'After roasting'}</Txt>
        <Txt style={[styles.muted, { flex: 1 }]}>{ar ? 'الناتج' : 'Output'}</Txt>
      </View>
      {ages.map((age, index) => <View key={`${age.roast_age_min_days}-${index}`} testID={`roast-age-yield-${index}`} style={{ padding: 10, borderRadius: 10, gap: 5, backgroundColor: age.is_peak ? '#E2EFEB' : colors.cream }}>
        <View style={[styles.row, { flexDirection: ar ? 'row-reverse' : 'row' }]}>
          <Txt style={{ flex: 1, fontSize: 14 }}>{roastAgeLabel(age.roast_age_min_days, age.roast_age_max_days, ar)}</Txt>
          <Txt style={{ flex: 1, fontSize: 16, fontWeight: '700', writingDirection: 'ltr' }}>{age.yield_grams} g</Txt>
        </View>
        {age.is_peak ? <Txt style={{ color: colors.teal, fontSize: 12, fontWeight: '700' }}>{ar ? 'الذروة حسب المصدر' : 'Source peak window'}</Txt> : null}
      </View>)}
      {scalarBasis ? <Txt style={styles.muted}>{scalarBasis}</Txt> : null}
    </View> : null}
  </View>;
}
