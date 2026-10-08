import { useContext, useRef, useState } from 'react';
import { View } from './native';
import { supabase } from './client';
import { Action, Field, Language, Txt, styles } from './ui';

export function PasswordRecovery({ done }: { done: () => void }) {
  const ar = useContext(Language) === 'ar';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  async function save() {
    if (!supabase || inFlight.current) return;
    if (password.length < 8 || password !== confirmation) {
      setError(
        ar
          ? 'استخدم 8 أحرف على الأقل وتأكد من تطابق كلمتي المرور.'
          : 'Use at least 8 characters and matching passwords.',
      );
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const { error: failure } = await supabase.auth.updateUser({ password });
      if (failure) throw failure;
      setPassword('');
      setConfirmation('');
      done();
    } catch {
      setError(
        ar
          ? 'تعذر حفظ كلمة المرور. تحقق من الاتصال، أو اطلب رابط استرجاع جديد إذا انتهت صلاحيته.'
          : 'Could not save your password. Check your connection, or request a new recovery link if this one expired.',
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={[styles.card, { gap: 16 }]} testID="password-recovery">
      <Txt heading style={styles.title}>
        {ar ? 'تعيين كلمة مرور جديدة' : 'Set a new password'}
      </Txt>
      <Field
        label={ar ? 'كلمة المرور الجديدة' : 'New password'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!busy}
      />
      <Field
        label={ar ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password'}
        value={confirmation}
        onChangeText={setConfirmation}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!busy}
      />
      {error ? (
        <View accessibilityRole="alert">
          <Txt style={styles.error}>{error}</Txt>
        </View>
      ) : null}
      <Action
        title={
          busy
            ? ar
              ? 'جارٍ الحفظ…'
              : 'Saving…'
            : ar
              ? 'حفظ كلمة المرور'
              : 'Save password'
        }
        onPress={() => void save()}
        disabled={busy}
        selected
      />
    </View>
  );
}
