import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { supabase } from './client';
import type { CoffeeItem, RecipeItem } from './data';
import { Language, Txt, Icon, colors, styles } from './ui';

type Grind = 'finer' | 'same' | 'coarser' | null;
type Outcome = 'excellent' | 'good' | 'needs_adjustment' | 'poor';
type Log = {
  id:string; recipe_id:string|null; bean_id:string|null; brew_method:string|null;
  dose_grams:number|null; water_grams:number|null; actual_time_seconds:number|null;
  outcome_submission:unknown; created_at:string;
};
type Parsed = Log & { outcome:Outcome|null; nextGrind:Grind };
const rank:Record<Outcome,number>={excellent:4,good:3,needs_adjustment:2,poor:1};

function parseSubmission(value:unknown):{outcome:Outcome|null;nextGrind:Grind}{
  if(!value||typeof value!=='object'||Array.isArray(value))return {outcome:null,nextGrind:null};
  const row=value as Record<string,unknown>;
  const outcome=['excellent','good','needs_adjustment','poor'].includes(String(row.outcome))?row.outcome as Outcome:null;
  const next=['finer','same','coarser'].includes(String(row.next_grind_adjustment))?row.next_grind_adjustment as Exclude<Grind,null>:null;
  return {outcome,nextGrind:next};
}
function secondsLabel(seconds:number|null){if(!seconds)return '—';const m=Math.floor(seconds/60),s=seconds%60;return m?m+':'+String(s).padStart(2,'0'):s+'s';}

