import { useContext, useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from './native';
import { useReducedMotion } from './Motion';
import { PillButton } from './PillButton';
import { IconButton, Language, Txt, colors, useLabels, type IconName } from './ui';

export function ProfileSectionMenu({ value, items, onChange, style }: {
  value: string;
  items: { id: string; label: string; icon: IconName }[];
  onChange: (id: string) => void;
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
}) {
  const ar = useContext(Language) === 'ar';
  const L = useLabels();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const trigger = useRef<ComponentRef<typeof View>>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const close = () => setAnchor(null);
  const menuWidth = Math.min(280, width - 32);
  const menuHeight = 224;
  const left = anchor ? Math.max(16, Math.min(width - menuWidth - 16, ar ? anchor.x : anchor.x + anchor.width - menuWidth)) : 16;
  const top = anchor ? Math.max(16, anchor.y + anchor.height + menuHeight + 8 <= height - 16 ? anchor.y + anchor.height + 8 : Math.min(height - menuHeight - 16, anchor.y - menuHeight - 8)) : 16;
  return (
    <View ref={trigger} collapsable={false} style={style}>
      <PillButton title={L('المزيد', 'More')} compact trailingIcon="chevronDown"
        selected={items.some(item => item.id === value)}
        accessibilityLabel={L('المزيد من أقسام الحساب', 'More profile sections')}
        accessibilityState={{ expanded: anchor !== null }}
        onPress={() => trigger.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }))} />
      <Modal visible={anchor !== null} transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={close}>
        <View style={{ flex: 1, backgroundColor: '#0003' }}>
          <Pressable accessibilityRole="button" accessibilityLabel={L('إغلاق القائمة', 'Close menu')} onPress={close} style={StyleSheet.absoluteFill} />
          <View testID="profile-extra-sections" accessibilityViewIsModal style={{ position: 'absolute', left, top, width: menuWidth, maxHeight: height - 32, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, padding: 12, gap: 6 }}>
            <View style={{ flexDirection: ar ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Txt style={{ fontSize: 13, fontWeight: '700' }}>{L('المزيد', 'More')}</Txt>
              <IconButton name="close" size={16} label={L('إغلاق', 'Close')} onPress={close} />
            </View>
            <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6 }}>
              {items.map(item => <PillButton key={item.id} compact title={item.label} icon={item.icon} selected={item.id === value}
                onPress={() => { close(); onChange(item.id); }} />)}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
