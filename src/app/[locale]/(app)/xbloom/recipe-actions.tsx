"use client";

import { useState } from "react";
import { Copy, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export interface XBloomRecipeSettings {
  title: string;
  doseGrams?: number | null;
  waterGrams?: number | null;
  grindSetting?: string | null;
  waterTempC?: number | null;
}

/** Copy-settings and export-JSON are the two real, working actions available
 * without an official xBloom API — see src/lib/integrations/xbloom.ts. */
export function XBloomRecipeActions({ settings }: { settings: XBloomRecipeSettings }) {
  const t = useTranslations("xbloomHub");
  const [copied, setCopied] = useState(false);

  const summary = [
    settings.title,
    settings.doseGrams ? `${t("dose")}: ${settings.doseGrams}g` : null,
    settings.waterGrams ? `${t("water")}: ${settings.waterGrams}g` : null,
    settings.grindSetting ? `${t("grind")}: ${settings.grindSetting}` : null,
    settings.waterTempC ? `${t("temp")}: ${settings.waterTempC}°C` : null,
  ]
    .filter(Boolean)
    .join("\n");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard permission denied — no-op, button remains usable to retry.
    }
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${settings.title.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
        <Copy className="h-3.5 w-3.5" aria-hidden />
        {copied ? t("copied") : t("actionCopy")}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
        <Download className="h-3.5 w-3.5" aria-hidden />
        {t("actionExport")}
      </Button>
    </div>
  );
}
