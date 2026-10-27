import { useContext } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from './native';
import { METHODS, type Method } from './core/engine';
import { methods } from './copy';
import { Action, Icon, Language, Txt, colors, styles, useLabels } from './ui';

const popular: readonly Method[] = ['v60', 'espresso', 'xbloom', 'aeropress', 'chemex', 'french_press'];

/** Real recipe destinations, with the same paper cards as the home categories. */
export function BrewMethodCards({ compact = false, choose }: {
  compact?: boolean;
  choose: (method: Method) => void;
}) {
  const locale = useContext(Language);
  const { width } = useWindowDimensions();
  const items = compact ? popular : METHODS;
  const columns = width >= 850 ? 5 : width >= 600 ? 3 : 2;
  const cardWidth = (Math.min(width, 1120) - 36 - (columns - 1) * 10) / columns;
  return <View testID="brew-method-cards" style={{ flexDirection: locale === 'ar' ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 10 }}>
    {items.map(method => <Pressable key={method} testID={'brew-method-' + method}
      accessibilityRole="button" accessibilityLabel={methods[locale][method]}
      onPress={() => choose(method)}
      style={({ pressed }) => ({ width: cardWidth, minHeight: 94, padding: 12, gap: 8,
        alignItems: 'center', justifyContent: 'center', borderRadius: 20,
        backgroundColor: pressed ? colors.chip : colors.paper, borderWidth: 1, borderColor: colors.line })}>
      <Icon name={method} size={28} color={colors.copper} />
      <Txt style={{ fontSize: 13, textAlign: 'center' }}>{methods[locale][method]}</Txt>
    </Pressable>)}
  </View>;
}

export function BrewMethods({ choose }: { choose: (method?: Method) => void }) {
  const L = useLabels();
  return <ScrollView testID="brew-methods-screen" contentContainerStyle={{ width: '100%', maxWidth: 1120, alignSelf: 'center', padding: 18, gap: 18 }}>
    <Txt heading style={styles.title}>{L('اختر طريقة التحضير', 'Choose your brew method')}</Txt>
    <BrewMethodCards choose={choose} />
    <Action title={L('مكتبة الوصفات', 'Recipe library')} onPress={() => choose()} />
  </ScrollView>;
}
