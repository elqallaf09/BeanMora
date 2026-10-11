import { useContext, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, ScrollView, View } from './native';
import { Icon, Language, Txt, colors, type IconName } from './ui';
import { PillButton } from './PillButton';

/** Compact navigation with either underlines or soft pill controls. */
export function TabRail({ items, value, onChange, equal = false, compact = false, wrap = false, columns, testID, variant = 'underline' }: {
  items: { id: string; label: string; compactLabel?: string; icon?: IconName }[];
  value: string;
  onChange: (id: string) => void;
  equal?: boolean;
  compact?: boolean;
  wrap?: boolean;
  columns?: number;
  testID?: string;
  variant?: 'underline' | 'pills';
}) {
  const ar = useContext(Language) === 'ar';
  const firstId = items[0]?.id;
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [viewport, setViewport] = useState(0), [contentWidth, setContentWidth] = useState(0);
  const [gridWidth, setGridWidth] = useState(0);
  const gridColumns = columns && columns > 0 ? Math.floor(columns) : undefined;
  const wrapped = wrap || Boolean(gridColumns);
  const [positions, setPositions] = useState<Record<string, { x: number; width: number }>>({});
  useEffect(() => {
    if (equal || wrapped || !viewport || !contentWidth) return;
    const selected = positions[value] ?? (firstId ? positions[firstId] : undefined);
    const x = selected ? ar ? selected.x + selected.width - viewport : selected.x : ar ? contentWidth - viewport : 0;
    scroll.current?.scrollTo({ x: Math.max(0, Math.min(x, contentWidth - viewport)), animated: false });
  }, [ar, contentWidth, equal, wrapped, firstId, positions, value, viewport]);
  const content = (
    <View onLayout={gridColumns ? event => setGridWidth(event.nativeEvent.layout.width) : undefined}
      style={{ flexDirection: ar ? 'row-reverse' : 'row', flex: equal ? 1 : undefined, flexWrap: wrapped ? 'wrap' : 'nowrap', gap: variant === 'pills' ? 6 : 0 }}>
      {items.map(item => {
        const selected = item.id === value;
        if (variant === 'pills') return <PillButton key={item.id} title={gridColumns ? item.compactLabel ?? item.label : item.label}
          accessibilityLabel={item.label} icon={gridColumns ? undefined : item.icon} compact={compact} snug={Boolean(gridColumns)} selected={selected}
          labelLines={equal || gridColumns ? 2 : 1}
          style={gridColumns ? { width: gridWidth ? Math.floor((gridWidth - (gridColumns - 1) * 6) / gridColumns) : `${100 / gridColumns - 2}%` } : { flex: equal ? 1 : undefined }}
          onPress={() => onChange(item.id)}
          onLayout={gridColumns ? undefined : event => {
            const { x, width } = event.nativeEvent.layout;
            setPositions(previous => previous[item.id]?.x === x && previous[item.id]?.width === width ? previous : { ...previous, [item.id]: { x, width } });
          }} />;
        return (
          <Pressable key={item.id} accessibilityRole="button"
            onLayout={event => {
              const { x, width } = event.nativeEvent.layout;
              setPositions(previous => previous[item.id]?.x === x && previous[item.id]?.width === width ? previous : { ...previous, [item.id]: { x, width } });
            }}
            accessibilityLabel={item.label} accessibilityState={{ selected }}
            {...(Platform.OS === 'web' ? { 'aria-pressed': selected } : {})}
            onPress={() => onChange(item.id)}
            style={{ flex: equal ? 1 : undefined, minWidth: 0, minHeight: compact ? 44 : 48, paddingHorizontal: equal ? 4 : compact ? 8 : 16,
              alignItems: 'center', justifyContent: 'center', gap: compact ? 4 : 7, flexDirection: ar ? 'row-reverse' : 'row',
              borderBottomWidth: compact ? 2 : 3, borderBottomColor: selected ? colors.teal : 'transparent' }}>
            {item.icon ? <Icon name={item.icon} size={compact ? 15 : 18} color={selected ? colors.teal : colors.muted} /> : null}
            <Txt numberOfLines={1} style={{ flexShrink: 1, fontSize: compact ? 12 : 14, fontWeight: selected ? '700' : '400', color: selected ? colors.teal : colors.ink, textAlign: 'center' }}>{item.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
  return equal || wrapped ? <View testID={testID} style={{ borderBottomWidth: variant === 'pills' ? 0 : 1, borderColor: colors.line }}>{content}</View> : (
    <ScrollView ref={scroll} testID={testID} horizontal showsHorizontalScrollIndicator={false}
      onLayout={event => setViewport(event.nativeEvent.layout.width)} onContentSizeChange={width => setContentWidth(width)}
      style={{ flexGrow: 0, borderBottomWidth: variant === 'pills' ? 0 : 1, borderColor: colors.line }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: ar ? 'flex-end' : 'flex-start' }}>{content}</ScrollView>
  );
}
