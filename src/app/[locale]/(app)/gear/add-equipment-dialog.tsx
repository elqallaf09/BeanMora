"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

// Must exactly match the equipment_models/user_equipment `category` check
// constraint from migration 03 — inserting anything outside this list
// fails at the database, not just the UI.
const CATEGORIES = [
  "grinder",
  "espresso_machine",
  "xbloom",
  "v60_dripper",
  "aeropress",
  "chemex",
  "scale",
  "kettle",
  "filter",
  "portafilter_basket",
  "distribution_tool",
  "other",
] as const;

function categoryKey(c: string) {
  return `category${c.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join("")}`;
}

export function AddEquipmentDialog() {
  const t = useTranslations("myGear");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("grinder");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<AnyRow[]>([]);
  const [selected, setSelected] = useState<AnyRow | null>(null);
  const [makeDefault, setMakeDefault] = useState(true);
  const [saving, setSaving] = useState(false);

  async function handleSearch(value: string) {
    setQuery(value);
    setSelected(null);
    if (value.trim().length < 2) {
      setMatches([]);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("equipment_models")
      .select("id, name, brand:equipment_brands(name)")
      .eq("category", category)
      .ilike("name", `%${value}%`)
      .limit(6);
    setMatches(data ?? []);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("user_equipment").insert({
        user_id: user.id,
        category,
        equipment_model_id: selected?.id ?? null,
        custom_name: selected ? null : query.trim() || null,
        is_default: makeDefault,
      });

      setOpen(false);
      setQuery("");
      setMatches([]);
      setSelected(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button type="button" variant="accent" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" aria-hidden />
        {t("addEquipment")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addEquipmentTitle")}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div>
              <Label htmlFor="eq-category">{t("category")}</Label>
              <select
                id="eq-category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as (typeof CATEGORIES)[number]);
                  setMatches([]);
                  setSelected(null);
                }}
                className="h-10 w-full rounded-[calc(var(--radius-brand)-4px)] border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(categoryKey(c))}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="eq-search">{t("brandModel")}</Label>
              <Input id="eq-search" value={query} onChange={(e) => handleSearch(e.target.value)} placeholder={t("customName")} />
              {matches.length > 0 ? (
                <ul className="mt-1 flex flex-col overflow-hidden rounded-lg border border-[var(--color-border,#ece1d3)]">
                  {matches.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(m);
                          setQuery(`${m.brand?.name ? `${m.brand.name} ` : ""}${m.name}`);
                          setMatches([]);
                        }}
                        className="w-full px-3 py-2 text-start text-sm hover:bg-[var(--color-cream)]"
                      >
                        {m.brand?.name ? `${m.brand.name} ` : ""}
                        {m.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <label className="flex items-center gap-2 text-sm text-[var(--color-dark-text)]">
              <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} className="accent-[var(--color-teal)]" />
              {t("makeDefault")}
            </label>
          </div>

          <DialogFooter>
            <Button type="button" onClick={handleSave} disabled={saving || !query.trim()} variant="accent">
              {t("addEquipment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
