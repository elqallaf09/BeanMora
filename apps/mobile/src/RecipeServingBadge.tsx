import { useContext } from 'react';
import { View } from './native';
import { Language, Txt, colors } from './ui';
import type { RecipeItem } from './data';

export function RecipeServingBadge({ recipe }: { recipe: RecipeItem }) {
  const ar = useContext(Language) === 'ar';
  const style = recipe.discovery?.servingStyle;
  const label = style === 'hot' ? ar ? 'حار' : 'Hot'
    : style === 'iced' ? ar ? 'بارد · مثلّج' : 'Cold · Iced'
    : style === 'cold' ? ar ? 'بارد' : 'Cold' : ar ? 'التقديم غير محدد' : 'Serving unspecified';
  return <View testID="recipe-serving-badge" style={{ borderRadius: 99, backgroundColor: colors.chip, paddingHorizontal: 10,
    paddingVertical: 4, borderWidth: 1, borderColor: style === 'hot' ? colors.brown : colors.teal, alignSelf: 'flex-start' }}>
    <Txt style={{ fontSize: 12, lineHeight: 18, fontWeight: '700' }}>{label}{recipe.discovery?.servingStyleInferred ? ar ? ' · مقترح' : ' · Suggested' : ''}</Txt>
  </View>;
}
