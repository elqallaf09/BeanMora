import { useContext, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  legalContent,
  legalUpdated,
  type LegalKind,
} from './core/legal-content';
import { Action, Language, Txt, colors, styles } from './ui';

export function LegalLinks() {
  const locale = useContext(Language);
  const [open, setOpen] = useState<LegalKind | null>(null);
  const document = open ? legalContent[locale][open] : null;
  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'center',
        }}
      >
        {(['privacy', 'terms'] as const).map((kind) => (
          <Pressable
            key={kind}
            accessibilityRole="button"
            onPress={() => setOpen(kind)}
            style={{
              minHeight: 44,
              justifyContent: 'center',
              paddingHorizontal: 8,
            }}
          >
            <Txt
              style={{ color: colors.teal, textDecorationLine: 'underline' }}
            >
              {legalContent[locale][kind].title}
            </Txt>
          </Pressable>
        ))}
      </View>
      <Modal
        visible={!!document}
        animationType="slide"
        onRequestClose={() => setOpen(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
          <ScrollView
            contentContainerStyle={{
              padding: 24,
              gap: 16,
              maxWidth: 800,
              width: '100%',
              alignSelf: 'center',
            }}
          >
            <Txt heading style={styles.title}>
              {document?.title}
            </Txt>
            <Txt style={styles.muted}>
              {locale === 'ar' ? 'آخر تحديث: ' : 'Updated: '}
              {legalUpdated}
            </Txt>
            {document?.sections.map(([title, body]) => (
              <View key={title} style={{ gap: 8 }}>
                <Txt heading style={styles.subtitle}>
                  {title}
                </Txt>
                <Txt>{body}</Txt>
              </View>
            ))}
            <Action
              title={locale === 'ar' ? 'إغلاق' : 'Close'}
              onPress={() => setOpen(null)}
              selected
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
