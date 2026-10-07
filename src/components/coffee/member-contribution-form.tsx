"use client";
import { useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  contributionFields,
  contributionImage,
  contributionPayload,
  initialContribution,
  requireMember,
  submitContribution,
  uploadContributionImage,
  type ContributionKind,
} from "@/lib/member-contributions";
import { Button } from "@/components/ui/button";

export function MemberContributionForm({ kind }: { kind: ContributionKind }) {
  const locale = useLocale() === "ar" ? "ar" : "en",
    ar = locale === "ar",
    router = useRouter();
  const [values, setValues] = useState(() => initialContribution(kind)),
    [photo, setPhoto] = useState<File | null>(null),
    [rights, setRights] = useState(false),
    [busy, setBusy] = useState(false),
    [locked, setLocked] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState<string | null>(null);
  const attempt = useRef<{
    id: string;
    owner: string;
    payload: Record<string, unknown>;
    path?: string;
  } | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const client = createClient();
      if (!attempt.current) {
        const payload = contributionPayload(kind, values, locale);
        if (photo && !rights)
          throw new Error(
            ar
              ? "أكد أنك تملك حق مشاركة الصورة."
              : "Confirm you can share this image.",
          );
        if (photo) contributionImage(new Uint8Array(await photo.arrayBuffer()));
        const owner = await requireMember(client);
        attempt.current = { id: crypto.randomUUID(), owner, payload };
        setLocked(true);
      }
      const a = attempt.current;
      if (photo && !a.path)
        a.path = await uploadContributionImage(
          client,
          a.owner,
          a.id,
          new Uint8Array(await photo.arrayBuffer()),
        );
      await submitContribution(client, kind, a.owner, a.id, {
        ...a.payload,
        image_path: a.path ?? "",
      });
      setSaved(a.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(
        /^(تحقق|أكد|Check:|Confirm)/.test(message)
          ? message
          : message === "MEMBER_SIGN_IN_REQUIRED"
            ? ar
              ? "سجّل الدخول بحساب مسجل لإتمام الإضافة."
              : "Sign in with a registered account to continue."
            : message.startsWith("IMAGE_")
              ? ar
                ? "اختر صورة JPEG أو PNG أو WebP لا تتجاوز ٥ ميغابايت، وتحقق من اتصالك."
                : "Choose a JPEG, PNG or WebP image under 5 MB and check your connection."
              : ar
                ? "تعذّر تأكيد الحفظ. تحقق من اتصالك ثم أعد المحاولة بنفس البيانات."
                : "Could not confirm saving. Check your connection and retry with the same details.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (saved)
    return (
      <div className="space-y-4">
        <p role="status">
          {kind === "bean"
            ? ar
              ? "تمت الإضافة إلى أكياسك. تظهر للعامة بعد المراجعة."
              : "Added to your bags. Public listing follows review."
            : ar
              ? "تم حفظ الوصفة وخطواتها."
              : "Recipe and steps saved."}
        </p>
        <Button
          onClick={() => {
            router.push(kind === "bean" ? "/gear/beans" : `/recipes/${saved}`);
            router.refresh();
          }}
        >
          {ar ? "عرض" : "View"}
        </Button>
      </div>
    );
  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-sm text-[var(--color-muted-text)]">
        {ar
          ? "الحقول المميزة بنجمة مطلوبة. اترك المعلومة غير المعروفة فارغة."
          : "Starred fields are required. Leave unknown details blank."}
      </p>
      <fieldset
        disabled={busy || locked}
        className="grid min-w-0 gap-4 sm:grid-cols-2"
      >
        {contributionFields[kind].map((f) => (
          <label
            key={f.key}
            className={`flex min-w-0 flex-col gap-2 text-sm ${f.multiline ? "sm:col-span-2" : ""}`}
          >
            <span>{(ar ? f.ar : f.en) + (f.required ? " *" : "")}</span>
            {f.choices ? (
              <select
                aria-label={ar ? f.ar : f.en}
                value={values[f.key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
                className="min-h-11 w-full rounded-xl border bg-white p-3"
              >
                {f.choices.map((c) => (
                  <option key={c[0]} value={c[0]}>
                    {c[ar ? 1 : 2]}
                  </option>
                ))}
              </select>
            ) : f.multiline ? (
              <textarea
                aria-label={ar ? f.ar : f.en}
                required={f.required}
                rows={5}
                value={values[f.key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
                className="w-full rounded-xl border bg-white p-3"
                maxLength={f.key === "steps" ? 20000 : 5000}
              />
            ) : (
              <input
                aria-label={ar ? f.ar : f.en}
                required={f.required}
                type={f.key.endsWith("_url") ? "url" : "text"}
                inputMode={f.numeric ? "decimal" : undefined}
                value={values[f.key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
                className="min-h-11 w-full min-w-0 rounded-xl border bg-white p-3"
                maxLength={2048}
              />
            )}
          </label>
        ))}
      </fieldset>
      <label className="block space-y-2 text-sm">
        <span>
          {ar
            ? "صورة اختيارية — حتى ٥ ميغابايت"
            : "Optional image — up to 5 MB"}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy || locked}
          className="block w-full min-w-0"
          onChange={(e) => {
            setPhoto(e.target.files?.[0] ?? null);
            setRights(false);
          }}
        />
      </label>
      {photo ? (
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={rights}
            disabled={busy || locked}
            onChange={(e) => setRights(e.target.checked)}
          />
          {ar
            ? "أملك حق مشاركة هذه الصورة"
            : "I have permission to share this image"}
        </label>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <Button disabled={busy} type="submit">
        {busy
          ? ar
            ? "جارٍ الحفظ…"
            : "Saving…"
          : locked
            ? ar
              ? "إعادة تأكيد الحفظ"
              : "Retry saving"
            : ar
              ? "حفظ"
              : "Save"}
      </Button>
    </form>
  );
}
