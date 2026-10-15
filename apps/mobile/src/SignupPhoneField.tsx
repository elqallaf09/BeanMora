import { StyleSheet, TextInput, View } from './native';
import { Txt, colors, styles } from './ui';
import { signupPhoneFromInput, splitSignupPhone } from './signupPhone';

export function SignupPhoneField({ label, country, value, onChangeText, editable = true }: {
  label: string;
  country: string;
  value: string;
  onChangeText: (value: string) => void;
  editable?: boolean;
}) {
  const { callingCode, number } = splitSignupPhone(value, country);
  return (
    <View testID="signup-phone-field" style={{ gap: 6 }}>
      <Txt style={styles.label}>{label}</Txt>
      <View style={s.field}>
        {callingCode ? (
          <View testID="signup-phone-prefix" style={s.prefix}>
            <Txt style={s.code}>{'\u2066' + callingCode + '\u2069'}</Txt>
          </View>
        ) : null}
        <TextInput
          testID="signup-phone-input"
          accessibilityLabel={[label, callingCode].filter(Boolean).join(' ')}
          value={number}
          onChangeText={next => onChangeText(signupPhoneFromInput(next, callingCode))}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={callingCode ? undefined : '+'}
          placeholderTextColor={colors.muted}
          maxLength={32}
          editable={editable}
          style={s.input}
        />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  field: {
    flexDirection: 'row', direction: 'ltr', alignItems: 'center',
    borderWidth: 1, borderColor: colors.line, borderRadius: 14,
    paddingHorizontal: 14, minHeight: 50, backgroundColor: '#F8F5EF',
  },
  prefix: { paddingRight: 12, marginRight: 12, borderRightWidth: 1, borderRightColor: colors.line },
  code: { color: colors.ink, fontSize: 15, writingDirection: 'ltr', textAlign: 'left' },
  input: {
    flex: 1, minWidth: 0, minHeight: 48, paddingVertical: 12, paddingHorizontal: 0,
    color: colors.ink, fontSize: 15, writingDirection: 'ltr', textAlign: 'left',
  },
});
