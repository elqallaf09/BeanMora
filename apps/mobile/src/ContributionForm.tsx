import { useLabels } from './ui';
import { uiMessage } from './localeText';
import { useContext, useRef, useState } from "react";
import { Image, Pressable, ScrollView, View } from "./native";
import * as ImagePicker from "expo-image-picker";
import { randomUUID } from "expo-crypto";
import {
  contributionFields,
  contributionImage,
  contributionPayload,
  initialContribution,
  submitContribution,
  uploadContributionImage,
  type ContributionKind,
} from "./core/member-contributions";
import { supabase } from "./client";
import { Action, Field, Language, Txt, styles } from "./ui";

export function ContributionForm({
  kind,
  userId,
  login,
  done,
}: {
  kind: ContributionKind;
  userId: string | null;
  login: () => void;
  done: () => void;
}) {
  const i18nUi = useLabels();
  const locale = useContext(Language),
    ar = locale === "ar";
  const [values, setValues] = useState(() => initialContribution(kind));
  const [photo, setPhoto] = useState<{ uri: string; bytes: Uint8Array } | null>(
    null,
  );
  const [rights, setRights] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const attempt = useRef<{
    id: string;
    payload: Record<string, unknown>;
    path?: string;
  } | null>(null);
  const [locked, setLocked] = useState(false);
  const pick = async () => {
    setError("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        exif: false,
        quality: 0.85,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64) throw new Error("IMAGE_FORMAT");
      const raw = atob(asset.base64),
        bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
      contributionImage(bytes);
      setPhoto({ uri: asset.uri, bytes });
      setRights(false);
    } catch {
      setError(
        ar
          ? "اختر صورة بصيغة JPEG أو PNG أو WebP لا تتجاوز ٥ ميغابايت."
          : i18nUi("اختر صورة بصيغة JPEG أو PNG أو WebP لا تتجاوز ٥ ميغابايت.", "Choose a JPEG, PNG or WebP image under 5 MB."),
      );
    }
  };
  const submit = async () => {
    if (busy || !supabase || !userId) return;
    setError("");
    setBusy(true);
    try {
      if (!attempt.current) {
        const payload = contributionPayload(kind, values, locale);
        if (photo && !rights)
          throw new Error(
            ar
              ? "أكد أنك تملك حق مشاركة الصورة."
              : i18nUi("أكد أنك تملك حق مشاركة الصورة.", "Confirm you can share this image."),
          );
        attempt.current = { id: randomUUID(), payload };
        setLocked(true);
      }
      const current = attempt.current;
      if (photo && !current.path)
        current.path = await uploadContributionImage(
          supabase,
          userId,
          current.id,
          photo.bytes,
        );
      await submitContribution(supabase, kind, userId, current.id, {
        ...current.payload,
        image_path: current.path ?? "",
      });
      setSaved(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(
        /^(تحقق|أكد|Check:|Confirm)/.test(message)
          ? uiMessage(locale,message)
          : ar
            ? "تعذّر تأكيد الحفظ. تحقق من اتصالك وحسابك، ثم أعد المحاولة بنفس البيانات."
            : i18nUi("تعذّر تأكيد الحفظ. تحقق من اتصالك وحسابك، ثم أعد المحاولة بنفس البيانات.", "Could not confirm saving. Check your connection and account, then retry with the same details."),
      );
    } finally {
      setBusy(false);
    }
  };
  if (!userId)
    return (
      <View style={{ padding: 24, gap: 16 }}>
        <Txt>
          {ar
            ? "سجّل دخولك لإضافة وصفة أو بن وصورته."
            : i18nUi("سجّل دخولك لإضافة وصفة أو بن وصورته.", "Sign in to add a recipe or coffee and its image.")}
        </Txt>
        <Action
          selected
          title={ar ? "تسجيل الدخول" : i18nUi("تسجيل الدخول", "Sign in")}
          onPress={login}
        />
      </View>
    );
  if (saved)
    return (
      <View style={{ padding: 24, gap: 16 }}>
        <Txt accessibilityRole="alert">
          {kind === "bean"
            ? ar
              ? "تمت إضافة البن إلى أكياسك. يظهر في الكتالوج العام بعد المراجعة."
              : i18nUi("تمت إضافة البن إلى أكياسك. يظهر في الكتالوج العام بعد المراجعة.", "Coffee added to your bags. It appears in the public catalog after review.")
            : ar
              ? "تم حفظ الوصفة وخطواتها بنجاح."
              : i18nUi("تم حفظ الوصفة وخطواتها بنجاح.", "Recipe and steps saved successfully.")}
        </Txt>
        <Action selected title={ar ? "تم" : i18nUi("تم", "Done")} onPress={done} />
      </View>
    );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 48 }}
    >
      <Txt heading style={styles.title}>
        {kind === "recipe"
          ? ar
            ? "إضافة وصفة"
            : i18nUi("إضافة وصفة", "Add a recipe")
          : ar
            ? "إضافة بن"
            : i18nUi("إضافة بن", "Add coffee")}
      </Txt>
      <Txt style={styles.muted}>
        {ar
          ? "الحقول المميزة بنجمة مطلوبة. اترك المعلومة غير المعروفة فارغة."
          : i18nUi("الحقول المميزة بنجمة مطلوبة. اترك المعلومة غير المعروفة فارغة.", "Starred fields are required. Leave unknown details blank.")}
      </Txt>
      {contributionFields[kind].map((f) => (
        <View key={f.key} style={{ gap: 6 }}>
          <Txt>{(i18nUi(f.ar,f.en)) + (f.required ? " *" : "")}</Txt>
          {f.choices ? (
            <View
              style={{
                flexDirection: ar ? "row-reverse" : "row",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {f.choices.map((c) => (
                <Action
                  compact
                  key={c[0]}
                  title={i18nUi(c[1],c[2])}
                  selected={(values[f.key] ?? "") === c[0]}
                  disabled={busy || locked}
                  onPress={() => setValues((v) => ({ ...v, [f.key]: c[0] }))}
                />
              ))}
            </View>
          ) : (
            <Field
              label={i18nUi(f.ar,f.en)}
              value={values[f.key] ?? ""}
              editable={!busy && !locked}
              onChangeText={(text) =>
                setValues((v) => ({ ...v, [f.key]: text }))
              }
              multiline={f.multiline}
              keyboardType={f.numeric ? "decimal-pad" : "default"}
              maxLength={f.key === "steps" ? 20000 : f.multiline ? 5000 : 2048}
              autoCapitalize={f.key.endsWith("_url") ? "none" : "sentences"}
            />
          )}
        </View>
      ))}
      {photo ? (
        <Image
          accessibilityLabel={ar ? "الصورة المختارة" : i18nUi("الصورة المختارة", "Selected image")}
          source={{ uri: photo.uri }}
          style={{ width: "100%", height: 190, borderRadius: 12 }}
          resizeMode="contain"
        />
      ) : null}
      <Action
        title={ar ? "اختيار صورة (اختياري)" : i18nUi("اختيار صورة (اختياري)", "Choose image (optional)")}
        disabled={busy || locked}
        onPress={() => void pick()}
      />
      {photo ? (
        <>
          <Action
            title={ar ? "إزالة الصورة" : i18nUi("إزالة الصورة", "Remove image")}
            disabled={busy || locked}
            onPress={() => {
              setPhoto(null);
              setRights(false);
            }}
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: rights, disabled: locked }}
            disabled={busy || locked}
            onPress={() => setRights((v) => !v)}
            style={{ padding: 12, minHeight: 44 }}
          >
            <Txt>
              {(rights ? "☑ " : "☐ ") +
                (ar
                  ? "أملك حق مشاركة هذه الصورة"
                  : i18nUi("أملك حق مشاركة هذه الصورة", "I have permission to share this image"))}
            </Txt>
          </Pressable>
        </>
      ) : null}
      {error ? (
        <Txt accessibilityRole="alert" style={styles.error}>
          {error}
        </Txt>
      ) : null}
      <Action
        selected
        title={
          busy
            ? ar
              ? "جارٍ الحفظ…"
              : i18nUi("جارٍ الحفظ…", "Saving…")
            : locked
              ? ar
                ? "إعادة تأكيد الحفظ"
                : i18nUi("إعادة تأكيد الحفظ", "Retry saving")
              : ar
                ? "حفظ"
                : i18nUi("حفظ", "Save")
        }
        disabled={busy}
        onPress={() => void submit()}
      />
    </ScrollView>
  );
}
