import { useEffect, useRef, useState } from 'react';
import { View } from './native';
import { supabase } from './client';
import { Action, Field, Txt, styles, useLabels } from './ui';
import { CountryPicker } from './CountryPicker';
import { loadAccountDetails, saveAccountDetails } from './core/account-profile';

export function AccountDetails({ owner, updated }: { owner: string; updated: () => void }) {
  const L = useLabels();
  const [country, setCountry] = useState(''), [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setFailed(false);
    void (supabase ? loadAccountDetails(supabase, owner) : Promise.reject(new Error('ACCOUNT_LOAD')))
      .then(data => { if (active) { setCountry(data.country); setPhone(data.phone); } })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [owner, revision]);
  async function save() {
    if (!supabase || pending.current) return;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const result = await saveAccountDetails(supabase, owner, country, phone);
      setPhone(result.phone);
      setNotice(L('تم تحديث الدولة ورقم الهاتف.', 'Country and phone updated.', '国・地域と電話番号を更新しました。'));
      updated();
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setError(code === 'ACCOUNT_COUNTRY' ? L('اختر دولتك.', 'Choose your country.', '国・地域を選択してください。')
        : code === 'ACCOUNT_PHONE' ? L('أدخل رقم الهاتف مع رمز الدولة، مثل +96550000000.', 'Enter your phone with its country code, for example +96550000000.', '国番号を含む電話番号を入力してください。')
        : L('لم يتأكد حفظ البيانات. تحقق من الاتصال وأعد المحاولة.', 'Saving was not confirmed. Check your connection and retry.', '保存を確認できませんでした。接続を確認して再試行してください。'));
    } finally { pending.current = false; setBusy(false); }
  }
  return <View testID="account-details" style={{ gap: 10 }}>
    <Txt heading style={styles.subtitle}>{L('بيانات الحساب', 'Account details')}</Txt>
    {loading ? <Txt>{L('جارٍ التحميل…', 'Loading…')}</Txt> : failed ? <Action title={L('إعادة تحميل بيانات الحساب', 'Retry loading account details')} onPress={() => setRevision(n => n + 1)} /> : <>
      <CountryPicker value={country} onChange={setCountry} disabled={busy} />
      <Field label={L('رقم الهاتف', 'Phone number')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="+96550000000" maxLength={32} editable={!busy} style={{ writingDirection: 'ltr', textAlign: 'left' }} />
      <Txt style={styles.muted}>{L('يظهر علم الدولة بجانب اسم المستخدم. رقم الهاتف خاص بحسابك ولا يظهر للآخرين.', 'Your country flag appears beside your username. Your phone stays private.', '国旗はユーザー名の横に表示されます。電話番号は非公開です。')}</Txt>
      <Action compact title={busy ? L('جارٍ الحفظ…', 'Saving…', '保存中…') : L('حفظ بيانات الحساب', 'Save account details')} disabled={busy} onPress={() => void save()} />
    </>}
    {error ? <Txt accessibilityRole="alert" style={styles.error}>{error}</Txt> : null}
    {notice ? <View accessibilityLiveRegion="polite"><Txt style={styles.success}>{notice}</Txt></View> : null}
  </View>;
}
