import { useContext, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { parseOutcome, saveOutcome, OUTCOMES, type BrewOutcome, type Outcome } from './core/outcome';
import type { RecipeItem } from './data';
import { supabase } from './client';
import { errors, outcomes } from './copy';
import { numberInput } from './guards';
import { Action, Field, Language, Txt, styles, useCopy } from './ui';
import { brewCoach, type TasteSignal } from './brewCoach';
export function OutcomeForm({ recipe, userId, done, measuredSeconds }: { recipe: RecipeItem; userId: string; done: () => void; measuredSeconds?: number }) {
  const locale = useContext(Language); const t = useCopy();
  const [dose, setDose] = useState(recipe.dose === null ? '' : String(recipe.dose));
  const [water, setWater] = useState(recipe.water === null || recipe.waterUnit === 'ml' ? '' : String(recipe.water));
  const [seconds, setSeconds] = useState(measuredSeconds && Number.isInteger(measuredSeconds) && measuredSeconds > 0 ? String(measuredSeconds) : ''); const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [grindSetting, setGrindSetting] = useState(recipe.grindSetting ?? '');
  const [brewed, setBrewed] = useState(false); const [modified, setModified] = useState(false); const [share, setShare] = useState(false);
  const [nextGrind, setNextGrind] = useState<'finer' | 'same' | 'coarser' | null>(null);
  const [tasteSignal,setTasteSignal]=useState<TasteSignal|null>(null);
  const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false); const [error, setError] = useState(''); const [auxiliaryWarning,setAuxiliaryWarning]=useState('');
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
          share_with_community: share, next_grind_adjustment: nextGrind, taste_scores: {}, brewed });
        if (!payload) { setError(errors[locale].invalid); return; }
        pending.current = { id: randomUUID(), payload };
      }
      const response = await saveOutcome(supabase, pending.current.id, pending.current.payload);
      const request = pending.current;
      if (!response.ok) { setError(errors[locale][response.error]); return; }
      const warnings:string[]=[];
      if(tasteSignal){
        const tasteUpdate=await supabase.from('brew_logs').update({taste_signal:tasteSignal}).eq('id',request.id).eq('user_id',userId);
        if(tasteUpdate.error) warnings.push(locale==='ar'?'تم حفظ الكوب، لكن تعذّر حفظ ملاحظة الطعم.':'The brew was saved, but the taste note could not be synced.');
      }
      const grind = grindSetting.trim();
      if (grind) {
        try{
          const update = await supabase.from('brew_logs').update({ grind_setting: grind }).eq('id', request.id).eq('user_id', userId);
          if (update.error) throw update.error;
          const inventoryLookup = recipe.productId
            ? supabase.from('user_bean_inventory').select('id').eq('user_id',userId).eq('roasted_product_id',recipe.productId).order('updated_at',{ascending:false}).limit(1).maybeSingle()
            : recipe.beanId
              ? supabase.from('user_bean_inventory').select('id').eq('user_id',userId).eq('legacy_bean_id',recipe.beanId).order('updated_at',{ascending:false}).limit(1).maybeSingle()
              : null;
          if (inventoryLookup) {
            const inventory = await inventoryLookup;
            if (inventory.error) throw inventory.error;
            if (inventory.data?.id) {
              const sync = await supabase.from('user_bean_inventory').update({last_grind_setting:grind}).eq('id',inventory.data.id).eq('user_id',userId);
              if(sync.error) throw sync.error;
            }
          }
        }catch{warnings.push(locale==='ar'?'تم حفظ الكوب، لكن تعذّر تحديث درجة الطحن في المخزون.':'The brew was saved, but the grind setting could not be synced to inventory.');}
      }
      if (share) {
        const post = await supabase.from('posts').insert({
          user_id: userId,
          recipe_id: recipe.id,
          brew_log_id: request.id,
          bean_id: recipe.beanId,
          brew_method: recipe.method,
          dose_grams: request.payload.dose_grams,
          water_grams: request.payload.water_grams,
          actual_time_seconds: request.payload.actual_time_seconds,
          outcome: request.payload.outcome,
          body: null,
          content_language: locale,
          visibility: 'public',
          is_hidden: false,
        });
        if (post.error && post.error.code!=='23505') warnings.push(locale==='ar'?'تم حفظ الكوب، لكن تعذرت مشاركته تلقائيًا. تقدر تشاركه لاحقًا من المجتمع.':'The brew was saved, but automatic sharing failed. You can share it later from Community.');
      }
      setAuxiliaryWarning(warnings.join(' '));
      setSaved(true);
    } catch { setError(errors[locale].retry); }
    finally { inFlight.current = false; setBusy(false); }
  }
  if (saved) return <View style={styles.content}><Txt heading style={styles.title}>{t.saved}</Txt>{auxiliaryWarning?<Txt style={styles.warning}>{auxiliaryWarning}</Txt>:share?<Txt style={styles.success}>{locale==='ar'?'تمت مشاركة التجربة في المجتمع.':'Your brew was shared to Community.'}</Txt>:null}<Action title={t.next} onPress={done} selected /></View>;
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <View style={local.hero}><Txt heading style={local.heroTitle}>{locale==='ar'?'شلون كان الكوب؟':'How was the cup?'}</Txt><Txt style={local.heroNote}>{locale==='ar'?'سجّل النتيجة بسرعة ونحتفظ بالإعداد اللي نجح معاك.':'Log the result quickly so BeanMora can remember what worked.'}</Txt></View><View style={local.recipePill}><Txt style={local.recipeTitle}>{recipe.title}</Txt></View><Txt style={styles.muted}>{t.amountNote}</Txt>{recipe.waterUnit === 'ml' ? <Txt style={styles.muted}>{locale === 'ar' ? 'ماء المصدر بالملليلتر؛ أدخل وزن الماء الفعلي من الميزان بالجرام.' : 'Source water is in milliliters; enter the actual water weight from your scale in grams.'}</Txt> : null}
    <Field label={t.dose} value={dose} onChangeText={setDose} keyboardType="decimal-pad" editable={!locked} />
    <Field label={t.water} value={water} onChangeText={setWater} keyboardType="decimal-pad" editable={!locked} />
    <Field label={t.seconds} value={seconds} onChangeText={setSeconds} keyboardType="number-pad" editable={!locked} />
    <Field label={locale==='ar'?'درجة الطحن الفعلية':'Actual grind setting'} value={grindSetting} onChangeText={setGrindSetting} editable={!locked} placeholder={locale==='ar'?'مثال: 5E أو 22 clicks':'e.g. 5E or 22 clicks'} />
    <Txt style={local.sectionLabel}>{t.outcome}</Txt><View style={local.outcomeGrid}>{OUTCOMES.map((o,index) => <Pressable key={o} accessibilityRole="button" accessibilityLabel={outcomes[locale][o]} accessibilityState={{selected:outcome===o,disabled:locked}} disabled={locked} onPress={()=>setOutcome(o)} style={[local.outcomeCard,outcome===o&&local.outcomeSelected]}><Txt style={local.outcomeEmoji}>{['◎','○','△','×'][index]}</Txt><Txt style={[local.outcomeText,outcome===o&&{color:'#FFF'}]}>{outcomes[locale][o]}</Txt></Pressable>)}</View>
    <View style={local.tasteCard}><Txt style={local.coachTitle}>{locale==='ar'?'شنو كان أوضح شي بالطعم؟':'What stood out most?'}</Txt><View style={styles.row}>{([
      ['sharp_sour',locale==='ar'?'حامض/حاد':'Sharp sour'],['bitter_dry',locale==='ar'?'مر/جاف':'Bitter/dry'],['thin_weak',locale==='ar'?'خفيف/ضعيف':'Thin/weak'],['balanced',locale==='ar'?'متوازن':'Balanced'],['other',locale==='ar'?'شي ثاني':'Other']
    ] as const).map(([value,label])=><Action key={value} title={label} onPress={()=>{setTasteSignal(value);const coach=brewCoach(value);if(coach.grind)setNextGrind(coach.grind);}} selected={tasteSignal===value} disabled={locked}/>)}</View>{tasteSignal?<View style={local.coachResult}><Txt style={local.coachResultTitle}>{locale==='ar'?brewCoach(tasteSignal).ar:brewCoach(tasteSignal).en}</Txt><Txt style={local.coachNote}>{locale==='ar'?brewCoach(tasteSignal).reasonAr:brewCoach(tasteSignal).reasonEn}</Txt></View>:null}</View><View style={local.coachCard}><Txt style={local.coachTitle}>{locale==='ar'?'المحاولة الياية':'Next attempt'}</Txt><Txt style={local.coachNote}>{locale==='ar'?'إذا بتغيّر الطحن، احفظ التعديل المقصود عشان نقارن النتيجة بالمحاولة الحالية.':'Save the grind change you plan to try so we can compare it with this cup.'}</Txt><View style={styles.row}><Action title={locale==='ar'?'أنعم':'Finer'} onPress={()=>setNextGrind('finer')} selected={nextGrind==='finer'} disabled={locked}/><Action title={locale==='ar'?'نفس الطحن':'Same'} onPress={()=>setNextGrind('same')} selected={nextGrind==='same'} disabled={locked}/><Action title={locale==='ar'?'أخشن':'Coarser'} onPress={()=>setNextGrind('coarser')} selected={nextGrind==='coarser'} disabled={locked}/></View></View>
    <Txt>{t.modified}</Txt><Switch accessibilityLabel={t.modified} value={modified} onValueChange={setModified} disabled={locked} />
    <Txt>{t.brewed}</Txt><Switch accessibilityLabel={t.brewed} value={brewed} onValueChange={setBrewed} disabled={locked} />
    <Txt>{t.share}</Txt><Switch accessibilityLabel={t.share} value={share} onValueChange={setShare} disabled={locked} /><Txt style={styles.muted}>{share?(locale==='ar'?'بعد الحفظ راح ينشئ BeanMora منشور مجتمع تلقائي من نفس التجربة والمقادير.':'After saving, BeanMora will create a community post from this exact brew and its measurements.'):t.shareNote}</Txt>
    {error ? <Txt style={styles.error}>{error}</Txt> : null}
    {pending.current ? <Txt style={styles.warning}>{t.frozen}</Txt> : null}
    <Action title={busy ? t.saving : pending.current ? t.retry : t.save} onPress={() => void submit()} disabled={busy} selected />
  </ScrollView>;
}

