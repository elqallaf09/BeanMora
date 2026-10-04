import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, FlatList, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Share, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import type { Session } from '@supabase/supabase-js';
import { configured, supabase } from './src/client';
import { loadData, type Bundle, type CoffeeItem, type RecipeItem } from './src/data';
import { recommendCoffees, recommendRecipes, type Method } from './src/core/engine';
import { copy, caveats, reasons, type Locale } from './src/copy';
import { searchText } from './src/guards';
import type { EquipmentItem, RoasterItem } from './src/catalog';
import { EquipmentDirectory, EquipmentDetail, RoasterDirectory, RoasterDetail, XBLOOMHub } from './src/ExploreScreens';
import { LanguageSwitcher } from './src/LanguageSwitcher';
import { MotionProvider, ScreenTransition } from './src/Motion';
import { RecipeDetail } from './src/RecipeDetail';
import { MethodGuide } from './src/MethodGuide';
import { RecipeCatalog } from './src/RecipeCatalog';
import { OutcomeForm } from './src/OutcomeForm';
import { AccountScreen, finishOAuth } from './src/AccountScreen';
import { AppVersion } from './src/AppVersion';
import { MyBags } from './src/MyBags';
import { CoffeeCard, CoffeeDetail, Home, MethodPicker, SectionTitle, coffeeStyles } from './src/CoffeeScreens';
import { Action, Brand, Field, Icon, IconButton, Language, Txt, colors, styles, type IconName } from './src/ui';

type Tab = 'home' | 'beans' | 'recipes' | 'forYou' | 'favorites' | 'bags' | 'account' | 'equipment' | 'roasters' | 'xbloom';
type Detail = { type: 'coffee'; item: CoffeeItem } | { type: 'recipe'; item: RecipeItem } | { type: 'equipment'; item: EquipmentItem } | { type: 'roaster'; item: RoasterItem };
type Loaded = Bundle & { owner: string | null; locale: Locale };

