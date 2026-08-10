"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { calculateRatio } from "@/lib/recipe-calculations";
import { TASTING_NOTES, isTastingNote, isValidAttemptInput, type TastingNote } from "@/lib/espresso-attempt";
import { cn } from "@/lib/utils";

export interface Attempt {
  id: string;
  dose_grams: number | null;
  water_grams: number | null;
  actual_time_seconds: number | null;
  grind_setting: string | null;
  notes: string | null;
  tasting_note: string | null;
  created_at: string;
}

const TASTING_NOTE_STYLE: Record<TastingNote, string> = {
  balanced: "border-transparent bg-[var(--color-success)]/10 text-[var(--color-success)]",
  too_sour: "border-transparent bg-[var(--color-error)]/10 text-[var(--color-error)]",
  too_bitter: "border-transparent bg-[var(--color-error)]/10 text-[var(--color-error)]",
  too_fast: "border-transparent bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  too_slow: "border-transparent bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  custom: "border-transparent bg-[var(--color-cream)] text-[var(--color-dark-text-fixed)]",
};

const TASTING_NOTE_LABEL_KEY: Record<TastingNote, string> = {
  balanced: "tastingNoteBalanced",
  too_sour: "tastingNoteTooSour",
  too_bitter: "tastingNoteTooBitter",
  too_fast: "tastingNoteTooFast",
  too_slow: "tastingNoteTooSlow",
  custom: "tastingNoteCustom",
};

/**
 * Radix Dialog content styled as a bottom sheet under the `sm` breakpoint
 * and as a compact centered dialog at `sm` and up — one primitive, no extra
 * dependency, matching the brief's "mobile: bottom sheet, desktop: compact
 * dialog" split without forking the shared `ui/dialog.tsx` used everywhere
 * else in the app (whose modal is always centered).
 */
function ResponsiveDialogContent({ className, children, ...props }: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 grid max-h-[85vh] w-full gap-4 overflow-y-auto rounded-t-2xl border-t border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] p-5 shadow-lg",
          "sm:inset-x-auto sm:start-1/2 sm:top-1/2 sm:bottom-auto sm:max-h-none sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-y-1/2 sm:rounded-[var(--radius-brand)] sm:border sm:p-6 ltr:sm:-translate-x-1/2 rtl:sm:translate-x-1/2",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export function AttemptsTimeline({ attempts }: { attempts: Attempt[] }) {
  return (
    <ol className="flex flex-col gap-0">
      {attempts.map((a, i) => (
        <AttemptItem key={a.id} attempt={a} isLast={i === attempts.length - 1} />
      ))}
    </ol>
  );
}

