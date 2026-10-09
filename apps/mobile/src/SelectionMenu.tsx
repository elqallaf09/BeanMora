import { useContext, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "./native";
import { Field, Icon, Language, Txt, colors, styles } from "./ui";
import { normalizeSearch } from "./core/deepSearch";

/** One compact trigger, with a searchable list only while choosing. */
export function SelectionMenu({
  label,
  value,
  items,
  onChange,
  disabled = false,
  style,
}: {
  label: string;
  value: string;
  items: { id: string; name: string; note?: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const ar = useContext(Language) === "ar";
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const chosen = items.find((item) => item.id === value);
  const filtered = items.filter((item) =>
    normalizeSearch(item.name + " " + (item.note ?? "")).includes(
      normalizeSearch(search),
    ),
  );
  const close = () => {
    setOpen(false);
    setSearch("");
  };
  return (
    <View style={[{ minWidth: 0 }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label + ": " + (chosen?.name ?? "")}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          s.trigger,
          { flexDirection: ar ? "row-reverse" : "row" },
          disabled && { opacity: 0.5 },
        ]}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Txt style={styles.muted}>{label}</Txt>
          <Txt numberOfLines={1} style={{ fontWeight: "700" }}>
            {chosen?.name ?? (ar ? "اختر" : "Choose")}
          </Txt>
        </View>
        <Icon name="arrow" size={16} color={colors.teal} />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={s.backdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ar ? "إغلاق القائمة" : "Close menu"}
            onPress={close}
            style={StyleSheet.absoluteFill}
          />
          <View accessibilityViewIsModal style={s.dialog}>
            <View
              style={[
                styles.row,
                {
                  justifyContent: "space-between",
                  flexDirection: ar ? "row-reverse" : "row",
                },
              ]}
            >
              <Txt heading style={styles.subtitle}>
                {label}
              </Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ar ? "إغلاق" : "Close"}
                onPress={close}
                style={s.close}
              >
                <Txt style={{ fontSize: 24 }}>×</Txt>
              </Pressable>
            </View>
            {items.length > 8 ? (
              <Field
                label={ar ? "ابحث في القائمة" : "Search this list"}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
              />
            ) : null}
            <FlatList
              style={{ flexGrow: 0 }}
              keyboardShouldPersistTaps="handled"
              data={filtered}
              keyExtractor={(item) => item.id}
              initialNumToRender={16}
              ListEmptyComponent={
                <Txt style={styles.muted}>
                  {ar ? "لا توجد نتائج" : "No results"}
                </Txt>
              }
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  accessibilityState={{ selected: item.id === value }}
                  onPress={() => {
                    onChange(item.id);
                    close();
                  }}
                  style={[
                    s.option,
                    { flexDirection: ar ? "row-reverse" : "row" },
                    item.id === value && { backgroundColor: colors.chip },
                  ]}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt
                      style={
                        item.id === value && {
                          color: colors.teal,
                          fontWeight: "700",
                        }
                      }
                    >
                      {item.name}
                    </Txt>
                    {item.note ? (
                      <Txt numberOfLines={1} style={styles.muted}>
                        {item.note}
                      </Txt>
                    ) : null}
                  </View>
                  {item.id === value ? (
                    <Txt style={{ color: colors.teal }}>✓</Txt>
                  ) : null}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    borderRadius: 14,
    minHeight: 62,
    padding: 12,
    gap: 12,
    alignItems: "center",
  },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#0007",
  },
  dialog: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "80%",
    backgroundColor: colors.paper,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    overflow: "hidden",
  },
  close: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  option: {
    minHeight: 50,
    padding: 12,
    borderRadius: 10,
    gap: 12,
    alignItems: "center",
  },
});
