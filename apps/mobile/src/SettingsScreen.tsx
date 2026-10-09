import { useContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Modal, ScrollView, View } from './native';
import { SafeAreaView } from './native';
import { Action, Language, Txt, styles, colors } from './ui';
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
}: {
  visible: boolean;
  close: () => void;
  changeLanguage: (locale: Locale) => void;
  session: Session | null;
  onDeleted: (localCleanupFailed: boolean) => void;
}) {
  const locale = useContext(Language);
  const ar = locale === 'ar';
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
                {ar ? 'الإعدادات' : 'Settings'}
              </Txt>
              <Action compact title={ar ? 'تم' : 'Done'} onPress={close} />
            </View>
            <View style={[styles.card, { padding: 16, gap: 12 }]}>
              <Txt
                heading
                style={{ fontSize: 14, fontWeight: '700', color: colors.muted }}
              >
                {ar ? 'المظهر' : 'Appearance'}
              </Txt>
              <TabRail equal testID="settings-appearance" value={theme.appearance}
                items={[{ id: 'light', label: ar ? 'نهاري' : 'Light' }, { id: 'dark', label: ar ? 'ليلي' : 'Dark' }, { id: 'system', label: ar ? 'حسب الجهاز' : 'Device' }]}
                onChange={value => theme.setAppearance(value as Appearance)} />
              {theme.saveError ? (
                <Txt style={styles.error}>
                  {ar
                    ? 'تعذّر حفظ المظهر. اختره مرة ثانية للمحاولة.'
                    : 'Could not save appearance. Choose it again to retry.'}
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
                {ar ? 'اللغة' : 'Language'}
              </Txt>
              <TabRail equal testID="settings-language" value={locale}
                items={[{ id: 'ar', label: 'العربية' }, { id: 'en', label: 'English' }]}
                onChange={value => changeLanguage(value as Locale)} />
            </View>
            {session ? (
              <SettingsSocial key={'social-' + session.user.id} owner={session.user.id} />
            ) : null}
            {session ? (
              <SettingsAccount
                key={session.user.id}
                session={session}
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
