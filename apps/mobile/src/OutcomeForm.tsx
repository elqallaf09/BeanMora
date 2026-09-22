import { useContext, useRef, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { parseOutcome, saveOutcome, OUTCOMES, type BrewOutcome, type Outcome } from './core/outcome';
import type { RecipeItem } from './data';
import { supabase } from './client';
import { errors, outcomes } from './copy';
import { numberInput } from './guards';
import { Action, Field, Language, Txt, styles, useCopy } from './ui';
export function OutcomeForm({ recipe, userId, done }: { recipe: RecipeItem; userId: string; done: () => void }) {
  const locale = useContext(Language); const t = useCopy();
  const [dose, setDose] = useState(recipe.dose === null ? '' : String(recipe.dose));
  const [water, setWater] = useState(recipe.water === null ? '' : String(recipe.water));
  const [seconds, setSeconds] = useState(''); const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [brewed, setBrewed] = useState(false); const [modified, setModified] = useState(false); const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false); const [error, setError] = useState('');
  const inFlight = useRef(false); const pending = useRef<{ id: string; payload: BrewOutcome } | null>(null);
  const locked = busy || pending.current !== null;
  async function submit() {
    if (inFlight.current || !supabase || saved) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || user.is_anonymous || user.id !== userId) { setError(errors[locale].auth); return; }
      if (!pending.current) {
        const payload = parseOutcome({ recipe_id: recipe.id, bean_id: recipe.beanId, brew_method: recipe.method,
          dose_grams: numberInput(dose), water_grams: numberInput(water),
          actual_time_seconds: seconds.trim() ? numberInput(seconds) ?? -1 : null,
          outcome, status: modified ? 'brewed_with_modifications' : 'brewed_as_written',
          share_with_community: share, next_grind_adjustment: null, taste_scores: {}, brewed });
        if (!payload) { setError(errors[locale].invalid); return; }
        pending.current = { id: randomUUID(), payload };
      }
      const response = await saveOutcome(supabase, pending.current.id, pending.current.payload);
      if (!response.ok) { setError(errors[locale][response.error]); return; }
      setSaved(true);
    } catch { setError(errors[locale].retry); }
    finally { inFlight.current = false; setBusy(false); }
  }
  if (saved) return <View style={styles.content}><Txt heading style={styles.title}>{t.saved}</Txt><Action title={t.next} onPress={done} selected /></View>;
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Txt heading style={styles.subtitle}>{t.record}</Txt><Txt>{recipe.title}</Txt><Txt style={styles.muted}>{t.amountNote}</Txt>
    <Field label={t.dose} value={dose} onChangeText={setDose} keyboardType="decimal-pad" editable={!locked} />
    <Field label={t.water} value={water} onChangeText={setWater} keyboardType="decimal-pad" editable={!locked} />
    <Field label={t.seconds} value={seconds} onChangeText={setSeconds} keyboardType="number-pad" editable={!locked} />
    <Txt>{t.outcome}</Txt><View style={styles.row}>{OUTCOMES.map(o => <Action key={o} title={outcomes[locale][o]} onPress={() => setOutcome(o)} selected={outcome === o} disabled={locked} />)}</View>
    <Txt>{t.modified}</Txt><Switch accessibilityLabel={t.modified} value={modified} onValueChange={setModified} disabled={locked} />
    <Txt>{t.brewed}</Txt><Switch accessibilityLabel={t.brewed} value={brewed} onValueChange={setBrewed} disabled={locked} />
    <Txt>{t.share}</Txt><Switch accessibilityLabel={t.share} value={share} onValueChange={setShare} disabled={locked} /><Txt style={styles.muted}>{t.shareNote}</Txt>
    {error ? <Txt style={styles.error}>{error}</Txt> : null}
    {pending.current ? <Txt style={styles.warning}>{t.frozen}</Txt> : null}
    <Action title={busy ? t.saving : pending.current ? t.retry : t.save} onPress={() => void submit()} disabled={busy} selected />
  </ScrollView>;
}
