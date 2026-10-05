import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { supabase } from './client';
import type { CoffeeItem, RecipeItem } from './data';
import { CoffeePhoto } from './CoffeeScreens';
import { Action, Field, Language, Txt, Icon, colors, styles } from './ui';

type BagState = 'new' | 'open' | 'frozen' | 'finished';
type Filter = 'all' | BagState;
type InventoryRow = {
  id:string; roasted_product_id:string|null; legacy_bean_id:string|null; roast_date:string|null; opened_at:string|null;
  original_weight_grams:number|null; remaining_weight_grams:number|null; storage_location:string|null;
  preferred_recipe_id:string|null; last_grind_setting:string|null; brew_count:number; created_at:string; updated_at:string;
};
type BrewRow={id:string;recipe_id:string|null;bean_id:string|null;dose_grams:number|null;water_grams:number|null;actual_time_seconds:number|null;outcome_submission:unknown;created_at:string};

const outcome=(value:unknown)=>value&&typeof value==='object'&&!Array.isArray(value)&&typeof (value as Record<string,unknown>).outcome==='string'?String((value as Record<string,unknown>).outcome):null;
const sec=(v:number|null)=>!v?'—':v>=60?Math.floor(v/60)+':'+String(v%60).padStart(2,'0'):v+'s';
const daysSince=(date:string|null)=>{if(!date)return null;const start=new Date(date+'T00:00:00');if(Number.isNaN(start.getTime()))return null;return Math.max(0,Math.floor((Date.now()-start.getTime())/86400000));};

