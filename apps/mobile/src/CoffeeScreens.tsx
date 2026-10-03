import { useContext, useEffect, useState } from 'react';
import { Image, ImageBackground, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { Language, Txt, Icon, IconButton, Action, colors, styles, type IconName } from './ui';
import { methods } from './copy';
import { METHODS, type Method } from './core/engine';
import type { Bundle, CoffeeItem, RecipeItem } from './data';

export const artwork = {
  hero: require('../assets/images/home-banner.jpg'), login: require('../assets/images/login-background.jpg'),
  bag: require('../assets/images/coffee-bag.jpg'), beans: require('../assets/images/coffee-beans.jpg'), cherries: require('../assets/images/coffee-cherries.jpg'),
  xbloom: require('../assets/images/xbloom.jpg'), grinder: require('../assets/images/grinder.jpg'), scale: require('../assets/images/scale.jpg'),
};
const flags: Record<string, string> = { Bolivia: '🇧🇴', Ethiopia: '🇪🇹', Colombia: '🇨🇴', Guatemala: '🇬🇹', Brazil: '🇧🇷', Kenya: '🇰🇪', Panama: '🇵🇦', 'Costa Rica': '🇨🇷', 'El Salvador': '🇸🇻', Yemen: '🇾🇪', Rwanda: '🇷🇼', Indonesia: '🇮🇩', Peru: '🇵🇪', Honduras: '🇭🇳', Ecuador: '🇪🇨', India: '🇮🇳', Uganda: '🇺🇬', Mexico: '🇲🇽' };
export const originLabel = (origin: string) => [flags[origin], origin].filter(Boolean).join(' ');
export function CoffeePhoto({ uri, seed = '', detail = false }: { uri?: string | null; seed?: string; detail?: boolean }) {
  const ar = useContext(Language) === 'ar'; const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const illustrative = !uri || failed;
  const hash = Array.from(seed).reduce((n, c) => n + c.charCodeAt(0), 0);
  const source: ImageSourcePropType = illustrative ? detail ? artwork.bag : [artwork.cherries, artwork.beans, artwork.bag][hash % 3] : { uri: uri! };
  return <View style={s.photo}><Image source={source} resizeMode="cover" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]} onError={() => setFailed(true)} />{illustrative ? <View style={s.photoNote}><Txt style={{ fontSize: 9, lineHeight: 14, color: '#FFF' }}>{ar ? 'صورة توضيحية' : 'Illustrative photo'}</Txt></View> : null}</View>;
}
export function SectionTitle({ title, onPress, action }: { title: string; onPress?: () => void; action?: string }) {
  const ar = useContext(Language) === 'ar';
  return <View style={s.sectionHeading}><Txt heading style={styles.subtitle}>{title}</Txt>{onPress ? <Pressable accessibilityRole="button" accessibilityLabel={action ?? (ar ? 'عرض الكل' : 'View all')} onPress={onPress} style={s.sectionLink}><Txt style={styles.muted}>{action ?? (ar ? 'عرض الكل' : 'View all')}</Txt><Icon name="arrow" size={14} color={colors.muted}/></Pressable> : null}</View>;
}
export function MethodPicker({ value, onChange, allowed = METHODS, all = true }: { value?: Method; onChange: (method?: Method) => void; allowed?: readonly Method[]; all?: boolean }) {
  const locale = useContext(Language); const items = all ? [undefined, ...allowed] : [...allowed];
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.methodRail}>{items.map(m => {
    const title = m ? methods[locale][m] : locale === 'ar' ? 'الكل' : 'All'; const active = value === m;
    return <Pressable key={m ?? 'all'} accessibilityRole="button" accessibilityLabel={m ? title : locale === 'ar' ? 'كل طرق التحضير' : 'All methods'} accessibilityState={{ selected: active }} onPress={() => onChange(m)} style={[s.method, active && s.methodActive]}><Icon name={m ?? 'bean'} size={27} color={active ? '#FFF' : colors.ink}/><Txt numberOfLines={1} style={{ fontSize: 12, lineHeight: 20, fontWeight: '700', color: active ? '#FFF' : colors.ink, textAlign: 'center' }}>{title}</Txt></Pressable>;
  })}</ScrollView>;
}
export function CoffeeCard({ item, width, saved, open, save }: { item: CoffeeItem; width: number; saved: boolean; open: () => void; save: () => void }) {
  const ar = useContext(Language) === 'ar';
  return <View style={[s.coffeeCard, { width }]}><Pressable accessibilityRole="button" accessibilityLabel={item.name} onPress={open} style={{ flex: 1 }}><View style={{ height: Math.max(94, Math.min(155, width * 0.57)), overflow: 'hidden', borderRadius: 13 }}><CoffeePhoto uri={item.imageUrl} seed={item.id}/></View><View style={s.coffeeCopy}><Txt numberOfLines={2} style={s.coffeeName}>{item.name}</Txt><Txt numberOfLines={1} style={s.coffeeFlavors}>{item.flavors.length ? item.flavors.slice(0, 3).join(' · ') : item.roaster}</Txt></View></Pressable><View style={s.coffeeFooter}><Txt numberOfLines={1} style={{ fontSize: 11, lineHeight: 18, flex: 1, fontFamily: undefined, writingDirection: 'ltr', textAlign: 'left' }}>{originLabel(item.origin) || item.roaster}</Txt><IconButton name="heart" label={(saved ? ar ? 'إزالة من المفضلة: ' : 'Unsave: ' : ar ? 'حفظ في المفضلة: ' : 'Save: ') + item.name} onPress={save} selected={saved} size={20}/></View></View>;
}
export function Home({ data, coffees, method, setMethod, openCoffee, browse, brew, tools, saved, save, refresh, refreshing }: {
  data: Bundle | null; coffees: CoffeeItem[]; method?: Method; setMethod: (method?: Method) => void; openCoffee: (item: CoffeeItem) => void; browse: () => void; brew: () => void; tools: (category:'all'|'xbloom'|'grinder'|'scale') => void; saved: string[]; save: (item: CoffeeItem) => void; refresh: () => void; refreshing: boolean;
}) {
  const locale = useContext(Language); const ar = locale === 'ar'; const { width } = useWindowDimensions();
  const available = Math.min(width, 1120) - 36; const cols = available >= 600 ? 4 : 2; const cardWidth = (available - (cols - 1) * 12) / cols;
  const stats: { icon: IconName; value: number | string; title: string; note: string }[] = [
    { icon: 'bean', value: data ? new Set(data.coffees.map(c => c.beanId ?? c.kind + c.id)).size : '—', title: ar ? 'نوع بن' : 'Coffees', note: ar ? 'من مختلف أنحاء العالم' : 'From around the world' },
    { icon: 'espresso', value: data?.recipeTotal ?? '—', title: ar ? 'وصفة' : 'Recipes', note: ar ? 'وصفات متنوعة بعناية' : 'Explore your next cup' },
    { icon: 'xbloom', value: METHODS.length, title: ar ? 'طريقة تحضير' : 'Brew methods', note: ar ? 'من إسبريسو إلى كولد برو' : 'From espresso to cold brew' },
    { icon: 'globe', value: data ? new Set(data.coffees.map(c=>c.origin).filter(Boolean)).size : '—', title: ar ? 'دولة' : 'Origins', note: ar ? 'حبوب من مختلف المزارع' : 'Discover coffee origins' },
  ];
  return <ScrollView testID="home-scroll" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brown}/>} contentContainerStyle={s.page}>
    <ImageBackground source={artwork.hero} style={[s.hero, { height: Math.max(180, Math.min(280, available / 3.1)) }]} imageStyle={{ borderRadius: 18, width:'100%',height:'100%' }}>
      <View style={s.heroShade}/><View style={[s.heroCopy, { width: width < 500 ? '66%' : '55%' }]}><Txt heading style={[s.heroTitle, { fontSize: width < 500 ? 24 : 34, lineHeight: width < 500 ? 34 : 45 }]}>{ar ? 'اكتشف عالم القهوة.' : 'Discover the world of coffee.'}</Txt><Txt style={s.heroDescription}>{ar ? 'من الحبوب إلى الكوب، تجربة أفضل كل يوم.' : 'From bean to cup, a better experience every day.'}</Txt><Pressable accessibilityRole="button" accessibilityLabel={ar ? 'استكشف الآن' : 'Explore now'} onPress={browse} style={s.heroButton}><Txt style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>{ar ? 'استكشف الآن' : 'Explore now'}</Txt><Icon name="arrow" color="#FFF" size={17}/></Pressable></View>{width >= 650 ? <Txt style={s.heroSignature}>More{'\n'}Than{'\n'}Coffee</Txt> : null}
    </ImageBackground>
    <View style={s.stats}>{stats.map(stat=><View key={stat.icon} style={[s.stat, width < 500 && { paddingHorizontal: 6 }]}>{width >= 600 ? <View style={s.statIcon}><Icon name={stat.icon} size={23}/></View> : null}<View style={{ flex: 1 }}><Txt style={s.statNumber}>{stat.value}</Txt><Txt numberOfLines={1} style={s.statTitle}>{stat.title}</Txt>{width >= 600 ? <Txt numberOfLines={1} style={s.statNote}>{stat.note}</Txt> : null}</View></View>)}</View>
    <View style={s.section}><SectionTitle title={ar ? 'اختر طريقة التحضير' : 'Choose your brew method'} onPress={brew}/><MethodPicker value={method} onChange={setMethod}/></View>
    <View style={s.section}><SectionTitle title={ar ? 'أحدث الحبوب' : 'Latest beans'} onPress={browse}/>{refreshing && !data ? <View style={s.grid}>{Array.from({ length: cols },(_,i)=><View key={i} style={[s.skeleton, { width: cardWidth }]}><View style={s.skeletonPhoto}/><View style={s.skeletonText}/></View>)}</View> : coffees.length ? <View style={s.grid}>{coffees.slice(0,4).map(c=><CoffeeCard key={c.kind+c.id} item={c} width={cardWidth} saved={saved.includes(c.beanId ?? c.id)} open={()=>openCoffee(c)} save={()=>save(c)}/>)}</View> : <Txt style={styles.muted}>{ar ? 'لا توجد حبوب مطابقة لطريقة التحضير.' : 'No coffees match this brew method.'}</Txt>}</View>
    <View style={s.section}><SectionTitle title={ar ? 'أدوات وتوصيات' : 'Tools and recommendations'} onPress={()=>tools('all')}/><View style={s.tools}>{[
      { title: 'xBloom', description: ar ? 'تحكم كامل في الوصفة' : 'A recipe for every cup', image: artwork.xbloom, press: ()=>tools('xbloom') },
      { title: ar ? 'طاحونة القهوة' : 'Coffee grinder', description: ar ? 'طحن مثالي كل مرة' : 'Find your perfect grind', image: artwork.grinder, press: ()=>tools('grinder') },
      { title: ar ? 'ميزان القهوة' : 'Coffee scale', description: ar ? 'دقة تصنع الفرق' : 'Precision makes the difference', image: artwork.scale, press: ()=>tools('scale') },
    ].map(tool=><Pressable key={tool.title} accessibilityRole="button" accessibilityLabel={tool.title} onPress={tool.press} style={[s.tool, width < 600 && { minWidth: 145 }]}><Image source={tool.image} resizeMode="contain" style={s.toolImage}/><View style={s.toolCopy}><Txt numberOfLines={1} style={{ fontSize: 15, fontWeight: '700' }}>{tool.title}</Txt><Txt style={{ fontSize: 11, color: colors.muted, lineHeight: 18 }}>{tool.description}</Txt><Txt style={{ fontSize: 12, marginTop: 8, textDecorationLine: 'underline' }}>{ar ? 'عرض الآن' : 'View now'}</Txt></View></Pressable>)}</View></View>
    {data?.warnings ? <Txt style={styles.warning}>{ar ? 'تعذّر تحميل بعض البيانات. اسحب لتحديثها.' : 'Some data could not be loaded. Pull to refresh.'}</Txt> : null}
  </ScrollView>;
}
export function CoffeeDetail({ item, recipes, openRecipe }: { item: CoffeeItem; recipes: RecipeItem[]; openRecipe: (r: RecipeItem) => void }) {
  const locale = useContext(Language); const ar = locale === 'ar'; const { width } = useWindowDimensions();
  const related = recipes.filter(r=>item.kind === 'product' ? r.productId === item.id || !!item.beanId && r.beanId === item.beanId : r.beanId === item.id);
  const allowed = METHODS.filter(m=>item.methods.includes(m) || related.some(r=>r.method===m));
  const [method,setMethod]=useState<Method>(allowed.includes('xbloom') ? 'xbloom' : allowed[0] ?? 'v60');
  const [photo,setPhoto]=useState(0); const recipe=related.find(r=>r.method===method);
  const process: Record<string,string> = { natural: ar ? 'معالجة طبيعية' : 'Natural', washed: ar ? 'مغسول' : 'Washed', honey: ar ? 'عسلي' : 'Honey', anaerobic: ar ? 'لاهوائي' : 'Anaerobic' };
  const temperature=recipe?.temperature ?? recipe?.xBloom?.temp;
  const numbers = [
    { icon:'bean' as const,value:recipe?.dose ? recipe.dose+' g' : '—',label:ar ? 'كمية البن' : 'Coffee' },
    { icon:'drop' as const,value:recipe?.water ? recipe.water+' '+recipe.waterUnit : '—',label:ar ? 'كمية الماء' : 'Water' },
    { icon:'temp' as const,value:temperature ? temperature+'°C' : '—',label:ar ? 'درجة الحرارة' : 'Temperature' },
    { icon:'clock' as const,value:recipe?.seconds ? Math.floor(recipe.seconds/60)+':'+String(recipe.seconds%60).padStart(2,'0') : '—',label:ar ? 'الوقت' : 'Time' },
  ];
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.page, { maxWidth: 780, gap: 18 }]}>
    <View style={[s.detailPhoto,{ height: Math.min(360, (Math.min(width,780)-36)*0.59) }]}><CoffeePhoto uri={item.images[photo]} seed={item.id} detail/>{item.images.length>1 ? <View style={s.galleryDots}>{item.images.map((_,i)=><Pressable key={i} accessibilityRole="button" accessibilityLabel={(ar?'صورة ':'Photo ')+(i+1)} onPress={()=>setPhoto(i)} style={[s.dot,{backgroundColor:i===photo?'#FFF':'#FFFFFF66'}]}/>)}</View> : null}{item.images.length ? <Txt style={s.photoCount}>{photo+1}/{item.images.length}</Txt> : null}</View>
    <View style={s.detailTitleRow}><View style={{flex:1}}><Txt heading style={styles.title}>{item.name}</Txt><Txt style={styles.muted}>{[item.roaster,process[item.process]??item.process].filter(Boolean).join(' – ')}</Txt></View>{item.origin ? <Txt style={[styles.muted,{fontFamily:undefined,writingDirection:'ltr'}]}>{originLabel(item.origin)}</Txt> : null}</View>
    <View style={styles.detailMetaRow}>{item.flavors.map(f=><View key={f} style={styles.metaPill}><Txt style={styles.metaText}>{f}</Txt></View>)}</View>
    {item.description ? <Txt style={{ fontSize: 14, lineHeight: 27 }}>{item.description}</Txt> : null}
    <View style={s.infoSection}><Txt heading style={s.infoHeading}>{ar?'معلومات البن':'Coffee information'}</Txt><View style={s.brewStats}>{numbers.map(n=><View key={n.icon} style={s.brewStat}><View style={{flexDirection:'row',gap:7,alignItems:'center'}}><Icon name={n.icon} size={21}/><Txt style={{fontFamily:undefined,fontWeight:'700',fontSize:14}}>{n.value}</Txt></View><Txt numberOfLines={1} style={{fontSize:11,color:colors.muted}}>{n.label}</Txt></View>)}</View>{!recipe ? <Txt style={[styles.muted,{fontSize:11,paddingHorizontal:12,paddingBottom:8}]}>{ar?'تظهر مقادير التحضير عند اختيار وصفة مرتبطة بهذا البن.':'Brew measurements appear when a linked recipe is available.'}</Txt> : null}</View>
    <View style={s.section}><SectionTitle title={ar?'اختر طريقة التحضير':'Choose your brew method'}/><MethodPicker value={method} onChange={m=>m&&setMethod(m)} allowed={allowed} all={false}/></View>
    <Pressable accessibilityRole="button" accessibilityState={{disabled:!recipe}} disabled={!recipe} onPress={()=>recipe&&openRecipe(recipe)} style={[s.brewButton,!recipe&&{opacity:0.55}]}><Icon name="play" color="#FFF" size={18}/><Txt style={{color:'#FFF',fontWeight:'700',fontSize:16}}>{recipe?(ar?'ابدأ التحضير مع ':'Start brewing with ')+methods[locale][method]:ar?'لا توجد وصفة مرتبطة بهذه الطريقة':'No linked recipe for this method'}</Txt></Pressable>
    {recipe ? <Pressable accessibilityRole="button" accessibilityLabel={recipe.title} onPress={()=>openRecipe(recipe)} style={s.recommended}><View style={s.statIcon}><Icon name={method}/></View><View style={{flex:1}}><Txt style={{fontWeight:'700'}}>{ar?'وصفة '+methods[locale][method]+' الموصى بها':methods[locale][method]+' recipe'}</Txt><Txt numberOfLines={2} style={styles.muted}>{recipe.title}</Txt></View><Icon name="arrow" size={20}/></Pressable> : null}
    {item.sourceUrl ? <Action title={ar?'فتح مصدر البيانات':'Open data source'} onPress={()=>void Linking.openURL(item.sourceUrl!)}/> : null}
  </ScrollView>;
}
const s=StyleSheet.create({
  page:{width:'100%',maxWidth:1120,alignSelf:'center',paddingHorizontal:18,paddingTop:12,paddingBottom:24,gap:18},
  hero:{borderRadius:18,overflow:'hidden',justifyContent:'center',backgroundColor:colors.brown},
  heroShade:{position:'absolute',top:0,bottom:0,left:0,right:0,backgroundColor:'rgba(22,12,6,0.2)'},
  heroCopy:{paddingHorizontal:25,gap:7,alignItems:'center',zIndex:1},
  heroTitle:{color:'#FFF',fontWeight:'700',textAlign:'center'},
  heroDescription:{color:'#FFFDF7',fontSize:13,lineHeight:21,textAlign:'center'},
  heroButton:{flexDirection:'row',gap:10,borderWidth:1,borderColor:'#FFF6E8',borderRadius:999,paddingHorizontal:22,minHeight:43,alignItems:'center',justifyContent:'center',marginTop:5,backgroundColor:'#48301F88'},
  heroSignature:{position:'absolute',right:24,bottom:25,color:'#FFF',fontSize:22,lineHeight:30,fontStyle:'italic',fontFamily:'cursive',textAlign:'center',writingDirection:'ltr'},
  stats:{flexDirection:'row',gap:10},
  stat:{flex:1,minWidth:0,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:16,minHeight:84,padding:12,flexDirection:'row',gap:12,alignItems:'center'},
  statIcon:{width:42,height:42,borderRadius:21,backgroundColor:colors.chip,alignItems:'center',justifyContent:'center'},
  statNumber:{fontFamily:undefined,fontSize:23,lineHeight:28,fontWeight:'800',textAlign:'center',writingDirection:'ltr'},
  statTitle:{fontSize:12,lineHeight:19,fontWeight:'700',textAlign:'center'},
  statNote:{fontSize:10,lineHeight:17,color:colors.muted,textAlign:'center'},
  section:{gap:10},
  sectionHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  sectionLink:{flexDirection:'row',gap:6,alignItems:'center',minHeight:40},
  methodRail:{gap:8,paddingBottom:2},
  method:{width:76,height:82,borderRadius:16,borderWidth:1,borderColor:colors.line,backgroundColor:colors.paper,alignItems:'center',justifyContent:'center',gap:8},
  methodActive:{backgroundColor:colors.brown,borderColor:colors.brown},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:12,alignItems:'stretch'},
  coffeeCard:{borderRadius:15,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,overflow:'hidden',minWidth:0},
  photo:{flex:1,width:'100%',height:'100%',backgroundColor:'#E5D8C6'},
  photoNote:{position:'absolute',top:6,left:7,borderRadius:10,backgroundColor:'#21170D99',paddingHorizontal:6,paddingVertical:2},
  coffeeCopy:{paddingHorizontal:9,paddingTop:8,gap:4},
  coffeeName:{fontSize:14,lineHeight:20,fontWeight:'700',textAlign:'left',writingDirection:'auto',minHeight:40},
  coffeeFlavors:{fontSize:11,lineHeight:18,color:colors.muted},
  coffeeFooter:{flexDirection:'row',alignItems:'center',paddingLeft:9,paddingRight:2,minHeight:36},
  tools:{flexDirection:'row',flexWrap:'wrap',gap:12},
  tool:{flex:1,minWidth:0,minHeight:130,borderRadius:16,backgroundColor:'#E8DDCE',overflow:'hidden'},
  toolImage:{position:'absolute',right:0,bottom:0,width:'50%',height:'100%'},
  toolCopy:{width:'60%',padding:14,paddingRight:0,alignItems:'flex-start'},
  skeleton:{height:182,borderRadius:15,backgroundColor:colors.paper,padding:8,gap:10},
  skeletonPhoto:{height:104,borderRadius:12,backgroundColor:'#E6DFD1'},
  skeletonText:{height:18,borderRadius:6,backgroundColor:'#E6DFD1',width:'75%'},
  detailPhoto:{borderRadius:18,overflow:'hidden',backgroundColor:'#DDD0BD'},
  galleryDots:{position:'absolute',bottom:14,alignSelf:'center',flexDirection:'row',gap:6},
  dot:{width:9,height:9,borderRadius:5},
  photoCount:{position:'absolute',right:14,bottom:10,backgroundColor:'#21170D99',paddingHorizontal:12,paddingVertical:4,borderRadius:12,color:'#FFF',fontFamily:undefined},
  detailTitleRow:{flexDirection:'row',alignItems:'center',gap:12},
  infoSection:{gap:0},
  infoHeading:{alignSelf:'flex-start',fontSize:20,fontWeight:'700',backgroundColor:colors.paper,paddingHorizontal:15,paddingTop:10,borderTopLeftRadius:18,borderTopRightRadius:18},
  brewStats:{flexDirection:'row',borderWidth:1,borderColor:colors.line,borderRadius:18,paddingVertical:16,backgroundColor:colors.paper},
  brewStat:{flex:1,minWidth:0,alignItems:'center',gap:4,borderRightWidth:1,borderColor:colors.line},
  brewButton:{backgroundColor:colors.brown,borderRadius:15,minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,padding:12},
  recommended:{backgroundColor:colors.paper,borderRadius:16,padding:14,flexDirection:'row',gap:14,alignItems:'center',borderWidth:1,borderColor:colors.line},
});
export const coffeeStyles=s;
