import { useContext, useEffect, useRef, useState } from "react";
import { View } from "./native";
import { randomUUID } from "expo-crypto";
import { supabase } from "./client";
import { Action, Field, Language, Txt, styles } from "./ui";
import {
  addCatalogComment,
  loadCatalogComments,
  type CatalogComment,
  type CommentTarget,
} from "./core/catalog-comments";
import { setMemberFavorite } from "./core/member-social";
export function CatalogComments({
  kind,
  id,
}: {
  kind: CommentTarget;
  id: string;
}) {
  const locale = useContext(Language),
    ar = locale === "ar";
  const [rows, setRows] = useState<CatalogComment[]>([]),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [locked, setLocked] = useState(false),
    [expanded, setExpanded] = useState(false);
  const attempt = useRef<{ id: string; body: string } | null>(null);
  useEffect(() => {
    let active = true;
    setRows([]);
    if (supabase)
      void loadCatalogComments(supabase, kind, id)
        .then((r) => {
          if (active) setRows(r);
        })
        .catch(() => {
          if (active)
            setError(
              ar ? "تعذّر تحميل التعليقات." : "Could not load comments.",
            );
        });
    return () => {
      active = false;
    };
  }, [kind, id, revision, ar]);
  async function send() {
    if (!supabase || busy) return;
    setBusy(true);
    setError("");
    try {
      if (!attempt.current) {
        if (body.trim().length < 2 || body.trim().length > 2000)
          throw Error("COMMENT_LENGTH");
        attempt.current = { id: randomUUID(), body: body.trim() };
        setLocked(true);
      }
      await addCatalogComment(
        supabase,
        kind,
        id,
        attempt.current.id,
        attempt.current.body,
        locale,
      );
      attempt.current = null;
      setLocked(false);
      setBody("");
      setRevision((n) => n + 1);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "MEMBER_SIGN_IN_REQUIRED") {
        attempt.current = null;
        setLocked(false);
      }
      setError(
        code === "MEMBER_SIGN_IN_REQUIRED"
          ? ar
            ? "سجّل الدخول بحساب مسجل من صفحة حسابي لإضافة تعليق."
            : "Sign in with a registered account from Account to comment."
          : code === "COMMENT_LENGTH"
            ? ar
              ? "اكتب تعليقًا من حرفين إلى ٢٠٠٠ حرف."
              : "Write a comment of 2–2000 characters."
            : ar
              ? "تعذّر تأكيد التعليق. أعد المحاولة بنفس النص."
              : "Could not confirm the comment. Retry with the same text.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={[styles.card, { padding: 15, gap: 10 }]}>
      <Action title={ar ? "التعليقات" : "Comments"} onPress={() => setExpanded(v => !v)} selected={expanded} />
      {expanded ? <>
      {rows.map((c) => (
        <View key={c.id} style={{ gap: 5, paddingVertical: 8 }}>
          <Txt style={{ fontWeight: "700" }}>
            {c.author?.name ?? (ar ? "عضو" : "Member")}
            {c.author?.username ? " @" + c.author.username : ""}
          </Txt>
          <Txt>{c.body}</Txt>
        </View>
      ))}
      <Field
        label={ar ? "تعليقك" : "Your comment"}
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={2000}
        editable={!busy && !locked}
      />
      {error ? (
        <Txt accessibilityRole="alert" style={styles.error}>
          {error}
        </Txt>
      ) : null}
      <Action
        title={
          locked
            ? ar
              ? "إعادة حفظ التعليق"
              : "Retry comment"
            : ar
              ? "إضافة تعليق"
              : "Add comment"
        }
        disabled={busy}
        onPress={() => void send()}
      />
      </> : null}
    </View>
  );
}
export function AccountFavorite({ recipeId }: { recipeId: string }) {
  const ar = useContext(Language) === "ar";
  const [owner, setOwner] = useState<string | null>(null),
    [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    if (supabase)
      void (async () => {
        const { data } = await supabase!.auth.getUser();
        if (!data.user || data.user.is_anonymous) return;
        const { data: row, error } = await supabase!
          .from("recipe_saves")
          .select("id")
          .eq("user_id", data.user.id)
          .eq("recipe_id", recipeId)
          .maybeSingle();
        if (active) {
          setOwner(data.user.id);
          setSaved(Boolean(row));
          setError(Boolean(error));
        }
      })().catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [recipeId]);
  if (!owner) return null;
  return (
    <View style={{ gap: 7 }}>
      <Action
        title={
          saved
            ? ar
              ? "إزالة من مفضلة حسابي"
              : "Remove from account favorites"
            : ar
              ? "أضف إلى مفضلة حسابي"
              : "Add to account favorites"
        }
        selected={saved}
        disabled={busy}
        onPress={() => {
          setBusy(true);
          setError(false);
          void setMemberFavorite(supabase!, owner, recipeId, !saved)
            .then(() => setSaved((v) => !v))
            .catch(() => setError(true))
            .finally(() => setBusy(false));
        }}
      />
      {error ? (
        <Txt style={styles.error}>
          {ar
            ? "تعذّر تأكيد المفضلة. أعد المحاولة."
            : "Could not confirm favorites. Retry."}
        </Txt>
      ) : null}
    </View>
  );
}
