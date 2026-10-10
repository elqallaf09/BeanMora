import { useContext, useState } from 'react';
import {
  Animated, Platform, Pressable,
  type AccessibilityState, type LayoutChangeEvent, type StyleProp, type ViewStyle,
} from 'react-native';
import { usePressMotion } from './Motion';
import { useTheme } from './theme';
import { Icon, Language, Txt, colors, type IconName } from './ui';

/** Theme-aware surfaces use native primitives to keep their mint borders intact. */
export function PillButton({
  title, icon, trailingIcon, onPress, selected, disabled = false, compact = false,
  count, leadingCount = false, dashed = false, labelLines = 1, style, onLayout,
  accessibilityLabel, accessibilityState,
}: {
  title: string;
  icon?: IconName;
  trailingIcon?: IconName;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  count?: number;
  leadingCount?: boolean;
  dashed?: boolean;
  labelLines?: number;
  style?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
}) {
  const ar = useContext(Language) === 'ar';
  const { dark } = useTheme();
  const motion = usePressMotion();
  const [focused, setFocused] = useState(false), [hovered, setHovered] = useState(false);
  const palette = dark ? {
    surface: '#241C16', hover: '#30261E', pressed: '#382D23', border: '#514034',
    ink: '#F7EADB', accent: '#9AD5C1', active: '#183E36', activePressed: '#245448', activeBorder: '#538B75', activeInk: '#B9EDDA',
  } : {
    surface: colors.paper, hover: '#F5EFE5', pressed: colors.chip, border: '#DDD0C1',
    ink: colors.ink, accent: colors.teal, active: '#E0EEE5', activePressed: '#D0E3D8', activeBorder: '#357E6C', activeInk: '#165D54',
  };
  const ink = selected ? palette.activeInk : palette.ink;
  const row = { flexDirection: ar ? 'row-reverse' as const : 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: compact ? 5 : 8 };
  const label = <Txt numberOfLines={labelLines} style={{ flexShrink: 1, minWidth: 0, fontSize: compact ? 12 : 14, lineHeight: compact ? 18 : 20, fontWeight: selected ? '700' : '500', color: ink, textAlign: 'center' }}>{title}</Txt>;
  const symbol = icon ? <Icon name={icon} size={compact ? 16 : 19} color={selected ? palette.activeInk : palette.accent} /> : null;
  const number = count !== undefined ? <Txt style={{ color: ink, fontWeight: '700', fontSize: 18, lineHeight: 24, writingDirection: 'ltr' }}>{count}</Txt> : null;
  return (
    <Animated.View onLayout={onLayout} style={[{ minWidth: 0, maxWidth: '100%' }, style, motion.style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{ disabled, ...(selected !== undefined ? { selected } : {}), ...accessibilityState }}
        {...(Platform.OS === 'web' && selected !== undefined ? { 'aria-pressed': selected } : {})}
        {...(Platform.OS === 'web' && accessibilityState?.expanded !== undefined ? { 'aria-expanded': accessibilityState.expanded, 'aria-haspopup': 'dialog' as const } : {})}
        disabled={disabled} onPress={onPress} onPressIn={motion.pressIn} onPressOut={motion.pressOut}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
        style={({ pressed }) => ({
          ...row, flex: 1, minHeight: dashed ? 52 : 44,
          paddingHorizontal: compact ? 10 : 16, paddingVertical: 6,
          borderRadius: 999, borderWidth: 1, borderStyle: dashed ? 'dashed' : 'solid',
          borderColor: focused ? palette.accent : selected ? palette.activeBorder : palette.border,
          backgroundColor: selected ? pressed ? palette.activePressed : palette.active : pressed ? palette.pressed : hovered ? palette.hover : palette.surface,
          opacity: disabled ? 0.45 : 1,
          ...(focused ? { shadowColor: palette.accent, shadowOpacity: 0.24, shadowRadius: 3, shadowOffset: { width: 0, height: 0 } } : {}),
        })}
      >
        {symbol}{leadingCount ? number : null}{label}{leadingCount ? null : number}
        {trailingIcon ? <Icon name={trailingIcon} size={compact ? 12 : 16} color={palette.accent} /> : null}
      </Pressable>
    </Animated.View>
  );
}
