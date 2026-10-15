import { useContext, useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from './native';
import { Language, Txt, colors, styles } from './ui';
import { getSupportCopy, openSupportDraft, SUPPORT_EMAIL, SUPPORT_TOPICS, type SupportTopic } from './support-mail';

export function SupportContact() {
  const locale = useContext(Language);
  const text = getSupportCopy(locale);
  const [opening, setOpening] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const openingRef = useRef(false);
  const open = async (topic: SupportTopic) => {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    setUnavailable(false);
    try {
      const result = await openSupportDraft(url => Linking.openURL(url), locale, topic);
      setUnavailable(result === 'unavailable');
    } finally {
      openingRef.current = false;
      setOpening(false);
    }
  };
  return (
    <View testID="support-contact" style={[styles.card, { padding: 16, gap: 12 }]}>
      <Txt heading style={{ fontSize: 18, fontWeight: '700' }}>{text.title}</Txt>
      <Txt>{text.intro}</Txt>
      <Text selectable testID="support-email" accessibilityLabel={SUPPORT_EMAIL}
        style={[styles.text, { color: colors.teal, writingDirection: 'ltr', textAlign: 'left' }]}>
        {SUPPORT_EMAIL}
      </Text>
      <View style={{ flexDirection: locale === 'ar' ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
        {SUPPORT_TOPICS.map(topic => (
          <Pressable key={topic} testID={`support-${topic}`} accessibilityRole="button"
            accessibilityLabel={text.topics[topic]} accessibilityHint={text.draftHint}
            accessibilityState={{ disabled: opening, busy: opening }} disabled={opening}
            onPress={() => { void open(topic); }}
            style={({ pressed }) => ({ flexBasis: '45%', flexGrow: 1, minHeight: 48,
              justifyContent: 'center', borderWidth: 1, borderColor: colors.line,
              borderRadius: 12, padding: 12, backgroundColor: colors.chip,
              opacity: pressed || opening ? 0.55 : 1 })}>
            <Txt style={{ fontWeight: '700', textAlign: 'center' }}>{text.topics[topic]}</Txt>
          </Pressable>
        ))}
      </View>
      <Txt style={styles.muted}>{text.draftHint}</Txt>
      <Txt style={styles.muted}>{text.reportHint}</Txt>
      <Txt style={styles.muted}>{text.safety}</Txt>
      {unavailable ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite"
        style={[styles.text, styles.error, { textAlign: locale === 'ar' ? 'right' : 'left' }]}>
        {text.unavailable}
      </Text> : null}
    </View>
  );
}
