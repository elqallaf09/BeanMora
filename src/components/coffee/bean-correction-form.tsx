"use client";

import { useRef, useState } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function BeanCorrectionForm({ beanId }: { beanId: string }) {
  const ar = useLocale() === "ar";
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || saved) return;
    const fields = new FormData(event.currentTarget);
    const reason = String(fields.get("reason") ?? "").trim();
    const suggested = String(fields.get("suggested") ?? "").trim();
    if (reason.length < 10 || reason.length > 2000 || suggested.length > 1000) {
      setError(true);
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError(false);
    try {
      const db = createClient();
      const { data, error: identityError } = await db.auth.getUser();
      if (identityError || !data.user) throw new Error("SIGN_IN_REQUIRED");
      const { data: result, error: insertError } = await db.from("data_correction_requests").insert({
        entity_type: "bean", entity_id: beanId, reported_by: data.user.id,
        reason, suggested_value: suggested || null,
      }).select("id").single();
      if (insertError || !result?.id) throw new Error("CORRECTION_NOT_SAVED");
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (saved) return <p role="status" className="rounded-xl border p-4">{ar ? "تم إرسال الملاحظة للمراجعة." : "Your correction was submitted for review."}</p>;

  const control = "mt-2 w-full rounded-xl border bg-[var(--color-surface)] p-3";
  return <form onSubmit={submit} className="space-y-5">
    <label className="block">{ar ? "ما المعلومة غير الصحيحة؟" : "What information is incorrect?"}
      <textarea name="reason" required minLength={10} maxLength={2000} rows={4} disabled={busy} className={control} />
    </label>
    <label className="block">{ar ? "المعلومة الصحيحة أو رابط المصدر (اختياري)" : "Correct information or source URL (optional)"}
      <textarea name="suggested" maxLength={1000} rows={3} disabled={busy} className={control} />
    </label>
    {error ? <p role="alert" className="text-[var(--color-error)]">{ar ? "تعذّر إرسال الملاحظة. اكتب شرحًا من 10 إلى 2000 حرف وحاول مرة ثانية." : "Could not submit. Enter a description of 10–2000 characters and try again."}</p> : null}
    <Button type="submit" disabled={busy}>{busy ? ar ? "جارٍ الإرسال…" : "Submitting…" : ar ? "إرسال الملاحظة" : "Submit correction"}</Button>
  </form>;
}
