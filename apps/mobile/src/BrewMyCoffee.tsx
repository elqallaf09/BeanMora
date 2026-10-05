import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { supabase } from './client';
import { mapRecipe, RECIPE_FIELDS, type CoffeeItem, type RecipeItem, type RecipeRow } from './data';
import { MethodPicker, CoffeePhoto } from './CoffeeScreens';
import { Language, Txt, Icon, colors, styles } from './ui';
import { isMethod, recommendRecipes, type Method, type Profile } from './core/engine';
import { methods } from './copy';
import { recipeQuickFacts } from './recipeQuickFacts';

type InventoryRow={
  id:string; roasted_product_id:string|null; legacy_bean_id:string|null; preferred_recipe_id:string|null;
  last_grind_setting:string|null; remaining_weight_grams:number|null; opened_at:string|null; updated_at:string;
};
type Candidate={recipe:RecipeItem;style:string|null;exact:boolean};
type Serving='all'|'hot'|'iced'|'cold';

export function BrewMyCoffee({userId,coffees,profile,login,browse,openRecipe}:{userId:string|null;coffees:CoffeeItem[];profile:Profile;login:()=>void;browse:()=>void;openRecipe:(r:RecipeItem)=>void}) {
  const locale=useContext(Language);const ar=locale==='ar';
  const [inventory,setInventory]=useState<InventoryRow[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [selectedId,setSelectedId]=useState<string|null>(null);const [method,setMethod]=useState<Method|undefined>();const [methodTouched,setMethodTouched]=useState(false);const [serving,setServing]=useState<Serving>('all');
  const [candidates,setCandidates]=useState<Candidate[]>([]);const [recipesBusy,setRecipesBusy]=useState(false);

  useEffect(()=>{let active=true;const client=supabase;if(!userId||!client){setInventory([]);return;}setBusy(true);setError('');
    const run=async()=>{try{
      const {data,error}=await client.from('user_bean_inventory').select('id,roasted_product_id,legacy_bean_id,preferred_recipe_id,last_grind_setting,remaining_weight_grams,opened_at,updated_at').eq('user_id',userId).order('opened_at',{ascending:false,nullsFirst:false}).order('updated_at',{ascending:false});
      if(!active)return;if(error)throw error;const rows=((data??[]) as InventoryRow[]).filter(row=>row.remaining_weight_grams!==0);setInventory(rows);setSelectedId(current=>current&&rows.some(r=>r.id===current)?current:(rows[0]?.id??null));
    }catch{if(active)setError(ar?'تعذّر تحميل أكياسك.':'Could not load your bags.');}finally{if(active)setBusy(false);}};
    void run();return()=>{active=false;};
  },[userId,ar]);

  const selected=inventory.find(row=>row.id===selectedId)??null;
  const coffeeFor=(row:InventoryRow|null)=>row?coffees.find(c=>row.roasted_product_id?c.kind==='product'&&c.id===row.roasted_product_id:(c.beanId??c.id)===row.legacy_bean_id)??null:null;
  const coffee=coffeeFor(selected);
  const availableMethods=useMemo(()=>[...new Set([...(coffee?.methods??[]),...candidates.map(row=>row.recipe.method)].filter(isMethod))],[coffee,candidates]);

  useEffect(()=>{if(!availableMethods.length){setMethod(undefined);return;}const preferred=(candidates.find(row=>row.recipe.id===selected?.preferred_recipe_id)??candidates[0])?.recipe.method;if(!methodTouched&&preferred&&availableMethods.includes(preferred)){setMethod(preferred);return;}setMethod(current=>current&&availableMethods.includes(current)?current:availableMethods[0]);},[selectedId,availableMethods.join('|'),selected?.preferred_recipe_id,methodTouched,candidates]);

  useEffect(()=>{let active=true;const client=supabase;if(!selected||!client){setCandidates([]);return;}setRecipesBusy(true);setError('');
    const run=async()=>{try{
      const queries:PromiseLike<{data:unknown;error:unknown}>[]=[];
      if(selected.roasted_product_id) queries.push(client.from('recipes').select(`${RECIPE_FIELDS},serving_style`).eq('visibility','public').eq('roasted_product_id',selected.roasted_product_id).order('updated_at',{ascending:false}).limit(24));
      const beanId=coffee?.beanId??selected.legacy_bean_id;
      if(beanId) queries.push(client.from('recipes').select(`${RECIPE_FIELDS},serving_style`).eq('visibility','public').eq('bean_id',beanId).order('updated_at',{ascending:false}).limit(24));
      if(selected.preferred_recipe_id) queries.push(client.from('recipes').select(`${RECIPE_FIELDS},serving_style`).eq('visibility','public').eq('id',selected.preferred_recipe_id).limit(1));
      const results=await Promise.all(queries);
      if(!active)return;
      const rows:Candidate[]=[];
      for(const result of results){
        if(result.error)continue;
        for(const raw of (result.data??[]) as (RecipeRow & {serving_style?:string|null})[]){
          const recipe=mapRecipe(raw,locale);if(!recipe)continue;
          rows.push({recipe,style:raw.serving_style??null,exact:Boolean(selected.roasted_product_id&&recipe.productId===selected.roasted_product_id)});
        }
      }
      const dedup=[...new Map(rows.map(row=>[row.recipe.id,row])).values()];
      dedup.sort((a,b)=>{
        const prefA=a.recipe.id===selected.preferred_recipe_id?1:0,prefB=b.recipe.id===selected.preferred_recipe_id?1:0;
        if(prefA!==prefB)return prefB-prefA;
        if(a.exact!==b.exact)return Number(b.exact)-Number(a.exact);
        if(a.recipe.incomplete!==b.recipe.incomplete)return Number(a.recipe.incomplete)-Number(b.recipe.incomplete);
        return a.recipe.title.localeCompare(b.recipe.title);
      });
      setCandidates(dedup);
    }catch{if(active)setError(ar?'تعذّر تحميل وصفات هذا الكيس.':'Could not load recipes for this bag.');}finally{if(active)setRecipesBusy(false);}};
    void run();return()=>{active=false;};
  },[selectedId,coffee?.beanId,locale]);

  const visibleBase=candidates.filter(row=>(!method||row.recipe.method===method)&&(serving==='all'||row.style===serving));
  const personalizedRanks=new Map(recommendRecipes(visibleBase.map(row=>row.recipe),profile,method,24).map((row,index)=>[row.item.id,{rank:row.rank,reasons:row.reasons,index}]));
  const visible=[...visibleBase].sort((a,b)=>{
    const prefA=a.recipe.id===selected?.preferred_recipe_id?1:0,prefB=b.recipe.id===selected?.preferred_recipe_id?1:0;
    if(prefA!==prefB)return prefB-prefA;
    if(a.exact!==b.exact)return Number(b.exact)-Number(a.exact);
    const rankA=personalizedRanks.get(a.recipe.id)?.rank??-999,rankB=personalizedRanks.get(b.recipe.id)?.rank??-999;
    if(rankA!==rankB)return rankB-rankA;
    return a.recipe.title.localeCompare(b.recipe.title);
  });
  const recommended=visible[0]??null;
  const recommendedReasons=recommended?personalizedRanks.get(recommended.recipe.id)?.reasons??[]:[];

  if(!userId)return <View style={s.center}><Icon name="play" size={40} color={colors.teal}/><Txt heading style={styles.title}>{ar?'حضّر قهوتي':'Brew my coffee'}</Txt><Txt style={[styles.muted,{textAlign:'center'}]}>{ar?'سجّل دخولك عشان نبدأ من الكيس اللي عندك ونرجع لأفضل إعداداتك.':'Sign in so BeanMora can start from a bag you own and your saved settings.'}</Txt><Pressable accessibilityRole="button" onPress={login} style={s.primary}><Txt style={s.primaryText}>{ar?'تسجيل الدخول':'Sign in'}</Txt></Pressable></View>;

  return <ScrollView contentContainerStyle={s.page}>
    <View style={s.header}><View style={{flex:1}}><Txt heading style={styles.title}>{ar?'حضّر قهوتي':'Brew my coffee'}</Txt><Txt style={styles.muted}>{ar?'اختَر كيسك، وبعدها نضيق الخيارات للوصفات المرتبطة فعليًا بنفس البن.':'Choose your bag, then BeanMora narrows the list to recipes actually linked to that coffee.'}</Txt></View><View style={s.headerIcon}><Icon name="play" size={26} color={colors.teal}/></View></View>

    {busy?<ActivityIndicator color={colors.teal}/>:inventory.length?<><Txt style={s.sectionTitle}>{ar?'1. اختَر الكيس':'1. Choose your bag'}</Txt><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.bags}>{inventory.map(row=>{const item=coffeeFor(row);if(!item)return null;const active=row.id===selectedId;return <Pressable key={row.id} accessibilityRole="button" accessibilityState={{selected:active}} onPress={()=>{setSelectedId(row.id);setServing('all');setMethod(undefined);setMethodTouched(false);}} style={[s.bagCard,active&&s.bagCardActive]}><View style={s.bagPhoto}><CoffeePhoto uri={item.imageUrl} uris={item.images} kind={item.imageKind}/></View><Txt numberOfLines={2} style={[s.bagName,active&&{color:'#FFF'}]}>{item.name}</Txt><Txt numberOfLines={1} style={[s.bagMeta,active&&{color:'#E8F5F3'}]}>{row.remaining_weight_grams!==null?row.remaining_weight_grams+' g':ar?'الوزن غير محدد':'Weight not set'}</Txt></Pressable>})}</ScrollView></>:<View style={s.empty}><Txt style={s.emptyTitle}>{ar?'أكياسي فاضية':'My Bags is empty'}</Txt><Txt style={styles.muted}>{ar?'أضف كيسًا من صفحة البن أولًا، وبعدها نقدر نبني التحضير عليه.':'Add a bag from a coffee page first, then BeanMora can build your brew around it.'}</Txt><Pressable accessibilityRole="button" onPress={browse} style={s.secondary}><Txt style={s.secondaryText}>{ar?'اكتشف البن':'Discover coffee'}</Txt><Icon name="search" size={17} color={colors.brown}/></Pressable></View>}

    {selected&&coffee?<><View style={s.selectedCard}><View style={s.selectedPhoto}><CoffeePhoto uri={coffee.imageUrl} uris={coffee.images} kind={coffee.imageKind}/></View><View style={{flex:1,gap:3}}><Txt style={s.selectedName}>{coffee.name}</Txt><Txt style={styles.muted}>{coffee.roaster}</Txt>{selected.last_grind_setting?<Txt style={s.savedSetting}>{ar?'آخر طحنة: ':'Last grind: '}{selected.last_grind_setting}</Txt>:null}</View></View>

      <Txt style={s.sectionTitle}>{ar?'2. طريقة التحضير':'2. Brew method'}</Txt>
      {availableMethods.length?<MethodPicker value={method} onChange={m=>{if(m){setMethod(m);setMethodTouched(true);}}} allowed={availableMethods} all={false}/>:<Txt style={styles.muted}>{ar?'ما عندنا طريقة تحضير مرتبطة بهالبن للحين.':'No brew method is linked to this coffee yet.'}</Txt>}

      <Txt style={s.sectionTitle}>{ar?'3. التقديم':'3. Serving style'}</Txt>
      <View style={s.servingRow}>{([
        ['all',ar?'الكل':'Any'],['hot',ar?'حار':'Hot'],['iced',ar?'مثلّج':'Iced'],['cold',ar?'بارد':'Cold']
      ] as const).map(([id,label])=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:serving===id}} onPress={()=>setServing(id)} style={[s.serving,serving===id&&s.servingActive]}><Txt style={[s.servingText,serving===id&&{color:'#FFF'}]}>{label}</Txt></Pressable>)}</View>

      <Txt style={s.sectionTitle}>{ar?'4. أفضل نقطة بداية':'4. Best starting point'}</Txt>
      {recipesBusy?<ActivityIndicator color={colors.teal}/>:recommended?<View style={s.recommend}><View style={s.recommendTop}><View style={s.recommendIcon}><Icon name={recommended.recipe.method} size={25} color={colors.teal}/></View><View style={{flex:1,gap:3}}><Txt style={s.recommendTitle}>{recommended.recipe.title}</Txt><Txt style={styles.muted}>{methods[locale][recommended.recipe.method]}{recommended.recipe.id===selected.preferred_recipe_id?(ar?' · أفضل وصفة محفوظة':' · Saved best recipe'):recommended.exact?(ar?' · مطابقة لهذا المنتج':' · Exact product match'):recommendedReasons.includes('exactEquipment')?(ar?' · مطابقة لمعداتك':' · Matches your equipment'):recommendedReasons.includes('gearMethod')?(ar?' · مناسبة لطريقتك':' · Fits your brew gear'):''}</Txt></View></View><View testID="bag-brew-facts" style={s.metrics}>{recipeQuickFacts(recommended.recipe,ar).map(fact=><Metric key={fact.key} label={fact.label} value={fact.value}/>)}</View><Pressable accessibilityRole="button" onPress={()=>openRecipe(recommended.recipe)} style={s.primary}><Txt style={s.primaryText}>{ar?'ابدأ بهذه الوصفة':'Start this recipe'}</Txt><Icon name="play" size={17} color="#FFF"/></Pressable></View>:<View style={s.empty}><Txt style={s.emptyTitle}>{ar?'ما لقينا وصفة مطابقة بهالشروط':'No exact recipe matches these choices'}</Txt><Txt style={styles.muted}>{ar?'جرّب طريقة تقديم ثانية أو افتح مكتبة الوصفات لهذا البن من صفحة البن.':'Try another serving style or open this coffee page to browse more recipes.'}</Txt></View>}

      {visible.length>1?<View style={s.more}><Txt style={s.sectionTitle}>{ar?'بدائل مناسبة':'Other matching recipes'}</Txt>{visible.slice(1,6).map(row=><Pressable key={row.recipe.id} accessibilityRole="button" accessibilityLabel={row.recipe.title} onPress={()=>openRecipe(row.recipe)} style={s.recipeRow}><Icon name={row.recipe.method} size={20} color={colors.copper}/><View style={{flex:1}}><Txt numberOfLines={2} style={s.recipeTitle}>{row.recipe.title}</Txt><Txt style={styles.muted}>{methods[locale][row.recipe.method]}</Txt></View><Icon name="arrow" size={17}/></Pressable>)}</View>:null}
    </>:null}
    {error?<Txt style={styles.warning}>{error}</Txt>:null}
  </ScrollView>;
}
function Metric({label,value}:{label:string;value:string}){return <View style={s.metric}><Txt style={s.metricValue}>{value}</Txt><Txt style={s.metricLabel}>{label}</Txt></View>}

