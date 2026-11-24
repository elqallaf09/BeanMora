import { useContext, useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from './native';
import { Icon, Language, Txt, colors, styles } from './ui';
export function Disclosure({
  title,
  subtitle,
  children,
  initial = false,
  testID,
  primary = false,
  openSignal,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  initial?: boolean;
  testID?: string;
  primary?: boolean;
  /** Changing this value opens the section (it never closes it). */
  openSignal?: number;
}) {
  const ar = useContext(Language) === 'ar';
  const [open, setOpen] = useState(initial);
  useEffect(() => { if (openSignal) setOpen(true); }, [openSignal]);
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
          backgroundColor: primary ? colors.teal : undefined,
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
            style={{ fontSize: 16, lineHeight: 24, fontWeight: '700', color: primary ? '#FFF' : colors.ink }}
          >
            {title}
          </Txt>
          {subtitle ? (
            <Txt style={{ fontSize: 12, color: primary ? '#FFF' : colors.muted }}>{subtitle}</Txt>
          ) : null}
        </View>
        <Txt style={{ fontSize: 20, color: primary ? '#FFF' : colors.teal }}>
          {open ? '−' : '+'}
        </Txt>
      </Pressable>
      {open ? (
        <View style={{ padding: 15, paddingTop: 0, gap: 10 }}>{children}</View>
      ) : null}
    </View>
  );
}
