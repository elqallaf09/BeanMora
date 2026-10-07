import { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { Locale } from './copy';
import { Language, Txt, colors } from './ui';
import { useReducedMotion } from './Motion';

/** Model 01: two direct choices, with a fixed order in both languages. */
export function LanguageSwitcher({ change }: { change: (v: Locale) => void }) {
  const locale = useContext(Language);
  const reduced = useReducedMotion();
  const [segmentWidth, setSegmentWidth] = useState(48);
  const position = useRef(new Animated.Value(locale === 'ar' ? 0 : 48)).current;
  useEffect(() => {
    const target = locale === 'ar' ? 0 : segmentWidth;
    if (reduced) {
      position.stopAnimation();
      position.setValue(target);
      return;
    }
    const motion = Animated.spring(position, {
      toValue: target,
      speed: 28,
      bounciness: 0,
      isInteraction: false,
      useNativeDriver: Platform.OS !== 'web',
    });
    motion.start();
    return () => motion.stop();
  }, [locale, reduced, position, segmentWidth]);
  return (
    <View
      testID="language-switcher"
      style={s.pill}
      onLayout={(event) =>
        setSegmentWidth((event.nativeEvent.layout.width - 8) / 2)
      }
    >
      <Animated.View
        pointerEvents="none"
        testID="language-selection-indicator"
        style={[
          s.indicator,
          { width: segmentWidth, transform: [{ translateX: position }] },
        ]}
      />
      {(['ar', 'en'] as const).map((value) => {
        const selected = value === locale;
        return (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={value === 'ar' ? 'العربية' : 'English'}
            accessibilityLanguage={value}
            accessibilityState={{ selected }}
            {...(Platform.OS === 'web' ? { 'aria-pressed': selected } : {})}
            onPress={() => {
              if (!selected) change(value);
            }}
            style={({ pressed }) => [s.option, pressed && s.pressed]}
          >
            <Txt style={[s.label, selected && s.selectedLabel]}>
              {value === 'ar' ? 'عربي' : 'EN'}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
const s = StyleSheet.create({
  pill: {
    // Explicit bounds keep the control independent of window size and
    // prevent header expansion during native layout remeasurement.
    width: 104,
    height: 52,
    flexDirection: 'row',
    direction: 'ltr',
    alignSelf: 'center',
    flexGrow: 0,
    flexShrink: 0,
    padding: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D8C1A7',
    backgroundColor: '#F8F1E6',
    boxShadow: '0 2px 6px rgba(68, 39, 19, 0.08)',
  },
  option: {
    width: 48,
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 44,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 999,
    backgroundColor: colors.brown,
  },
  label: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  selectedLabel: { color: '#FFFFFF' },
  pressed: { opacity: 0.75 },
});