export function MyBags({ userId, coffees, savedIds, recipes, openCoffee, openRecipe, login }: { userId:string|null; coffees: CoffeeItem[]; savedIds:string[]; recipes:RecipeItem[]; openCoffee: (item: CoffeeItem) => void; openRecipe:(item:RecipeItem)=>void; login:()=>void }) {
  const locale=useContext(Language); const ar=locale==='ar';
  const [inventory,setInventory]=useState<InventoryRow[]>([]); const [brews,setBrews]=useState<BrewRow[]>([]);
  const [filter,setFilter]=useState<Filter>('all'); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const [editing,setEditing]=useState<string|null>(null); const [draft,setDraft]=useState({original:'',remaining:'',roast:'',opened:'',storage:''}); const [saving,setSaving]=useState(false);
  const labels:Record<Filter,string>={all:ar?'الكل':'All',new:ar?'جديد':'New',open:ar?'مفتوح':'Open',frozen:ar?'مجمّد':'Frozen',finished:ar?'منتهي':'Finished'};

  const load=async()=>{if(!userId||!supabase){setInventory([]);setBrews([]);return;}setBusy(true);setError('');
    try{
      const [i,b]=await Promise.all([
        supabase.from('user_bean_inventory').select('id,roasted_product_id,legacy_bean_id,roast_date,opened_at,original_weight_grams,remaining_weight_grams,storage_location,preferred_recipe_id,last_grind_setting,brew_count,created_at,updated_at').eq('user_id',userId).order('updated_at',{ascending:false}),
        supabase.from('brew_logs').select('id,recipe_id,bean_id,dose_grams,water_grams,actual_time_seconds,outcome_submission,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(150),
      ]);
      if(i.error||b.error)throw i.error||b.error;setInventory((i.data??[]) as InventoryRow[]);setBrews((b.data??[]) as BrewRow[]);
    }catch{setError(ar?'تعذّر تحميل المخزون.':'Could not load inventory.');}finally{setBusy(false);}
  };
  useEffect(()=>{void load();},[userId,ar]);

  const itemFor=(row:InventoryRow)=>coffees.find(c=>row.roasted_product_id?c.kind==='product'&&c.id===row.roasted_product_id:(c.beanId??c.id)===row.legacy_bean_id)??null;
  const stateFor=(row:InventoryRow):BagState=>row.remaining_weight_grams===0?'finished':(row.storage_location??'').toLowerCase().includes('freez')?'frozen':row.opened_at?'open':'new';
  const brewsFor=(row:InventoryRow)=>brews.filter(log=>{
    const recipe=log.recipe_id?recipes.find(r=>r.id===log.recipe_id):null;
    return row.roasted_product_id?recipe?.productId===row.roasted_product_id:(log.bean_id&&log.bean_id===row.legacy_bean_id);
  });
  const bestFor=(row:InventoryRow)=>[...brewsFor(row)].sort((a,b)=>{
    const score=(x:BrewRow)=>outcome(x.outcome_submission)==='excellent'?4:outcome(x.outcome_submission)==='good'?3:outcome(x.outcome_submission)==='needs_adjustment'?2:outcome(x.outcome_submission)==='poor'?1:0;
    return score(b)-score(a)||b.created_at.localeCompare(a.created_at);
  })[0]??null;

  const rows=useMemo(()=>inventory.filter(row=>filter==='all'||stateFor(row)===filter),[inventory,filter]);
  const untracked=useMemo(()=>coffees.filter(item=>savedIds.includes(item.beanId??item.id)&&!inventory.some(row=>row.roasted_product_id?item.kind==='product'&&row.roasted_product_id===item.id:(item.beanId??item.id)===row.legacy_bean_id)),[coffees,savedIds,inventory]);

  const addBag=async(item:CoffeeItem)=>{if(!userId||!supabase){login();return;}setSaving(true);setError('');
    const payload=item.kind==='product'?{user_id:userId,roasted_product_id:item.id,legacy_bean_id:null}:{user_id:userId,roasted_product_id:null,legacy_bean_id:item.beanId??item.id};
    const {error}=await supabase.from('user_bean_inventory').insert(payload);setSaving(false);if(error){setError(ar?'تعذّرت إضافة الكيس.':'Could not add bag.');return;}void load();
  };
  const beginEdit=(row:InventoryRow)=>{setEditing(row.id);setDraft({original:row.original_weight_grams?.toString()??'',remaining:row.remaining_weight_grams?.toString()??'',roast:row.roast_date??'',opened:row.opened_at??'',storage:row.storage_location??''});};
  const saveEdit=async(row:InventoryRow)=>{if(!supabase||!userId)return;setSaving(true);setError('');
    const num=(v:string)=>v.trim()?Math.max(0,Math.round(Number(v))):null;
    const original=num(draft.original),remaining=num(draft.remaining);
    if((draft.original.trim()&&Number.isNaN(Number(draft.original)))||(draft.remaining.trim()&&Number.isNaN(Number(draft.remaining)))||(original!==null&&remaining!==null&&remaining>original)){setSaving(false);setError(ar?'راجع الأوزان المدخلة.':'Check the bag weights.');return;}
    const {error}=await supabase.from('user_bean_inventory').update({original_weight_grams:original,remaining_weight_grams:remaining,roast_date:draft.roast.trim()||null,opened_at:draft.opened.trim()||null,storage_location:draft.storage.trim()||null}).eq('id',row.id).eq('user_id',userId);
    setSaving(false);if(error){setError(ar?'تعذّر حفظ بيانات الكيس.':'Could not save bag details.');return;}setEditing(null);void load();
  };

  if(!userId)return <View style={s.center}><Icon name="bean" size={42} color={colors.copper}/><Txt heading style={styles.title}>{ar?'أكياسي':'My bags'}</Txt><Txt style={[styles.muted,{textAlign:'center'}]}>{ar?'سجّل دخولك عشان نخزن وزن كل كيس وتواريخه ونربطه بتحضيراتك تلقائيًا.':'Sign in to track bag weights, dates and automatic brew usage.'}</Txt><Action title={ar?'تسجيل الدخول':'Sign in'} onPress={login} selected/></View>;

  return <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <View style={s.header}><View style={{flex:1}}><Txt heading style={styles.title}>{ar?'أكياسي':'My bags'}</Txt><Txt style={styles.muted}>{ar?'مخزون فعلي: الوزن والتواريخ والكمية المتبقية وآخر تحضير وأفضل إعداد.':'Real inventory: weight, dates, remaining coffee, latest brew and best setup.'}</Txt></View><View style={s.headerIcon}><Icon name="bean" size={27} color={colors.copper}/></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{(['all','new','open','frozen','finished'] as Filter[]).map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:filter===value}} onPress={()=>setFilter(value)} style={[s.filter,filter===value&&s.filterActive]}><Txt style={[s.filterText,filter===value&&{color:'#FFF'}]}>{labels[value]}</Txt></Pressable>)}</ScrollView>
    {busy?<ActivityIndicator color={colors.teal}/>:null}{error?<Txt style={styles.error}>{error}</Txt>:null}
    <View style={s.list}>{rows.map(row=>{const item=itemFor(row);if(!item)return null;const state=stateFor(row);const latest=brewsFor(row)[0]??null;const best=bestFor(row);const remaining=row.remaining_weight_grams,original=row.original_weight_grams;const percent=remaining!==null&&original?Math.max(0,Math.min(100,Math.round(remaining/original*100))):null;const roastDays=daysSince(row.roast_date);const lastDose=latest?.dose_grams??null;const cups=remaining!==null&&lastDose&&lastDose>0?Math.floor(remaining/lastDose):null;const low=remaining!==null&&lastDose&&remaining>0&&remaining<=lastDose*2;return <View key={row.id} style={s.card}>
      <Pressable accessibilityRole="button" accessibilityLabel={item.name} onPress={()=>openCoffee(item)} style={s.product}><View style={s.photo}><CoffeePhoto uri={item.imageUrl} uris={item.images} kind={item.imageKind}/></View><View style={s.copy}><Txt numberOfLines={1} style={s.roaster}>{item.roaster}</Txt><Txt numberOfLines={2} style={s.name}>{item.name}</Txt><Txt style={styles.muted}>{labels[state]} · {ar?'تحضيرات':'Brews'} {row.brew_count}</Txt></View></Pressable>
      {percent!==null?<View style={s.progressTrack}><View style={[s.progressFill,{width:`${percent}%`}]} /></View>:null}
      <View style={s.metrics}><Metric label={ar?'المتبقي':'Remaining'} value={remaining!==null?remaining+' g':'—'}/><Metric label={ar?'الوزن الأصلي':'Original'} value={original!==null?original+' g':'—'}/><Metric label={ar?'من التحميص':'Since roast'} value={roastDays!==null?(ar?roastDays+' يوم':roastDays+' days'):'—'}/><Metric label={ar?'أكواب تقريبية':'Approx. cups'} value={cups!==null?String(cups):'—'}/></View>
      {low?<View style={s.lowStock}><Icon name="bell" size={17} color={colors.copper}/><Txt style={s.lowStockText}>{ar?'الكيس قرب يخلص حسب آخر جرعة سجلتها.':'This bag is nearly empty based on your last recorded dose.'}</Txt></View>:null}
      {row.storage_location?<Txt style={styles.muted}>{ar?'التخزين: ':'Storage: '}{row.storage_location}</Txt>:null}
      <View style={s.brewInfo}><View style={{flex:1}}><Txt style={s.miniTitle}>{ar?'آخر تحضير':'Latest brew'}</Txt><Txt style={styles.muted}>{latest?[latest.dose_grams?latest.dose_grams+'g':null,latest.water_grams?latest.water_grams+'g':null,sec(latest.actual_time_seconds),outcome(latest.outcome_submission)].filter(Boolean).join(' · '):(ar?'لا يوجد بعد':'None yet')}</Txt></View><View style={{flex:1}}><Txt style={s.miniTitle}>{ar?'أفضل إعداد':'Best setup'}</Txt><Txt style={styles.muted}>{best?[best.dose_grams?best.dose_grams+'g':null,best.water_grams?best.water_grams+'g':null,sec(best.actual_time_seconds),outcome(best.outcome_submission)].filter(Boolean).join(' · '):(ar?'لا يوجد بعد':'None yet')}</Txt></View></View>
      <View style={s.quickFacts}><Metric label={ar?'آخر طحنة':'Last grind'} value={row.last_grind_setting??'—'}/><Metric label={ar?'الوصفة المفضلة':'Preferred recipe'} value={row.preferred_recipe_id?(recipes.find(r=>r.id===row.preferred_recipe_id)?.title??'—'):'—'}/></View>
      {row.preferred_recipe_id&&recipes.find(r=>r.id===row.preferred_recipe_id)?<Action title={ar?'كرر أفضل وصفة':'Repeat best recipe'} onPress={()=>openRecipe(recipes.find(r=>r.id===row.preferred_recipe_id)!)} selected/>:null}
      {editing===row.id?<View style={s.editor}><Field label={ar?'وزن الكيس الأصلي (g)':'Original bag weight (g)'} value={draft.original} onChangeText={original=>setDraft(v=>({...v,original}))} keyboardType="number-pad"/><Field label={ar?'الكمية المتبقية (g)':'Remaining (g)'} value={draft.remaining} onChangeText={remaining=>setDraft(v=>({...v,remaining}))} keyboardType="number-pad"/><Field label={ar?'تاريخ التحميص YYYY-MM-DD':'Roast date YYYY-MM-DD'} value={draft.roast} onChangeText={roast=>setDraft(v=>({...v,roast}))}/><Field label={ar?'تاريخ الفتح YYYY-MM-DD':'Opened date YYYY-MM-DD'} value={draft.opened} onChangeText={opened=>setDraft(v=>({...v,opened}))}/><Field label={ar?'مكان التخزين (مثال: freezer)':'Storage (e.g. freezer)'} value={draft.storage} onChangeText={storage=>setDraft(v=>({...v,storage}))}/><View style={styles.row}><Action title={ar?'حفظ':'Save'} onPress={()=>void saveEdit(row)} selected disabled={saving}/><Action title={ar?'إلغاء':'Cancel'} onPress={()=>setEditing(null)} disabled={saving}/></View></View>:<Action title={ar?'تعديل بيانات الكيس':'Edit bag details'} onPress={()=>beginEdit(row)}/>}
    </View>})}</View>
    {untracked.length?<View style={s.addSection}><Txt heading style={styles.subtitle}>{ar?'بن محفوظ خارج المخزون':'Saved coffee not in inventory'}</Txt><Txt style={styles.muted}>{ar?'أضفه للمخزون عشان يبدأ تتبع الوزن والتحضيرات تلقائيًا.':'Add it to inventory to start automatic weight and brew tracking.'}</Txt>{untracked.slice(0,12).map(item=><View key={item.kind+item.id} style={s.addRow}><View style={{flex:1}}><Txt style={s.miniTitle}>{item.name}</Txt><Txt style={styles.muted}>{item.roaster}</Txt></View><Action title={ar?'إضافة':'Add'} onPress={()=>void addBag(item)} disabled={saving}/></View>)}</View>:null}
    {!rows.length&&!busy?<View style={s.empty}><Icon name="bean" size={42} color={colors.copper}/><Txt style={s.emptyTitle}>{ar?'ما عندك أكياس بهالحالة':'No bags in this state'}</Txt></View>:null}
  </ScrollView>;
}
function Metric({label,value}:{label:string;value:string}){return <View style={s.metric}><Txt style={s.metricValue}>{value}</Txt><Txt style={s.metricLabel}>{label}</Txt></View>}

