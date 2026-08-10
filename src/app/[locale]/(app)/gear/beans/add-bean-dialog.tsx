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

export function AddBeanDialog() {
  const t = useTranslations("myBeans");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<AnyRow[]>([]);
  const [selected, setSelected] = useState<AnyRow | null>(null);
  const [roastDate, setRoastDate] = useState("");
  const [weight, setWeight] = useState(250);
  const [notes, setNotes] = useState("");
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
      .from("beans")
      .select("id, slug, name_ar, name_en")
      .or(`name_en.ilike.%${value}%,name_ar.ilike.%${value}%`)
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

      let beanId = selected?.id;
      if (!beanId) {
        const name = query.trim();
        if (!name) return;
        const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
        const { data: newBean } = await supabase
          .from("beans")
          .insert({ slug, name_ar: name, name_en: name, created_by: user.id, is_published: false })
          .select("id")
          .single();
        beanId = newBean?.id;
      }
      if (!beanId) return;

      await supabase.from("user_bean_inventory").insert({
        user_id: user.id,
        legacy_bean_id: beanId,
        roast_date: roastDate || null,
        original_weight_grams: weight,
        remaining_weight_grams: weight,
        notes: notes || null,
      });

      setOpen(false);
      setQuery("");
      setMatches([]);
      setSelected(null);
      setNotes("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button type="button" variant="accent" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" aria-hidden />
        {t("addBean")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addBeanTitle")}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div>
              <Label htmlFor="bean-search">{t("searchExisting")}</Label>
              <Input
                id="bean-search"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
              />
              {matches.length > 0 ? (
                <ul className="mt-1 flex flex-col overflow-hidden rounded-lg border border-[var(--color-border,#ece1d3)]">
                  {matches.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(m);
                          setQuery(m.name_en || m.name_ar);
                          setMatches([]);
                        }}
                        className="w-full px-3 py-2 text-start text-sm hover:bg-[var(--color-cream)]"
                      >
                        {m.name_en || m.name_ar}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-1 text-[11px] text-[var(--color-muted-text)]">{t("noBarcodeYet")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="roast-date">{t("roastDate")}</Label>
                <Input id="roast-date" type="date" value={roastDate} onChange={(e) => setRoastDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="weight">{t("originalWeight")}</Label>
                <Input id="weight" type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">{t("notes")}</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" onClick={handleSave} disabled={saving || !query.trim()} variant="accent">
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
