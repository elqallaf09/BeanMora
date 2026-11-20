import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Switch, View } from './native';
import { catalogScope } from './client';
import { Txt, styles, useLabels } from './ui';
import { assistantPreferenceKey, defaultAssistantPreference, readAssistantPreference, saveAssistantPreference } from './coffeeAssistantPolicy';

/** A privacy choice in Settings; Coffee Expert itself needs no activation step. */
export function SettingsCoffeeAssistant({ owner }: { owner: string }) {
  const L = useLabels();
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    void readAssistantPreference(AsyncStorage, assistantPreferenceKey(catalogScope, owner)).then(saved => {
      if (!cancelled) { setOnline(!saved.optedOut); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [owner]);
  return <View testID="settings-coffee-assistant" style={[styles.card, { padding: 16, gap: 12 }]}>
    <Txt heading>{L('خبير القهوة', 'Coffee expert')}</Txt>
    <Txt>{L('الإجابات عبر الإنترنت', 'Online answers')}</Txt>
    <Switch accessibilityLabel={L('الإجابات عبر الإنترنت', 'Online answers')} value={online} disabled={loading} onValueChange={enabled => {
      setOnline(enabled);
      void saveAssistantPreference(AsyncStorage, assistantPreferenceKey(catalogScope, owner), { ...defaultAssistantPreference(), optedOut: !enabled });
    }} />
    <Txt style={styles.muted}>{L('تستخدم الإجابات الذكية سؤالك والأسئلة الأخيرة من المحادثة. يمكنك إيقافها هنا للاكتفاء بدليل القهوة.', 'Online AI answers use your question and recent conversation questions. Turn this off to use only the coffee guide.')}</Txt>
  </View>;
}