const s=StyleSheet.create({
  page:{width:'100%',maxWidth:900,alignSelf:'center',paddingHorizontal:18,paddingTop:14,paddingBottom:28,gap:16},
  center:{flex:1,maxWidth:520,width:'100%',alignSelf:'center',padding:28,alignItems:'center',justifyContent:'center',gap:14},
  header:{flexDirection:'row',alignItems:'center',gap:12},headerIcon:{width:54,height:54,borderRadius:27,backgroundColor:'#F2E7D8',alignItems:'center',justifyContent:'center'},
  filters:{gap:8,paddingBottom:2},filter:{minHeight:40,paddingHorizontal:16,borderRadius:999,borderWidth:1,borderColor:colors.line,backgroundColor:colors.paper,alignItems:'center',justifyContent:'center'},filterActive:{backgroundColor:colors.teal,borderColor:colors.teal},filterText:{fontSize:12,lineHeight:18,fontWeight:'800',color:colors.brown},
  list:{gap:12},card:{backgroundColor:colors.paper,borderRadius:20,borderWidth:1,borderColor:colors.line,padding:11,gap:11},product:{flexDirection:'row',gap:12,alignItems:'center'},photo:{width:82,height:92,borderRadius:14,overflow:'hidden',backgroundColor:'#F9F5EC'},copy:{flex:1,gap:2},roaster:{fontSize:11,lineHeight:17,color:colors.teal,fontWeight:'700'},name:{fontSize:16,lineHeight:23,fontWeight:'800'},
  progressTrack:{height:8,borderRadius:99,backgroundColor:'#EEE4D8',overflow:'hidden'},progressFill:{height:'100%',backgroundColor:colors.teal,borderRadius:99},
  metrics:{flexDirection:'row',flexWrap:'wrap',gap:8},metric:{width:'48%',backgroundColor:'#F8F2E9',borderRadius:13,padding:9},metricValue:{fontSize:13,lineHeight:19,fontWeight:'800',writingDirection:'ltr',textAlign:'left'},metricLabel:{fontSize:10,lineHeight:16,color:colors.muted},
  brewInfo:{flexDirection:'row',gap:10},quickFacts:{flexDirection:'row',flexWrap:'wrap',gap:8},lowStock:{minHeight:40,borderRadius:12,backgroundColor:'#FFF1DD',paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:8},lowStockText:{flex:1,fontSize:11,lineHeight:18,fontWeight:'700',color:'#70431D'},miniTitle:{fontSize:12,lineHeight:18,fontWeight:'800'},editor:{gap:11,backgroundColor:'#FAF5EC',padding:12,borderRadius:15},
  addSection:{gap:9,backgroundColor:'#F2E7D8',borderRadius:20,padding:14},addRow:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:colors.paper,borderRadius:14,padding:10},
  empty:{paddingVertical:40,paddingHorizontal:24,alignItems:'center',gap:8,backgroundColor:colors.paper,borderRadius:20,borderWidth:1,borderColor:colors.line},emptyTitle:{fontSize:17,lineHeight:25,fontWeight:'800',textAlign:'center'},
});
