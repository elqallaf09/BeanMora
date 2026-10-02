import { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, FlatList, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Share, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import type { Session } from '@supabase/supabase-js';
import { configured, supabase } from './src/client';
import { loadData, type Bundle, type CoffeeItem, type RecipeItem } from './src/data';
import { recommendCoffees, recommendRecipes, type Method } from './src/core/engine';
import { copy, caveats, methods, reasons, type Locale } from './src/copy';
import { searchText, safeUrl } from './src/guards';
import { OutcomeForm } from './src/OutcomeForm';
import { AccountScreen, finishOAuth } from './src/AccountScreen';
import { CoffeeCard, CoffeeDetail, CoffeePhoto, Home, MethodPicker, SectionTitle, coffeeStyles } from './src/CoffeeScreens';
import { Action, Brand, Field, Icon, IconButton, Language, Txt, colors, styles, type IconName } from './src/ui';

type Tab = 'home' | 'beans' | 'recipes' | 'forYou' | 'favorites' | 'account';
type Detail = { type: 'coffee'; item: CoffeeItem } | { type: 'recipe'; item: RecipeItem };
type Loaded = Bundle & { owner: string | null; locale: Locale };
function RecipeDetail({ recipe, record }: { recipe: RecipeItem; record: () => void }) {
  const locale=useContext(Language); const t=copy[locale]; const ar=locale==='ar'; const [linkError,setLinkError]=useState(false);
  async function openSource() { if(!recipe.videoUrl)return;try{await Linking.openURL(recipe.videoUrl);}catch{setLinkError(true);} }
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[coffeeStyles.page,{maxWidth:780}]}>
    <View style={{height:230,borderRadius:18,overflow:'hidden'}}><CoffeePhoto uri={recipe.coverUrl} seed={recipe.id} detail/></View>
    <Txt style={styles.muted}>{methods[locale][recipe.method]}</Txt><Txt heading style={styles.title}>{recipe.title}</Txt>
    <View style={styles.card}><View style={styles.row}>{[{icon:'bean' as const,value:recipe.dose,label:t.dose},{icon:'drop' as const,value:recipe.water,label:t.water},{icon:'temp' as const,value:recipe.temperature,label:ar?'درجة الحرارة':'Temperature'}].map(n=><View key={n.icon} style={{flex:1,alignItems:'center',gap:5}}><Icon name={n.icon}/><Txt style={{fontFamily:undefined,fontWeight:'700'}}>{n.value??'—'}{n.value?(n.icon==='temp'?'°C':' g'):''}</Txt><Txt style={[styles.muted,{fontSize:11,textAlign:'center'}]}>{n.label}</Txt></View>)}</View></View>
    {recipe.notes?<Txt>{recipe.notes}</Txt>:null}
    {recipe.method==='xbloom'&&recipe.xBloom?<View style={styles.card}><Txt heading style={styles.subtitle}>xBloom</Txt><Txt>{ar?'ملف التحضير المتوافق':'Compatible brew profile'}: {recipe.xBloom.deviceModel}</Txt>{recipe.xBloom.grindSetting?<Txt>{ar?'الطحنة':'Grind'}: {recipe.xBloom.grindSetting}</Txt>:null}{Array.isArray(recipe.xBloom.pours)?recipe.xBloom.pours.map((p:any,i:number)=><View key={i} style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:6}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:colors.brown}}/><Txt>{ar?'الصبة ':'Pour '}{i+1}: {[p?.water_grams??p?.grams??p?.amount,p?.duration_seconds??p?.seconds].filter(v=>v!=null).join(' · ')}</Txt></View>):null}</View>:null}
    <Txt heading style={styles.subtitle}>{t.instructions}</Txt>{recipe.steps.length?recipe.steps.map(step=><View key={step.number} style={styles.card}><Txt style={{fontWeight:'700'}}>{step.number}. {step.title}</Txt><Txt>{step.description}</Txt></View>):<Txt style={styles.warning}>{t.noSteps}</Txt>}
    {recipe.videoUrl?<Action title={ar?'فتح رابط الوصفة':'Open recipe link'} onPress={()=>void openSource()}/>:null}{linkError?<Txt style={styles.error}>{t.sourceError}</Txt>:null}
    <Action title={t.record} onPress={record} selected/>
  </ScrollView>;
}
function Shell() {
  const {width}=useWindowDimensions(); const [locale,setLocale]=useState<Locale>('ar'); const t=copy[locale]; const ar=locale==='ar';
  const [session,setSession]=useState<Session|null>(null); const userId=session&&!session.user.is_anonymous?session.user.id:null;
  const [tab,setTab]=useState<Tab>('home'); const [method,setMethod]=useState<Method>(); const [search,setSearch]=useState('');
  const [detail,setDetail]=useState<Detail|null>(null); const [parentCoffee,setParentCoffee]=useState<CoffeeItem|null>(null); const [recording,setRecording]=useState(false);
  const [bundle,setBundle]=useState<Loaded|null>(null); const [refreshing,setRefreshing]=useState(false); const [revision,setRevision]=useState(0);
  const [visibleCount,setVisibleCount]=useState(30); const [saved,setSaved]=useState<{owner:string;ids:string[]}|null>(null);
  const savePending=useRef(new Set<string>()); const identity=useRef(userId); identity.current=userId;
  const [equipmentBusy,setEquipmentBusy]=useState(false); const [equipment,setEquipment]=useState<{name:string;source_url:string|null}[]|null>(null); const equipmentRead=useRef(0);
  const [message,setMessage]=useState(''); const [notifications,setNotifications]=useState<string[]|null>(null);
  const [fontsLoaded,fontError]=useFonts({'Tajawal-Regular':require('./assets/fonts/Tajawal-Regular.ttf'),'Tajawal-Bold':require('./assets/fonts/Tajawal-Bold.ttf')});
  useEffect(()=>{
    if(!supabase)return;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,value)=>setSession(value));
    const apply=(state:string)=>{if(state==='active')supabase?.auth.startAutoRefresh();else supabase?.auth.stopAutoRefresh();};
    apply(AppState.currentState); const listener=AppState.addEventListener('change',apply);
    const callback=Linking.addEventListener('url',event=>{void finishOAuth(event.url).catch(()=>setMessage(t.authError));});
    void Linking.getInitialURL().then(url=>url?finishOAuth(url):undefined).catch(()=>setMessage(t.authError));
    return()=>{subscription.unsubscribe();listener.remove();callback.remove();supabase?.auth.stopAutoRefresh();};
  },[]);
  useEffect(()=>{
    let active=true;setRefreshing(true);setBundle(null);
    if(!supabase){setRefreshing(false);return;}
    loadData(supabase,locale,userId).then(data=>{if(active)setBundle({...data,owner:userId,locale});}).catch(()=>{if(active)setBundle(null);}).finally(()=>{if(active)setRefreshing(false);});
    return()=>{active=false;};
  },[locale,userId,revision]);
  // Never render another identity's personalized results or saves while its read is pending.
  const data=bundle?.owner === userId && bundle.locale===locale?bundle:null;
  useEffect(()=>{if(data&&userId)setSaved({owner:userId,ids:data.savedBeanIds});else setSaved(null);},[data,userId]);
  const savedIds=saved?.owner===userId?saved.ids:[];
  function navigate(next:Tab){setDetail(null);setParentCoffee(null);setRecording(false);setTab(next);setSearch('');}
  function back(){if(recording)setRecording(false);else if(parentCoffee){setDetail({type:'coffee',item:parentCoffee});setParentCoffee(null);}else if(detail)setDetail(null);else navigate('home');}
  useEffect(()=>{
    const listener=BackHandler.addEventListener('hardwareBackPress',()=>{if(recording||detail||tab!=='home'){back();return true;}return false;});
    return()=>listener.remove();
  },[recording,detail,parentCoffee,tab]);
  useEffect(()=>setVisibleCount(30),[tab,method,search]);
  const filter=searchText(search);
  const matchesMethod=(c:CoffeeItem)=>!method||c.methods.includes(method)||!!data?.recipes.some(r=>r.method===method&&(r.productId===c.id||r.beanId===(c.beanId??c.id)));
  const coffees=data?.coffees.filter(c=>c.reviewed&&c.published&&matchesMethod(c)&&searchText([c.name,c.roaster,c.origin,...c.flavors].join(' ')).includes(filter))??[];
  const recipes=data?.recipes.filter(r=>r.public&&(!method||r.method===method)&&searchText([r.title,...r.flavors].join(' ')).includes(filter))??[];
  const rankedCoffee=data?recommendCoffees(data.coffees,data.profile,Date.now(),method):[];
  const rankedRecipes=data?recommendRecipes(data.recipes,data.profile,method):[];
  const refresh=()=>setRevision(n=>n+1);
  const openCoffee=(item:CoffeeItem)=>{setParentCoffee(null);setDetail({type:'coffee',item});};
  function startRecord(){if(!userId){navigate('account');}else setRecording(true);}
  async function saveCoffee(item:CoffeeItem){
    if(!userId||!supabase){navigate('account');return;}
    const beanId=item.beanId;if(!beanId){setMessage(ar?'حفظ هذا المنتج غير متاح بعد.':'Saving this product is not available yet.');return;}
    const owner=userId;const key=owner+beanId;if(savePending.current.has(key))return;savePending.current.add(key);
    const exists=savedIds.includes(beanId);
    try{
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(authError||auth.user?.id!==owner)throw new Error(t.loginFirst);
      const result=exists?await supabase.from('bean_saves').delete().eq('user_id',owner).eq('bean_id',beanId):await supabase.from('bean_saves').upsert({user_id:owner,bean_id:beanId},{onConflict:'bean_id,user_id'});
      if(result.error)throw result.error;
      if(identity.current===owner)setSaved(current=>({owner,ids:exists?(current?.owner===owner?current.ids:[]).filter(id=>id!==beanId):Array.from(new Set([...(current?.owner===owner?current.ids:[]),beanId]))}));
    }catch{if(identity.current===owner)setMessage(ar?'تعذّر حفظ المفضلة. حاول مرة ثانية.':'Could not update favorites. Try again.');}finally{savePending.current.delete(key);}
  }
  async function showTools(category:'all'|'xbloom'|'grinder'|'scale'){
    if(category==='xbloom'){setMethod('xbloom');navigate('recipes');return;}
    if(!supabase)return;
    const read=++equipmentRead.current;setEquipment([]);setEquipmentBusy(true);
    let query=supabase.from('equipment_models').select('name,source_url').order('name').limit(200);
    if(category!=='all')query=query.eq('category',category);
    const {data:rows,error}=await query;
    if(read!==equipmentRead.current)return;
    setEquipmentBusy(false);
    if(error){setEquipment(null);setMessage(ar?'تعذّر تحميل الأدوات.':'Could not load equipment.');return;}
    setEquipment((rows??[]).map(row=>({name:row.name,source_url:safeUrl(row.source_url)})));
  }
  async function showNotifications(){
    if(!userId||!supabase){navigate('account');return;}
    setNotifications([t.loading]);const owner=userId;
    const {data:rows,error}=await supabase.from('notifications').select('type,entity_type,created_at').eq('user_id',owner).order('created_at',{ascending:false}).limit(20);
    if(identity.current!==owner){setNotifications(null);return;}
    if(error){setNotifications(null);setMessage(ar?'تعذّر تحميل التنبيهات.':'Could not load notifications.');return;}
    setNotifications((rows??[]).map(row=>[(ar?'نشاط جديد':'New activity'),new Date(row.created_at).toLocaleDateString(locale+'-u-nu-latn')].join(' · ')));
  }
  const login=tab==='account'&&!userId&&!detail;
  const nav:{tab:Tab;icon:IconName;label:string}[]=[
    {tab:'home',icon:'home',label:ar?'الرئيسية':'Home'},{tab:'beans',icon:'search',label:ar?'اكتشف':'Discover'},{tab:'recipes',icon:'plus',label:ar?'تحضير':'Brew'},{tab:'favorites',icon:'heart',label:ar?'المفضلة':'Favorites'},{tab:'account',icon:'user',label:t.account},
  ];
  const columns=width>=850?4:width>=600?3:2;const cardWidth=(Math.min(width,1120)-36-(columns-1)*12)/columns;
  const displayCoffee=tab==='favorites'?coffees.filter(c=>savedIds.includes(c.beanId??c.id)):coffees;
  if(!fontsLoaded&&!fontError)return <View style={[styles.fill,{alignItems:'center',justifyContent:'center'}]}><ActivityIndicator color={colors.brown}/></View>;
  return <Language.Provider value={locale}><SafeAreaView style={styles.fill} edges={login?['left','right','bottom']:undefined}>
    <StatusBar barStyle={login?'light-content':'dark-content'}/>
    {!login?<View style={s.header}>{detail?<><IconButton name="back" label={t.back} onPress={back}/><View style={{flex:1}}/><IconButton name="heart" label={ar?'المفضلة':'Favorites'} onPress={()=>detail.type==='coffee'?void saveCoffee(detail.item):navigate('favorites')}/><IconButton name="share" label={ar?'مشاركة':'Share'} onPress={()=>void Share.share({message:detail.type==='coffee'?detail.item.name:detail.item.title}).catch(()=>setMessage(t.sourceError))}/></>:<><View style={[s.languages,{width:width<600?Math.max(92,Math.min(180,width*0.30)):204}]}>{(['ar','en'] as const).map(lang=><Pressable key={lang} accessibilityRole="button" accessibilityLabel={lang==='ar'?'العربية':'English'} accessibilityState={{selected:locale===lang}} onPress={()=>{setLocale(lang);setDetail(null);setParentCoffee(null);setRecording(false);}} style={[s.language,locale===lang&&{backgroundColor:colors.brown}]}><Txt style={{fontSize:width<500?11:14,textAlign:'center',color:locale===lang?'#FFF':colors.ink,fontWeight:locale===lang?'700':'400'}}>{lang==='ar'?'العربية':'English'}</Txt></Pressable>)}</View><Brand/><View style={[s.headerActions,{width:width<500?80:150}]}><IconButton name="search" label={ar?'البحث':'Search'} onPress={()=>navigate('beans')}/>{width>=400?<IconButton name="bell" label={ar?'التنبيهات':'Notifications'} onPress={()=>void showNotifications()}/>:null}<IconButton name="user" label={ar?'فتح حسابي':'Open account'} onPress={()=>navigate('account')}/></View></>}</View>:null}
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    {!configured?<View style={styles.content}><Txt heading style={styles.title}>{t.setup}</Txt><Txt>{t.setupNote}</Txt></View>
    :recording&&detail?.type==='recipe'&&userId?<OutcomeForm key={userId+detail.item.id} userId={userId} recipe={detail.item} done={()=>{navigate('forYou');refresh();}}/>
    :detail?.type==='coffee'?<CoffeeDetail key={detail.item.id+locale} item={detail.item} recipes={data?.recipes??[]} openRecipe={recipe=>{setParentCoffee(detail.item as CoffeeItem);setDetail({type:'recipe',item:recipe});}}/>
    :detail?.type==='recipe'?<RecipeDetail recipe={detail.item} record={startRecord}/>
    :tab==='account'?<AccountScreen key={userId??'public'} session={userId?session:null} back={()=>navigate('home')}/>
    :tab==='home'?<Home data={data} coffees={coffees} method={method} setMethod={setMethod} openCoffee={openCoffee} browse={()=>navigate('beans')} brew={()=>navigate('recipes')} tools={category=>void showTools(category)} saved={savedIds} save={item=>void saveCoffee(item)} refresh={refresh} refreshing={refreshing}/>
    :tab==='forYou'?<ScrollView contentContainerStyle={coffeeStyles.page}><View style={s.catalogTabs}><Action title={t.beans} onPress={()=>navigate('beans')}/><Action title={t.recipes} onPress={()=>navigate('recipes')}/><Action title={t.forYou} onPress={()=>{}} selected/></View><Txt heading style={styles.title}>{t.forYou}</Txt><Txt style={styles.muted}>{t.ruleNote}</Txt><SectionTitle title={t.beans}/>{rankedCoffee.length?rankedCoffee.map(row=><View key={row.item.kind+row.item.id} style={styles.card}><Action title={row.item.name} onPress={()=>{const item=data?.coffees.find(c=>c.id===row.item.id&&c.kind===row.item.kind);if(item)openCoffee(item);}}/><Txt>{t.matching}: {row.reasons.length?row.reasons.map(r=>reasons[locale][r]).join(' · '):t.general}</Txt>{row.caveats.map(c=><Txt key={c} style={styles.muted}>{caveats[locale][c]}</Txt>)}</View>):<Txt>{t.empty}</Txt>}<SectionTitle title={t.recipes}/>{rankedRecipes.map(row=><View key={row.item.id} style={styles.card}><Action title={row.item.title} onPress={()=>{const item=data?.recipes.find(r=>r.id===row.item.id);if(item)setDetail({type:'recipe',item});}}/><Txt>{t.matching}: {row.reasons.length?row.reasons.map(r=>reasons[locale][r]).join(' · '):t.general}</Txt></View>)}</ScrollView>
    :<FlatList key={tab+columns} numColumns={columns} data={(tab==='recipes'?recipes:displayCoffee).slice(0,visibleCount) as (CoffeeItem|RecipeItem)[]} keyExtractor={item=>('kind'in item?item.kind:'recipe')+item.id} columnWrapperStyle={{gap:12}} contentContainerStyle={[coffeeStyles.page,{gap:12}]} refreshing={refreshing} onRefresh={refresh} ListHeaderComponent={<View style={{gap:16,marginBottom:4}}>{tab!=='favorites'?<View style={s.catalogTabs}><Action title={t.beans} onPress={()=>navigate('beans')} selected={tab==='beans'}/><Action title={t.recipes} onPress={()=>navigate('recipes')} selected={tab==='recipes'}/><Action title={t.forYou} onPress={()=>navigate('forYou')}/></View>:null}<Txt heading style={styles.title}>{tab==='favorites'?(ar?'المفضلة':'Favorites'):tab==='recipes'?t.recipes:t.beans}</Txt><MethodPicker value={method} onChange={setMethod}/><Field label={t.search} value={search} onChangeText={setSearch} placeholder={ar?'ابحث عن البن أو المحمصة أو البلد…':'Search coffee, roaster or origin…'}/>{data?.warnings||!data&&!refreshing?<Txt style={styles.warning}>{t.partial}</Txt>:null}{data?.limited?<Txt style={styles.warning}>{t.limited}</Txt>:null}</View>} ListEmptyComponent={<Txt style={styles.muted}>{refreshing?t.loading:tab==='favorites'&&!userId?t.loginFirst:tab==='favorites'?(ar?'احفظ حبوبك المفضلة بالضغط على القلب.':'Save your favorite coffees with the heart button.'):t.empty}</Txt>} ListFooterComponent={<View style={{gap:10,marginTop:10}}>{(tab==='recipes'?recipes:displayCoffee).length>visibleCount?<Action title={ar?'عرض المزيد':'Load more'} onPress={()=>setVisibleCount(n=>n+30)} selected/>:null}<Action title={t.refresh} onPress={refresh}/></View>} renderItem={({item})=>'kind'in item?<CoffeeCard item={item} width={cardWidth} saved={savedIds.includes(item.beanId??item.id)} open={()=>openCoffee(item)} save={()=>void saveCoffee(item)}/>:<Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={()=>setDetail({type:'recipe',item})} style={[styles.card,{width:cardWidth,padding:0,overflow:'hidden'}]}><View style={{height:120}}><CoffeePhoto uri={item.coverUrl} seed={item.id}/></View><View style={{padding:12,gap:6}}><Txt style={styles.muted}>{methods[locale][item.method]}</Txt><Txt numberOfLines={3} style={{fontWeight:'700',fontSize:15}}>{item.title}</Txt><Txt style={{fontSize:12}}>{item.dose??'—'} g · {item.water??'—'} g</Txt></View></Pressable>}/>}
    </KeyboardAvoidingView>
    {!detail&&!login&&configured?<View style={s.nav}><View style={s.navInner}>{nav.map(item=><Pressable key={item.tab} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{selected:tab===item.tab}} onPress={()=>navigate(item.tab)} style={s.navItem}><Icon name={item.icon} filled={tab===item.tab} color={tab===item.tab?colors.brown:colors.muted} size={23}/><Txt style={{fontSize:11,lineHeight:20,fontWeight:tab===item.tab?'700':'400',color:tab===item.tab?colors.brown:colors.muted,textAlign:'center'}}>{item.label}</Txt></Pressable>)}</View></View>:null}
    <Modal visible={!!message||notifications!==null||equipment!==null} transparent animationType="fade" onRequestClose={()=>{setMessage('');setNotifications(null);setEquipment(null);equipmentRead.current++;}}><View style={s.modalShade}><View style={s.modal}><Txt heading style={styles.subtitle}>{equipment!==null?(ar?'أدوات القهوة':'Coffee equipment'):notifications!==null?(ar?'التنبيهات':'Notifications'):'BeanMora'}</Txt><ScrollView style={{maxHeight:350}}>{message?<Txt>{message}</Txt>:equipment!==null?equipment.length?equipment.map((e,i)=><View key={i} style={{paddingVertical:10,gap:6}}><Txt style={{fontWeight:'700'}}>{e.name}</Txt>{e.source_url?<Action title={ar?'عرض التفاصيل':'View details'} onPress={()=>void Linking.openURL(e.source_url!).catch(()=>setMessage(t.sourceError))}/>:null}</View>):<Txt style={styles.muted}>{equipmentBusy?(ar?'جارٍ تحميل الأدوات…':'Loading equipment…'):(ar?'لا توجد أدوات مسجلة لهذه الفئة.':'No equipment is listed for this category.')}</Txt>:notifications?.length?notifications.map((n,i)=><Txt key={i} style={{paddingVertical:10}}>{n}</Txt>):<Txt style={styles.muted}>{ar?'لا توجد تنبيهات حالياً.':'No notifications right now.'}</Txt>}</ScrollView><Action title={ar?'إغلاق':'Close'} onPress={()=>{setMessage('');setNotifications(null);setEquipment(null);equipmentRead.current++;}} selected/></View></View></Modal>
  </SafeAreaView></Language.Provider>;
}
export default function App(){return <SafeAreaProvider><Shell/></SafeAreaProvider>;}
const s=StyleSheet.create({
  header:{width:'100%',maxWidth:1120,alignSelf:'center',minHeight:92,paddingHorizontal:18,paddingVertical:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  languages:{flexDirection:'row',gap:6},language:{flex:1,borderRadius:999,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,minHeight:42,alignItems:'center',justifyContent:'center'},
  headerActions:{flexDirection:'row',justifyContent:'flex-end',alignItems:'center'},
  catalogTabs:{flexDirection:'row',gap:8,flexWrap:'wrap'},
  nav:{borderTopWidth:1,borderColor:colors.line,backgroundColor:colors.paper},
  navInner:{width:'100%',maxWidth:1120,alignSelf:'center',flexDirection:'row',paddingVertical:10,paddingHorizontal:14},
  navItem:{flex:1,alignItems:'center',justifyContent:'center',gap:4,minHeight:46},
  modalShade:{flex:1,backgroundColor:'#0007',alignItems:'center',justifyContent:'center',padding:24},
  modal:{width:'100%',maxWidth:480,backgroundColor:colors.paper,borderRadius:22,padding:22,gap:18},
});
