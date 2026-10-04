import { useContext, useEffect, useState } from 'react';
import { AppState, Share, View } from 'react-native';
import type { RecipeItem } from './data';
import { numberInput } from './guards';
import { doseLabel, elapsedMs, emptyClock, formatTime, scaleChemex, scaledPours, timeLabel, updateClock, waterLabel } from './manualBrew';
import { Action, Field, Icon, Language, Txt, colors, styles } from './ui';

export function GuidedBrew({ recipe, record }: { recipe: RecipeItem; record: (seconds?: number) => void }) {
  const ar = useContext(Language) === 'ar';
  const [clock, setClock] = useState(emptyClock);
  const [now, setNow] = useState(Date.now);
  const [dose, setDose] = useState(String(recipe.dose ?? ''));
  const [shareError, setShareError] = useState(false);
  const manual = recipe.sourceBrew.manual;
  useEffect(() => {
    if (clock.mode !== 'running') return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 500);
    const appState = AppState.addEventListener('change', state => { if (state === 'active') tick(); });
    return () => { clearInterval(timer); appState.remove(); };
  }, [clock.mode]);
  const scalable = recipe.method === 'chemex' && manual?.scalable && !!recipe.dose && !!recipe.water && recipe.waterUnit === 'g';
  const factor = scalable ? scaleChemex(recipe, numberInput(dose)) : 1;
  const invalid = scalable && factor === null;
  const changed = factor !== null && factor !== 1;
  const seconds = Math.floor(elapsedMs(clock, now) / 1000);
  const guideTime = timeLabel(recipe, ar) === '—' ? (ar ? 'حسب انتهاء التدفق' : 'Follow the end of the flow') : timeLabel(recipe, ar);
  const target = manual?.time_max_seconds ?? recipe.seconds;
  const pours = scaledPours(recipe.pours, factor ?? 1);
  const timed = pours.filter(p => p.at !== null);
  const currentPour = timed.reduce<number | null>((last, p) => p.at! <= seconds ? p.number : last, null);
  const mismatch = recipe.waterUnit === 'g' && recipe.water && recipe.pours.length > 0 && Math.abs(recipe.pours.reduce((sum, p) => sum + p.grams, 0) - recipe.water) > 0.1;
  function act(action: 'start' | 'pause' | 'finish' | 'reset') {
    const current = Date.now(); setNow(current); setClock(c => updateClock(c, action, current));
  }
  async function share() {
    try {
      await Share.share({ message: [recipe.title, changed ? (ar ? 'كمية محسوبة من الوصفة' : 'Calculated batch adaptation') : (ar ? 'مقادير المصدر' : 'Source recipe'), `${ar ? 'البن' : 'Coffee'}: ${changed ? `${numberInput(dose)} g` : doseLabel(recipe)}`, `${recipe.method === 'espresso' ? (ar ? 'الناتج' : 'Yield') : (ar ? 'ماء التحضير' : 'Brew water')}: ${changed && recipe.water ? `${Math.round(recipe.water * (factor ?? 1) * 10) / 10} ${recipe.waterUnit}` : waterLabel(recipe, ar)}`, `${ar ? 'الوقت الإرشادي' : 'Guide time'}: ${timeLabel(recipe, ar)}`, manual?.example_pours ? (ar ? 'الصبات مثال ضمن نطاق المصدر.' : 'Pours are an example within source ranges.') : null, (ar ? manual?.pour_note_ar : manual?.pour_note), ...pours.map(p => `${p.at !== null ? formatTime(p.at) : '—'} · +${p.grams} g · ${ar ? 'الميزان' : 'scale'} ${p.cumulative} g`), recipe.sources[0]?.url].filter(Boolean).join('\n') });
      setShareError(false);
    } catch { setShareError(true); }
  }
  return <View testID="guided-brew" style={{ gap: 12 }}>
    {scalable ? <View style={styles.card}>
      <Txt heading style={styles.subtitle}>{ar ? 'احسب كمية أقل' : 'Calculate a smaller batch'}</Txt>
      <Field label={ar ? 'جرعة البن للحساب (g)' : 'Coffee dose to calculate (g)'} value={dose} onChangeText={setDose} keyboardType="decimal-pad" editable={clock.mode === 'idle'}/>
      {invalid ? <Txt style={styles.error}>{ar ? `أدخل جرعة من 10 إلى ${recipe.dose} g.` : `Enter a dose from 10 to ${recipe.dose} g.`}</Txt> : <Txt>{ar ? 'إجمالي ماء التحضير: ' : 'Total brew water: '}{Math.round(recipe.water! * factor! * 10) / 10} g</Txt>}
      <Txt style={styles.muted}>{ar ? 'الحساب يحافظ على النسبة؛ الكمية المعدّلة ليست الوصفة الأصلية. استخدم فلتر الحجم المناسب، وراقب التصريف لأن الوقت يتغير مع الكمية.' : 'The ratio is preserved; a changed batch is an adaptation. Match the filter to the brewer and check drawdown because timing may change.'}</Txt>
    </View> : null}
    <View style={[styles.card, { backgroundColor: colors.brown, borderColor: colors.brown }]}>
      <View style={styles.row}><Icon name="clock" color="#FFF"/><Txt heading style={[styles.subtitle, { color: '#FFF' }]}>{ar ? 'مؤقت التحضير' : 'Brew timer'}</Txt></View>
      <View testID="brew-elapsed"><Txt style={{ fontSize: 48, lineHeight: 64, color: '#FFF', fontFamily: undefined, fontWeight: '700', textAlign: 'center', writingDirection: 'ltr' }}>{formatTime(seconds)}</Txt></View>
      <View style={[styles.row, { justifyContent: 'center', flexDirection: ar ? 'row-reverse' : 'row' }]}><Txt style={{ color: '#EADFD2' }}>{ar ? 'الوقت الإرشادي:' : 'Guide time:'}</Txt><Txt style={{ color: '#EADFD2', textAlign: 'center', writingDirection: /^\d/.test(guideTime) ? 'ltr' : ar ? 'rtl' : 'ltr' }}>{guideTime}</Txt></View>
      {target ? <View style={{ height: 5, borderRadius: 4, backgroundColor: '#725744', overflow: 'hidden' }}><View style={{ height: 5, width: `${Math.min(100, seconds / target * 100)}%`, backgroundColor: '#E5C29E' }}/></View> : null}
      <Txt style={{ color: '#EADFD2' }}>{(ar ? manual?.timer_start_ar : manual?.timer_start) || (ar ? 'شغّل المؤقت عند بدء التحضير الفعلي.' : 'Start the timer when actual brewing begins.')}</Txt>
      <View style={styles.row}>
        {clock.mode === 'idle' || clock.mode === 'paused' ? <Action title={clock.mode === 'paused' ? (ar ? 'استئناف المؤقت' : 'Resume timer') : (ar ? 'ابدأ التحضير' : 'Start brewing')} onPress={() => act('start')} disabled={!!invalid}/> : null}
        {clock.mode === 'running' ? <Action title={ar ? 'إيقاف مؤقت' : 'Pause timer'} onPress={() => act('pause')}/> : null}
        {clock.mode === 'running' || clock.mode === 'paused' ? <Action title={ar ? 'أنهيت التحضير' : 'Finish brewing'} onPress={() => act('finish')}/> : null}
        {clock.mode !== 'idle' ? <Action title={ar ? 'تصفير المؤقت' : 'Reset timer'} onPress={() => act('reset')}/> : null}
      </View>
      {target && seconds >= target && clock.mode !== 'finished' ? <Txt style={{ color: '#FFF' }}>{ar ? 'انتهى الوقت الإرشادي؛ تحقق من التدفق. المؤقت لا يوقف النار أو الجهاز.' : 'The guide time has passed. Check the flow; the timer does not control heat or equipment.'}</Txt> : null}
      {clock.mode === 'finished' ? <><Txt style={{ color: '#FFF' }}>{ar ? 'انتهى المؤقت. راجع الكميات الفعلية قبل حفظ النتيجة.' : 'Timer finished. Check actual amounts before saving your result.'}</Txt>{changed ? <Txt style={{ color: '#FFF' }}>{ar ? 'غيّرت كمية الحساب؛ أدخل الكميات الفعلية واختر «حضّرتها مع تعديلات» في نموذج النتيجة.' : 'You changed the batch. Enter actual amounts and choose “Brewed with modifications” in the result form.'}</Txt> : null}<Action title={ar ? 'سجّل النتيجة بالوقت المقاس' : 'Record with measured time'} onPress={() => record(seconds > 0 ? seconds : undefined)}/></> : null}
    </View>
    {pours.length ? <View style={{ gap: 8 }}>
      <Txt heading style={styles.subtitle}>{ar ? 'خطة الصبات' : 'Pour plan'}</Txt>
      {manual?.example_pours ? <Txt style={styles.warning}>{ar ? 'الخطة مثال باستخدام حدود نطاق المصدر؛ اتبع النطاق والتدفق المذكورين.' : 'This plan uses source-range endpoints as an example. Follow the published range and flow.'}</Txt> : null}
      <Txt style={styles.muted}>{ar ? '«الميزان» هو إجمالي الماء التراكمي؛ + تعني كمية هذه الصبة فقط.' : 'Scale means cumulative water; + means only the water added in that pour.'}</Txt>
      {(ar ? manual?.pour_note_ar : manual?.pour_note) ? <Txt>{ar ? manual?.pour_note_ar : manual?.pour_note}</Txt> : null}
      {mismatch ? <Txt style={styles.warning}>{ar ? 'مجموع الصبات يختلف عن إجمالي المصدر؛ راجع الرابط قبل التحضير.' : 'Pour amounts differ from the source total. Check the source before brewing.'}</Txt> : null}
      {pours.map(p => <View key={p.number} testID={`brew-pour-${p.number}`} style={[styles.card, clock.mode === 'running' && p.number === currentPour && { borderColor: colors.brown, backgroundColor: '#F1E2CC' }]}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}><Txt heading style={{ fontWeight: '700' }}>{manual?.dilution_pour_numbers?.includes(p.number) ? (ar ? 'التخفيف بعد الكبس' : 'Dilute after pressing') : p.bloom ? (ar ? 'التزهير' : 'Bloom') : (ar ? `الصبة ${p.number}` : `Pour ${p.number}`)}</Txt><Txt style={{ fontFamily: undefined, writingDirection: 'ltr' }}>{p.at !== null ? formatTime(p.at) : (ar ? 'حسب التدفق' : 'Follow flow')}</Txt></View>
        <View style={[styles.row, { flexDirection: ar ? 'row-reverse' : 'row' }]}><Txt style={{ fontSize: 20, fontWeight: '700', writingDirection: 'ltr' }}>+{p.grams} g</Txt><Txt style={{ fontSize: 20, fontWeight: '700' }}>{ar ? '· الميزان:' : '· Scale:'}</Txt><Txt style={{ fontSize: 20, fontWeight: '700', writingDirection: 'ltr' }}>{p.cumulative} g</Txt></View>
      </View>)}
    </View> : null}
    <Action title={ar ? 'مشاركة المقادير والخطة' : 'Share amounts and plan'} onPress={() => void share()} disabled={!!invalid}/>
    {shareError ? <Txt style={styles.error}>{ar ? 'تعذّرت المشاركة. حاول مرة أخرى.' : 'Sharing failed. Try again.'}</Txt> : null}
  </View>;
}
