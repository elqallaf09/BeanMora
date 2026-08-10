"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  FilterSheet,
  FilterSheetTriggerButton,
  FilterGroup,
  FilterChip,
} from "@/components/coffee/filter-sheet";
import { Button } from "@/components/ui/button";

export interface DiscoverFilterState {
  process?: string;
  roast?: string;
  method?: string;
  equipmentCategory?: string;
  sort?: string;
}

const PROCESS_OPTIONS = ["washed", "natural", "honey", "anaerobic", "wet_hulled"];
const ROAST_OPTIONS = ["light", "medium_light", "medium", "medium_dark", "dark"];
const METHOD_OPTIONS = ["v60", "espresso", "xbloom"];
const EQUIPMENT_CATEGORY_OPTIONS = [
  "grinder",
  "espresso_machine",
  "v60_dripper",
  "aeropress",
  "chemex",
  "scale",
  "kettle",
];
const EQUIPMENT_CATEGORY_KEY: Record<string, string> = {
  grinder: "myGear.categoryGrinder",
  espresso_machine: "myGear.categoryEspressoMachine",
  v60_dripper: "myGear.categoryV60Dripper",
  aeropress: "myGear.categoryAeropress",
  chemex: "myGear.categoryChemex",
  scale: "myGear.categoryScale",
  kettle: "myGear.categoryKettle",
};

export function DiscoverToolbar({
  category,
  initialQuery,
  initialFilters,
}: {
  category: string;
  initialQuery: string;
  initialFilters: DiscoverFilterState;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [staged, setStaged] = useState<DiscoverFilterState>(initialFilters);

  const activeCount = Object.values(initialFilters).filter(Boolean).length;

  function buildUrl(next: { q?: string; filters?: DiscoverFilterState }) {
    const params = new URLSearchParams();
    params.set("category", category);
    const nextQ = next.q ?? q;
    if (nextQ) params.set("q", nextQ);
    const filters = next.filters ?? initialFilters;
    if (filters.process) params.set("process", filters.process);
    if (filters.roast) params.set("roast", filters.roast);
    if (filters.method) params.set("method", filters.method);
    if (filters.equipmentCategory) params.set("equipmentCategory", filters.equipmentCategory);
    if (filters.sort) params.set("sort", filters.sort);
    return `/discover?${params.toString()}` as `/${string}`;
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildUrl({ q }));
  }

  function toggle(key: keyof DiscoverFilterState, value: string) {
    setStaged((prev) => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  }

  function applyFilters() {
    setOpen(false);
    router.push(buildUrl({ filters: staged }));
  }

  function resetFilters() {
    setStaged({});
    router.push(buildUrl({ filters: {} }));
    setOpen(false);
  }

  return (
    <div className="flex gap-2">
      <form onSubmit={handleSearchSubmit} role="search" className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)] ltr:left-4 rtl:right-4"
          aria-hidden
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("discover.searchPlaceholder")}
          aria-label={t("discover.searchPlaceholder")}
          className="h-12 w-full rounded-full border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] text-sm text-[var(--color-dark-text)] outline-none placeholder:text-[var(--color-muted-text)] ps-10 pe-9 focus-visible:border-[var(--color-teal)] focus-visible:ring-2 focus-visible:ring-[var(--color-teal)]/30"
        />
        {q ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              router.push(buildUrl({ q: "" }));
            }}
            aria-label={t("discover.clearSearch")}
            className="absolute top-1/2 -translate-y-1/2 text-[var(--color-muted-text)] ltr:right-3 rtl:left-3"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </form>

      <FilterSheet
        open={open}
        onOpenChange={setOpen}
        trigger={<FilterSheetTriggerButton label={t("discover.filters")} activeCount={activeCount} />}
        title={t("discover.filters")}
        footer={
            <>
              <Button type="button" variant="outline" className="flex-1" onClick={resetFilters}>
                {t("discover.resetFilters")}
              </Button>
              <Button type="button" className="flex-1" onClick={applyFilters}>
                {t("discover.applyFilters")}
              </Button>
            </>
          }
        >
          {category === "beans" ? (
            <FilterGroup label={t("discover.filterProcess")}>
              {PROCESS_OPTIONS.map((p) => (
                <FilterChip
                  key={p}
                  label={t(`catalog.process${p.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join("")}`)}
                  active={staged.process === p}
                  onClick={() => toggle("process", p)}
                />
              ))}
            </FilterGroup>
          ) : null}
          {category === "beans" ? (
            <FilterGroup label={t("discover.filterRoast")}>
              {ROAST_OPTIONS.map((r) => (
                <FilterChip
                  key={r}
                  label={t(`catalog.roast${r.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join("")}`)}
                  active={staged.roast === r}
                  onClick={() => toggle("roast", r)}
                />
              ))}
            </FilterGroup>
          ) : null}
          {category === "beans" || category === "recipes" ? (
            <FilterGroup label={t("discover.filterCompatibility")}>
              {METHOD_OPTIONS.map((m) => (
                <FilterChip
                  key={m}
                  label={t(`nav.${m}`)}
                  active={staged.method === m}
                  onClick={() => toggle("method", m)}
                />
              ))}
            </FilterGroup>
          ) : null}
          {category === "equipment" ? (
            <FilterGroup label={t("discover.filterEquipmentCategory")}>
              {EQUIPMENT_CATEGORY_OPTIONS.map((c) => (
                <FilterChip
                  key={c}
                  label={t(EQUIPMENT_CATEGORY_KEY[c])}
                  active={staged.equipmentCategory === c}
                  onClick={() => toggle("equipmentCategory", c)}
                />
              ))}
            </FilterGroup>
          ) : null}
          <FilterGroup label={t("discover.filterSort")}>
            <FilterChip
              label={t("discover.sortNewest")}
              active={!staged.sort || staged.sort === "newest"}
              onClick={() => toggle("sort", "newest")}
            />
            <FilterChip
              label={t("discover.sortName")}
              active={staged.sort === "name"}
              onClick={() => toggle("sort", "name")}
            />
          </FilterGroup>
      </FilterSheet>
    </div>
  );
}
