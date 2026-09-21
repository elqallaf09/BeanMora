"use client";

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import type { BrewOutcome } from '@/lib/brewing/outcome';
import { Pause, Play, RotateCcw, SkipForward, Vibrate, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrewProgress, PourTimeline, type BrewStepTiming } from '@/components/coffee/brew-progress';
import { BrewOutcomeForm } from '@/components/coffee/brew-outcome-form';

export interface GuidedRecipe {
  recipeId?: string;
  beanId?: string | null;
  title: string;
  doseGrams: number;
  waterGrams: number;
  steps: BrewStepTiming[];
  allowCommunity?: boolean;
}
function playBeep() {
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.onended = () => { void ctx.close().catch(() => {}); };
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } catch { /* Unsupported/blocked audio must not stop the brew. */ }
}
export function GuidedBrewClient({ recipe }: { recipe: GuidedRecipe }) {
  const t = useTranslations('v60');
  const outcomeT = useTranslations('brewOutcome');
  const router = useRouter();
  const [savedOutcome, setSavedOutcome] = useState<BrewOutcome | null>(null);
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const copyLock = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [hapticOn, setHapticOn] = useState(true);
  const lastStep = useRef(-1);
  const elapsedRef = useRef(0);
  const estimatedTotal = recipe.steps.at(-1)?.atSeconds ?? 165;

  useEffect(() => {
    if (feedback || paused) return;
    // Reconcile against elapsed real time when background tabs throttle ticks.
    const start = performance.now(); const base = elapsedRef.current;
    const id = setInterval(() => { const n = base + Math.floor((performance.now() - start) / 1000); elapsedRef.current = n; setElapsed(n); }, 250);
    return () => clearInterval(id);
  }, [feedback, paused, skipped]);
  useEffect(() => {
    if (feedback) return;
    let cancelled = false;
    let lock: { release(): Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } };
    nav.wakeLock?.request('screen').then(value => { if (cancelled) void value.release().catch(() => {}); else lock = value; }).catch(() => {});
    return () => { cancelled = true; void lock?.release().catch(() => {}); };
  }, [feedback]);
  useEffect(() => {
    if (feedback) return;
    const index = recipe.steps.findLastIndex(s => elapsed >= s.atSeconds);
    if (index !== lastStep.current && index >= 0) {
      lastStep.current = index;
      if (soundOn) playBeep();
      if (hapticOn && 'vibrate' in navigator) navigator.vibrate(150);
    }
  }, [elapsed, recipe.steps, feedback, soundOn, hapticOn]);
  const index = Math.max(0, recipe.steps.findLastIndex(s => elapsed >= s.atSeconds));
  const step = recipe.steps[index]; const next = recipe.steps[index + 1];
  function skip() {
    setSkipped(true);
    if (next) { elapsedRef.current = next.atSeconds; setElapsed(next.atSeconds); setPaused(true); }
    else setFeedback(true);
  }
  function restart() { elapsedRef.current = 0; setElapsed(0); lastStep.current = -1; setSkipped(false); setPaused(true); }
  async function saveAsRecipe() {
    if (!savedOutcome || copyLock.current) return;
    copyLock.current = true; setCopying(true); setCopyError(false);
    try {
      const client = createClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user || user.is_anonymous) throw new Error('auth');
      const { data, error } = await client.from('recipes').insert({ user_id: user.id, bean_id: savedOutcome.bean_id, title: recipe.title, brew_method: 'v60', dose_grams: savedOutcome.dose_grams, water_grams: savedOutcome.water_grams, total_time_seconds: savedOutcome.actual_time_seconds, visibility: 'private' }).select('id').single();
      if (error || !data) throw new Error('save');
      router.push(`/recipes/${data.id}`);
    } catch { setCopyError(true); }
    finally { copyLock.current = false; setCopying(false); }
  }
  if (feedback) return <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
    <h1 className="text-xl font-bold">{recipe.title}</h1>
    {skipped ? <p className="text-sm text-[var(--color-muted-text)]">{outcomeT('skippedTime')}</p> : null}
    <BrewOutcomeForm recipeId={recipe.recipeId} beanId={recipe.beanId} method="v60" doseGrams={recipe.doseGrams} waterGrams={recipe.waterGrams} actualSeconds={!skipped && elapsed > 0 ? elapsed : null} allowCommunity={recipe.allowCommunity} onSaved={setSavedOutcome} />
    {savedOutcome ? <Button type="button" onClick={saveAsRecipe} disabled={copying}>{t('saveAsRecipe')}</Button> : null}
    {copyError ? <p role="alert">{outcomeT('errors.retry')}</p> : null}
  </div>;
  return <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-8">
    <div className="text-center"><p className="text-xs font-semibold text-[var(--color-muted-text)]">{t('step')} {index + 1} {t('of')} {recipe.steps.length}</p><h1 className="text-lg font-extrabold">{step?.label}</h1></div>
    <BrewProgress elapsedSeconds={elapsed} totalSeconds={estimatedTotal} isBloom={!!step?.isBloom} currentLabel={step?.label ?? ''} nextLabel={next?.label} currentTargetGrams={step?.targetWaterGrams} totalWaterGrams={recipe.waterGrams} isPaused={paused} />
    <PourTimeline steps={recipe.steps} elapsedSeconds={elapsed} className="w-full" />
    <div className="flex items-center gap-3">
      <Button type="button" variant="outline" size="icon" onClick={restart} aria-label={t('controlsRestart')}><RotateCcw className="h-4 w-4" aria-hidden /></Button>
      <Button type="button" size="lg" variant="accent" className="h-14 w-14 rounded-full p-0" onClick={() => setPaused(v => !v)} aria-label={paused ? t('controlsResume') : t('controlsPause')}>{paused ? <Play aria-hidden /> : <Pause aria-hidden />}</Button>
      <Button type="button" variant="outline" size="icon" onClick={skip} aria-label={t('controlsSkip')}><SkipForward className="h-4 w-4" aria-hidden /></Button>
    </div>
    <div className="flex items-center gap-4 text-xs">
      <button type="button" onClick={() => setSoundOn(v => !v)} aria-pressed={soundOn} className="flex min-h-11 items-center gap-2">{soundOn ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}{t('controlsSound')}</button>
      <button type="button" onClick={() => setHapticOn(v => !v)} aria-pressed={hapticOn} className="flex min-h-11 items-center gap-2"><Vibrate className="h-4 w-4" aria-hidden />{t('controlsHaptic')}</button>
    </div>
    <button type="button" onClick={() => setFeedback(true)} className="min-h-11 text-sm underline">{t('feedbackTitle')}</button>
    <p className="text-center text-[11px] text-[var(--color-muted-text)]">{t('keepAwakeOn')}</p>
  </div>;
}
