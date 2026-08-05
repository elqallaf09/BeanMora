"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The upgrade prompt shown whenever a guest (anonymous) session hits a
 * restricted action (publishing a recipe, rating, commenting, following,
 * claiming a roaster, ...). Reusable — any restricted-action trigger
 * across the app should open this instead of performing the action.
 *
 * `returnTo` is passed through as the `next` query param on both auth
 * routes so the guest lands back on the page they were on after they sign
 * up or log in, per the product requirement to preserve the return
 * destination.
 */
export function GuestUpgradeDialog({
  open,
  onOpenChange,
  returnTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnTo?: string;
}) {
  const t = useTranslations("auth");

  const nextParam = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("guestUpgradeTitle")}</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} type="button">
            {t("guestUpgradeCancel")}
          </Button>
          <Button asChild variant="outline">
            <Link href={`/login${nextParam}`}>{t("guestUpgradeSignIn")}</Link>
          </Button>
          <Button asChild>
            <Link href={`/signup${nextParam}`}>{t("guestUpgradeCreateAccount")}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
