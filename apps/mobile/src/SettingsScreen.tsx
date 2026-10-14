import { useContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Modal, Pressable, ScrollView, View } from './native';
import { SafeAreaView } from './native';
import { useLabels, Action, Language, Txt, styles, colors } from './ui';
import { useTheme, type Appearance } from './theme';
import type { Locale } from './copy';
import { languageOptions } from './localeText';
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
              <Pressable testID="settings-done" accessibilityRole="button" accessibilityLabel={L('تم', 'Done')}
                onPress={close} style={({ pressed }) => ({ minWidth: 88, minHeight: 48, paddingHorizontal: 18,
                  borderRadius: 14, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.65 : 1 })}>
                <Txt style={{ fontSize: 18, lineHeight: 26, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }}>{L('تم', 'Done')}</Txt>
              </Pressable>
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
              <TabRail wrap variant="pills" columns={2} testID="settings-language" value={locale}
                items={languageOptions}
                onChange={value => changeLanguage(value as Locale)} />
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
