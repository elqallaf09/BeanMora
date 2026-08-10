"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Archive } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function ArchiveBagButton({ itemId }: { itemId: string }) {
  const t = useTranslations("myBeans");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleArchive() {
    setPending(true);
    try {
      const supabase = createClient();
      await supabase.from("user_bean_inventory").update({ archived_at: new Date().toISOString() }).eq("id", itemId);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleArchive} disabled={pending} className="gap-1 text-[var(--color-muted-text)]">
      <Archive className="h-3.5 w-3.5" aria-hidden />
      {t("archive")}
    </Button>
  );
}

export function LogBrewLink({ beanId }: { beanId: string }) {
  const t = useTranslations("myBeans");
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={`/v60/brew?bean=${beanId}`}>{t("logBrew")}</Link>
    </Button>
  );
}