export function BestSetup({userId,recipes,coffees,login,openRecipe,openCoffee}:{userId:string|null;recipes:RecipeItem[];coffees:CoffeeItem[];login:()=>void;openRecipe:(r:RecipeItem)=>void;openCoffee:(c:CoffeeItem)=>void}) {
  const locale=useContext(Language);const ar=locale==='ar';
  const [logs,setLogs]=useState<Parsed[]>([]);const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{let active=true;if(!userId||!supabase){setLogs([]);return;}setLoading(true);setError('');
    void supabase.from('brew_logs').select('id,recipe_id,bean_id,brew_method,dose_grams,water_grams,actual_time_seconds,outcome_submission,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(100).then(({data,error})=>{
      if(!active)return;if(error){setError(ar?'تعذّر تحميل سجل التحضير.':'Could not load brew history.');setLogs([]);return;}
      setLogs(((data??[]) as Log[]).map(row=>({...row,...parseSubmission(row.outcome_submission)})));
    }).catch(()=>{if(active)setError(ar?'تعذّر تحميل سجل التحضير.':'Could not load brew history.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[userId,ar]);

  const best=useMemo(()=>[...logs].filter(x=>x.outcome).sort((a,b)=>(rank[b.outcome!]-rank[a.outcome!])||b.created_at.localeCompare(a.created_at))[0]??null,[logs]);
  const latest=logs[0]??null;
  const recipeFor=(log:Parsed|null)=>log?.recipe_id?recipes.find(r=>r.id===log.recipe_id)??null:null;
  const coffeeFor=(log:Parsed|null)=>log?.bean_id?coffees.find(c=>c.beanId===log.bean_id||c.id===log.bean_id)??null:null;
  const bestRecipe=recipeFor(best), bestCoffee=coffeeFor(best), latestRecipe=recipeFor(latest);

  const suggestion=useMemo(()=>{
    if(!latest)return null;
    if(latest.nextGrind)return {kind:latest.nextGrind,text:latest.nextGrind==='finer'?(ar?'جرّب طحن أنعم في المحاولة الياية.':'Try a finer grind next time.'):latest.nextGrind==='coarser'?(ar?'جرّب طحن أخشن في المحاولة الياية.':'Try a coarser grind next time.'):(ar?'ثبّت درجة الطحن في المحاولة الياية.':'Keep the same grind next time.'),why:ar?'هذا التعديل أنت حفظته بعد آخر كوب.':'You saved this adjustment after your last cup.'};
    if(latest.outcome==='excellent')return {kind:'same',text:ar?'كرر نفس الإعداد؛ هذي أفضل نقطة بداية لك.':'Repeat the same setup; this is a strong baseline.',why:ar?'آخر نتيجة سجّلتها كانت ممتازة.':'Your last recorded result was excellent.'};
    const recipe=latestRecipe;const target=recipe?.seconds??null;
    if(target&&latest.actual_time_seconds){
      const delta=latest.actual_time_seconds-target;
      if(delta<-15)return {kind:'finer',text:ar?'اقتراح مبدئي: جرّب طحن أنعم شوي.':'Starting suggestion: try slightly finer.',why:ar?'وقت التحضير كان أسرع من وقت الوصفة بأكثر من 15 ثانية.':'Your brew ran more than 15 seconds faster than the recipe target.'};
      if(delta>15)return {kind:'coarser',text:ar?'اقتراح مبدئي: جرّب طحن أخشن شوي.':'Starting suggestion: try slightly coarser.',why:ar?'وقت التحضير كان أبطأ من وقت الوصفة بأكثر من 15 ثانية.':'Your brew ran more than 15 seconds slower than the recipe target.'};
    }
    return {kind:'same',text:ar?'غيّر عامل واحد فقط في المحاولة الياية وسجّل النتيجة.':'Change one variable only on the next attempt and log the result.',why:ar?'ما عندنا دليل كافي لاقتراح تغيير محدد بدون تخمين.':'There is not enough evidence for a more specific change without guessing.'};
  },[latest,latestRecipe,ar]);

  if(!userId)return <View style={s.center}><View style={s.bigIcon}><Icon name="star" size={34} color={colors.copper} filled/></View><Txt heading style={styles.title}>{ar?'أفضل إعداد':'Best setup'}</Txt><Txt style={[styles.muted,{textAlign:'center'}]}>{ar?'سجّل دخولك عشان نرجع لتجاربك ونطلع أفضل إعداد فعلي لك.':'Sign in so BeanMora can use your real brew history to find your best setup.'}</Txt><Pressable accessibilityRole="button" onPress={login} style={s.primary}><Txt style={s.primaryText}>{ar?'تسجيل الدخول':'Sign in'}</Txt></Pressable></View>;

  return <ScrollView contentContainerStyle={s.page}>
    <View style={s.header}><View style={{flex:1}}><Txt heading style={styles.title}>{ar?'أفضل إعداد':'Best setup'}</Txt><Txt style={styles.muted}>{ar?'مبني فقط على تجارب التحضير اللي حفظتها.':'Based only on brew attempts you actually saved.'}</Txt></View><View style={s.bigIcon}><Icon name="star" size={30} color={colors.copper} filled/></View></View>
    {loading?<ActivityIndicator color={colors.teal}/>:error?<Txt style={styles.error}>{error}</Txt>:!logs.length?<View style={s.empty}><Txt style={s.cardTitle}>{ar?'ما عندنا تجربة محفوظة للحين':'No saved brew yet'}</Txt><Txt style={styles.muted}>{ar?'حضّر وصفة وسجّل النتيجة، وبعدها راح نطلع لك أفضل إعداد ومقارنة للمحاولة الياية.':'Brew a recipe and save the result; then BeanMora can surface your best setup and next-step comparison.'}</Txt></View>:<>
      {best?<View style={s.bestCard}><View style={s.bestTop}><View style={s.bestBadge}><Icon name="star" size={17} color="#FFF" filled/><Txt style={s.bestBadgeText}>{ar?'أفضل تجربة محفوظة':'Best saved attempt'}</Txt></View><Txt style={s.outcome}>{best.outcome==='excellent'?(ar?'ممتازة':'Excellent'):best.outcome==='good'?(ar?'جيدة':'Good'):best.outcome==='needs_adjustment'?(ar?'تحتاج تعديل':'Needs adjustment'):(ar?'غير مرضية':'Poor')}</Txt></View><Txt style={s.bestName}>{bestCoffee?.name??bestRecipe?.title??best.brew_method??'—'}</Txt>{bestCoffee?<Txt style={s.roaster}>{bestCoffee.roaster}</Txt>:null}<View style={s.metrics}><Metric label={ar?'البن':'Dose'} value={best.dose_grams?best.dose_grams+' g':'—'}/><Metric label={ar?'الماء':'Water'} value={best.water_grams?best.water_grams+' g':'—'}/><Metric label={ar?'الوقت':'Time'} value={secondsLabel(best.actual_time_seconds)}/><Metric label={ar?'الطريقة':'Method'} value={best.brew_method??'—'}/></View><View style={s.actions}>{bestRecipe?<Pressable accessibilityRole="button" onPress={()=>openRecipe(bestRecipe)} style={s.primary}><Txt style={s.primaryText}>{ar?'كرر الوصفة':'Repeat recipe'}</Txt></Pressable>:null}{bestCoffee?<Pressable accessibilityRole="button" onPress={()=>openCoffee(bestCoffee)} style={s.secondary}><Txt style={s.secondaryText}>{ar?'افتح البن':'Open coffee'}</Txt></Pressable>:null}</View></View>:null}
      {suggestion?<View style={s.coach}><View style={s.coachIcon}><Icon name={suggestion.kind==='same'?'star':'gear'} size={22} color={colors.teal}/></View><View style={{flex:1,gap:4}}><Txt style={s.cardTitle}>{ar?'المحاولة الياية':'Next attempt'}</Txt><Txt style={s.suggestion}>{suggestion.text}</Txt><Txt style={styles.muted}>{suggestion.why}</Txt></View></View>:null}
      <View style={s.history}><Txt style={s.cardTitle}>{ar?'آخر المحاولات':'Recent attempts'}</Txt>{logs.slice(0,5).map(log=>{const recipe=recipeFor(log);const coffee=coffeeFor(log);return <View key={log.id} style={s.historyRow}><View style={s.historyDot}/><View style={{flex:1}}><Txt numberOfLines={1} style={s.historyName}>{coffee?.name??recipe?.title??log.brew_method??'—'}</Txt><Txt style={styles.muted}>{[log.dose_grams?log.dose_grams+'g':null,log.water_grams?log.water_grams+'g':null,secondsLabel(log.actual_time_seconds)].filter(Boolean).join(' · ')}</Txt></View><Txt style={s.historyOutcome}>{log.outcome==='excellent'?'★':log.outcome==='good'?'✓':log.outcome==='needs_adjustment'?'△':'·'}</Txt></View>})}</View>
    </>}
  </ScrollView>;
}
function Metric({label,value}:{label:string;value:string}){return <View style={s.metric}><Txt style={s.metricValue}>{value}</Txt><Txt style={s.metricLabel}>{label}</Txt></View>}

const s=StyleSheet.create({
  page:{width:'100%',maxWidth:900,alignSelf:'center',paddingHorizontal:18,paddingTop:14,paddingBottom:30,gap:15},
  center:{flex:1,maxWidth:520,width:'100%',alignSelf:'center',padding:28,alignItems:'center',justifyContent:'center',gap:14},
  header:{flexDirection:'row',alignItems:'center',gap:12},
  bigIcon:{width:58,height:58,borderRadius:29,backgroundColor:'#F2E7D8',alignItems:'center',justifyContent:'center'},
  empty:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:20,padding:18,gap:8},
  bestCard:{backgroundColor:'#3B2417',borderRadius:22,padding:17,gap:11},
  bestTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  bestBadge:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#FFFFFF17',borderRadius:999,paddingHorizontal:10,paddingVertical:6},
  bestBadgeText:{color:'#FFF',fontSize:10,lineHeight:16,fontWeight:'800'},
  outcome:{color:'#E8C29D',fontSize:12,lineHeight:18,fontWeight:'800'},
  bestName:{color:'#FFF',fontSize:22,lineHeight:30,fontWeight:'800'},
  roaster:{color:'#E8CFC0',fontSize:12,lineHeight:19},
  metrics:{flexDirection:'row',flexWrap:'wrap',gap:8},
  metric:{width:'48%',backgroundColor:'#FFFFFF10',borderRadius:14,padding:10},
  metricValue:{color:'#FFF',fontSize:15,lineHeight:21,fontWeight:'800',textAlign:'left',writingDirection:'ltr'},
  metricLabel:{color:'#E1CFC0',fontSize:10,lineHeight:16},
  actions:{flexDirection:'row',gap:8,flexWrap:'wrap'},
  primary:{backgroundColor:colors.teal,minHeight:46,borderRadius:14,paddingHorizontal:16,alignItems:'center',justifyContent:'center'},
  primaryText:{color:'#FFF',fontSize:13,lineHeight:20,fontWeight:'800',textAlign:'center'},
  secondary:{backgroundColor:'#FFF9F0',minHeight:46,borderRadius:14,paddingHorizontal:16,alignItems:'center',justifyContent:'center'},
  secondaryText:{color:colors.brown,fontSize:13,lineHeight:20,fontWeight:'800'},
  coach:{backgroundColor:'#F3EBDD',borderRadius:20,padding:15,flexDirection:'row',gap:12,borderWidth:1,borderColor:'#E2D2C0'},
  coachIcon:{width:42,height:42,borderRadius:21,backgroundColor:'#FFF9F0',alignItems:'center',justifyContent:'center'},
  cardTitle:{fontSize:16,lineHeight:23,fontWeight:'800'},
  suggestion:{fontSize:14,lineHeight:22,fontWeight:'700'},
  history:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:20,padding:15,gap:6},
  historyRow:{minHeight:58,flexDirection:'row',alignItems:'center',gap:10,borderTopWidth:1,borderTopColor:'#EFE6DC',paddingTop:8},
  historyDot:{width:9,height:9,borderRadius:5,backgroundColor:colors.copper},
  historyName:{fontSize:13,lineHeight:20,fontWeight:'700'},
  historyOutcome:{fontSize:20,lineHeight:26,color:colors.teal,fontWeight:'800'},
});
