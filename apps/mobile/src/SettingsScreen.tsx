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
  const row = {
    flexDirection: ar ? ('row-reverse' as const) : ('row' as const),
    gap: 8,
    flexWrap: 'wrap' as const,
  };
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
              <View style={row}>
                {(
                  [
                    ['light', 'نهاري', 'Light'],
                    ['dark', 'ليلي', 'Dark'],
                    ['system', 'حسب الجهاز', 'Device'],
                  ] as [Appearance, string, string][]
                ).map(([value, arabic, english]) => (
                  <View key={value} style={{ flex: 1, minWidth: 72 }}>
                    <Action
                      compact
                      title={ar ? arabic : english}
                      selected={theme.appearance === value}
                      onPress={() => theme.setAppearance(value)}
                    />
                  </View>
                ))}
              </View>
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
              <View style={row}>
                <View style={{ flex: 1 }}>
                  <Action
                    compact
                    title="العربية"
                    selected={locale === 'ar'}
                    onPress={() => changeLanguage('ar')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Action
                    compact
                    title="English"
                    selected={locale === 'en'}
                    onPress={() => changeLanguage('en')}
                  />
                </View>
              </View>
            </View>
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
