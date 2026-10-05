import { createContext, useContext, type ReactNode } from 'react';
import {
  Animated,
  Image,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import Svg, { Path, Circle, Rect, Ellipse } from 'react-native-svg';
import { copy, type Locale } from './copy';
import { usePressMotion } from './Motion';

export const colors = {
  cream: '#F7F2E9',
  paper: '#FFFCF6',
  ink: '#2B1D14',
  brown: '#3B2417',
  muted: '#796958',
  line: '#E7DCCF',
  chip: '#EFE6D9',
  copper: '#B76C35',
  teal: '#167B7F',
};
export const Language = createContext<Locale>('ar');
export const useCopy = () => copy[useContext(Language)];
export function Txt({
  children,
  style,
  heading = false,
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  heading?: boolean;
  numberOfLines?: number;
}) {
  const rtl = useContext(Language) === 'ar';
  const weight = StyleSheet.flatten(style)?.fontWeight;
  return (
    <Text
      accessibilityRole={heading ? 'header' : undefined}
      numberOfLines={numberOfLines}
      style={[
        styles.text,
        rtl && {
          fontFamily:
            weight && Number(weight) >= 600
              ? 'Tajawal-Bold'
              : 'Tajawal-Regular',
        },
        {
          textAlign: rtl ? 'right' : 'left',
          writingDirection: rtl ? 'rtl' : 'ltr',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Action({
  title,
  onPress,
  disabled = false,
  selected = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
}) {
  const motion = usePressMotion();
  return (
    <Animated.View style={motion.style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled, selected }}
        onPress={onPress}
        onPressIn={motion.pressIn}
        onPressOut={motion.pressOut}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          selected && styles.selected,
          (pressed || disabled) && { opacity: 0.55 },
        ]}
      >
        <Txt
          style={{
            color: selected ? '#FFFFFF' : colors.brown,
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          {title}
        </Txt>
      </Pressable>
    </Animated.View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const rtl = useContext(Language) === 'ar';
  return (
    <View style={{ gap: 6 }}>
      <Txt style={styles.label}>{label}</Txt>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          {
            textAlign: rtl ? 'right' : 'left',
            fontFamily: rtl ? 'Tajawal-Regular' : undefined,
          },
          props.style,
        ]}
      />
    </View>
  );
}
export type IconName =
  | 'home'
  | 'search'
  | 'plus'
  | 'heart'
  | 'user'
  | 'bell'
  | 'back'
  | 'arrow'
  | 'share'
  | 'bean'
  | 'espresso'
  | 'v60'
  | 'xbloom'
  | 'aeropress'
  | 'chemex'
  | 'french_press'
  | 'cold_brew'
  | 'moka_pot'
  | 'origami'
  | 'kalita_wave'
  | 'april'
  | 'orea'
  | 'switch'
  | 'pour_over'
  | 'auto_drip'
  | 'globe'
  | 'drop'
  | 'temp'
  | 'clock'
  | 'play'
  | 'more'
  | 'lock'
  | 'mail'
  | 'eye'
  | 'star'
  | 'gear'
  | 'apple'
  | 'google';
export function Icon({
  name,
  size = 24,
  color = colors.ink,
  filled = false,
}: {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
}) {
  const body: Record<IconName, ReactNode> = {
    home: (
      <Path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z" fill={filled ? color : 'none'} />
    ),
    search: (
      <>
        <Circle cx="10.5" cy="10.5" r="7" />
        <Path d="m16 16 5 5" />
      </>
    ),
    plus: (
      <>
        <Circle cx="12" cy="12" r="9" />
        <Path d="M12 7v10M7 12h10" />
      </>
    ),
    heart: (
      <Path
        d="M12 21 3.8 12.7C-2 6.8 5.8.4 12 6.8 18.2.4 26 6.8 20.2 12.7Z"
        fill={filled ? color : 'none'}
      />
    ),
    user: (
      <>
        <Circle cx="12" cy="7" r="3.6" />
        <Path d="M4 21v-3a8 8 0 0 1 16 0v3" />
      </>
    ),
    bell: (
      <Path d="M5 16c2-2 1-4 1-6a6 6 0 0 1 12 0c0 2-1 4 1 6l1 2H4ZM10 21h4M12 2v2" />
    ),
    back: <Path d="m15 4-8 8 8 8" />,
    arrow: <Path d="M3 12h18m-6-6 6 6-6 6" />,
    share: <Path d="M5 13v8h14v-8M12 16V3m-4 4 4-4 4 4" />,
    bean: (
      <>
        <Ellipse
          cx="12"
          cy="12"
          rx="7"
          ry="10"
          transform="rotate(18 12 12)"
          fill={filled ? color : 'none'}
        />
        <Path d="M11 2c-3 6 6 11 2 20" stroke={filled ? colors.paper : color} />
      </>
    ),
    espresso: (
      <Path d="M4 7h13v7a6 6 0 0 1-12 0ZM17 8h2a3 3 0 0 1 0 6h-2M3 21h17M8 3v1m5-1v1" />
    ),
    v60: (
      <>
        <Ellipse cx="12" cy="5" rx="8" ry="2.3" />
        <Path d="m4 5 7 12v4m9-16-7 12v4M8 22h8M8 9l3 7m5-7-3 7" />
      </>
    ),
    origami: (
      <>
        <Ellipse cx="12" cy="5" rx="9" ry="2.5" />
        <Path d="m3 5 8 14h2l8-14M7 6l4 12M17 6l-4 12M3 21h18" />
      </>
    ),
    kalita_wave: (
      <>
        <Ellipse cx="12" cy="5" rx="8" ry="2.4" />
        <Path d="m4 5 3 13h10l3-13M7 9h10M8 13h8M4 21h16" />
      </>
    ),
    april: (
      <>
        <Ellipse cx="12" cy="5" rx="8" ry="2.4" />
        <Path d="m4 5 3 12h10l3-12M7 17v4m10-4v4M5 21h14M9 10h6" />
      </>
    ),
    orea: (
      <>
        <Ellipse cx="12" cy="5" rx="8" ry="2.4" />
        <Path d="m4 5 3 12h10l3-12M7 17h10M5 21h14m-7-4v4" />
      </>
    ),
    switch: (
      <>
        <Ellipse cx="12" cy="5" rx="8" ry="2.4" />
        <Path d="m4 5 6 11h4l6-11M9 17v4h6v-4m0 1 5-3M6 22h12" />
      </>
    ),
    pour_over: (
      <>
        <Path d="M3 4h18l-7 12h-4ZM5 21h14M12 16v5M7 7l4 7" />
        <Path d="M4 1h4m8 0h4" />
      </>
    ),
    auto_drip: (
      <>
        <Rect x="5" y="2" width="14" height="20" rx="2" />
        <Path d="M7 7h10M9 11h6v7H9ZM15 12h2v4h-2M8 20h8" />
        <Circle cx="15" cy="5" r="0.6" fill={color} />
      </>
    ),
    xbloom: (
      <>
        <Rect x="6" y="2" width="12" height="20" rx="1.5" />
        <Circle cx="12" cy="7" r="2" />
        <Path d="M9 12h6v6H9ZM8 20h8" />
      </>
    ),
    aeropress: (
      <Path d="M7 3h10M8 3v17h8V3M10 7h4m-4 3h4m-4 3h4M5 21h14M5 1h14" />
    ),
    chemex: <Path d="M5 2h14l-5 9v2l5 9H5l5-9v-2ZM10 11h4m-4 2h4" />,
    french_press: (
      <Path d="M6 6h11v14H6ZM5 4h13M11 1v3m6 4h3v10h-3M9 9v8m5-8v8M4 22h15" />
    ),
    cold_brew: <Path d="M6 5h11v17H6ZM9 2h5v3M17 8h3v11h-3M9 9v9m5-9v9" />,
    moka_pot: (
      <Path d="M8 7h9l-1 7 3 7H5l3-7ZM8 5h9M12 2v3M17 8h4v6h-4M5 8H3l3 5M8 14h8" />
    ),
    globe: (
      <>
        <Circle cx="12" cy="12" r="9" />
        <Ellipse cx="12" cy="12" rx="4" ry="9" />
        <Path d="M3 12h18" />
      </>
    ),
    drop: <Path d="M12 2c-2 4-7 9-7 13a7 7 0 0 0 14 0c0-4-5-9-7-13Z" />,
    temp: (
      <>
        <Path d="M9 4a3 3 0 0 1 6 0v10a5 5 0 1 1-6 0ZM12 7v10" />
        <Circle cx="12" cy="18" r="1.5" fill={color} />
        <Path d="M18 5h2m-2 4h2" />
      </>
    ),
    clock: (
      <>
        <Circle cx="12" cy="12" r="9" />
        <Path d="M12 6v6h5" />
      </>
    ),
    play: <Path d="m8 4 12 8-12 8Z" fill={color} />,
    more: (
      <>
        {[4, 12, 20].map((x) => (
          <Circle key={x} cx={x} cy="12" r="1.3" fill={color} />
        ))}
      </>
    ),
    lock: (
      <>
        <Rect x="5" y="10" width="14" height="11" rx="2" />
        <Path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" />
      </>
    ),
    mail: (
      <>
        <Rect x="3" y="5" width="18" height="14" rx="1" />
        <Path d="m3 5 9 8 9-8" />
      </>
    ),
    eye: (
      <>
        <Path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
        <Circle cx="12" cy="12" r="3" />
      </>
    ),
    star: (
      <Path
        d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"
        fill={filled ? color : 'none'}
      />
    ),
    gear: (
      <>
        <Path d="m9 2 6 0 1 3 3 1 2 5-2 3v4l-5 3-3-1-3 1-5-4 1-4-1-3 3-5 3-1Z" />
        <Circle cx="12" cy="12" r="4" />
      </>
    ),
    apple: (
      <Path
        d="M16 1c0 3-2 5-4 5 0-3 2-5 4-5ZM18 7c-2-2-4 0-6 0S8 5 5 8c-4 5 0 14 4 14 1 0 2-1 3-1s2 1 3 1c3 0 5-5 5-7-5-2-4-6-2-8Z"
        fill={color}
        stroke="none"
      />
    ),
    google: (
      <>
        <Path d="M21 12h-9" stroke="#4285F4" strokeWidth="4" />
        <Path d="M20 12a8 8 0 0 1-3 6" stroke="#4285F4" strokeWidth="4" />
        <Path d="M17 18a8 8 0 0 1-12-3" stroke="#34A853" strokeWidth="4" />
        <Path d="M5 15a8 8 0 0 1 0-7" stroke="#FBBC05" strokeWidth="4" />
        <Path d="M5 8a8 8 0 0 1 12-3" stroke="#EA4335" strokeWidth="4" />
      </>
    ),
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {body[name]}
    </Svg>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  selected = false,
  color,
  size = 23,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  selected?: boolean;
  color?: string;
  size?: number;
}) {
  const motion = usePressMotion();
  return (
    <Animated.View style={motion.style}>
      <Pressable
        onPress={onPress}
        onPressIn={motion.pressIn}
        onPressOut={motion.pressOut}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        hitSlop={6}
        style={({ pressed }) => [
          styles.iconButton,
          pressed && { opacity: 0.5 },
        ]}
      >
        <Icon name={name} size={size} color={color} filled={selected} />
      </Pressable>
    </Animated.View>
  );
}
export function Leaf({
  size = 38,
  color = colors.brown,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 60">
      <Path
        d="M32 1C20 12 23 24 32 34c9-10 12-22 0-33ZM5 16c0 19 12 26 25 26C28 25 17 17 5 16Zm54 0c-12 1-23 9-25 26 13 0 25-7 25-26Z"
        fill={color}
      />
      <Path
        d="M32 22v35M14 26l18 18 18-18"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
      />
      <Path
        d="M32 10v23M12 22l15 16M52 22 37 38"
        stroke={colors.cream}
        strokeWidth="1.2"
        fill="none"
      />
    </Svg>
  );
}
export function Brand({
  light = false,
  large = false,
}: {
  light?: boolean;
  large?: boolean;
}) {
  const ar = useContext(Language) === 'ar';
  const ink = light ? '#FFFDF7' : '#140E0B';
  const height = large ? 90 : 46;
  return (
    <View
      testID="beanmora-brand"
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        direction: 'ltr',
        gap: large ? 9 : 4,
        flexShrink: 1,
      }}
    >
      <Image
        source={require('../assets/brand/mark.png')}
        resizeMode="contain"
        accessibilityLabel="BeanMora logo"
        style={{ height, width: (height * 695) / 1188 }}
      />
      <View style={{ alignItems: 'center', gap: large ? 3 : 0 }}>
        <Text
          style={{
            fontFamily: 'Quicksand',
            color: ink,
            fontSize: large ? 39 : 22,
            fontWeight: '500',
            lineHeight: large ? 49 : 28,
            letterSpacing: -0.6,
            writingDirection: 'ltr',
          }}
        >
          BeanMora
        </Text>
        <Text
          style={{
            fontFamily: 'Quicksand',
            color: light ? '#72C4C4' : colors.teal,
            fontSize: large ? 12 : 7.2,
            lineHeight: large ? 18 : 12,
            writingDirection: 'ltr',
          }}
        >
          {ar ? 'وصفات القهوة وأكثر' : 'Coffee Recipes & More'}
        </Text>
      </View>
    </View>
  );
}
export const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.cream },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  text: { color: colors.ink, fontSize: 15, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '700', lineHeight: 36 },
  subtitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 30,
  },
  card: {
    backgroundColor: colors.paper,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  button: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
  selected: { backgroundColor: colors.teal, borderColor: colors.teal },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F9F6F0',
    fontSize: 16,
    color: colors.ink,
  },
  label: { fontSize: 13, fontWeight: '600' },
  warning: {
    color: '#70431D',
    fontSize: 13,
    backgroundColor: '#F6E8D3',
    padding: 12,
    borderRadius: 12,
  },
  error: { color: '#9B2929', padding: 12, fontSize: 14 },
  success: {
    color: '#315D3A',
    backgroundColor: '#E7F1E7',
    padding: 12,
    borderRadius: 12,
    fontSize: 13,
  },
  iconButton: {
    width: 40,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaPill: {
    backgroundColor: colors.chip,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  metaText: { fontSize: 12, lineHeight: 20 },
  detailMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featuredCard: { borderColor: '#B8A088', backgroundColor: '#FFFAF0' },
});
