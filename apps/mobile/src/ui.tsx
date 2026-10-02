import { createContext, useContext, useRef, type ReactNode } from 'react';
import { Animated, Text, Pressable, TextInput, StyleSheet, type StyleProp, type TextInputProps, type TextStyle } from 'react-native';
import { copy, type Locale } from './copy';
export const Language = createContext<Locale>('ar');
export const useCopy = () => copy[useContext(Language)];
export function Txt({ children, style, heading = false }: { children: ReactNode; style?: StyleProp<TextStyle>; heading?: boolean }) {
  const rtl = useContext(Language) === 'ar';
  return <Text accessibilityRole={heading ? 'header' : undefined} style={[styles.text, { textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' }, style]}>{children}</Text>;
}
export function Action({ title, onPress, disabled = false, selected = false }: { title: string; onPress: () => void; disabled?: boolean; selected?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const down = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 30, bounciness: 0 }).start();
  const up = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 5 }).start();
  return <Animated.View style={{ transform: [{ scale }] }}><Pressable onPressIn={down} onPressOut={up} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled, selected }} onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, selected && styles.selected, (pressed || disabled) && { opacity: 0.6 }]}>
    <Txt style={{ color: selected ? '#FFFFFF' : '#3E2C24', fontWeight: '600', textAlign: 'center' }}>{title}</Txt>
  </Pressable></Animated.View>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const rtl = useContext(Language) === 'ar';
  return <><Txt style={styles.label}>{label}</Txt><TextInput {...props} accessibilityLabel={label} placeholderTextColor="#74685C" style={[styles.input, { textAlign: rtl ? 'right' : 'left' }, props.style]} /></>;
}
export const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#F8F4EC' },
  content: { paddingHorizontal: 22, paddingTop: 16, gap: 16, paddingBottom: 110, flexGrow: 1 },
  text: { color: '#3E2C24', fontSize: 15, lineHeight: 23 },
  muted: { color: '#756657', fontSize: 13, lineHeight: 20 },
  title: { color: '#3E2C24', fontSize: 28, fontWeight: '800', lineHeight: 37 },
  subtitle: { color: '#3E2C24', fontSize: 20, fontWeight: '700', lineHeight: 28 },
  gridRow: { gap: 14, paddingHorizontal: 22 },
  gridCard: { flex: 1, minWidth: 0 },
  card: { backgroundColor: '#FFFCF7', padding: 14, borderRadius: 22, borderWidth: 1, borderColor: '#E4D8C7', gap: 8, marginBottom: 12, overflow: 'hidden' },
  hero: { backgroundColor: '#EAE0D0', padding: 20, borderRadius: 24, gap: 8 },
  heroImage: { borderRadius: 28 },
  heroScrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(32,20,14,0.46)', borderRadius: 28 },
  visualHero: { backgroundColor: '#EFE4D3', padding: 22, borderRadius: 28, gap: 14, minHeight: 138, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#E1D2BD' },
  beanOrb: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#D9C2A3', alignItems: 'center', justifyContent: 'center' },
  cardImage: { width: '100%', height: 190, borderRadius: 18, backgroundColor: '#EAE0D0', marginBottom: 6 },
  cardImageFallback: { width: '100%', height: 150, borderRadius: 18, backgroundColor: '#EADBC6', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  detailImage: { width: '100%', height: 320, borderRadius: 18, backgroundColor: '#EAE0D0', marginBottom: 8 },
  imageFallback: { width: '100%', height: 180, borderRadius: 18, backgroundColor: '#E2D1B9', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  xbloomCard: { backgroundColor: '#1F1C1A', padding: 18, borderRadius: 22, gap: 8, marginVertical: 8 },
  skeletonCard: { backgroundColor: '#FFFCF6', padding: 14, borderRadius: 22, gap: 10, borderWidth: 1, borderColor: '#E6DCCC' },
  skeletonImage: { height: 120, borderRadius: 16, backgroundColor: '#E7DDCF' },
  skeletonLineWide: { height: 18, width: '72%', borderRadius: 9, backgroundColor: '#E7DDCF' },
  skeletonLine: { height: 14, width: '45%', borderRadius: 7, backgroundColor: '#EEE6DB' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, minHeight: 78, borderRadius: 20, padding: 12, backgroundColor: '#FFFCF6', borderWidth: 1, borderColor: '#E2D6C5', justifyContent: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', lineHeight: 30 },
  profileHero: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#EADBC6', padding: 20, borderRadius: 26, borderWidth: 1, borderColor: '#E1D2BD' },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D9C2A3' },
  featuredCard: { borderWidth: 2, borderColor: '#A9835D', backgroundColor: '#FFF9EF' },
  timeline: { gap: 0, marginTop: 8 },
  timelineRow: { flexDirection: 'row', gap: 12, paddingBottom: 14, alignItems: 'flex-start' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#D8A15B', marginTop: 5 },
  bottomNav: { gap: 8, paddingVertical: 12, borderTopWidth: 1, borderColor: '#E5D9C8', backgroundColor: '#FFFCF7', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 14, elevation: 10 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  button: { borderRadius: 18, borderWidth: 1, borderColor: '#CBB89D', paddingHorizontal: 15, paddingVertical: 11, minHeight: 46, justifyContent: 'center', backgroundColor: '#FFFCF6' },
  selected: { backgroundColor: '#3E2C24', borderColor: '#3E2C24' },
  input: { borderWidth: 1, borderColor: '#CBB89D', borderRadius: 14, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#FFFFFF', fontSize: 16, color: '#3E2C24' },
  label: { fontSize: 13, fontWeight: '600', marginTop: 5 },
  warning: { color: '#70431D', fontSize: 13, backgroundColor: '#F6E8D3', padding: 12, borderRadius: 12 },
  error: { color: '#9B2929', padding: 12, fontSize: 14 },
  beanCardBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  beanCardTitle: { fontSize: 18, lineHeight: 24, fontWeight: '800' },
  favoriteGlyph: { fontSize: 27, lineHeight: 30, color: '#4A3025' },
  detailMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 3 },
  metaPill: { backgroundColor: '#F0E8DC', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  metaText: { fontSize: 12, lineHeight: 16 },
  flavorLine: { color: '#6F5C4C', fontSize: 13, lineHeight: 19 },
  detailSection: { backgroundColor: '#FFFCF7', borderRadius: 22, padding: 18, gap: 10, borderWidth: 1, borderColor: '#E5D9C8' },
  methodTile: { minWidth: 110, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 17, backgroundColor: '#F3EBDD', borderWidth: 1, borderColor: '#E2D5C2', alignItems: 'center' },
  verificationCard: { backgroundColor: '#F4EBDD', borderRadius: 20, padding: 16, gap: 10 },
  success: { color: '#315D3A', backgroundColor: '#E7F1E7', padding: 12, borderRadius: 12, fontSize: 13 },
  loginHero: { alignItems: 'center', paddingVertical: 26, gap: 5 },
  loginMark: { width: 74, height: 74, borderRadius: 37, backgroundColor: '#4A2F23', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  loginPanel: { backgroundColor: '#FFFCF7', padding: 22, borderRadius: 28, borderWidth: 1, borderColor: '#E4D8C7', gap: 14, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 18, elevation: 4 },
  socialRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 4 },
  socialButton: { width: 64, height: 48, borderRadius: 16, borderWidth: 1, borderColor: '#E0D4C4', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
});
