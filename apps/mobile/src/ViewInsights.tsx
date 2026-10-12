import { useContext, useEffect, useRef, useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "./native";
import { Action, Icon, Txt, colors, styles, useLabels, Language } from "./ui";
import { MemberAvatar } from "./MemberAvatar";
import { supabase } from "./client";
import { profileVisitors, type NamedViews } from "./core/member-social";
import { storyViewers } from "./core/community-social";

/** Story lists stay inside the story's existing modal. Both queries enforce owner access. */
export function ViewInsights({
  owner,
  target,
  kind,
  openMember,
  onOpenChange,
  buttonStyle,
}: {
  owner: string;
  target: string;
  kind: "profile" | "story";
  openMember?: (username: string) => void;
  onOpenChange?: (open: boolean) => void;
  buttonStyle?: StyleProp<ViewStyle>;
}) {
  const L = useLabels();
  const ar = useContext(Language) === "ar";
  const [open, setOpen] = useState(false),
    [result, setResult] = useState<NamedViews | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useRef(0);
  const close = () => {
    setOpen(false);
    onOpenChange?.(false);
  };
  async function load(offset = 0) {
    if (!supabase) return;
    const id = ++request.current;
    setBusy(true);
    setError("");
    try {
      const next =
        kind === "profile"
          ? await profileVisitors(supabase, owner, offset)
          : await storyViewers(supabase, owner, target, offset);
      if (id === request.current)
        setResult((previous) => ({
          count: next.count,
          rows: offset
            ? [
                ...new Map(
                  [...(previous?.rows ?? []), ...next.rows].map((row) => [
                    row.id,
                    row,
                  ]),
                ).values(),
              ]
            : next.rows,
        }));
    } catch {
      if (id === request.current)
        setError(
          L(
            "تعذّر تحميل المشاهدين. أعد المحاولة.",
            "Could not load viewers. Please retry.",
            "閲覧者を読み込めませんでした。再試行してください。",
          ),
        );
    } finally {
      if (id === request.current) setBusy(false);
    }
  }
  useEffect(() => {
    setOpen(false);
    setResult(null);
    setError("");
    if (kind === "story") void load();
    return () => {
      request.current++;
    };
  }, [owner, target, kind]);
  const title =
    kind === "profile"
      ? L("من زار حسابي", "Profile visitors", "プロフィールの閲覧者")
      : L("مشاهدو القصة", "Story viewers", "ストーリーの閲覧者");
  const content = open ? (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 20,
          backgroundColor: "#0009",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        },
      ]}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityLabel={L(
          "إغلاق المشاهدين",
          "Close viewers",
          "閲覧者を閉じる",
        )}
        onPress={close}
      />
      <View
        testID="view-insights-panel"
        accessibilityViewIsModal
        style={{
          width: "100%",
          maxWidth: 430,
          maxHeight: "80%",
          borderRadius: 20,
          backgroundColor: colors.paper,
          padding: 18,
          gap: 12,
        }}
      >
        <Txt heading style={styles.subtitle}>
          {title}
        </Txt>
        <View testID="view-insights-count">
          <Txt>
            {result
              ? result.count + " " + L("مشاهد", "viewers", "人の閲覧者")
              : L("جارٍ التحميل…", "Loading…", "読み込み中…")}
          </Txt>
        </View>
        <Txt style={styles.muted}>
          {kind === "profile"
            ? L(
                "الزوّار المسجلون خلال آخر 30 يوم. يظهر آخر وقت للزيارة.",
                "Signed-in visitors from the last 30 days, with their latest visit.",
                "過去30日間にログインして閲覧したユーザーと最終閲覧日時。",
              )
            : L(
                "تُحتسب المشاهدة مرة واحدة لكل حساب مسجل، بعد عرض الصورة أو بدء الفيديو.",
                "Each signed-in account counts once, after the photo loads or the video starts.",
                "写真の表示または動画の再生開始後、ログインした各ユーザーを1回だけ数えます。",
              )}
        </Txt>
        <ScrollView
          style={{ flexShrink: 1 }}
          contentContainerStyle={{ gap: 10 }}
        >
          {result?.rows.map((member) => (
            <Pressable
              key={member.id}
              accessibilityRole={openMember ? "button" : undefined}
              disabled={!openMember}
              onPress={() => {
                close();
                openMember?.(member.username);
              }}
              style={{
                flexDirection: ar ? "row-reverse" : "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 5,
              }}
            >
              <MemberAvatar
                name={member.name}
                url={member.avatar_url}
                size={42}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt numberOfLines={1} style={{ fontWeight: "700" }}>
                  {member.name}
                </Txt>
                <Txt numberOfLines={1} style={styles.muted}>
                  @{member.username}
                </Txt>
                <Txt style={styles.muted}>
                  {new Date(member.viewed_at).toLocaleString(
                    L("ar-KW-u-nu-latn", "en", "ja"),
                  )}
                </Txt>
              </View>
            </Pressable>
          ))}
          {!busy && !error && result?.count === 0 ? (
            <Txt>
              {L(
                "لا توجد مشاهدات مسجلة حتى الآن.",
                "No recorded views yet.",
                "まだ閲覧記録がありません。",
              )}
            </Txt>
          ) : null}
          {result && result.rows.length < result.count ? (
            <Action
              compact
              disabled={busy}
              title={L("عرض المزيد من المشاهدين", "More viewers", "さらに表示")}
              onPress={() => void load(result.rows.length)}
            />
          ) : null}
        </ScrollView>
        {error ? (
          <Txt accessibilityRole="alert" style={styles.error}>
            {error}
          </Txt>
        ) : null}
        <View style={{ gap: 8 }}>
          <Action
            compact
            disabled={busy}
            title={
              busy
                ? L("جارٍ التحميل…", "Loading…", "読み込み中…")
                : L("تحديث المشاهدين", "Refresh viewers", "閲覧者を更新")
            }
            onPress={() => void load()}
          />
          <Action
            compact
            selected
            title={L("إغلاق المشاهدين", "Close viewers", "閲覧者を閉じる")}
            onPress={close}
          />
        </View>
      </View>
    </View>
  ) : null;
  return (
    <>
      <Pressable
        testID={kind === "profile" ? "profile-visitors" : "story-view-count"}
        accessibilityRole="button"
        accessibilityLabel={
          kind === "profile"
            ? title
            : title + (result ? ` (${result.count})` : "")
        }
        onPress={() => {
          setOpen(true);
          onOpenChange?.(true);
          void load();
        }}
        style={[
          {
            minHeight: 44,
            minWidth: 44,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingHorizontal: 8,
          },
          buttonStyle,
        ]}
      >
        <Icon
          name={kind === "profile" ? "eyes" : "eye"}
          size={24}
          color={kind === "story" ? "#FFFFFF" : colors.teal}
        />
        {kind === "story" ? (
          <Txt style={{ color: "#FFFFFF" }}>{result ? result.count : "…"}</Txt>
        ) : null}
      </Pressable>
      {kind === "story" ? (
        content
      ) : (
        <Modal
          transparent
          visible={open}
          animationType="fade"
          onRequestClose={close}
        >
          {content}
        </Modal>
      )}
    </>
  );
}
