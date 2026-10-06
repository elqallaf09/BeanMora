import { useContext, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Locale } from "./copy";
import { Language, Txt, colors, styles } from "./ui";

type Anchor = { x: number; y: number; width: number; height: number };

export function LanguageSwitcher({ change }: { change: (v: Locale) => void }) {
  const locale = useContext(Language);
  const ar = locale === "ar";
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tablet = width >= 700;
  const trigger = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [menuHeight, setMenuHeight] = useState(0);
  const title = ar ? "لغة التطبيق" : "App language";
  const closeLabel = ar ? "إغلاق اختيار اللغة" : "Close language selection";
  const close = () => setOpen(false);

  // Close a positioned menu when rotation changes its anchor coordinates.
  useEffect(() => setOpen(false), [width]);

  function show() {
    Keyboard.dismiss();
    if (tablet && trigger.current) {
      trigger.current.measureInWindow((x, y, width, height) => {
        setAnchor({ x, y, width, height });
        setOpen(true);
      });
    } else {
      setOpen(true);
    }
  }

  const menuWidth = Math.min(300, width - insets.left - insets.right - 32);
  const left = Math.max(
    insets.left + 16,
    Math.min(
      ar && anchor ? anchor.x + anchor.width - menuWidth : (anchor?.x ?? 16),
      width - insets.right - menuWidth - 16,
    ),
  );
  const top = Math.max(
    insets.top + 12,
    Math.min(
      anchor ? anchor.y + anchor.height + 10 : insets.top + 12,
      height - insets.bottom - menuHeight - 16,
    ),
  );

  return (
    <>
      <Pressable
        ref={trigger}
        testID="language-switcher"
        accessibilityRole="button"
        accessibilityLabel={
          ar ? "تغيير اللغة، العربية" : "Change language, English"
        }
        aria-expanded={open}
        onPress={show}
        style={({ pressed }) => [s.trigger, pressed && s.pressed]}
      >
        <Txt style={s.symbol}>ع/A</Txt>
      </Pressable>
      <Modal
        visible={open}
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        animationType={tablet ? "fade" : "slide"}
        onRequestClose={close}
      >
        <View style={[s.shade, tablet && s.tabletShade]}>
          <Pressable
            testID="language-backdrop"
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={close}
            style={StyleSheet.absoluteFill}
          />
          <View
            testID="language-picker"
            role="dialog"
            accessibilityLabel={title}
            accessibilityViewIsModal
            onAccessibilityEscape={close}
            onLayout={(event) => setMenuHeight(event.nativeEvent.layout.height)}
            style={[
              s.sheet,
              { maxHeight: height - insets.top - insets.bottom - 24 },
              tablet
                ? { position: "absolute", width: menuWidth, left, top }
                : [
                    s.mobileSheet,
                    { marginLeft: insets.left, marginRight: insets.right },
                  ],
            ]}
          >
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                s.content,
                {
                  paddingBottom: tablet ? 20 : Math.max(20, insets.bottom + 12),
                },
              ]}
            >
              {!tablet ? <View style={s.handle} /> : null}
              <View style={[s.heading, ar && s.rtl]}>
                <Txt heading style={[styles.subtitle, s.title]}>
                  {title}
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={ar ? "إغلاق" : "Close"}
                  onPress={close}
                  style={({ pressed }) => [s.close, pressed && s.pressed]}
                >
                  <Txt style={s.closeSymbol}>×</Txt>
                </Pressable>
              </View>
              <Txt style={styles.muted}>
                {ar
                  ? "اختر اللغة الأنسب لك."
                  : "Choose your preferred language."}
              </Txt>
              <View style={s.options}>
                {(["ar", "en"] as const).map((v) => {
                  const selected = v === locale;
                  return (
                    <Pressable
                      key={v}
                      accessibilityRole="button"
                      accessibilityLabel={v === "ar" ? "العربية" : "English"}
                      accessibilityLanguage={v}
                      accessibilityState={{ selected }}
                      {...(Platform.OS === "web"
                        ? { "aria-pressed": selected }
                        : {})}
                      onPress={() => {
                        close();
                        if (!selected) change(v);
                      }}
                      style={({ pressed }) => [
                        s.option,
                        ar && s.rtl,
                        selected && s.selected,
                        pressed && s.pressed,
                      ]}
                    >
                      <View style={[s.badge, selected && s.selectedBadge]}>
                        <Txt style={[s.letter, selected && s.selectedLetter]}>
                          {v === "ar" ? "ع" : "A"}
                        </Txt>
                      </View>
                      <Txt
                        style={[
                          s.optionTitle,
                          { writingDirection: v === "ar" ? "rtl" : "ltr" },
                        ]}
                      >
                        {v === "ar" ? "العربية" : "English"}
                      </Txt>
                      <View style={s.check}>
                        {selected ? <Txt style={s.checkSymbol}>✓</Txt> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  trigger: {
    width: 44,
    height: 44,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D9C7B2",
    backgroundColor: colors.paper,
  },
  symbol: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    writingDirection: "ltr",
  },
  pressed: { opacity: 0.65 },
  shade: { flex: 1, backgroundColor: "#201A1566", justifyContent: "flex-end" },
  tabletShade: { backgroundColor: "#201A1526" },
  sheet: {
    backgroundColor: colors.paper,
    borderRadius: 22,
    overflow: "hidden",
    boxShadow: "0 8px 30px rgba(43, 29, 20, 0.16)",
  },
  mobileSheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  content: { paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: "center",
    marginBottom: 4,
  },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  rtl: { flexDirection: "row-reverse" },
  title: { flex: 1, fontSize: 20 },
  close: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: colors.chip,
  },
  closeSymbol: { fontSize: 26, lineHeight: 30, textAlign: "center" },
  options: { gap: 8, marginTop: 8 },
  option: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  selected: { borderColor: colors.teal, backgroundColor: "#EEF6F3" },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.chip,
  },
  selectedBadge: { backgroundColor: colors.teal },
  letter: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  selectedLetter: { color: "#FFFFFF" },
  optionTitle: { flex: 1, fontSize: 17, fontWeight: "700" },
  check: { width: 24, alignItems: "center" },
  checkSymbol: { color: colors.teal, fontSize: 22, fontWeight: "700" },
});
