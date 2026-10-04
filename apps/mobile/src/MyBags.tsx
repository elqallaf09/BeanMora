import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { CoffeeItem } from './data';
import { CoffeePhoto } from './CoffeeScreens';
import { Language, Txt, Icon, colors, styles } from './ui';

type BagState = 'new' | 'open' | 'frozen';
type Filter = 'all' | BagState;
const STORAGE_KEY = 'beanmora-bag-states-v1';

export function MyBags({ coffees, openCoffee }: { coffees: CoffeeItem[]; openCoffee: (item: CoffeeItem) => void }) {
  const locale = useContext(Language); const ar = locale === 'ar';
  const [states,setStates]=useState<Record<string,BagState>>({});
  const [filter,setFilter]=useState<Filter>('all');

  useEffect(()=>{void AsyncStorage.getItem(STORAGE_KEY).then(raw=>{
    if(!raw)return;
    try{const value=JSON.parse(raw) as Record<string,BagState>;setStates(value);}catch{}
  }).catch(()=>{});},[]);

  const rows=useMemo(()=>coffees.filter(item=>filter==='all'||(states[item.beanId??item.id]??'new')===filter),[coffees,filter,states]);
  const labels:Record<Filter,string>={all:ar?'الكل':'All',new:ar?'جديد':'New',open:ar?'مفتوح':'Open',frozen:ar?'مجمّد':'Frozen'};
  const next=(state:BagState):BagState=>state==='new'?'open':state==='open'?'frozen':'new';
  const setBagState=(item:CoffeeItem)=>{
    const id=item.beanId??item.id; const value=next(states[id]??'new'); const updated={...states,[id]:value};setStates(updated);
    void AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(updated)).catch(()=>{});
  };

  return <ScrollView contentContainerStyle={s.page}>
    <View style={s.header}><View style={{flex:1}}><Txt heading style={styles.title}>{ar?'أكياسي':'My bags'}</Txt><Txt style={styles.muted}>{ar?'بنّك المحفوظ وحالة كل كيس في مكان واحد.':'Your saved coffees and the state of each bag.'}</Txt></View><View style={s.headerIcon}><Icon name="bean" size={27} color={colors.copper}/></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{(['all','new','open','frozen'] as Filter[]).map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:filter===value}} onPress={()=>setFilter(value)} style={[s.filter,filter===value&&s.filterActive]}><Txt style={[s.filterText,filter===value&&{color:'#FFF'}]}>{labels[value]}</Txt></Pressable>)}</ScrollView>
    {rows.length?<View style={s.list}>{rows.map(item=>{const state=states[item.beanId??item.id]??'new';return <View key={item.kind+item.id} style={s.card}><Pressable accessibilityRole="button" accessibilityLabel={item.name} onPress={()=>openCoffee(item)} style={s.product}><View style={s.photo}><CoffeePhoto uri={item.imageUrl} uris={item.images} kind={item.imageKind}/></View><View style={s.copy}><Txt numberOfLines={1} style={s.roaster}>{item.roaster}</Txt><Txt numberOfLines={2} style={s.name}>{item.name}</Txt><Txt numberOfLines={1} style={styles.muted}>{item.origin}</Txt></View></Pressable><Pressable accessibilityRole="button" accessibilityLabel={(ar?'حالة الكيس: ':'Bag state: ')+labels[state]} onPress={()=>setBagState(item)} style={[s.state,state==='open'&&s.stateOpen,state==='frozen'&&s.stateFrozen]}><Txt style={s.stateText}>{labels[state]}</Txt><Txt style={s.stateHint}>{ar?'اضغط للتغيير':'Tap to change'}</Txt></Pressable></View>;})}</View>:<View style={s.empty}><Icon name="bean" size={42} color={colors.copper}/><Txt style={s.emptyTitle}>{ar?'ما عندك أكياس بهالحالة':'No bags in this state'}</Txt><Txt style={styles.muted}>{ar?'احفظ البن من صفحة المنتج، وراح يظهر لك هنا.':'Save a coffee from its product page and it will appear here.'}</Txt></View>}
  </ScrollView>;
}

const s=StyleSheet.create({
  page:{width:'100%',maxWidth:900,alignSelf:'center',paddingHorizontal:18,paddingTop:14,paddingBottom:28,gap:16},
  header:{flexDirection:'row',alignItems:'center',gap:12},
  headerIcon:{width:54,height:54,borderRadius:27,backgroundColor:'#F2E7D8',alignItems:'center',justifyContent:'center'},
  filters:{gap:8,paddingBottom:2},
  filter:{minHeight:40,paddingHorizontal:16,borderRadius:999,borderWidth:1,borderColor:colors.line,backgroundColor:colors.paper,alignItems:'center',justifyContent:'center'},
  filterActive:{backgroundColor:colors.teal,borderColor:colors.teal},
  filterText:{fontSize:12,lineHeight:18,fontWeight:'800',color:colors.brown},
  list:{gap:10},
  card:{backgroundColor:colors.paper,borderRadius:18,borderWidth:1,borderColor:colors.line,padding:10,gap:10},
  product:{flexDirection:'row',gap:12,alignItems:'center'},
  photo:{width:82,height:92,borderRadius:14,overflow:'hidden',backgroundColor:'#F9F5EC'},
  copy:{flex:1,gap:2},
  roaster:{fontSize:11,lineHeight:17,color:colors.teal,fontWeight:'700'},
  name:{fontSize:16,lineHeight:23,fontWeight:'800'},
  state:{minHeight:44,borderRadius:13,paddingHorizontal:13,backgroundColor:'#EEE6DC',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  stateOpen:{backgroundColor:'#E6F1ED'},
  stateFrozen:{backgroundColor:'#E5EEF4'},
  stateText:{fontSize:12,lineHeight:18,fontWeight:'800'},
  stateHint:{fontSize:10,lineHeight:16,color:colors.muted},
  empty:{paddingVertical:48,paddingHorizontal:24,alignItems:'center',gap:8,backgroundColor:colors.paper,borderRadius:20,borderWidth:1,borderColor:colors.line},
  emptyTitle:{fontSize:17,lineHeight:25,fontWeight:'800',textAlign:'center'},
});
