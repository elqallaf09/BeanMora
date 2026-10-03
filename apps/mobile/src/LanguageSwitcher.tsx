import { useContext, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import type { Locale } from "./copy";
import { Action, Icon, Language, Txt, colors, styles } from "./ui";
export function LanguageSwitcher({ change }: { change: (v: Locale) => void }) {
  const locale = useContext(Language);
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          ar ? "تغيير اللغة، العربية" : "Change language, English"
        }
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [s.pill, pressed && { opacity: 0.65 }]}
      >
        <Icon name="globe" size={18} color={colors.brown} />
        <Txt style={{ fontSize: 13, fontWeight: "700" }}>
          {ar ? "العربية" : "English"}
        </Txt>
        <Txt style={{ fontSize: 14 }}>⌄</Txt>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            ar ? "إغلاق اختيار اللغة" : "Close language selection"
          }
          onPress={() => setOpen(false)}
          style={s.shade}
        >
          <Pressable
            style={s.sheet}
            onPress={(event) => event.stopPropagation()}
          >
            <Icon name="globe" size={30} />
            <Txt heading style={styles.subtitle}>
              لغة التطبيق · App language
            </Txt>
            <Txt style={styles.muted}>
              {ar ? "اختر اللغة الأنسب لك." : "Choose your preferred language."}
            </Txt>
            {(["ar", "en"] as const).map((v) => (
              <Action
                key={v}
                title={v === "ar" ? "العربية" : "English"}
                selected={v === locale}
                onPress={() => {
                  change(v);
                  setOpen(false);
                }}
              />
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  pill: {
    flexDirection: "row",
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 11,
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D9C7B2",
    backgroundColor: colors.paper,
  },
  shade: {
    flex: 1,
    backgroundColor: "#201A1566",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 390,
    padding: 24,
    gap: 15,
    borderRadius: 26,
    backgroundColor: colors.paper,
  },
});