function AttemptItem({ attempt, isLast }: { attempt: Attempt; isLast: boolean }) {
  const t = useTranslations("espresso");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const tastingNote = isTastingNote(attempt.tasting_note) ? attempt.tasting_note : null;
  const ratio =
    attempt.dose_grams && attempt.water_grams ? calculateRatio(attempt.dose_grams, attempt.water_grams) : null;

  return (
    <li className="relative flex gap-3 pb-5">
      {!isLast ? <span className="absolute start-[7px] top-4 h-full w-px bg-[var(--color-border,#ece1d3)]" aria-hidden /> : null}
      <span className="relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[var(--color-teal)] bg-[var(--color-surface,#fff)]" />
      <div className="relative min-w-0 flex-1 rounded-xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] px-3 py-2 pe-9 text-sm">
        <p className="font-semibold text-[var(--color-dark-text)]">
          {attempt.dose_grams}g → {attempt.water_grams}g · {attempt.actual_time_seconds}s
        </p>
        <p className="text-xs text-[var(--color-muted-text)]">{ratio != null ? `1:${ratio}` : "—"}</p>
        {attempt.grind_setting ? (
          <p className="mt-1 text-xs text-[var(--color-muted-text)]">
            {t("grindSetting")}: <span className="text-[var(--color-dark-text)]">{attempt.grind_setting}</span>
          </p>
        ) : null}
        {tastingNote ? (
          <Badge className={cn("mt-1.5", TASTING_NOTE_STYLE[tastingNote])}>{t(TASTING_NOTE_LABEL_KEY[tastingNote])}</Badge>
        ) : null}
        {attempt.notes ? <p className="mt-1.5 text-xs italic text-[var(--color-muted-text)]">{attempt.notes}</p> : null}

        {/* Quiet three-dot action menu — deliberately small and low-contrast
            so the timeline stays editorial, not a table with visible row
            controls. */}
        <div className="absolute end-1.5 top-1.5">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={t("attemptActions")}
            className="rounded-full p-1 text-[var(--color-muted-text)] hover:bg-[var(--surface-hover)]"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </button>
          {menuOpen ? (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
              <div className="absolute end-0 top-7 z-20 w-36 overflow-hidden rounded-xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-start text-xs text-[var(--color-dark-text)] hover:bg-[var(--surface-hover)]"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  {t("editAttempt")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setDeleteOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-start text-xs text-[var(--color-error)] hover:bg-[var(--surface-hover)]"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  {t("deleteAttempt")}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <EditAttemptDialog attempt={attempt} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteAttemptDialog attemptId={attempt.id} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </li>
  );
}

function EditAttemptDialog({
  attempt,
  open,
  onOpenChange,
}: {
  attempt: Attempt;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("espresso");
  const router = useRouter();
  const [dose, setDose] = useState(attempt.dose_grams ?? 0);
  const [yieldG, setYieldG] = useState(attempt.water_grams ?? 0);
  const [time, setTime] = useState(attempt.actual_time_seconds ?? 0);
  const [grindSetting, setGrindSetting] = useState(attempt.grind_setting ?? "");
  const [notes, setNotes] = useState(attempt.notes ?? "");
  const [tastingNote, setTastingNote] = useState<TastingNote | null>(
    isTastingNote(attempt.tasting_note) ? attempt.tasting_note : null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const valid = isValidAttemptInput({ doseGrams: dose, waterGrams: yieldG, timeSeconds: time });
  const ratio = valid ? calculateRatio(dose, yieldG) : null;

  function resetToAttempt() {
    setDose(attempt.dose_grams ?? 0);
    setYieldG(attempt.water_grams ?? 0);
    setTime(attempt.actual_time_seconds ?? 0);
    setGrindSetting(attempt.grind_setting ?? "");
    setNotes(attempt.notes ?? "");
    setTastingNote(isTastingNote(attempt.tasting_note) ? attempt.tasting_note : null);
    setError(false);
  }

  async function handleSave() {
    if (!valid) {
      setError(true);
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Ownership double-check on top of RLS (matches the pattern already
      // used by RemoveSavedButton etc. elsewhere in the app) — updates
      // the existing row in place, never inserts a new one.
      const { error: updateError } = await supabase
        .from("brew_logs")
        .update({
          dose_grams: dose,
          water_grams: yieldG,
          actual_time_seconds: time,
          grind_setting: grindSetting.trim() || null,
          notes: notes.trim() || null,
          tasting_note: tastingNote,
        })
        .eq("id", attempt.id)
        .eq("user_id", user.id);

      if (updateError) {
        setError(true);
        return;
      }

      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetToAttempt();
        onOpenChange(next);
      }}
    >
      <ResponsiveDialogContent aria-describedby="edit-attempt-description">
        <DialogTitle>{t("editAttempt")}</DialogTitle>
        <DialogDescription id="edit-attempt-description">{t("editAttemptDescription")}</DialogDescription>
        <DialogClose className="absolute end-4 top-4 rounded-[calc(var(--radius-brand)-4px)] text-[var(--color-muted-text)] transition-colors hover:text-[var(--color-dark-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-teal)]">
          <X className="h-4 w-4" aria-hidden />
          <span className="sr-only">{t("cancel")}</span>
        </DialogClose>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="edit-dose" className="text-xs">
              {t("dose")} (g)
            </Label>
            <Input
              id="edit-dose"
              type="number"
              value={dose}
              onChange={(e) => setDose(Number(e.target.value))}
              className="tabular-nums"
            />
          </div>
          <div>
            <Label htmlFor="edit-yield" className="text-xs">
              {t("yield")} (g)
            </Label>
            <Input
              id="edit-yield"
              type="number"
              value={yieldG}
              onChange={(e) => setYieldG(Number(e.target.value))}
              className="tabular-nums"
            />
          </div>
          <div>
            <Label htmlFor="edit-time" className="text-xs">
              {t("time")} (s)
            </Label>
            <Input
              id="edit-time"
              type="number"
              value={time}
              onChange={(e) => setTime(Number(e.target.value))}
              className="tabular-nums"
            />
          </div>
        </div>

        <p className="text-xs text-[var(--color-muted-text)]">
          {t("ratio")}:{" "}
          <span className="font-semibold text-[var(--color-dark-text)]">{ratio != null ? `1:${ratio}` : "—"}</span>
        </p>

        <div>
          <Label htmlFor="edit-grind" className="text-xs">
            {t("grindSetting")}
          </Label>
          <Input
            id="edit-grind"
            value={grindSetting}
            onChange={(e) => setGrindSetting(e.target.value)}
            placeholder={t("grindSettingPlaceholder")}
          />
        </div>

        <div>
          <Label className="text-xs">{t("tastingNote")}</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TASTING_NOTES.map((note) => (
              <button
                key={note}
                type="button"
                onClick={() => setTastingNote(tastingNote === note ? null : note)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  tastingNote === note
                    ? "border-transparent bg-[var(--color-teal)] text-[var(--color-soft-white)]"
                    : "border-[var(--color-border,#ece1d3)] text-[var(--color-muted-text)] hover:bg-[var(--surface-hover)]",
                )}
              >
                {t(TASTING_NOTE_LABEL_KEY[note])}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="edit-notes" className="text-xs">
            {t("notes")}
          </Label>
          <textarea
            id="edit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={tastingNote === "custom" ? t("notesCustomPlaceholder") : t("notesPlaceholder")}
            rows={2}
            className="flex w-full rounded-[calc(var(--radius-brand)-4px)] border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] px-3 py-2 text-sm text-[var(--color-dark-text)] placeholder:text-[var(--color-muted-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-teal)]"
          />
        </div>

        {error ? <p className="text-xs font-medium text-[var(--color-error)]">{t("attemptSaveError")}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="button" variant="accent" onClick={handleSave} disabled={saving || !valid}>
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </Dialog>
  );
}

function DeleteAttemptDialog({
  attemptId,
  open,
  onOpenChange,
}: {
  attemptId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("espresso");
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Scoped to both id and the authenticated user's own id — RLS
      // ("users delete their own brew logs", migration 07) already blocks
      // cross-user deletes at the database level; this mirrors that same
      // check client-side so a mistaken id never even reaches the server
      // as an unscoped delete.
      const { error } = await supabase.from("brew_logs").delete().eq("id", attemptId).eq("user_id", user.id);
      if (error) return;

      onOpenChange(false);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent aria-describedby="delete-attempt-description">
        <DialogTitle>{t("deleteAttemptTitle")}</DialogTitle>
        <DialogDescription id="delete-attempt-description">{t("deleteAttemptConfirm")}</DialogDescription>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? t("deleting") : t("deleteAttempt")}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </Dialog>
  );
}