const local=StyleSheet.create({
  hero:{backgroundColor:'#3B2417',borderRadius:22,padding:18,gap:5},
  heroTitle:{color:'#FFF',fontSize:24,lineHeight:34,fontWeight:'800'},
  heroNote:{color:'#F1E5D8',fontSize:12,lineHeight:20},
  recipePill:{backgroundColor:'#F2E7D8',borderRadius:16,padding:13,borderWidth:1,borderColor:'#E2D2C0'},
  recipeTitle:{fontSize:15,lineHeight:23,fontWeight:'800'},
  sectionLabel:{fontSize:15,fontWeight:'800'},
  outcomeGrid:{flexDirection:'row',gap:8,flexWrap:'wrap'},
  outcomeCard:{flexGrow:1,minWidth:72,borderRadius:18,borderWidth:1,borderColor:'#E7DCCF',backgroundColor:'#FFFCF6',paddingVertical:12,paddingHorizontal:8,alignItems:'center',gap:5},
  outcomeSelected:{backgroundColor:'#167B7F',borderColor:'#167B7F'},
  outcomeEmoji:{fontSize:22,lineHeight:29,textAlign:'center'},
  outcomeText:{fontSize:11,lineHeight:17,fontWeight:'700',textAlign:'center'},
  tasteCard:{backgroundColor:'#F7F2E9',borderRadius:18,padding:14,gap:10,borderWidth:1,borderColor:'#E7DCCF'},coachResult:{backgroundColor:'#EEF7F5',borderRadius:14,padding:11,gap:4},coachResultTitle:{fontSize:13,lineHeight:20,fontWeight:'800',color:'#167B7F'},coachCard:{backgroundColor:'#F8F1E8',borderRadius:18,padding:14,gap:10,borderWidth:1,borderColor:'#E7DCCF'},
  coachTitle:{fontSize:16,lineHeight:24,fontWeight:'800'},
  coachNote:{fontSize:12,lineHeight:20,color:'#796958'},
});
