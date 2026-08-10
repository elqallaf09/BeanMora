"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { brewMethodLabelKey, difficultyLabel } from "@/lib/catalog-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorCard } from "@/components/coffee/empty-states";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

const BREW_METHODS = ["v60", "espresso", "xbloom", "aeropress", "chemex", "french_press", "cold_brew", "moka_pot"];
const DIFFICULTIES = ["beginner", "intermediate", "advanced"];

const selectClass =
  "flex h-10 w-full rounded-[calc(var(--radius-brand)-4px)] border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] px-3 py-2 text-sm text-[var(--color-dark-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-teal)]";
const textareaClass =
  "flex w-full rounded-[calc(var(--radius-brand)-4px)] border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] px-3 py-2 text-sm text-[var(--color-dark-text)] placeholder:text-[var(--color-muted-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-teal)]";

interface StepDraft {
  title: string;
  description: string;
  durationSeconds: string;
}

export function RecipeBuilderForm({ isGuest, locale }: { isGuest: boolean; locale: string }) {
  const t = useTranslations();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [brewMethod, setBrewMethod] = useState("v60");
  const [beanQuery, setBeanQuery] = useState("");
  const [beanMatches, setBeanMatches] = useState<AnyRow[]>([]);
  const [selectedBean, setSelectedBean] = useState<AnyRow | null>(null);
  const [dose, setDose] = useState("");
  const [water, setWater] = useState("");
  const [temp, setTemp] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [grinderSetting, setGrinderSetting] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [flavorNotes, setFlavorNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState<"draft" | "private" | "public">("draft");
  const [steps, setSteps] = useState<StepDraft[]>([{ title: "", description: "", durationSeconds: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBeanSearch(value: string) {
    setBeanQuery(value);
    setSelectedBean(null);
    if (value.trim().length < 2) {
      setBeanMatches([]);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("beans")
      .select("id, name_ar, name_en")
      .or(`name_en.ilike.%${value}%,name_ar.ilike.%${value}%`)
      .limit(6);
    setBeanMatches(data ?? []);
  }

  function updateStep(index: number, patch: Partial<StepDraft>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, { title: "", description: "", durationSeconds: "" }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError(t("recipeCreate.requiredTitle"));
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const totalSeconds = (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
      const flavors = flavorNotes
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      const { data: recipe, error: insertError } = await supabase
        .from("recipes")
        .insert({
          user_id: user.id,
          bean_id: selectedBean?.id ?? null,
          title: title.trim(),
          brew_method: brewMethod,
          dose_grams: dose ? Number(dose) : null,
          water_grams: water ? Number(water) : null,
          water_temp_c: temp ? Number(temp) : null,
          grinder_setting: grinderSetting.trim() || null,
          total_time_seconds: totalSeconds > 0 ? totalSeconds : null,
          difficulty,
          visibility,
          flavor_notes: flavors,
          notes: notes.trim() || null,
          content_language: locale === "en" ? "en" : "ar",
        })
        .select("id")
        .single();

      if (insertError || !recipe) {
        setError(t("recipeCreate.errorGeneric"));
        return;
      }

      const validSteps = steps.filter((s) => s.title.trim());
      if (validSteps.length > 0) {
        await supabase.from("recipe_steps").insert(
          validSteps.map((s, i) => ({
            recipe_id: recipe.id,
            step_number: i + 1,
            title: s.title.trim(),
            description: s.description.trim() || null,
            duration_seconds: s.durationSeconds ? Number(s.durationSeconds) : null,
          })),
        );
      }

      router.push(`/recipes/${recipe.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error ? <ErrorCard message={error} /> : null}

      <div>
        <Label htmlFor="recipe-title">{t("recipeCreate.titleLabel")}</Label>
        <Input
          id="recipe-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("recipeCreate.titlePlaceholder")}
          required
        />
      </div>

      <div>
        <Label htmlFor="brew-method">{t("recipeCreate.brewMethodLabel")}</Label>
        <select id="brew-method" className={selectClass} value={brewMethod} onChange={(e) => setBrewMethod(e.target.value)}>
          {BREW_METHODS.map((m) => (
            <option key={m} value={m}>
              {t(brewMethodLabelKey(m))}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="bean-search">{t("recipeCreate.beanLabel")}</Label>
        {selectedBean ? (
          <div className="flex items-center justify-between rounded-xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-cream)] px-3 py-2 text-sm">
            <span>{selectedBean.name_en || selectedBean.name_ar}</span>
            <button
              type="button"
              onClick={() => {
                setSelectedBean(null);
                setBeanQuery("");
              }}
              className="text-xs font-semibold text-[var(--color-teal-dark)]"
            >
              {t("recipeCreate.beanClear")}
            </button>
          </div>
        ) : (
          <>
            <Input
              id="bean-search"
              value={beanQuery}
              onChange={(e) => handleBeanSearch(e.target.value)}
              placeholder={t("recipeCreate.beanSearchPlaceholder")}
            />
            {beanMatches.length > 0 ? (
              <ul className="mt-1 flex flex-col overflow-hidden rounded-lg border border-[var(--color-border,#ece1d3)]">
                {beanMatches.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBean(b);
                        setBeanMatches([]);
                      }}
                      className="w-full px-3 py-2 text-start text-sm hover:bg-[var(--color-cream)]"
                    >
                      {b.name_en || b.name_ar}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="dose">{t("recipeCreate.doseLabel")}</Label>
          <Input id="dose" type="number" inputMode="decimal" value={dose} onChange={(e) => setDose(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="water">{t("recipeCreate.waterLabel")}</Label>
          <Input id="water" type="number" inputMode="decimal" value={water} onChange={(e) => setWater(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="temp">{t("recipeCreate.tempLabel")}</Label>
          <Input id="temp" type="number" inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="minutes">{t("recipeCreate.timeMinutesLabel")}</Label>
          <Input id="minutes" type="number" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="seconds">{t("recipeCreate.timeSecondsLabel")}</Label>
          <Input id="seconds" type="number" inputMode="numeric" value={seconds} onChange={(e) => setSeconds(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="difficulty">{t("recipeCreate.difficultyLabel")}</Label>
          <select id="difficulty" className={selectClass} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {difficultyLabel(t, d)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="grinder">{t("recipeCreate.grinderLabel")}</Label>
        <Input
          id="grinder"
          value={grinderSetting}
          onChange={(e) => setGrinderSetting(e.target.value)}
          placeholder={t("recipeCreate.grinderPlaceholder")}
        />
      </div>

      <div>
        <Label htmlFor="flavor-notes">{t("recipeCreate.flavorNotesLabel")}</Label>
        <Input
          id="flavor-notes"
          value={flavorNotes}
          onChange={(e) => setFlavorNotes(e.target.value)}
          placeholder={t("recipeCreate.flavorNotesPlaceholder")}
        />
      </div>

      <div>
        <Label htmlFor="notes">{t("recipeCreate.notesLabel")}</Label>
        <textarea
          id="notes"
          rows={3}
          className={textareaClass}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("recipeCreate.notesPlaceholder")}
        />
      </div>

      <div>
        <Label htmlFor="visibility">{t("recipeCreate.visibilityLabel")}</Label>
        <select
          id="visibility"
          className={selectClass}
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as typeof visibility)}
        >
          <option value="draft">{t("recipeCreate.visibilityDraft")}</option>
          <option value="private">{t("recipeCreate.visibilityPrivate")}</option>
          {!isGuest ? <option value="public">{t("recipeCreate.visibilityPublic")}</option> : null}
        </select>
        {isGuest ? <p className="mt-1 text-xs text-[var(--color-warning)]">{t("recipeCreate.guestVisibilityHint")}</p> : null}
      </div>

      <div>
        <Label>{t("recipeCreate.stepsLabel")}</Label>
        <div className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-[var(--color-border,#ece1d3)] p-3 sm:flex-row sm:items-start">
              <div className="flex-1 space-y-2">
                <Input
                  value={step.title}
                  onChange={(e) => updateStep(i, { title: e.target.value })}
                  placeholder={t("recipeCreate.stepTitlePlaceholder")}
                />
                <Input
                  value={step.description}
                  onChange={(e) => updateStep(i, { description: e.target.value })}
                  placeholder={t("recipeCreate.stepDescPlaceholder")}
                />
              </div>
              <Input
                type="number"
                inputMode="numeric"
                className="sm:w-28"
                value={step.durationSeconds}
                onChange={(e) => updateStep(i, { durationSeconds: e.target.value })}
                placeholder={t("recipeCreate.stepDurationPlaceholder")}
              />
              {steps.length > 1 ? (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeStep(i)} aria-label={t("recipeCreate.removeStep")}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addStep} className="mt-2">
          <Plus className="h-4 w-4" aria-hidden />
          {t("recipeCreate.addStep")}
        </Button>
      </div>

      <Button type="submit" variant="accent" size="lg" disabled={submitting}>
        {submitting ? t("recipeCreate.submitting") : t("recipeCreate.submit")}
      </Button>
    </form>
  );
}
