import { useContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Modal, ScrollView, View } from './native';
import { SafeAreaView } from './native';
import { useLabels, Action, Language, Txt, styles, colors } from './ui';
import { useTheme, type Appearance } from './theme';
import type { Locale } from './copy';
import { AppVersion } from './AppVersion';
import { LegalLinks } from './LegalLinks';
import { SettingsAccount } from './SettingsAccount';
import { TabRail } from './TabRail';
import { SettingsSocial } from './SettingsSocial';

export function SettingsScreen({
  visible,
  close,
  changeLanguage,
  session,
  onDeleted,
  onProfileUpdated,
}: {
  visible: boolean;
  close: () => void;
  changeLanguage: (locale: Locale) => void;
  session: Session | null;
  onDeleted: (localCleanupFailed: boolean) => void;
  onProfileUpdated: () => void;
}) {
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const L = useLabels();
  const theme = useTheme();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={close}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
        {visible ? (
          <ScrollView
            testID="settings-screen"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              padding: 18,
              gap: 14,
              width: '100%',
              maxWidth: 580,
              alignSelf: 'center',
            }}
          >
            <View
              style={[
                styles.row,
                {
                  justifyContent: 'space-between',
                  flexDirection: ar ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Txt heading style={{ fontSize: 24, fontWeight: '700' }}>
                {L('الإعدادات', 'Settings')}
              </Txt>
              <Action compact title={L('تم', 'Done')} onPress={close} />
            </View>
            <View style={[styles.card, { padding: 16, gap: 12 }]}>
              <Txt
                heading
                style={{ fontSize: 14, fontWeight: '700', color: colors.muted }}
              >
                {L('المظهر', 'Appearance')}
              </Txt>
              <TabRail equal testID="settings-appearance" value={theme.appearance}
                items={[{ id: 'light', label: L('نهاري', 'Light') }, { id: 'dark', label: L('ليلي', 'Dark') }, { id: 'system', label: L('حسب الجهاز', 'Device') }]}
                onChange={value => theme.setAppearance(value as Appearance)} />
              {theme.saveError ? (
                <Txt style={styles.error}>
                  {L('تعذّر حفظ المظهر. اختره مرة ثانية للمحاولة.', 'Could not save appearance. Choose it again to retry.')}
                </Txt>
              ) : null}
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.line,
                  marginVertical: 2,
                }}
              />
              <Txt
                heading
                style={{ fontSize: 14, fontWeight: '700', color: colors.muted }}
              >
                {L('اللغة', 'Language')}
              </Txt>
              <TabRail equal testID="settings-language" value={locale}
                items={[{ id: 'ar', label: 'العربية' }, { id: 'en', label: 'English' }, { id: 'ja', label: '日本語' }]}
                onChange={value => changeLanguage(value as Locale)} />
              {locale === 'ja' ? <Txt style={styles.muted}>日本語は初期対応です。カタログと投稿は元の言語で表示される場合があります。</Txt> : null}
            </View>
            {session ? (
              <SettingsSocial key={'social-' + session.user.id} owner={session.user.id} />
            ) : null}
            {session ? (
              <SettingsAccount
                key={session.user.id}
                session={session}
                onProfileUpdated={onProfileUpdated}
                onDeleted={onDeleted}
                onSignedOut={close}
              />
            ) : null}
            <LegalLinks />
            <AppVersion />
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}
