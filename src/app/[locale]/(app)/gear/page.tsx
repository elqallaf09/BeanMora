import { getTranslations } from "next-intl/server";
import { Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EquipmentCard } from "@/components/coffee/cards";
import { RichEmptyState, ErrorCard } from "@/components/coffee/empty-states";
import { AddEquipmentDialog } from "./add-equipment-dialog";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

function categoryKey(c: string) {
  return `myGear.category${c.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join("")}`;
}

export default async function MyGearPage() {
  const t = await getTranslations();
  const supabase = await createClient();

  const { data: equipmentRaw, error } = await supabase
    .from("user_equipment")
    .select("id, category, custom_name, is_default, equipment_model:equipment_models(name, image_url, brand:equipment_brands(name))")
    .order("created_at", { ascending: false });

  const equipment = ((equipmentRaw ?? []) as AnyRow[]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:py-8">
      <div className="mb-5 flex items-center justify-between">
        <div><p className="type-eyebrow text-[var(--color-copper)]">{t("brand.name")}</p><h1 className="type-headline mt-2.5 text-[var(--color-espresso)]">{t("myGear.title")}</h1></div>
        <AddEquipmentDialog />
      </div>

      {error ? (
        <ErrorCard message={t("errors.supabase")} />
      ) : equipment.length === 0 ? (
        <RichEmptyState icon={Wrench} title={t("myGear.emptyTitle")} description={t("myGear.emptyHint")} />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {equipment.map((eq) => (
            <EquipmentCard
              key={eq.id}
              id={eq.id}
              name={eq.equipment_model?.name ?? eq.custom_name ?? "—"}
              brand={eq.equipment_model?.brand?.name}
              categoryLabel={t(categoryKey(eq.category))}
              imageUrl={eq.equipment_model?.image_url}
              isDefault={eq.is_default}
              defaultLabel={t("myGear.default")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