function Shell() {
  const {width}=useWindowDimensions(); const [locale,setLocale]=useState<Locale>('ar'); const t=copy[locale]; const ar=locale==='ar';
  const languageChanged=useRef(false);
  useEffect(()=>{let active=true;void AsyncStorage.getItem('beanmora-language').then(v=>{if(active&&!languageChanged.current&&(v==='ar'||v==='en'))setLocale(v);}).catch(()=>{});return()=>{active=false;};},[]);
  function changeLanguage(v:Locale){languageChanged.current=true;setLocale(v);setDetail(null);setParents([]);setRecording(false);void AsyncStorage.setItem('beanmora-language',v).catch(()=>{});}
  const [session,setSession]=useState<Session|null>(null); const userId=session&&!session.user.is_anonymous?session.user.id:null;
  const [tab,setTab]=useState<Tab>('home'); const [method,setMethod]=useState<Method>(); const [search,setSearch]=useState('');
  const [detail,setDetail]=useState<Detail|null>(null); const [parents,setParents]=useState<Detail[]>([]); const [equipmentCategory,setEquipmentCategory]=useState('all'); const [recording,setRecording]=useState(false);
  const [measuredSeconds,setMeasuredSeconds]=useState<number>();
  const [bundle,setBundle]=useState<Loaded|null>(null); const [refreshing,setRefreshing]=useState(false); const [revision,setRevision]=useState(0);
  const [visibleCount,setVisibleCount]=useState(30); const [saved,setSaved]=useState<{owner:string;ids:string[]}|null>(null);
  const savePending=useRef(new Set<string>()); const identity=useRef(userId); identity.current=userId;
  const [message,setMessage]=useState(''); const [notifications,setNotifications]=useState<string[]|null>(null);
  const [fontsLoaded,fontError]=useFonts({'Tajawal-Regular':require('./assets/fonts/Tajawal-Regular.ttf'),'Tajawal-Bold':require('./assets/fonts/Tajawal-Bold.ttf'),'Quicksand':require('./assets/fonts/Quicksand.ttf')});
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
  function navigate(next:Tab){setDetail(null);setParents([]);setRecording(false);setMeasuredSeconds(undefined);setTab(next);setSearch('');}
  function back(){if(recording)setRecording(false);else if(parents.length){setDetail(parents[parents.length-1]);setParents(p=>p.slice(0,-1));}else if(detail)setDetail(null);else navigate('home');}
  useEffect(()=>{
    const listener=BackHandler.addEventListener('hardwareBackPress',()=>{if(recording||detail||tab!=='home'){back();return true;}return false;});
    return()=>listener.remove();
  },[recording,detail,parents,tab]);
  useEffect(()=>setVisibleCount(30),[tab,method,search]);
  const filter=searchText(search);
  const matchesMethod=(c:CoffeeItem)=>!method||c.methods.includes(method)||!!data?.recipes.some(r=>r.method===method&&(r.productId===c.id||r.beanId===(c.beanId??c.id)));
  const coffees=data?.coffees.filter(c=>c.reviewed&&c.published&&matchesMethod(c)&&searchText([c.name,c.roaster,c.origin,...c.flavors].join(' ')).includes(filter))??[];
  const recipes=data?.recipes.filter(r=>r.public&&(!method||r.method===method)&&searchText([r.title,...r.flavors].join(' ')).includes(filter))??[];
  const rankedCoffee=data?recommendCoffees(data.coffees,data.profile,Date.now(),method):[];
  const rankedRecipes=data?recommendRecipes(data.recipes,data.profile,method):[];
  const refresh=()=>setRevision(n=>n+1);
  const openDetail=(next:Detail)=>{if(detail)setParents(p=>[...p,detail]);else setParents([]);setDetail(next);};
  const openCoffee=(item:CoffeeItem)=>openDetail({type:'coffee',item});
  const openRecipe=(item:RecipeItem)=>openDetail({type:'recipe',item});
  function startRecord(seconds?:number){setMeasuredSeconds(seconds);if(!userId){navigate('account');}else setRecording(true);}
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
  function showTools(category:string){setEquipmentCategory(category);navigate('equipment');}
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
    {!login?<View style={s.header}>{detail?<><IconButton name="back" label={t.back} onPress={back}/><View style={{flex:1}}/><LanguageSwitcher change={changeLanguage}/>{detail.type==='coffee'?<IconButton name="heart" label={ar?'المفضلة':'Favorites'} onPress={()=>void saveCoffee(detail.item as CoffeeItem)}/>:null}<IconButton name="share" label={ar?'مشاركة':'Share'} onPress={()=>void Share.share({message:detail.type==='recipe'?detail.item.title:detail.item.name}).catch(()=>setMessage(t.sourceError))}/></>:<><LanguageSwitcher change={changeLanguage}/><Brand/><View style={[s.headerActions,{width:width<500?80:150}]}><IconButton name="search" label={ar?'البحث':'Search'} onPress={()=>navigate('beans')}/>{width>=400?<IconButton name="bell" label={ar?'التنبيهات':'Notifications'} onPress={()=>void showNotifications()}/>:null}<IconButton name="user" label={ar?'فتح حسابي':'Open account'} onPress={()=>navigate('account')}/></View></>}</View>:null}
    {!login&&!detail&&configured?<View style={s.libraryNav}>{[{id:'equipment' as const,label:ar?'أدوات القهوة':'Equipment',icon:'gear' as const},{id:'roasters' as const,label:ar?'المحامص':'Roasteries',icon:'bean' as const},{id:'xbloom' as const,label:'xBloom',icon:'xbloom' as const}].map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{selected:tab===item.id}} onPress={()=>{if(item.id==='equipment')setEquipmentCategory('all');navigate(item.id);}} style={[s.libraryButton,tab===item.id&&{backgroundColor:colors.brown}]}><Icon name={item.icon} size={18} color={tab===item.id?'#FFF':colors.brown}/><Txt style={{fontSize:13,fontWeight:'700',color:tab===item.id?'#FFF':colors.brown}}>{item.label}</Txt></Pressable>)}</View>:null}
    <ScreenTransition key={recording?'record':detail?detail.type+detail.item.id:tab}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    {!configured?<View style={styles.content}><Txt heading style={styles.title}>{t.setup}</Txt><Txt>{t.setupNote}</Txt><AppVersion/></View>
    :recording&&detail?.type==='recipe'&&userId?<OutcomeForm key={userId+detail.item.id} userId={userId} recipe={detail.item} measuredSeconds={measuredSeconds} done={()=>{navigate('forYou');refresh();}}/>
    :detail?.type==='coffee'?<CoffeeDetail key={detail.item.id+locale} item={detail.item} recipes={data?.recipes??[]} openRecipe={openRecipe}/>
    :detail?.type==='recipe'?<RecipeDetail recipe={detail.item} record={startRecord}/>
    :detail?.type==='equipment'?<EquipmentDetail key={detail.item.id+locale+(userId??'guest')} item={detail.item} recipes={data?.recipes??[]} userId={userId} login={()=>navigate('account')} openRecipe={openRecipe}/>
    :detail?.type==='roaster'?<RoasterDetail key={detail.item.id+locale} item={detail.item} coffees={data?.coffees??[]} recipes={data?.recipes??[]} openCoffee={openCoffee} openRecipe={openRecipe} saveCoffee={item=>void saveCoffee(item)} saved={savedIds} loading={refreshing}/>
    :tab==='equipment'?<EquipmentDirectory key={locale+equipmentCategory} category={equipmentCategory} open={item=>openDetail({type:'equipment',item})}/>
    :tab==='roasters'?<RoasterDirectory key={locale} coffees={data?.coffees ?? []} open={item=>openDetail({type:'roaster',item})}/>
    :tab==='xbloom'?<XBLOOMHub key={locale} recipes={data?.recipes??[]} openRecipe={openRecipe} loading={refreshing} tools={()=>{setEquipmentCategory('xbloom');navigate('equipment');}}/>
    :tab==='recipes'?<RecipeCatalog key={locale} method={method} open={openRecipe}/>
    :tab==='bags'?<MyBags key={(userId??'guest')+locale} coffees={coffees.filter(item=>savedIds.includes(item.beanId??item.id))} openCoffee={openCoffee}/>
    :tab==='account'?<AccountScreen key={userId??'public'} session={userId?session:null} back={()=>navigate('home')}/>
    :tab==='home'?<Home data={data} coffees={coffees} method={method} setMethod={setMethod} openCoffee={openCoffee} browse={()=>navigate('beans')} brew={()=>navigate('recipes')} personalize={()=>navigate('forYou')} bags={()=>navigate('bags')} tools={category=>void showTools(category)} saved={savedIds} save={item=>void saveCoffee(item)} refresh={refresh} refreshing={refreshing}/>
    :tab==='forYou'?<ScrollView contentContainerStyle={coffeeStyles.page}><View style={s.catalogTabs}><Action title={t.beans} onPress={()=>navigate('beans')}/><Action title={t.recipes} onPress={()=>navigate('recipes')}/><Action title={t.forYou} onPress={()=>{}} selected/></View><Txt heading style={styles.title}>{t.forYou}</Txt><Txt style={styles.muted}>{t.ruleNote}</Txt>{data?.limited?<Txt style={styles.muted}>{ar?'التوصيات تستخدم مجموعة محدودة من الوصفات. ابحث في مكتبة الوصفات لاستكشاف الكتالوغ الكامل.':'Recommendations use a bounded recipe sample. Search the recipe library for the full catalog.'}</Txt>:null}<SectionTitle title={t.beans}/>{rankedCoffee.length?rankedCoffee.map(row=><View key={row.item.kind+row.item.id} style={styles.card}><Action title={row.item.name} onPress={()=>{const item=data?.coffees.find(c=>c.id===row.item.id&&c.kind===row.item.kind);if(item)openCoffee(item);}}/><Txt>{t.matching}: {row.reasons.length?row.reasons.map(r=>reasons[locale][r]).join(' · '):t.general}</Txt>{row.caveats.map(c=><Txt key={c} style={styles.muted}>{caveats[locale][c]}</Txt>)}</View>):<Txt>{t.empty}</Txt>}<SectionTitle title={t.recipes}/>{rankedRecipes.map(row=><View key={row.item.id} style={styles.card}><Action title={row.item.title} onPress={()=>{const item=data?.recipes.find(r=>r.id===row.item.id);if(item)setDetail({type:'recipe',item});}}/><Txt>{t.matching}: {row.reasons.length?row.reasons.map(r=>reasons[locale][r]).join(' · '):t.general}</Txt></View>)}</ScrollView>
    :<FlatList key={tab+columns} numColumns={columns} data={displayCoffee.slice(0,visibleCount)} keyExtractor={item=>item.kind+item.id} columnWrapperStyle={{gap:12}} contentContainerStyle={[coffeeStyles.page,{gap:12}]} refreshing={refreshing} onRefresh={refresh} ListHeaderComponent={<View style={{gap:16,marginBottom:4}}>{tab!=='favorites'?<View style={s.catalogTabs}><Action title={t.beans} onPress={()=>navigate('beans')} selected/><Action title={t.recipes} onPress={()=>navigate('recipes')}/><Action title={t.forYou} onPress={()=>navigate('forYou')}/></View>:null}<Txt heading style={styles.title}>{tab==='favorites'?(ar?'المفضلة':'Favorites'):t.beans}</Txt><MethodPicker value={method} onChange={setMethod}/><MethodGuide key={method??'all'} method={method} recipes={()=>navigate('recipes')}/><Field label={t.search} value={search} onChangeText={setSearch} placeholder={ar?'ابحث عن البن أو المحمصة أو البلد…':'Search coffee, roaster or origin…'}/>{data?.warnings||!data&&!refreshing?<Txt style={styles.warning}>{t.partial}</Txt>:null}</View>} ListEmptyComponent={<Txt style={styles.muted}>{refreshing?t.loading:tab==='favorites'&&!userId?t.loginFirst:tab==='favorites'?(ar?'احفظ حبوبك المفضلة بالضغط على القلب.':'Save your favorite coffees with the heart button.'):t.empty}</Txt>} ListFooterComponent={<View style={{gap:10,marginTop:10}}>{displayCoffee.length>visibleCount?<Action title={ar?'عرض المزيد':'Load more'} onPress={()=>setVisibleCount(n=>n+30)} selected/>:null}<Action title={t.refresh} onPress={refresh}/></View>} renderItem={({item})=><CoffeeCard item={item} width={cardWidth} saved={savedIds.includes(item.beanId??item.id)} open={()=>openCoffee(item)} save={()=>void saveCoffee(item)}/>}/>}
    </KeyboardAvoidingView></ScreenTransition>
    {!detail&&!login&&configured?<View style={s.nav}><View style={s.navInner}>{nav.map(item=><Pressable key={item.tab} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{selected:tab===item.tab}} onPress={()=>navigate(item.tab)} style={s.navItem}><Icon name={item.icon} filled={tab===item.tab} color={tab===item.tab?colors.brown:colors.muted} size={23}/><Txt style={{fontSize:11,lineHeight:20,fontWeight:tab===item.tab?'700':'400',color:tab===item.tab?colors.brown:colors.muted,textAlign:'center'}}>{item.label}</Txt></Pressable>)}</View></View>:null}
    <Modal visible={!!message||notifications!==null} transparent animationType="fade" onRequestClose={()=>{setMessage('');setNotifications(null);}}><View style={s.modalShade}><View style={s.modal}><Txt heading style={styles.subtitle}>{notifications!==null?(ar?'التنبيهات':'Notifications'):'BeanMora'}</Txt><ScrollView style={{maxHeight:350}}>{message?<Txt>{message}</Txt>:notifications?.length?notifications.map((n,i)=><Txt key={i} style={{paddingVertical:10}}>{n}</Txt>):<Txt style={styles.muted}>{ar?'لا توجد تنبيهات حالياً.':'No notifications right now.'}</Txt>}</ScrollView><Action title={ar?'إغلاق':'Close'} onPress={()=>{setMessage('');setNotifications(null);}} selected/></View></View></Modal>
  </SafeAreaView></Language.Provider>;
}
export default function App(){return <SafeAreaProvider><MotionProvider><Shell/></MotionProvider></SafeAreaProvider>;}
const s=StyleSheet.create({
  header:{width:'100%',maxWidth:1120,alignSelf:'center',minHeight:92,paddingHorizontal:18,paddingVertical:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  libraryNav:{width:'100%',maxWidth:1120,alignSelf:'center',flexDirection:'row',gap:8,paddingHorizontal:18,paddingBottom:10},
  libraryButton:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,borderWidth:1,borderColor:colors.line,borderRadius:14,backgroundColor:colors.paper,minHeight:46},
  languages:{flexDirection:'row',gap:6},language:{flex:1,borderRadius:999,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,minHeight:42,alignItems:'center',justifyContent:'center'},
  headerActions:{flexDirection:'row',justifyContent:'flex-end',alignItems:'center'},
  catalogTabs:{flexDirection:'row',gap:8,flexWrap:'wrap'},
  nav:{borderTopWidth:1,borderColor:colors.line,backgroundColor:colors.paper},
  navInner:{width:'100%',maxWidth:1120,alignSelf:'center',flexDirection:'row',paddingVertical:10,paddingHorizontal:14},
  navItem:{flex:1,alignItems:'center',justifyContent:'center',gap:4,minHeight:46},
  modalShade:{flex:1,backgroundColor:'#0007',alignItems:'center',justifyContent:'center',padding:24},
  modal:{width:'100%',maxWidth:480,backgroundColor:colors.paper,borderRadius:22,padding:22,gap:18},
});
