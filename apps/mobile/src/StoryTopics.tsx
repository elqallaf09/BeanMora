import { useContext } from 'react';
import { Pressable, View } from './native';
import { Icon, Language, Txt, colors, useLabels, type IconName } from './ui';
import type { CoffeeStory } from './core/community-social';

const topics: { id: CoffeeStory['category']; ar: string; en: string; icon: IconName }[] = [
  { id: 'coffee', ar: 'القهوة', en: 'Coffee', icon: 'espresso' },
  { id: 'brewing', ar: 'التحضير', en: 'Brewing', icon: 'v60' },
  { id: 'equipment', ar: 'المعدات', en: 'Equipment', icon: 'gear' },
  { id: 'coffee_corner', ar: 'ركن القهوة', en: 'Coffee corner', icon: 'home' },
];

export function StoryTopics({ value, onChange, disabled }: { value: CoffeeStory['category']; onChange: (value: CoffeeStory['category']) => void; disabled: boolean }) {
  const L = useLabels();
  const ar = useContext(Language) === 'ar';
  return <View style={{ gap: 10 }}>
    <Txt style={{ fontWeight: '700', fontSize: 14 }}>{L('موضوع القصة', 'Story topic')}</Txt>
    <View accessibilityRole="radiogroup" accessibilityLabel={L('موضوع القصة', 'Story topic')} style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
      {topics.map(topic => {
        const selected = topic.id === value;
        return <Pressable key={topic.id} accessibilityRole="radio" accessibilityLabel={L(topic.ar, topic.en)} accessibilityState={{ checked: selected, disabled }} aria-checked={selected} disabled={disabled} onPress={() => onChange(topic.id)} style={({ pressed }) => ({
          flexBasis: '47%', flexGrow: 1, minHeight: 50, padding: 10, borderRadius: 16,
          flexDirection: ar ? 'row-reverse' : 'row', alignItems: 'center', gap: 8,
          backgroundColor: selected ? colors.teal : pressed ? colors.chip : colors.cream,
          borderWidth: 1, borderColor: selected ? colors.teal : colors.line, opacity: disabled ? 0.5 : 1,
        })}>
          <Icon name={topic.icon} size={22} color={selected ? '#FFFFFF' : colors.teal} />
          <Txt style={{ flex: 1, fontSize: 14, fontWeight: selected ? '700' : '500', color: selected ? '#FFFFFF' : colors.ink }}>{L(topic.ar, topic.en)}</Txt>
        </Pressable>;
      })}
    </View>
  </View>;
}
