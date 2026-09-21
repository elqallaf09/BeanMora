"use client";

import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { OUTCOMES, STATUSES, TASTES, saveOutcome, parseOutcome, type BrewOutcome, type Method, type SaveError } from "@/lib/brewing/outcome";

export interface BrewOutcomeFormProps {
  recipeId?: string | null;
  beanId?: string | null;
  method: Method;
  doseGrams?: number | null;
  waterGrams?: number | null;
  actualSeconds?: number | null;
  allowCommunity?: boolean;
  onSaved?: (payload: BrewOutcome) => void;
}

export function BrewOutcomeForm({ recipeId = null, beanId = null, method, doseGrams, waterGrams, actualSeconds, allowCommunity = false, onSaved }: BrewOutcomeFormProps) {
  const t = useTranslations('brewOutcome');
  const router = useRouter();
  const locked = useRef(false);
  // Freeze both key and payload after the first send: a network timeout must retry
  // the same operation, not save another cup or silently change the first one.
  const submission = useRef<{ id: string; payload: BrewOutcome } | null>(null);
  const [busy, setBusy] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<SaveError | null>(null);
  const inputClass = 'mt-1 block min-h-11 w-full rounded-xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface)] px-3 py-2 text-sm';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || saved) return;
    const formData = submission.current ? null : new FormData(event.currentTarget);
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      const client = createClient();
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user || user.is_anonymous) { setError('auth'); return; }
      if (!submission.current) {
        const data = formData!;
        const tasteScores: BrewOutcome['taste_scores'] = {};
        for (const key of TASTES) {
          const value = data.get(key);
          if (typeof value === 'string' && value !== '') tasteScores[key] = Number(value);
        }
        const seconds = String(data.get('seconds') ?? '').trim();
        const payload = {
          recipe_id: recipeId, bean_id: beanId, brew_method: method,
          dose_grams: Number(data.get('dose')), water_grams: Number(data.get('water')),
          actual_time_seconds: seconds === '' ? null : Number(seconds),
          outcome: data.get('outcome'), status: data.get('status'),
          brewed: data.get('brewed') === 'on',
          share_with_community: allowCommunity && data.get('share') === 'on',
          next_grind_adjustment: data.get('grind') || null, taste_scores: tasteScores,
        };
        // Validation is repeated in the database; a browser check isn't authorization.
        const validated = parseOutcome(payload);
        if (!validated) { setError('invalid'); return; }
        submission.current = { id: crypto.randomUUID(), payload: validated };
        setFrozen(true);
      }
      const current = submission.current;
      const result = await saveOutcome({ rpc: (name, args) => client.rpc(name, args).abortSignal(AbortSignal.timeout(15000)) }, current.id, current.payload);
      if (!result.ok) { setError(result.error); return; }
      setSaved(true);
      onSaved?.(current.payload);
      router.refresh();
    } catch { setError('retry'); }
    finally { locked.current = false; setBusy(false); }
  }

  if (saved) return (
    <section className="rounded-3xl border border-[var(--color-teal)]/30 bg-[var(--color-teal)]/5 p-6" role="status">
      <h2 className="text-xl font-bold">{t('saved')}</h2>
      <p className="mt-2 text-sm">{t(submission.current?.payload.share_with_community ? 'savedShared' : 'savedPrivate')}</p>
      {!recipeId ? <p className="mt-2 text-sm">{t('unlinked')}</p> : null}
      <Button asChild className="mt-4"><Link href="/recommendations">{t('seeRecommendations')}</Link></Button>
    </section>
  );

  return (
    <form onSubmit={submit} className="rounded-3xl border bg-[var(--color-surface)] p-5 sm:p-6" aria-busy={busy}>
      <h2 className="text-xl font-bold text-[var(--color-espresso)]">{t('title')}</h2>
      <p className="mt-2 text-sm text-[var(--color-muted-text)]">{t('intro')}</p>
      <fieldset disabled={busy || frozen} className="mt-5 space-y-4">
        <legend className="sr-only">{t('title')}</legend>
        <label className="block text-sm font-medium">{t('outcome')}<select name="outcome" required defaultValue="" className={inputClass}><option value="">{t('choose')}</option>{OUTCOMES.map(v => <option key={v} value={v}>{t(`outcomes.${v}`)}</option>)}</select></label>
        <label className="block text-sm font-medium">{t('status')}<select name="status" required defaultValue="" className={inputClass}><option value="">{t('choose')}</option>{STATUSES.map(v => <option key={v} value={v}>{t(`statuses.${v}`)}</option>)}</select></label>
        <p className="text-xs text-[var(--color-muted-text)]">{t('actualHint')}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">{t('dose')}<input name="dose" type="number" inputMode="decimal" min="0.01" max="9999.99" step="0.01" required defaultValue={doseGrams && Number.isFinite(doseGrams) ? doseGrams : ''} className={inputClass} /></label>
          <label className="text-sm">{t(method === 'espresso' ? 'yield' : 'water')}<input name="water" type="number" inputMode="decimal" min="0.01" max="99999.99" step="0.01" required defaultValue={waterGrams && Number.isFinite(waterGrams) ? waterGrams : ''} className={inputClass} /></label>
          <label className="text-sm">{t('seconds')}<input name="seconds" type="number" inputMode="numeric" min="1" max="604800" step="1" defaultValue={actualSeconds && Number.isFinite(actualSeconds) ? Math.floor(actualSeconds) : ''} className={inputClass} /></label>
        </div>
        <details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-semibold">{t('tasteOptional')}</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{TASTES.map(key => <label key={key} className="text-sm">{t(`tastes.${key}`)}<select name={key} defaultValue="" className={inputClass}><option value="">{t('notRated')}</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select></label>)}</div></details>
        <label className="block text-sm">{t('grind')}<select name="grind" defaultValue="" className={inputClass}><option value="">{t('notRated')}</option>{['finer','same','coarser'].map(v => <option key={v} value={v}>{t(`grindOptions.${v}`)}</option>)}</select></label>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="brewed" required className="mt-1 h-4 w-4" /><span>{t('confirmBrewed')}</span></label>
        {allowCommunity && recipeId ? <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="share" className="mt-1 h-4 w-4" /><span>{t('share')}<span className="mt-1 block text-xs text-[var(--color-muted-text)]">{t('shareHint')}</span></span></label> : null}
        <p className="text-xs text-[var(--color-muted-text)]">{t('privacy')}</p>
      </fieldset>
      {error ? <p className="mt-4 text-sm text-[var(--color-warning)]" role="alert">{t(`errors.${error}`)}</p> : null}
      {error === 'auth' ? <Link href={`/login?next=${encodeURIComponent(recipeId ? `/recipes/${recipeId}/record` : '/v60')}`} className="mt-2 inline-block text-sm underline">{t('signIn')}</Link> : null}
      {frozen && !busy ? <p className="mt-3 text-xs text-[var(--color-muted-text)]">{t('retryHint')}</p> : null}
      <Button type="submit" disabled={busy} size="lg" className="mt-5 w-full">{t(busy ? 'saving' : frozen ? 'retry' : 'save')}</Button>
    </form>
  );
}
