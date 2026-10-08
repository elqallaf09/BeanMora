import { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "./native";
import * as ImagePicker from "expo-image-picker";
import { randomUUID } from "expo-crypto";
import { MemberAvatar } from "./MemberAvatar";
import { Action, Language, Txt, colors, styles } from "./ui";
import { supabase } from "./client";
import { contributionImage } from "./core/member-contributions";
import { saveMemberAvatar } from "./core/member-social";

export function AvatarEditor({
  owner,
  name,
  url,
  saved,
}: {
  owner: string;
  name: string;
  url: string | null;
  saved: (url: string) => void;
}) {
  const ar = useContext(Language) === "ar";
  const [draft, setDraft] = useState<{
    id: string;
    uri: string;
    bytes: Uint8Array;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true),
    locked = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function choose() {
    if (locked.current) return;
    locked.current = true;
    setError("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        exif: false,
        quality: 0.85,
      });
      if (result.canceled || !mounted.current) return;
      const asset = result.assets[0];
      if (!asset || (asset.fileSize ?? 0) > 5 * 1024 * 1024)
        throw new Error("IMAGE_SIZE");
      const bytes = asset.base64
        ? Uint8Array.from(atob(asset.base64), (c) => c.charCodeAt(0))
        : new Uint8Array(await (await fetch(asset.uri)).arrayBuffer());
      contributionImage(bytes);
      if (mounted.current)
        setDraft({ id: randomUUID(), uri: asset.uri, bytes });
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error && e.message === "IMAGE_SIZE"
            ? ar
              ? "اختر صورة أصغر من 5 MB."
              : "Choose a photo smaller than 5 MB."
            : ar
              ? "اختر صورة JPG أو PNG أو WebP."
              : "Choose a JPG, PNG or WebP photo.",
        );
    } finally {
      locked.current = false;
    }
  }
  async function save() {
    if (!draft || !supabase || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await saveMemberAvatar(
        supabase,
        owner,
        draft.id,
        draft.bytes,
      );
      if (mounted.current) {
        saved(next);
        setDraft(null);
      }
    } catch {
      if (mounted.current)
        setError(
          ar
            ? "تعذّر حفظ الصورة. أعد المحاولة."
            : "Could not save the photo. Try again.",
        );
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <View>
      <Pressable
        testID="avatar-edit"
        accessibilityRole="button"
        accessibilityLabel={
          ar ? "تغيير الصورة الشخصية" : "Change profile photo"
        }
        disabled={busy}
        onPress={() => void choose()}
        style={{ borderWidth: 4, borderColor: colors.paper, borderRadius: 44 }}
      >
        <MemberAvatar name={name} url={url} size={64} />
        <View style={s.badge}>
          <Txt style={{ color: "#FFF", fontSize: 15, lineHeight: 20 }}>+</Txt>
        </View>
      </Pressable>
      {!draft && error ? <Txt style={styles.error}>{error}</Txt> : null}
      <Modal
        visible={Boolean(draft)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setDraft(null);
        }}
      >
        <View style={s.backdrop}>
          <View accessibilityViewIsModal style={s.dialog}>
            <Txt heading style={styles.subtitle}>
              {ar ? "صورتك الشخصية" : "Your profile photo"}
            </Txt>
            {draft ? (
              <Image
                testID="avatar-preview"
                source={{ uri: draft.uri }}
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  alignSelf: "center",
                }}
              />
            ) : null}
            <Txt style={styles.muted}>
              {ar
                ? "تظهر صورتك بجانب اسمك وفي coffeeHO."
                : "Your photo appears beside your name and in coffeeHO."}
            </Txt>
            {error ? (
              <Txt accessibilityRole="alert" style={styles.error}>
                {error}
              </Txt>
            ) : null}
            {busy ? <ActivityIndicator color={colors.teal} /> : null}
            <Action
              title={ar ? "حفظ الصورة" : "Save photo"}
              selected
              disabled={busy}
              onPress={() => void save()}
            />
            <Action
              title={ar ? "إلغاء" : "Cancel"}
              disabled={busy}
              onPress={() => {
                setDraft(null);
                setError("");
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  badge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.paper,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#0007",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.paper,
    borderRadius: 22,
    padding: 20,
    gap: 16,
  },
});
