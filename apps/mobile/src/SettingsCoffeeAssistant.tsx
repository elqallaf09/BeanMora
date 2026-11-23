import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View } from './native';
import { catalogScope, supabase } from './client';
import { Action, Txt, styles, useLabels } from './ui';
import { CoffeeConsentChoice } from './CoffeeConsentChoice';
import { assistantPreferenceKey, defaultAssistantPreference, saveAssistantPreference } from './coffeeAssistantPolicy';
import { consentFailure, readCoffeeConsent, saveCoffeeConsent, type CoffeeConsent, type ConsentChoice, type ConsentFailure } from './coffeeAssistantRemote';

export function SettingsCoffeeAssistant({ owner }: { owner: string }) {
  const L = useLabels();
  const [consent, setConsent] = useState<CoffeeConsent | null>(null);
  const [showChoice, setShowChoice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<ConsentFailure | null>(null);
  const pending = useRef<AbortController | null>(null);
  const refresh = useRef(false);

  async function update(choice?: ConsentChoice, keepNotice = false) {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    if (!keepNotice) setFailed(null);
    try {
      if (choice === 'guide') {
        // Stay in the guide locally even while revocation is pending or fails.
        void saveAssistantPreference(AsyncStorage, assistantPreferenceKey(catalogScope, owner), { ...defaultAssistantPreference(), optedOut: true });
      }
      const session = (await supabase?.auth.getSession())?.data.session;
      if (controller.signal.aborted || session?.user.id !== owner || session.user.is_anonymous) return;
      const options = { url: catalogScope, publicKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
        accessToken: session.access_token, signal: controller.signal };
      const next = choice ? await saveCoffeeConsent(options, choice, consent?.revision ?? 'unset') : await readCoffeeConsent(options);
      if (controller.signal.aborted) return;
      if (choice === 'allow') await saveAssistantPreference(AsyncStorage, assistantPreferenceKey(catalogScope, owner), defaultAssistantPreference());
      if (!controller.signal.aborted) { setConsent(next); setShowChoice(false); }
    } catch (error) {
      if (!controller.signal.aborted) {
        const reason = consentFailure(error);
        setFailed(reason); setShowChoice(false);
        // Another device changed the choice: show the current state at once.
        if (reason === 'changed') refresh.current = true;
      }
    } finally {
      if (pending.current === controller) { pending.current = null; setLoading(false); }
      if (refresh.current && !controller.signal.aborted) { refresh.current = false; void update(undefined, true); }
    }
  }
  useEffect(() => {
    setConsent(null); setShowChoice(false); void update();
    return () => { pending.current?.abort(); pending.current = null; };
  }, [owner]);
  return <View testID="settings-coffee-assistant" style={[styles.card, { padding: 16, gap: 12 }]}>
    <Txt heading>{L('خبير القهوة', 'Coffee expert')}</Txt>
    <Txt>{L('الإجابات عبر الإنترنت', 'Online answers')}</Txt>
    {(consent?.choice === 'allow' || (failed && !consent))
      ? <Action title={L('سحب الموافقة', 'Withdraw permission')} disabled={loading} onPress={() => void update('guide')} />
      : consent?.available
        ? <Action title={L('خيارات الخصوصية', 'Privacy choices')} disabled={loading} onPress={() => setShowChoice(true)} />
        : null}
    {showChoice ? <CoffeeConsentChoice disabled={loading} onChoice={choice => void update(choice)} /> : null}
    {failed ? <><Txt>{failed === 'changed'
      ? L('تغيّر اختيارك من جهاز آخر. عرضنا لك الحالة الحالية، اختر مرة ثانية إذا تبي.', 'Your choice was changed on another device. The current setting is shown; choose again if you want.')
      : failed === 'account'
        ? L('الإجابات عبر الإنترنت غير متاحة لحسابك حاليًا. دليل القهوة يظل متاحًا.', 'Online answers are not available for your account yet. The coffee guide is still available.')
        : failed === 'signin'
          ? L('انتهت جلسة الدخول. سجّل دخولك مرة ثانية ثم حاول.', 'Your session has ended. Sign in again, then try once more.')
          : failed === 'network'
            ? L('تعذّر الاتصال. تأكد من الإنترنت وحاول مجددًا.', 'Could not connect. Check your internet connection and try again.')
            : L('تعذّر التحقق من اختيارك أو حفظه. حاول مجددًا.', 'Your choice could not be checked or saved. Please try again.')}</Txt><Action title={L('إعادة المحاولة', 'Retry')} disabled={loading} onPress={() => void update()} /></> : null}
  </View>;
}
