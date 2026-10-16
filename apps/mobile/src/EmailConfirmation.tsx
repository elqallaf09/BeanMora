import { useRef, useState } from 'react';
import { Modal, View } from './native';
import { Action, Brand, Txt, colors, styles, useLabels } from './ui';
import { finishOAuth } from './AccountScreen';
import { callbackFailureKind } from './oauthCallback';
import { localeLabel, type Locale } from './localeText';

export function callbackFailureMessage(error: unknown, locale: Locale) {
  const L = (ar: string, en: string) => localeLabel(locale, ar, en);
  switch (callbackFailureKind(error)) {
    case 'browser': return L('تعذّر الدخول التلقائي من رابط البريد. سجّل الدخول ببريدك وكلمة المرور، أو اطلب رابطًا جديدًا إذا لم يتأكد البريد.', 'Automatic sign-in from the email link failed. Sign in with your email and password, or request a new link if your email is still unconfirmed.');
    case 'expired': return L('رابط التأكيد منتهي الصلاحية أو استُخدم سابقًا. جرّب تسجيل الدخول، أو اطلب رسالة تأكيد جديدة.', 'This confirmation link has expired or has already been used. Try signing in, or request a new confirmation email.');
    case 'network': return L('تعذّر الاتصال لتأكيد البريد. تحقق من اتصالك وحاول مجددًا.', 'Could not connect to confirm your email. Check your connection and try again.');
    default: return L('تعذّر إكمال المصادقة لحساب BeanMora. حاول مجددًا أو اطلب رابطًا جديدًا.', 'Could not complete authentication for your BeanMora account. Try again or request a new link.');
  }
}

/** Do not consume one-time email proof on page load: mail scanners may open it. */
export function EmailConfirmation({ url, locale, close }: { url: string; locale: Locale; close: () => void }) {
  const L = useLabels();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  async function confirm() {
    if (inFlight.current || confirmed) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      if (await finishOAuth(url) !== 'email-confirmed') throw new Error('EMAIL_CONFIRMATION_FAILED');
      setConfirmed(true);
    } catch (error) { setError(callbackFailureMessage(error, locale)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <Modal visible transparent animationType="fade" onRequestClose={() => { if (!busy) close(); }}>
    <View style={{ flex: 1, backgroundColor: '#0007', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View testID="email-confirmation" accessibilityViewIsModal style={{ width: '100%', maxWidth: 480, backgroundColor: colors.paper, borderRadius: 22, padding: 22, gap: 18 }}>
        <Brand />
        <Txt heading style={styles.subtitle}>{L('تأكيد البريد في BeanMora', 'Confirm your BeanMora email')}</Txt>
        <Txt>{confirmed
          ? L('تم تأكيد بريدك وتسجيل دخولك إلى BeanMora بنجاح. يمكنك أيضًا تسجيل الدخول في التطبيق ببريدك وكلمة المرور.', 'Your email is confirmed and you are signed in to BeanMora. You can also sign in to the app with your email and password.')
          : L('اضغط على تأكيد البريد لإكمال إنشاء حسابك في تطبيق BeanMora.', 'Confirm your email to finish creating your account in the BeanMora app.')}</Txt>
        {error ? <Txt accessibilityRole="alert">{error}</Txt> : null}
        {!confirmed ? <Action selected disabled={busy} title={busy ? L('يرجى الانتظار…', 'Please wait…') : L('تأكيد البريد', 'Confirm email')} onPress={() => void confirm()} /> : null}
        <Action disabled={busy} selected={confirmed} title={confirmed ? L('فتح حسابي', 'Open account') : L('العودة لتسجيل الدخول', 'Back to sign in')} onPress={close} />
      </View>
    </View>
  </Modal>;
}
