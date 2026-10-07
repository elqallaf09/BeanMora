"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RemoveOwnedButton } from "@/components/coffee/remove-owned-button";
import { Button } from "@/components/ui/button";

export function ArchiveBagButton({ itemId }: { itemId: string }) {
 return <RemoveOwnedButton id={itemId} table="user_bean_inventory"/>;
}

export function LogBrewLink({ beanId }: { beanId: string }) {
  const t = useTranslations("myBeans");
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={`/v60/brew?bean=${beanId}`}>{t("logBrew")}</Link>
    </Button>
  );
}
