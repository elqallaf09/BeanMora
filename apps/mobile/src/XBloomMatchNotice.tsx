import { useContext } from 'react';
import { View } from './native';
import { Language, Txt, styles, useLabels } from './ui';
import type { RecipeItem } from './data';
import { flavorLabel } from './sensory';
import { contentLocale } from './localeText';

export function XBloomMatchNotice({ recipe }: { recipe: RecipeItem }) {
  const locale = useContext(Language); const ar = locale === 'ar'; const L = useLabels();
  const match = recipe.coffeeMatch;
  if (!match || match.match_kind !== 'similar') return null;
  const families: Record<string, string> = { fruity: L('فاكهية','Fruity','フルーティー'), citrus: L('حمضيات','Citrus','柑橘'),
    floral: L('زهرية','Floral','フローラル'), chocolate: L('شوكولاتة','Chocolate','チョコレート'),
    nutty: L('مكسرات','Nutty','ナッツ'), sweet: L('حلاوة','Sweet','甘い'), tea: L('شاي','Tea','お茶'), spice: L('توابل','Spice','スパイス') };
  const reasons = [
    match.matching_notes.length ? L('إيحاءات مشتركة: ','Shared notes: ','共通の風味：') + match.matching_notes.map(n=>flavorLabel(n,ar)).join('، ') : null,
    !match.matching_notes.length && match.matching_families.length ? L('عائلات إيحاءات متشابهة: ','Similar flavor families: ','似た風味：') + match.matching_families.map(f=>families[f]??f).join('، ') : null,
    match.same_origin ? L('نفس بلد المنشأ','Same origin country','同じ原産国') : null,
    match.same_process ? L('نفس المعالجة','Same processing method','同じ精製方法') : null,
    match.same_roast ? L('نفس درجة التحميص','Same roast level','同じ焙煎度') : null,
  ].filter(Boolean);
  const coffeeName = match.coffee.localeContent?.[contentLocale(locale)]?.name ?? match.coffee.name;
  return <View testID="xbloom-similar-recipe" style={[styles.card,{gap:7}]}>
    <Txt heading style={styles.subtitle}>{L('أقرب وصفة xBloom لبنك','Closest xBloom recipe for your coffee','このコーヒーに近いxBloomレシピ')}</Txt>
    <Txt>{coffeeName}</Txt>
    <Txt style={styles.muted}>{L('هذه وصفة لبن مشابه، مقترحة كنقطة بداية. اضبطها حسب طعم كوبك.','This recipe is for a similar coffee and is suggested as a starting point. Adjust it to your taste.','似たコーヒーのレシピを出発点として提案します。味に合わせて調整してください。')}</Txt>
    {reasons.map(reason=><Txt key={reason} style={styles.muted}>{reason}</Txt>)}
    {!match.matching_notes.length ? <Txt style={styles.muted}>{L('المقارنة محدودة بالمعلومات المنشورة المتوفرة.','The comparison is limited to available published information.','公開されている情報に基づく限定的な比較です。')}</Txt> : null}
    <Txt style={styles.muted}>{L('وصفة الأساس: ','Source recipe: ','元のレシピ：')}{recipe.discovery?.coffeeName || recipe.title}</Txt>
    <Txt style={styles.muted}>{L('الجهاز: ','Device: ','機種：')}{match.device_model ?? L('غير موثّق؛ تأكد من التوافق','Unverified; check compatibility','未確認：互換性を確認してください')}</Txt>
  </View>;
}
