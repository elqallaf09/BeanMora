"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, LogOut, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const THEME_KEY = "beanmora-theme";
const MOTION_KEY = "beanmora-reduced-motion";

export function AppearanceToggle() {
  const t = useTranslations("settings");
  const [dim, setDim] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const isDim = stored === "dim";
    setDim(isDim);
    document.documentElement.classList.toggle("theme-dark", isDim);
  }, []);

  function apply(next: boolean) {
    setDim(next);
    localStorage.setItem(THEME_KEY, next ? "dim" : "light");
    document.documentElement.classList.toggle("theme-dark", next);
  }

  return (
    <div className="flex gap-2">
      {[
        { key: false, label: t("appearanceLight") },
        { key: true, label: t("appearanceDim") },
      ].map((opt) => (
        <button
          key={String(opt.key)}
          type="button"
          onClick={() => apply(opt.key)}
          aria-pressed={dim === opt.key}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${
            dim === opt.key
              ? "border-[var(--color-teal)] bg-[var(--color-teal)]/10 text-[var(--color-teal-dark)]"
              : "border-[var(--color-border,#ece1d3)] text-[var(--color-dark-text)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ReducedMotionToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(localStorage.getItem(MOTION_KEY) === "on");
  }, []);

  function apply(next: boolean) {
    setOn(next);
    localStorage.setItem(MOTION_KEY, next ? "on" : "off");
    document.documentElement.classList.toggle("force-reduced-motion", next);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => apply(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-[var(--color-teal)]" : "bg-[var(--color-border,#ece1d3)]"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ltr:left-0.5 rtl:right-0.5 ${
          on ? "ltr:translate-x-5 rtl:-translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function SignOutButton() {
  const t = useTranslations("settings");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button type="button" variant="outline" onClick={handleSignOut} disabled={pending} className="gap-2">
      <LogOut className="h-4 w-4" aria-hidden />
      {t("signOut")}
    </Button>
  );
}

export function DataExportButton() {
  const t = useTranslations("settings");
  const [pending, setPending] = useState(false);

  async function handleExport() {
    setPending(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: recipes }, { data: brewLogs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("recipes").select("*").eq("user_id", user.id),
        supabase.from("brew_logs").select("*").eq("user_id", user.id),
      ]);

      const payload = { profile, recipes, brewLogs, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "beanmora-data-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleExport} disabled={pending} className="gap-2">
      <Download className="h-4 w-4" aria-hidden />
      {t("dataExportAction")}
    </Button>
  );
}

export function DeleteAccountDialog() {
  const t = useTranslations("settings");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("delete_own_account");
      if (!error) {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button type="button" variant="destructive" onClick={() => setOpen(true)} className="gap-2">
        <Trash2 className="h-4 w-4" aria-hidden />
        {t("deleteAccount")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteAccount")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--color-muted-text)]">{t("deleteAccountHint")}</p>
          <div>
            <label htmlFor="confirm-delete" className="mb-1 block text-xs font-medium text-[var(--color-dark-text)]">
              {t("deleteAccountConfirm")}
            </label>
            <Input id="confirm-delete" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="destructive" disabled={confirmText !== "DELETE" || pending} onClick={handleDelete}>
              {t("deleteAccountAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
