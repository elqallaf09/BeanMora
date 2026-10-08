import { useContext, useMemo, useState } from 'react';
import { ScrollView, View } from './native';
import type { RecipeItem } from './data';
import { MethodPicker } from './CoffeeScreens';
import { recipeQuickFacts } from './recipeQuickFacts';
import { searchText } from './guards';
import type { Method } from './core/engine';
import { methods } from './copy';
import { Action, Field, Icon, Language, Txt, styles, colors } from './ui';

export function RecipeShelf({ recipes, loading, error, open }: { recipes: RecipeItem[]; loading: boolean; error: boolean; open: (r: RecipeItem) => void }) {
  const locale = useContext(Language); const ar = locale === 'ar';
  const [search, setSearch] = useState(''); const [method, setMethod] = useState<Method>();
  const rows = useMemo(() => recipes.filter(recipe => (!method || recipe.method === method)
    && searchText([recipe.title, recipe.author, ...recipe.flavors].join(' ')).includes(searchText(search))), [recipes, method, search]);
  return <ScrollView testID="saved-recipe-library" contentContainerStyle={[styles.content, { maxWidth: 780, width: '100%', alignSelf: 'center', gap: 14 }]}>
    <Txt heading style={styles.title}>{ar ? 'وصفاتي المحفوظة' : 'Saved recipes'}</Txt>
    <Txt style={styles.muted}>{ar ? 'المقادير والخطوات محفوظة على هذا الجهاز وتُفتح بدون اتصال. الصور وروابط المصدر تحتاج اتصالًا.' : 'Amounts and steps are saved on this device and open offline. Photos and source links need a connection.'}</Txt>
    <Field label={ar ? 'ابحث في وصفاتك' : 'Search saved recipes'} value={search} onChangeText={setSearch} />
    <MethodPicker value={method} onChange={setMethod} />
    {loading ? <Txt>{ar ? 'جارٍ تحميل وصفاتك…' : 'Loading your recipes…'}</Txt> : null}
    {error ? <Txt style={styles.warning}>{ar ? 'تعذّر الحفظ على الجهاز. تحقّق من المساحة المتاحة (حتى 50 وصفة).' : 'Could not save on this device. Check available storage (up to 50 recipes).'}</Txt> : null}
    {rows.map(recipe => <View key={recipe.id} style={styles.card}>
      <View style={[styles.row, ar && { flexDirection: 'row-reverse' }]}><Icon name={recipe.method} color={colors.teal} /><Txt style={styles.muted}>{methods[locale][recipe.method]}</Txt></View>
      <Action title={recipe.title} onPress={() => open(recipe)} />
      <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 12 }}>{recipeQuickFacts(recipe, ar).map(fact => <Txt key={fact.key}>{fact.label}: {fact.value}</Txt>)}</View>
    </View>)}
    {!loading && !rows.length ? <Txt style={styles.muted}>{recipes.length ? (ar ? 'لا توجد نتائج بهذه الشروط.' : 'No recipes match these choices.') : ar ? 'افتح وصفة واضغط «حفظ الوصفة على الجهاز» لتجدها هنا.' : 'Open a recipe and choose Save recipe on device to find it here.'}</Txt> : null}
  </ScrollView>;
}
