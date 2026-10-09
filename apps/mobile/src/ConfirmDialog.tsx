import { useContext } from "react";
import { Modal, Pressable, StyleSheet, View } from "./native";
import { Action, Language, Txt, colors, styles } from "./ui";

/** One confirmation surface for destructive actions on iOS, Android and web. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  busy = false,
  onConfirm,
  onCancel,
  error,
  inline = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  error?: string;
  inline?: boolean;
}) {
  const ar = useContext(Language) === "ar";
  const cancel = () => {
    if (!busy) onCancel();
  };
  if (!visible) return null;
  const content = (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#0008",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cancelLabel ?? (ar ? "إلغاء" : "Cancel")}
        disabled={busy}
        onPress={cancel}
        style={StyleSheet.absoluteFill}
      />
      <View
        testID="confirm-dialog"
        accessibilityViewIsModal
        style={{
          width: "100%",
          maxWidth: 360,
          backgroundColor: colors.paper,
          borderRadius: 20,
          padding: 20,
          gap: 14,
        }}
      >
        <Txt heading style={styles.subtitle}>
          {title}
        </Txt>
        <Txt>{message}</Txt>
        {error ? (
          <Txt accessibilityRole="alert" style={styles.error}>
            {error}
          </Txt>
        ) : null}
        <View style={{ flexDirection: ar ? "row-reverse" : "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Action
              selected
              title={confirmLabel ?? (ar ? "موافقة" : "Confirm")}
              disabled={busy}
              onPress={onConfirm}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Action
              title={cancelLabel ?? (ar ? "إلغاء" : "Cancel")}
              disabled={busy}
              onPress={onCancel}
            />
          </View>
        </View>
      </View>
    </View>
  );
  return inline ? (
    <View style={[StyleSheet.absoluteFill, { zIndex: 10 }]}>{content}</View>
  ) : (
    <Modal transparent visible animationType="fade" onRequestClose={cancel}>
      {content}
    </Modal>
  );
}
