import { useContext } from 'react';
import { Modal, ScrollView, View } from './native';
import { SafeAreaView } from './native';
import { Action, Language, Txt, styles, colors } from './ui';
import { useTheme, type Appearance } from './theme';
import type { Locale } from './copy';
import { AppVersion } from './AppVersion';

export function SettingsScreen({ visible, close, changeLanguage }: { visible: boolean; close: () => void; changeLanguage: (locale: Locale) => void }) {
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const theme = useTheme();
  return <Modal visible={visible} animationType="slide" onRequestClose={close} presentationStyle="pageSheet">
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView testID="settings-screen" contentContainerStyle={{ padding: 20, gap: 20, width: '100%', maxWidth: 680, alignSelf: 'center' }}>
        <View style={[styles.row, { justifyContent: 'space-between', flexDirection: ar ? 'row-reverse' : 'row' }]}>
          <Txt heading style={styles.title}>{ar ? 'الإعدادات' : 'Settings'}</Txt>
          <Action title={ar ? 'تم' : 'Done'} onPress={close} />
        </View>
        <View style={styles.card}>
          <Txt heading style={styles.subtitle}>{ar ? 'المظهر' : 'Appearance'}</Txt>
          <Txt style={styles.muted}>{ar ? 'اختر إضاءة مريحة لك. يُحفظ اختيارك على هذا الجهاز.' : 'Choose a comfortable appearance. Your choice is saved on this device.'}</Txt>
          {([
            ['light', 'نهاري', 'Light'], ['dark', 'ليلي', 'Dark'], ['system', 'حسب الجهاز', 'Use device setting'],
          ] as [Appearance, string, string][]).map(([value, arabic, english]) => <Action key={value} title={ar ? arabic : english} selected={theme.appearance === value} onPress={() => theme.setAppearance(value)} />)}
          {theme.saveError ? <Txt style={styles.error}>{ar ? 'تعذّر حفظ المظهر. اختره مرة ثانية للمحاولة.' : 'Could not save appearance. Choose it again to retry.'}</Txt> : null}
        </View>
        <View style={styles.card}>
          <Txt heading style={styles.subtitle}>{ar ? 'اللغة' : 'Language'}</Txt>
          <Action title="العربية" selected={locale === 'ar'} onPress={() => changeLanguage('ar')} />
          <Action title="English" selected={locale === 'en'} onPress={() => changeLanguage('en')} />
          <Txt style={styles.muted}>{ar ? 'تتغير اللغة وتبقى في نفس الصفحة.' : 'Change language while keeping your current page.'}</Txt>
        </View>
        <View style={styles.card}>
          <Txt heading style={styles.subtitle}>{ar ? 'الجديد في هذا الإصدار' : 'New in this release'}</Txt>
          <Txt>{ar ? 'وضوح أفضل في الوضع الليلي · حسابي بترتيب جديد · تعديل اسم المستخدم · تغيير البريد بتأكيد الملكية وكلمة المرور · coffeeHO بموجز اجتماعي ومشاركات الحسابات التي تتابعها' : 'Clearer dark mode · Redesigned account · Edit username · Verified email and password changes · A social coffeeHO timeline and following feed'}</Txt>
        </View>
        <AppVersion />
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
