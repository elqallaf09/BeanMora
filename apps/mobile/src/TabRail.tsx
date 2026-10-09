import { useContext, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, ScrollView, View } from './native';
import { Icon, Language, Txt, colors, type IconName } from './ui';

/** Mockup 7: a compact, scrollable rail with an underline selection. */
export function TabRail({ items, value, onChange, equal = false, testID }: {
  items: { id: string; label: string; icon?: IconName }[];
  value: string;
  onChange: (id: string) => void;
  equal?: boolean;
  testID?: string;
}) {
  const ar = useContext(Language) === 'ar';
  const firstId = items[0]?.id;
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [viewport, setViewport] = useState(0), [contentWidth, setContentWidth] = useState(0);
  const [positions, setPositions] = useState<Record<string, { x: number; width: number }>>({});
  useEffect(() => {
    if (equal || !viewport || !contentWidth) return;
    const selected = positions[value] ?? (firstId ? positions[firstId] : undefined);
    const x = selected ? ar ? selected.x + selected.width - viewport : selected.x : ar ? contentWidth - viewport : 0;
    scroll.current?.scrollTo({ x: Math.max(0, Math.min(x, contentWidth - viewport)), animated: false });
  }, [ar, contentWidth, equal, firstId, positions, value, viewport]);
  const content = (
    <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flex: equal ? 1 : undefined }}>
      {items.map(item => {
        const selected = item.id === value;
        return (
          <Pressable key={item.id} accessibilityRole="button"
            onLayout={event => {
              const { x, width } = event.nativeEvent.layout;
              setPositions(previous => previous[item.id]?.x === x && previous[item.id]?.width === width ? previous : { ...previous, [item.id]: { x, width } });
            }}
            accessibilityLabel={item.label} accessibilityState={{ selected }}
            {...(Platform.OS === 'web' ? { 'aria-pressed': selected } : {})}
            onPress={() => onChange(item.id)}
            style={{ flex: equal ? 1 : undefined, minHeight: 48, paddingHorizontal: equal ? 6 : 16,
              alignItems: 'center', justifyContent: 'center', gap: 7, flexDirection: ar ? 'row-reverse' : 'row',
              borderBottomWidth: 3, borderBottomColor: selected ? colors.teal : 'transparent' }}>
            {item.icon ? <Icon name={item.icon} size={18} color={selected ? colors.teal : colors.muted} /> : null}
            <Txt style={{ fontSize: 14, fontWeight: selected ? '700' : '400', color: selected ? colors.teal : colors.ink, textAlign: 'center' }}>{item.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
  return equal ? <View testID={testID} style={{ borderBottomWidth: 1, borderColor: colors.line }}>{content}</View> : (
    <ScrollView ref={scroll} testID={testID} horizontal showsHorizontalScrollIndicator={false}
      onLayout={event => setViewport(event.nativeEvent.layout.width)} onContentSizeChange={width => setContentWidth(width)}
      style={{ flexGrow: 0, borderBottomWidth: 1, borderColor: colors.line }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: ar ? 'flex-end' : 'flex-start' }}>{content}</ScrollView>
  );
}
