import { useContext, useState, type ReactNode } from 'react';
import { Pressable, View } from './native';
import { Icon, Language, Txt, colors, styles } from './ui';
export function Disclosure({
  title,
  subtitle,
  children,
  initial = false,
  testID,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  initial?: boolean;
  testID?: string;
}) {
  const ar = useContext(Language) === 'ar';
  const [open, setOpen] = useState(initial);
  return (
    <View
      testID={testID}
      style={[styles.card, { padding: 0, marginBottom: 0, overflow: 'hidden' }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={{
          minHeight: 54,
          paddingHorizontal: 15,
          paddingVertical: 12,
          flexDirection: ar ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Txt
            heading
            style={{ fontSize: 16, lineHeight: 24, fontWeight: '700' }}
          >
            {title}
          </Txt>
          {subtitle ? (
            <Txt style={{ fontSize: 12, color: colors.muted }}>{subtitle}</Txt>
          ) : null}
        </View>
        <Txt style={{ fontSize: 20, color: colors.teal }}>
          {open ? '−' : '+'}
        </Txt>
      </Pressable>
      {open ? (
        <View style={{ padding: 15, paddingTop: 0, gap: 10 }}>{children}</View>
      ) : null}
    </View>
  );
}
