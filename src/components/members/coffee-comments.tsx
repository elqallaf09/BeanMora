"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  addCatalogComment,
  loadCatalogComments,
  type CatalogComment,
} from "@/lib/catalog-comments";
import { Button } from "@/components/ui/button";
export function CoffeeComments({ id }: { id: string }) {
  const locale = useLocale() === "ar" ? "ar" : "en",
    ar = locale === "ar";
  const [rows, setRows] = useState<CatalogComment[]>([]),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [locked, setLocked] = useState(false);
  const attempt = useRef<{ id: string; body: string } | null>(null);
  useEffect(() => {
    let active = true;
    void loadCatalogComments(createClient(), "bean", id)
      .then((r) => {
        if (active) setRows(r);
      })
      .catch(() => {
        if (active)
          setError(ar ? "تعذّر تحميل التعليقات." : "Could not load comments.");
      });
    return () => {
      active = false;
    };
  }, [id, ar, revision]);
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">
        {ar ? "تعليقات البن" : "Coffee comments"}
      </h2>
      {rows.map((c) => (
        <article key={c.id} className="rounded-xl border p-4">
          <Link
            href={"/members/" + (c.author?.username ?? "")}
            className="font-bold"
          >
            {c.author?.name} @{c.author?.username}
          </Link>
          <p className="whitespace-pre-wrap break-words">{c.body}</p>
        </article>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          void (async () => {
            try {
              if (!attempt.current) {
                if (body.trim().length < 2) throw Error("COMMENT_LENGTH");
                attempt.current = {
                  id: crypto.randomUUID(),
                  body: body.trim(),
                };
                setLocked(true);
              }
              await addCatalogComment(
                createClient(),
                "bean",
                id,
                attempt.current.id,
                attempt.current.body,
                locale,
              );
              attempt.current = null;
              setBody("");
              setLocked(false);
              setRevision((n) => n + 1);
            } catch (e) {
              const auth =
                e instanceof Error && e.message === "MEMBER_SIGN_IN_REQUIRED";
              if (auth) {
                attempt.current = null;
                setLocked(false);
              }
              setError(
                auth
                  ? ar
                    ? "سجّل الدخول بحساب مسجل لإضافة تعليق."
                    : "Sign in with a registered account to comment."
                  : ar
                    ? "تعذّر تأكيد التعليق. تحقق من النص وأعد المحاولة."
                    : "Could not confirm comment. Check the text and retry.",
              );
            } finally {
              setBusy(false);
            }
          })();
        }}
        className="space-y-3"
      >
        <textarea
          aria-label={ar ? "تعليقك" : "Your comment"}
          value={body}
          disabled={busy || locked}
          onChange={(e) => setBody(e.target.value)}
          minLength={2}
          maxLength={2000}
          required
          className="w-full rounded-xl border p-3"
        />
        {error ? <p role="alert">{error}</p> : null}
        <Button disabled={busy} type="submit">
          {locked
            ? ar
              ? "إعادة حفظ التعليق"
              : "Retry comment"
            : ar
              ? "إضافة تعليق"
              : "Add comment"}
        </Button>
      </form>
    </section>
  );
}
