import { createContext, useContext, type ReactNode } from 'react';
import { Text, Pressable, TextInput, StyleSheet, type TextInputProps, type TextStyle } from 'react-native';
import { copy, type Locale } from './copy';
export const Language = createContext<Locale>('ar');
export const useCopy = () => copy[useContext(Language)];
export function Txt({ children, style, heading = false }: { children: ReactNode; style?: TextStyle; heading?: boolean }) {
  const rtl = useContext(Language) === 'ar';
  return <Text accessibilityRole={heading ? 'header' : undefined} style={[styles.text, { textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' }, style]}>{children}</Text>;
}
export function Action({ title, onPress, disabled = false, selected = false }: { title: string; onPress: () => void; disabled?: boolean; selected?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled, selected }} onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, selected && styles.selected, (pressed || disabled) && { opacity: 0.6 }]}>
    <Txt style={{ color: selected ? '#FFFFFF' : '#3E2C24', fontWeight: '600', textAlign: 'center' }}>{title}</Txt>
  </Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const rtl = useContext(Language) === 'ar';
  return <><Txt style={styles.label}>{label}</Txt><TextInput {...props} accessibilityLabel={label} placeholderTextColor="#74685C" style={[styles.input, { textAlign: rtl ? 'right' : 'left' }, props.style]} /></>;
}
export const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#F7F2E9' },
  content: { padding: 18, gap: 14, paddingBottom: 28, flexGrow: 1 },
  text: { color: '#3E2C24', fontSize: 15, lineHeight: 23 },
  muted: { color: '#756657', fontSize: 13, lineHeight: 20 },
  title: { color: '#3E2C24', fontSize: 28, fontWeight: '800', lineHeight: 37 },
  subtitle: { color: '#3E2C24', fontSize: 20, fontWeight: '700', lineHeight: 28 },
  card: { backgroundColor: '#FFFCF6', padding: 18, borderRadius: 22, borderWidth: 1, borderColor: '#DDD2C2', gap: 9, marginBottom: 12 },
  hero: { backgroundColor: '#EAE0D0', padding: 20, borderRadius: 24, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  button: { borderRadius: 16, borderWidth: 1, borderColor: '#CBB89D', paddingHorizontal: 15, paddingVertical: 11, minHeight: 46, justifyContent: 'center', backgroundColor: '#FFFCF6' },
  selected: { backgroundColor: '#3E2C24', borderColor: '#3E2C24' },
  input: { borderWidth: 1, borderColor: '#CBB89D', borderRadius: 14, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#FFFFFF', fontSize: 16, color: '#3E2C24' },
  label: { fontSize: 13, fontWeight: '600', marginTop: 5 },
  warning: { color: '#70431D', fontSize: 13, backgroundColor: '#F6E8D3', padding: 12, borderRadius: 12 },
  error: { color: '#9B2929', padding: 12, fontSize: 14 },
});