const s=StyleSheet.create({
  page:{width:'100%',maxWidth:920,alignSelf:'center',paddingHorizontal:18,paddingTop:14,paddingBottom:30,gap:16},
  center:{flex:1,maxWidth:520,width:'100%',alignSelf:'center',padding:28,alignItems:'center',justifyContent:'center',gap:14},
  header:{flexDirection:'row',alignItems:'center',gap:12},headerIcon:{width:54,height:54,borderRadius:27,backgroundColor:'#E7F2F0',alignItems:'center',justifyContent:'center'},
  sectionTitle:{fontSize:16,lineHeight:23,fontWeight:'800'},bags:{gap:9,paddingBottom:2},bagCard:{width:132,minHeight:172,borderRadius:17,borderWidth:1,borderColor:colors.line,backgroundColor:colors.paper,padding:9,gap:7},bagCardActive:{backgroundColor:colors.teal,borderColor:colors.teal},bagPhoto:{height:92,borderRadius:12,overflow:'hidden'},bagName:{fontSize:12,lineHeight:18,fontWeight:'800'},bagMeta:{fontSize:10,lineHeight:15,color:colors.muted},
  selectedCard:{flexDirection:'row',gap:12,alignItems:'center',backgroundColor:'#F4EADD',borderRadius:18,padding:12},selectedPhoto:{width:72,height:82,borderRadius:13,overflow:'hidden'},selectedName:{fontSize:17,lineHeight:24,fontWeight:'800'},savedSetting:{fontSize:11,lineHeight:17,fontWeight:'800',color:colors.teal},
  servingRow:{flexDirection:'row',flexWrap:'wrap',gap:8},serving:{minHeight:42,borderRadius:999,borderWidth:1,borderColor:colors.line,backgroundColor:colors.paper,paddingHorizontal:15,alignItems:'center',justifyContent:'center'},servingActive:{backgroundColor:colors.brown,borderColor:colors.brown},servingText:{fontSize:12,lineHeight:18,fontWeight:'800'},
  recommend:{backgroundColor:colors.paper,borderWidth:1,borderColor:'#D8C7B3',borderRadius:21,padding:15,gap:13},recommendTop:{flexDirection:'row',alignItems:'center',gap:11},recommendIcon:{width:48,height:48,borderRadius:16,backgroundColor:'#EAF5F3',alignItems:'center',justifyContent:'center'},recommendTitle:{fontSize:17,lineHeight:24,fontWeight:'800'},
  metrics:{flexDirection:'row',flexWrap:'wrap',gap:8},metric:{width:'48%',backgroundColor:'#F8F2E9',borderRadius:12,padding:9},metricValue:{fontSize:13,lineHeight:19,fontWeight:'800',writingDirection:'ltr',textAlign:'left'},metricLabel:{fontSize:10,lineHeight:15,color:colors.muted},
  primary:{minHeight:50,borderRadius:15,backgroundColor:colors.teal,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},primaryText:{color:'#FFF',fontSize:14,lineHeight:20,fontWeight:'800'},secondary:{minHeight:46,borderRadius:14,borderWidth:1,borderColor:colors.line,backgroundColor:'#FFF9F0',paddingHorizontal:15,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},secondaryText:{fontSize:13,lineHeight:19,fontWeight:'800',color:colors.brown},
  more:{gap:9},recipeRow:{minHeight:58,borderRadius:15,borderWidth:1,borderColor:colors.line,backgroundColor:colors.paper,padding:11,flexDirection:'row',alignItems:'center',gap:10},recipeTitle:{fontSize:13,lineHeight:20,fontWeight:'800'},
  empty:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:18,padding:18,gap:7,alignItems:'center'},emptyTitle:{fontSize:16,lineHeight:23,fontWeight:'800',textAlign:'center'},
});
