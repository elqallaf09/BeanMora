import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from './src/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import type { Session } from '@supabase/supabase-js';
import { configured, supabase } from './src/client';
import { mapCoffee, mapRecipe, RECIPE_FIELDS, type CoffeeRow, type RecipeRow, type CoffeeItem, type RecipeItem } from './src/data';
import { MemberDirectory, MemberProfile } from './src/MemberProfile';
import {loadEquipment} from './src/catalog';
import {
  emptyProfile,
  recommendCoffees,
  recommendRecipes,
  type Method,
} from './src/core/engine';
import { copy, caveats, reasons, type Locale } from './src/copy';
import { matchesIndexedSearch } from './src/core/deepSearch';
import { indexedCoffeeSearchDocument } from './src/searchIndex';
import { SearchScreen } from './src/SearchScreen';
import { flavorLabel, hasCompletePersonality } from './src/sensory';
import type { EquipmentItem, RoasterItem } from './src/catalog';
import {
  EquipmentDirectory,
  EquipmentDetail,
  RoasterDirectory,
  RoasterDetail,
} from './src/ExploreScreens';
import { SettingsScreen } from './src/SettingsScreen';
import { ThemeProvider, useTheme } from './src/theme';
import { SafeAreaView } from './src/native';
import { CoffeeAssistant, type AssistantTurn } from './src/CoffeeAssistant';
import { MotionProvider, ScreenTransition } from './src/Motion';
import { RecipeDetail } from './src/RecipeDetail';
import { MethodGuide } from './src/MethodGuide';
import { OutcomeForm } from './src/OutcomeForm';
import { AccountScreen, finishOAuth } from './src/AccountScreen';
import { AppVersion } from './src/AppVersion';
import { useCatalog } from './src/useCatalog';
import { ScreenBoundary } from './src/ScreenBoundary';
import { useRecipeShelf } from './src/useRecipeShelf';
import { RecipeShelf } from './src/RecipeShelf';
import { MemberRecipes } from './src/MemberRecipes';
import { CapsuleCatalog } from './src/CapsuleCatalog';
import { ContributionForm } from './src/ContributionForm';
import { MyEquipment } from './src/MyEquipment';
import { MyBags } from './src/MyBags';
import { BestSetup } from './src/BestSetup';
import { RoastLab } from './src/RoastLab';
import { CommunityScreen } from './src/CommunityScreen';
import { BrewMyCoffee } from './src/BrewMyCoffee';
import {
  CoffeeCard,
  CoffeeDetail,
  Home,
  MethodPicker,
  SectionTitle,
  coffeeStyles,
} from './src/CoffeeScreens';
import {
  Action,
  Brand,
  Field,
  Icon,
  IconButton,
  Language,
  Txt,
  colors,
  styles,
  type IconName,
} from './src/ui';

type Tab =
  | 'assistant'
  | 'members'
  | 'memberProfile'
  | 'myRecipes'
  | 'capsules'
  | 'myEquipment'
  | 'addRecipe'
  | 'addBean'
  | 'home'
  | 'beans'
  | 'search'
  | 'recipes'
  | 'savedRecipes'
  | 'brewFlow'
  | 'forYou'
  | 'favorites'
  | 'bags'
  | 'best'
  | 'community'
  | 'account'
  | 'equipment'
  | 'roasters'
  | 'roastLab';
type Detail =
  | { type: 'coffee'; item: CoffeeItem }
  | { type: 'recipe'; item: RecipeItem }
  | { type: 'equipment'; item: EquipmentItem }
  | { type: 'roaster'; item: RoasterItem };

function Shell() {
  const theme = useTheme();
  const [assistantConversation, setAssistantConversation] = useState<{ owner: string | null; turns: AssistantTurn[] }>({ owner: null, turns: [] });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { width } = useWindowDimensions();
  const [locale, setLocale] = useState<Locale>('ar');
  const t = copy[locale];
  const ar = locale === 'ar';
  const languageChanged = useRef(false);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem('beanmora-language')
      .then((v) => {
        if (active && !languageChanged.current && (v === 'ar' || v === 'en'))
          setLocale(v);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  function changeLanguage(v: Locale) {
    languageChanged.current = true;
    setLocale(v);
    void AsyncStorage.setItem('beanmora-language', v).catch(() => {});
  }
  const [session, setSession] = useState<Session | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const userId = session && !session.user.is_anonymous ? session.user.id : null;
  const assistantTurns = assistantConversation.owner === userId ? assistantConversation.turns : [];
  const setAssistantTurns = (turns: AssistantTurn[]) => setAssistantConversation({ owner: userId, turns });
  const [libraryMenu,setLibraryMenu]=useState(false);
  const [equipmentToAdd,setEquipmentToAdd]=useState<EquipmentItem|null>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [method, setMethod] = useState<Method>();
  const [search, setSearch] = useState('');
  const [roastId, setRoastId] = useState<string | null>(null);
  const [roastSection, setRoastSection] = useState<'own' | 'public'>('own');
  const [recipeEntry, setRecipeEntry] = useState(0);
  const [recipeCoffee, setRecipeCoffee] = useState<CoffeeItem | null>(null);
  const [personalityOnly, setPersonalityOnly] = useState(false);
  const [detailSnapshot, setDetail] = useState<Detail | null>(null);
  // A locale change updates the selected entity in place, including back-stack
  // entries and recipes loaded outside the first catalog page.
  const detail = useMemo(() => detailSnapshot ? ({
    ...detailSnapshot,
    item: { ...detailSnapshot.item, ...detailSnapshot.item.localeContent?.[locale] },
  } as Detail) : null, [detailSnapshot, locale]);
  const [parents, setParents] = useState<Detail[]>([]);
  const [equipmentCategory, setEquipmentCategory] = useState('all');
  const [recording, setRecording] = useState(false);
  const [measuredSeconds, setMeasuredSeconds] = useState<number>();
  const [revision, setRevision] = useState(0);
  const { data, refreshing } = useCatalog(locale, userId, revision);
  const shelf = useRecipeShelf(userId, locale);
  const loginReturn = useRef<{
    tab: Tab;
    detail: Detail | null;
    parents: Detail[];
    seconds?: number;
    record: boolean;
  } | null>(null);
  const [visibleCount, setVisibleCount] = useState(30);
  const [saved, setSaved] = useState<{
    owner: string;
    ids: string[];
  } | null>(null);
  const savePending = useRef(new Set<string>());
  const identity = useRef(userId);
  identity.current = userId;
  const [memberUsername,setMemberUsername]=useState('');
  const [message, setMessage] = useState('');
  const [notifications, setNotifications] = useState<string[] | null>(null);
  const [fontsLoaded, fontError] = useFonts({
    'Tajawal-Regular': require('./assets/fonts/Tajawal-Regular.ttf'),
    'Tajawal-Bold': require('./assets/fonts/Tajawal-Bold.ttf'),
    Quicksand: require('./assets/fonts/Quicksand.ttf'),
  });
  useEffect(() => {
    if (!supabase) return;
    const showRecovery = () => {
      loginReturn.current = null;
      setPasswordRecovery(true);
      setDetail(null);
      setParents([]);
      setRecording(false);
      setTab('account');
    };
    const handleCallback = async (url: string) => {
      const result = await finishOAuth(url);
      if (result === 'recovery') showRecovery();
      if (result && Platform.OS === 'web') {
        const clean = new URL(window.location.href);
        clean.searchParams.delete('code');
        window.history.replaceState(window.history.state, '', clean.toString());
      }
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, value) => {
      setSession(value);
      if (event === 'PASSWORD_RECOVERY') {
        showRecovery();
      } else if (event === 'SIGNED_OUT') setPasswordRecovery(false);
    });
    const apply = (state: string) => {
      if (state === 'active') supabase?.auth.startAutoRefresh();
      else supabase?.auth.stopAutoRefresh();
    };
    apply(AppState.currentState);
    const listener = AppState.addEventListener('change', apply);
    const callback = Linking.addEventListener('url', (event) => {
      void handleCallback(event.url).catch(() => setMessage(t.authError));
    });
    void Linking.getInitialURL()
      .then((url) => (url ? handleCallback(url) : undefined))
      .catch(() => setMessage(t.authError));
    return () => {
      subscription.unsubscribe();
      listener.remove();
      callback.remove();
      supabase?.auth.stopAutoRefresh();
    };
  }, []);
  useEffect(() => {
    if (userId && loginReturn.current) restoreLogin(true);
  }, [userId]);
  useEffect(() => {
    if (data && userId) setSaved({ owner: userId, ids: data.savedBeanIds });
    else setSaved(null);
  }, [data, userId]);
  useEffect(() => setAssistantConversation({ owner: userId, turns: [] }), [userId]);
  const savedIds = saved?.owner === userId ? saved.ids : [];
  function navigate(next: Tab) {
    if (next !== 'account') loginReturn.current = null;
    setDetail(null);
    setParents([]);
    setRecording(false);
    setMeasuredSeconds(undefined);
    if (next === 'recipes') setRecipeEntry((n) => n + 1);
    setTab(next);
    setSearch('');
    setPersonalityOnly(false);
    setRecipeCoffee(null);
  }
  function back() {
    if (tab === 'account' && loginReturn.current) restoreLogin(false);
    else if (recording) setRecording(false);
    else if (parents.length) {
      setDetail(parents[parents.length - 1]);
      setParents((p) => p.slice(0, -1));
    } else if (detail) setDetail(null);
    else if (recipeCoffee) {
      openCoffee(recipeCoffee);
      setRecipeCoffee(null);
    } else navigate('home');
  }
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (recording || detail || tab !== 'home') {
        back();
        return true;
      }
      return false;
    });
    return () => listener.remove();
  }, [recording, detail, parents, tab, recipeCoffee]);
  useEffect(() => setVisibleCount(30), [tab, method, search, personalityOnly]);
  // Navigation must not rebuild the search index or scan recipes per coffee.
  const coffees = useMemo(() => {
    const linkedBeans = new Set<string>();
    const linkedProducts = new Set<string>();
    if (method)
      for (const recipe of data?.recipes ?? []) {
        if (recipe.method !== method) continue;
        if (recipe.beanId) linkedBeans.add(recipe.beanId);
        if (recipe.productId) linkedProducts.add(recipe.productId);
      }
    const query = search.trim();
    return (data?.coffees ?? []).filter(
      (coffee) =>
        coffee.reviewed &&
        coffee.published &&
        (!method ||
          coffee.methods.includes(method) ||
          linkedProducts.has(coffee.id) ||
          linkedBeans.has(coffee.beanId ?? coffee.id)) &&
        (!query ||
          matchesIndexedSearch(indexedCoffeeSearchDocument(coffee), query)),
    );
  }, [data?.coffees, data?.recipes, method, search]);
  const rankedCoffee = useMemo(
    () =>
      data && tab === 'forYou'
        ? recommendCoffees(data.coffees, data.profile, Date.now(), method)
        : [],
    [data?.coffees, data?.profile, method, tab === 'forYou'],
  );
  const rankedRecipes = useMemo(
    () =>
      data && tab === 'forYou'
        ? recommendRecipes(data.recipes, data.profile, method)
        : [],
    [data?.recipes, data?.profile, method, tab === 'forYou'],
  );
  const refresh = () => setRevision((n) => n + 1);
  const openDetail = (next: Detail) => {
    if (detail) setParents((p) => [...p, detail]);
    else setParents([]);
    setDetail(next);
  };
  const openCoffee = (item: CoffeeItem) => openDetail({ type: 'coffee', item });
  const openRecipe = (item: RecipeItem) => openDetail({ type: 'recipe', item });
  function startRecord(seconds?: number) {
    setMeasuredSeconds(seconds);
    if (!userId) {
      requestLogin(true, seconds);
    } else setRecording(true);
  }
  function requestLogin(record = false, seconds?: number) {
    loginReturn.current = { tab, detail, parents, record, seconds };
    navigate('account');
  }
  function restoreLogin(loggedIn: boolean) {
    const target = loginReturn.current;
    loginReturn.current = null;
    if (!target) return;
    setTab(target.tab);
    setDetail(target.detail);
    setParents(target.parents);
    setMeasuredSeconds(target.seconds);
    setRecording(loggedIn && target.record && target.detail?.type === 'recipe');
  }
  async function saveCoffee(item: CoffeeItem) {
    if (!userId || !supabase) {
      requestLogin();
      return;
    }
    const beanId = item.beanId;
    if (!beanId) {
      setMessage(
        ar
          ? 'حفظ هذا المنتج غير متاح بعد.'
          : 'Saving this product is not available yet.',
      );
      return;
    }
    const owner = userId;
    const key = owner + beanId;
    if (savePending.current.has(key)) return;
    savePending.current.add(key);
    const exists = savedIds.includes(beanId);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || auth.user?.id !== owner) throw new Error(t.loginFirst);
      const result = exists
        ? await supabase
            .from('bean_saves')
            .delete()
            .eq('user_id', owner)
            .eq('bean_id', beanId)
        : await supabase
            .from('bean_saves')
            .upsert(
              { user_id: owner, bean_id: beanId },
              { onConflict: 'bean_id,user_id' },
            );
      if (result.error) throw result.error;
      if (identity.current === owner)
        setSaved((current) => ({
          owner,
          ids: exists
            ? (current?.owner === owner ? current.ids : []).filter(
                (id) => id !== beanId,
              )
            : Array.from(
                new Set([
                  ...(current?.owner === owner ? current.ids : []),
                  beanId,
                ]),
              ),
        }));
    } catch {
      if (identity.current === owner)
        setMessage(
          ar
            ? 'تعذّر حفظ المفضلة. حاول مرة ثانية.'
            : 'Could not update favorites. Try again.',
        );
    } finally {
      savePending.current.delete(key);
    }
  }
  async function addToBags(item: CoffeeItem) {
    if (!userId || !supabase) {
      requestLogin();
      return;
    }
    const owner = userId;
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || auth.user?.id !== owner)
        throw authError ?? new Error('identity changed');
      const payload =
        item.kind === 'product'
          ? {
              user_id: owner,
              roasted_product_id: item.id,
              legacy_bean_id: null,
            }
          : {
              user_id: owner,
              roasted_product_id: null,
              legacy_bean_id: item.beanId ?? item.id,
            };
      const { error } = await supabase
        .from('user_bean_inventory')
        .insert(payload);
      if (error) throw error;
      if (identity.current === owner) {
        setMessage(
          ar
            ? 'تمت إضافة الكيس إلى أكياسي. كمّل الوزن والتواريخ من صفحة أكياسي.'
            : 'Added to My Bags. Complete its weight and dates in My Bags.',
        );
        navigate('bags');
      }
    } catch {
      if (identity.current === owner)
        setMessage(
          ar
            ? 'تعذّرت إضافة الكيس إلى أكياسي.'
            : 'Could not add this coffee to My Bags.',
        );
    }
  }
  function showRoasts(
    id: string | null = null,
    scope: 'own' | 'public' = 'own',
  ) {
    setRoastId(id);
    setRoastSection(scope);
    navigate('roastLab');
  }
  function showTools(category: string) {
    setEquipmentCategory(category);
    navigate('equipment');
  }
  async function showNotifications() {
    if (!userId || !supabase) {
      requestLogin();
      return;
    }
    setNotifications([t.loading]);
    const owner = userId;
    const { data: rows, error } = await supabase
      .from('notifications')
      .select('type,entity_type,created_at')
      .eq('user_id', owner)
      .order('created_at', { ascending: false })
      .limit(20);
    if (identity.current !== owner) {
      setNotifications(null);
      return;
    }
    if (error) {
      setNotifications(null);
      setMessage(
        ar ? 'تعذّر تحميل التنبيهات.' : 'Could not load notifications.',
      );
      return;
    }
    setNotifications(
      (rows ?? []).map((row) =>
        [
          ar ? 'نشاط جديد' : 'New activity',
          new Date(row.created_at).toLocaleDateString(locale + '-u-nu-latn'),
        ].join(' · '),
      ),
    );
  }
  const showMember=(username:string)=>{setMemberUsername(username);navigate('memberProfile');};
  const manageMember=(kind:'bags'|'equipment'|'recipes')=>{if(kind==='equipment')setEquipmentToAdd(null);navigate(kind==='bags'?'bags':kind==='equipment'?'myEquipment':'addRecipe');};
  const openMemberItem=async(kind:'recipe'|'bean'|'product'|'equipment',id:string)=>{if(!supabase)return;const owner=identity.current;try{
    if(kind==='equipment'){const item=(await loadEquipment(supabase,locale)).find(e=>e.id===id);if(item&&owner===identity.current)setDetail({type:'equipment',item});return;}
    const table=kind==='recipe'?'recipes':kind==='bean'?'beans':'roasted_products';const {data:row,error}=await supabase.from(table).select(kind==='recipe'?RECIPE_FIELDS:'*').eq('id',id).single();if(error||!row)throw error;if(owner!==identity.current)return;
    if(kind==='recipe'){const item=mapRecipe(row as unknown as RecipeRow,locale);if(item)openRecipe(item);}else openCoffee(mapCoffee(row as unknown as CoffeeRow,kind,ar));
  }catch{setMessage(ar?'هذا المحتوى غير متاح للعرض الآن.':'This content is not available now.');}};
  const login = tab === 'account' && !userId && !detail;
  const nav: { tab: Tab; icon: IconName; label: string }[] = [
    { tab: 'home', icon: 'home', label: ar ? 'الرئيسية' : 'Home' },
    { tab: 'beans', icon: 'search', label: ar ? 'اكتشف' : 'Discover' },
    { tab: 'brewFlow', icon: 'plus', label: ar ? 'تحضير' : 'Brew' },
    {
      tab: 'community',
      icon: 'globe',
      label: 'coffeeHO',
    },
    { tab: 'account', icon: 'user', label: t.account },
  ];
  const columns = width >= 850 ? 4 : width >= 600 ? 3 : 2;
  const cardWidth = (Math.min(width, 1120) - 36 - (columns - 1) * 12) / columns;
  const displayCoffee = coffees.filter(
    (c) =>
      (tab !== 'favorites' || savedIds.includes(c.beanId ?? c.id)) &&
      (!personalityOnly || hasCompletePersonality(c.flavors, c.sensory)),
  );
  const homeActive = tab === 'home' && !detail && !recording;
  const screenIntro = (
    <>
      {!login && !detail && configured ? (
        <View testID="library-navigation" style={s.libraryNav}>
          <View style={[s.libraryNavContent,{flexDirection:ar?'row-reverse':'row',flexWrap:'wrap'}]}>
            {[
              {id:'assistant' as const,label:ar?'مساعد القهوة':'Coffee assistant',icon:'star' as const},
              {id:'capsules' as const,label:ar?'الكبسولات':'Capsules',icon:'espresso' as const},
              {
                id: 'recipes' as const,
                label: ar ? 'مكتبة الوصفات' : 'Recipe library',
                icon: 'espresso' as const,
              },
              {
                id: 'savedRecipes' as const,
                label: ar ? 'وصفاتي المحفوظة' : 'Saved recipes',
                icon: 'heart' as const,
              },
              {
                id: 'beans' as const,
                label: ar ? 'البن والإيحاءات' : 'Coffee & taste',
                icon: 'bean' as const,
              },
              {
                id: 'roasters' as const,
                label: ar ? 'المحامص' : 'Roasteries',
                icon: 'bean' as const,
              },
              {
                id: 'equipment' as const,
                label: ar ? 'أدوات القهوة' : 'Equipment',
                icon: 'gear' as const,
              },
              {
                id: 'roastLab' as const,
                label: ar ? 'مختبر التحميص' : 'Roast Lab',
                icon: 'temp' as const,
              },
            ].filter(item=>item.id!=='roastLab').map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: tab === item.id }}
                onPress={() => {
                  if (item.id === 'equipment') setEquipmentCategory('all');
                  if (item.id === 'recipes' || item.id === 'beans')
                    setMethod(undefined);
                  navigate(item.id);
                }}
                style={[
                  s.libraryButton,
                  tab === item.id && { backgroundColor: colors.brown },
                ]}
              >
                <Icon
                  name={item.icon}
                  size={14}
                  color={tab === item.id ? '#FFF' : colors.brown}
                />
                <Txt
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: tab === item.id ? '#FFF' : colors.brown,
                  }}
                >
                  {item.label}
                </Txt>
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" accessibilityLabel={ar?'المزيد':'More'} onPress={()=>setLibraryMenu(true)} style={s.libraryButton}><Icon name="plus" size={14}/><Txt style={{fontSize:11,fontWeight:'700'}}>{ar?'المزيد':'More'}</Txt></Pressable>
            <Modal transparent visible={libraryMenu} animationType="fade" onRequestClose={()=>setLibraryMenu(false)}><View style={{flex:1,justifyContent:'center',padding:24,backgroundColor:'#0008'}}><ScrollView contentContainerStyle={{padding:18,gap:10}} style={{maxHeight:'85%',backgroundColor:colors.paper,borderRadius:20}}>
              <Txt heading style={styles.subtitle}>{ar?'مكتبتي وإضافاتي':'My library and contributions'}</Txt>
              {([{id:'addRecipe',ar:'إضافة وصفة',en:'Add recipe'},{id:'addBean',ar:'إضافة بن',en:'Add coffee'},{id:'myRecipes',ar:'وصفاتي المضافة',en:'My submitted recipes'},{id:'myEquipment',ar:'معداتـي',en:'My equipment'},{id:'bags',ar:'أكياسي',en:'My bags'},{id:'roastLab',ar:'مختبر التحميص',en:'Roast Lab'}] as const).map(item=><Action key={item.id} title={item[locale]} onPress={()=>{setLibraryMenu(false);if(item.id==='myEquipment')setEquipmentToAdd(null);if(item.id==='roastLab'){setRoastId(null);setRoastSection('own');}navigate(item.id);}}/>)}
              <Action title={ar?'إغلاق':'Close'} onPress={()=>setLibraryMenu(false)}/>
            </ScrollView></View></Modal>

          </View>
        </View>
      ) : null}
      {configured && !login && (data?.stale || (!data && !refreshing)) ? (
        <View
          testID="catalog-connection-status"
          style={{
            paddingHorizontal: 18,
            paddingVertical: 8,
            maxWidth: 1120,
            width: '100%',
            alignSelf: 'center',
            backgroundColor: '#F3E7D5',
            gap: 5,
          }}
        >
          <Txt style={{ fontSize: 12, lineHeight: 19 }}>
            {data?.savedAt
              ? (ar ? 'آخر بيانات متاحة: ' : 'Last available data: ') +
                new Date(data.savedAt).toLocaleString(locale + '-u-nu-latn')
              : t.partial}
            {data?.savedAt
              ? refreshing
                ? ar
                  ? ' · جارٍ التحديث'
                  : ' · Updating'
                : ar
                  ? ' · تعذّر تحديث بعض البيانات'
                  : ' · Some data could not update'
              : ''}
          </Txt>
          {!refreshing ? (
            <Action
              title={ar ? 'إعادة الاتصال' : 'Reconnect'}
              onPress={refresh}
            />
          ) : null}
        </View>
      ) : null}
    </>
  );
  if (!fontsLoaded && !fontError)
    return (
      <View
        style={[
          styles.fill,
          { alignItems: 'center', justifyContent: 'center' },
        ]}
      >
        <ActivityIndicator color={colors.brown} />
      </View>
    );
  return (
    <Language.Provider value={locale}>
      <SafeAreaView
        style={styles.fill}
        edges={login ? ['left', 'right', 'bottom'] : undefined}
      >
        <StatusBar barStyle={login || theme.dark ? 'light-content' : 'dark-content'} />
        <SettingsScreen visible={settingsOpen} close={() => setSettingsOpen(false)} changeLanguage={changeLanguage} />
        {!login ? (
          <View
            testID="app-header"
            style={[s.header, width < 360 && { paddingHorizontal: 10 }]}
          >
            {detail ? (
              <>
                <IconButton name="back" label={t.back} onPress={back} />
                <View style={{ flex: 1 }} />
                <IconButton name="gear" label={ar ? 'الإعدادات' : 'Settings'} onPress={() => setSettingsOpen(true)} />
                {detail.type === 'coffee' ? (
                  <IconButton
                    name="heart"
                    label={ar ? 'المفضلة' : 'Favorites'}
                    onPress={() => void saveCoffee(detail.item as CoffeeItem)}
                  />
                ) : null}
                <IconButton
                  name="share"
                  label={ar ? 'مشاركة' : 'Share'}
                  onPress={() =>
                    void Share.share({
                      message:
                        detail.type === 'recipe'
                          ? detail.item.title
                          : detail.item.name,
                    }).catch(() => setMessage(t.sourceError))
                  }
                />
              </>
            ) : (
              <>
                <IconButton name="gear" label={ar ? 'الإعدادات' : 'Settings'} onPress={() => setSettingsOpen(true)} />
                <View style={s.headerBrand}>
                  <Brand compact={width < 600} />
                </View>
                <View style={s.headerActions}>
                  <IconButton
                    name="search"
                    label={ar ? 'البحث' : 'Search'}
                    onPress={() => navigate('search')}
                  />
                  {width >= 600 ? (
                    <IconButton
                      name="bell"
                      label={ar ? 'التنبيهات' : 'Notifications'}
                      onPress={() => void showNotifications()}
                    />
                  ) : null}
                  <IconButton
                    name="user"
                    label={ar ? 'فتح حسابي' : 'Open account'}
                    onPress={() => navigate('account')}
                  />
                </View>
              </>
            )}
          </View>
        ) : null}
        {!homeActive && tab !== 'assistant' ? screenIntro : null}
        <ScreenTransition
          key={
            recording ? 'record' : detail ? detail.type + detail.item.id : tab
          }
        >
          <ScreenBoundary
            key={
              (recording
                ? 'record'
                : detail
                  ? detail.type + detail.item.id
                  : tab)
            }
            locale={locale}
            home={() => navigate('home')}
          >
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              {!configured ? (
                <View style={styles.content}>
                  <Txt heading style={styles.title}>
                    {t.setup}
                  </Txt>
                  <Txt>{t.setupNote}</Txt>
                  <AppVersion />
                </View>
              ) : recording && detail?.type === 'recipe' && userId ? (
                <OutcomeForm
                  key={userId + detail.item.id}
                  userId={userId}
                  recipe={detail.item}
                  measuredSeconds={measuredSeconds}
                  done={() => {
                    navigate('forYou');
                    refresh();
                  }}
                />
              ) : detail?.type === 'coffee' ? (
                <CoffeeDetail
                  key={detail.item.id}
                  item={detail.item}
                  recipes={data?.recipes ?? []}
                  openRecipe={openRecipe}
                  addToBags={(item) => void addToBags(item)}
                  browseRecipes={(brewMethod) => {
                    setMethod(brewMethod);
                    navigate('recipes');
                    setRecipeCoffee(detail.item);
                  }}
                />
              ) : detail?.type === 'recipe' ? (
                <RecipeDetail
                  recipe={detail.item}
                  record={startRecord}
                  saved={shelf.ids.includes(detail.item.id)}
                  saving={shelf.busy}
                  saveError={shelf.error}
                  toggleSaved={() =>
                    void shelf.toggle(detail.item as RecipeItem)
                  }
                />
              ) : detail?.type === 'equipment' ? (
                <EquipmentDetail
                  key={detail.item.id + (userId ?? 'guest')}
                  item={detail.item}
                  myEquipment={()=>{setEquipmentToAdd(detail.item as EquipmentItem);navigate('myEquipment');}}
                  recipes={data?.recipes ?? []}
                  userId={userId}
                  login={() => requestLogin()}
                  openRecipe={openRecipe}
                />
              ) : detail?.type === 'roaster' ? (
                <RoasterDetail
                  key={detail.item.id}
                  item={detail.item}
                  coffees={data?.coffees ?? []}
                  recipes={data?.recipes ?? []}
                  openCoffee={openCoffee}
                  openRecipe={openRecipe}
                  saveCoffee={(item) => void saveCoffee(item)}
                  saved={savedIds}
                  loading={refreshing}
                />
              ) : tab === 'assistant' ? (
                <CoffeeAssistant key={userId ?? 'guest'} turns={assistantTurns} setTurns={setAssistantTurns} openItem={(kind,id) => void openMemberItem(kind,id)} />
              ) : tab === 'myRecipes' ? (<MemberRecipes key={userId??'guest'} userId={userId} login={()=>requestLogin()} open={openRecipe} create={()=>navigate('addRecipe')}/>) : tab === 'capsules' ? (<CapsuleCatalog/>) : tab === 'addRecipe' || tab === 'addBean' ? (
                <ContributionForm key={(userId??'guest')+tab} kind={tab==='addBean'?'bean':'recipe'} userId={userId} login={()=>requestLogin()} done={()=>{setRevision(n=>n+1);navigate(tab==='addBean'?'bags':'myRecipes');}}/>
              ) : tab === 'myEquipment' ? (
                <MyEquipment key={userId??'guest'} userId={userId} login={()=>requestLogin()} initialItem={equipmentToAdd} browse={()=>{setEquipmentCategory('all');navigate('equipment');}}/>
              ) : tab === 'equipment' ? (
                <EquipmentDirectory
                  key={equipmentCategory}
                  category={equipmentCategory}
                  add={item => { setEquipmentToAdd(item); navigate('myEquipment'); }}
                  open={(item) => openDetail({ type: 'equipment', item })}
                />
              ) : tab === 'roastLab' ? (
                <RoastLab
                  key={
                    (userId ?? 'guest') +
                    locale +
                    (roastId ?? '') +
                    roastSection
                  }
                  userId={userId}
                  login={() => requestLogin()}
                  recipes={data?.recipes ?? []}
                  openRecipe={openRecipe}
                  initialId={roastId}
                  initialSection={roastSection}
                />
              ) : tab === 'roasters' ? (
                <RoasterDirectory
                                    coffees={data?.coffees ?? []}
                  initialSearch={search}
                  open={(item) => openDetail({ type: 'roaster', item })}
                />
              ) : tab === 'savedRecipes' ? (
                <RecipeShelf
                  recipes={shelf.recipes}
                  loading={shelf.busy}
                  error={shelf.error}
                  open={openRecipe}
                />
              ) : tab === 'search' ? (
                <SearchScreen
                                    coffees={data?.coffees ?? []}
                  savedIds={savedIds}
                  saveCoffee={(item) => void saveCoffee(item)}
                  openCoffee={openCoffee}
                  openRecipe={openRecipe}
                  openRoaster={(item) => openDetail({ type: 'roaster', item })}
                  browseCoffees={(query) => {
                    setMethod(undefined);
                    navigate('beans');
                    setSearch(query);
                  }}
                  browseRoasters={(query) => {
                    navigate('roasters');
                    setSearch(query);
                  }}
                />
              ) : tab === 'recipes' ? (
                <SearchScreen key={recipeEntry + (recipeCoffee?.id ?? '')}
                  coffees={data?.coffees??[]} savedIds={savedIds} saveCoffee={item=>void saveCoffee(item)}
                  openCoffee={openCoffee} openRecipe={openRecipe} openRoaster={item=>openDetail({type:'roaster',item})}
                  browseCoffees={query=>{setMethod(undefined);navigate('beans');setSearch(query);}}
                  browseRoasters={query=>{navigate('roasters');setSearch(query);}}
                  recipeOptions={{method,coffee:data?.coffees.find(c=>c.kind===recipeCoffee?.kind&&c.id===recipeCoffee?.id)??recipeCoffee??undefined,locked:Boolean(recipeCoffee),backToCoffee:recipeCoffee?()=>{openCoffee(recipeCoffee);setRecipeCoffee(null);}:undefined}}
                />
              ) : tab === 'brewFlow' ? (
                <BrewMyCoffee
                  key={userId ?? 'guest'}
                  userId={userId}
                  coffees={data?.coffees ?? []}
                  profile={data?.profile ?? emptyProfile()}
                  login={() => requestLogin()}
                  browse={() => navigate('beans')}
                  openRecipe={openRecipe}
                />
              ) : tab === 'bags' ? (
                <MyBags
                  key={userId ?? 'guest'}
                  userId={userId}
                  coffees={data?.coffees ?? []}
                  savedIds={savedIds}
                  recipes={data?.recipes ?? []}
                  openCoffee={openCoffee}
                  openRecipe={openRecipe}
                  login={() => requestLogin()}
                />
              ) : tab === 'best' ? (
                <BestSetup
                  key={userId ?? 'guest'}
                  userId={userId}
                  recipes={data?.recipes ?? []}
                  coffees={data?.coffees ?? []}
                  login={() => requestLogin()}
                  openRecipe={openRecipe}
                  openCoffee={openCoffee}
                />
              ) : tab === 'members' ? (<MemberDirectory open={showMember}/>) : tab === 'memberProfile' ? (<ScrollView contentContainerStyle={{padding:18,gap:14}}><Action title={ar?'حسابات coffeeHO':'coffeeHO accounts'} onPress={()=>navigate('members')}/><MemberProfile key={(userId??'guest')+memberUsername} userId={userId} username={memberUsername} openMember={showMember} openItem={(kind,id)=>void openMemberItem(kind,id)} manage={manageMember} login={()=>requestLogin()}/></ScrollView>) : tab === 'community' ? (
                <CommunityScreen
                  key={userId ?? 'guest'}
                  userId={userId}
                  recipes={data?.recipes ?? []}
                  coffees={data?.coffees ?? []}
                  login={() => requestLogin()}
                  brew={() => navigate('brewFlow')}
                  browse={() => navigate('recipes')}
                  openRecipe={openRecipe}
                  openCoffee={openCoffee}
                  roast={(id) => showRoasts(id ?? null, 'public')}
                  tools={() => showTools('all')}
                  members={()=>navigate('members')}
                  openMember={showMember}
                />
              ) : tab === 'account' ? (
                <AccountScreen
                  key={userId ?? 'public'}
                  session={userId ? session : null}
                  settings={() => setSettingsOpen(true)}
                  profileContent={userId?<MemberProfile userId={userId} openMember={showMember} openItem={(kind,id)=>void openMemberItem(kind,id)} manage={manageMember} login={()=>requestLogin()}/>:null}
                  recovery={passwordRecovery}
                  onRecovered={() => {
                    setPasswordRecovery(false);
                    setMessage(
                      ar ? 'تم تحديث كلمة المرور.' : 'Password updated.',
                    );
                  }}
                  back={back}
                  onDeleted={(localCleanupFailed) => {
                    loginReturn.current = null;
                    setSession(null);
                    setSaved(null);
                    setNotifications(null);
                    setRevision((value) => value + 1);
                    navigate('home');
                    setMessage(
                      localCleanupFailed
                        ? ar
                          ? 'حُذف الحساب. تعذّر مسح بعض البيانات من الجهاز؛ امسح بيانات التطبيق من إعدادات الجهاز.'
                          : 'Account deleted. Some device data could not be cleared; clear app data in your device settings.'
                        : ar
                          ? 'تم حذف حسابك وبياناته.'
                          : 'Your account and its data were deleted.',
                    );
                  }}
                />
              ) : tab === 'home' ? (
                <Home
                  intro={screenIntro}
                  data={data}
                  coffees={coffees}
                  method={method}
                  setMethod={(value) => {
                    setMethod(value);
                    navigate('recipes');
                  }}
                  openCoffee={openCoffee}
                  browse={() => navigate('search')}
                  brew={() => navigate('brewFlow')}
                  personalize={() => navigate('best')}
                  bags={() => navigate('bags')}
                  tools={(category) => void showTools(category)}
                  saved={savedIds}
                  save={(item) => void saveCoffee(item)}
                  refresh={refresh}
                  refreshing={refreshing}
                />
              ) : tab === 'forYou' ? (
                <ScrollView contentContainerStyle={coffeeStyles.page}>
                  <View style={s.catalogTabs}>
                    <Action title={t.beans} onPress={() => navigate('beans')} />
                    <Action
                      title={t.recipes}
                      onPress={() => navigate('recipes')}
                    />
                    <Action title={t.forYou} onPress={() => {}} selected />
                  </View>
                  <Txt heading style={styles.title}>
                    {t.forYou}
                  </Txt>
                  <Txt style={styles.muted}>{t.ruleNote}</Txt>
                  {data?.limited ? (
                    <Txt style={styles.muted}>
                      {ar
                        ? 'التوصيات تستخدم مجموعة محدودة من الوصفات. ابحث في مكتبة الوصفات لاستكشاف الكتالوغ الكامل.'
                        : 'Recommendations use a bounded recipe sample. Search the recipe library for the full catalog.'}
                    </Txt>
                  ) : null}
                  <SectionTitle title={t.beans} />
                  {rankedCoffee.length ? (
                    rankedCoffee.map((row) => (
                      <View
                        key={row.item.kind + row.item.id}
                        style={styles.card}
                      >
                        <Action
                          title={row.item.name}
                          onPress={() => {
                            const item = data?.coffees.find(
                              (c) =>
                                c.id === row.item.id &&
                                c.kind === row.item.kind,
                            );
                            if (item) openCoffee(item);
                          }}
                        />
                        <Txt>
                          {t.matching}:{' '}
                          {row.reasons.length
                            ? row.reasons
                                .map((r) => reasons[locale][r])
                                .join(' · ')
                            : t.general}
                        </Txt>
                        {row.caveats.map((c) => (
                          <Txt key={c} style={styles.muted}>
                            {caveats[locale][c]}
                          </Txt>
                        ))}
                      </View>
                    ))
                  ) : (
                    <Txt>{t.empty}</Txt>
                  )}
                  <SectionTitle title={t.recipes} />
                  {rankedRecipes.map((row) => (
                    <View key={row.item.id} style={styles.card}>
                      <Action
                        title={row.item.title}
                        onPress={() => {
                          const item = data?.recipes.find(
                            (r) => r.id === row.item.id,
                          );
                          if (item) setDetail({ type: 'recipe', item });
                        }}
                      />
                      <Txt>
                        {t.matching}:{' '}
                        {row.reasons.length
                          ? row.reasons
                              .map((r) => reasons[locale][r])
                              .join(' · ')
                          : t.general}
                      </Txt>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <FlatList
                  key={tab + columns}
                  numColumns={columns}
                  data={displayCoffee.slice(0, visibleCount)}
                  keyExtractor={(item) => item.kind + item.id}
                  columnWrapperStyle={{ gap: 12 }}
                  contentContainerStyle={[coffeeStyles.page, { gap: 12 }]}
                  refreshing={refreshing}
                  onRefresh={refresh}
                  ListHeaderComponent={
                    <View style={{ gap: 16, marginBottom: 4 }}>
                      {tab !== 'favorites' ? (
                        <View style={s.catalogTabs}>
                          <Action
                            title={t.beans}
                            onPress={() => navigate('beans')}
                            selected
                          />
                          <Action
                            title={t.recipes}
                            onPress={() => navigate('recipes')}
                          />
                          <Action
                            title={t.forYou}
                            onPress={() => navigate('forYou')}
                          />
                        </View>
                      ) : null}
                      <Txt heading style={styles.title}>
                        {tab === 'favorites'
                          ? ar
                            ? 'المفضلة'
                            : 'Favorites'
                          : t.beans}
                      </Txt>
                      <View style={s.catalogTabs}>
                        <Action
                          title={ar ? 'كل البن' : 'All coffees'}
                          onPress={() => setPersonalityOnly(false)}
                          selected={!personalityOnly}
                        />
                        <Action
                          title={
                            ar ? 'شخصية البن مكتملة' : 'Complete personality'
                          }
                          onPress={() => setPersonalityOnly(true)}
                          selected={personalityOnly}
                        />
                      </View>
                      <MethodPicker value={method} onChange={setMethod} />
                      <MethodGuide
                        key={method ?? 'all'}
                        method={method}
                        recipes={() => navigate('recipes')}
                      />
                      <Field
                        label={t.search}
                        value={search}
                        onChangeText={setSearch}
                        placeholder={
                          ar
                            ? 'ابحث عن البن أو المحمصة أو البلد…'
                            : 'Search coffee, roaster or origin…'
                        }
                      />
                      {data?.warnings || (!data && !refreshing) ? (
                        <Txt style={styles.warning}>{t.partial}</Txt>
                      ) : null}
                    </View>
                  }
                  ListEmptyComponent={
                    <Txt style={styles.muted}>
                      {refreshing
                        ? t.loading
                        : tab === 'favorites' && !userId
                          ? t.loginFirst
                          : tab === 'favorites'
                            ? ar
                              ? 'احفظ حبوبك المفضلة بالضغط على القلب.'
                              : 'Save your favorite coffees with the heart button.'
                            : t.empty}
                    </Txt>
                  }
                  ListFooterComponent={
                    <View style={{ gap: 10, marginTop: 10 }}>
                      {displayCoffee.length > visibleCount ? (
                        <Action
                          title={ar ? 'عرض المزيد' : 'Load more'}
                          onPress={() => setVisibleCount((n) => n + 30)}
                          selected
                        />
                      ) : null}
                      <Action title={t.refresh} onPress={refresh} />
                    </View>
                  }
                  renderItem={({ item }) => (
                    <CoffeeCard
                      item={item}
                      width={cardWidth}
                      saved={savedIds.includes(item.beanId ?? item.id)}
                      open={() => openCoffee(item)}
                      save={() => void saveCoffee(item)}
                    />
                  )}
                />
              )}
            </KeyboardAvoidingView>
          </ScreenBoundary>
        </ScreenTransition>
        {!detail && !login && configured ? (
          <View testID="bottom-navigation" style={s.nav}>
            <View style={s.navInner}>
              {nav.map((item) => (
                <Pressable
                  key={item.tab}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: tab === item.tab }}
                  onPress={() => navigate(item.tab)}
                  style={s.navItem}
                >
                  {item.tab==='community'?<Image source={require('./assets/brand/mark.png')} accessibilityLabel="BeanMora logo" resizeMode="contain" style={{height:25,width:25}}/>:<Icon
                    name={item.icon}
                    filled={tab === item.tab}
                    color={tab === item.tab ? colors.brown : colors.muted}
                    size={23}
                  />}
                  <Txt
                    style={{
                      fontSize: 13,
                      lineHeight: 20,
                      fontWeight: tab === item.tab ? '700' : '400',
                      color: tab === item.tab ? colors.brown : colors.muted,
                      textAlign: 'center',
                    }}
                  >
                    {item.label}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <Modal
          visible={!!message || notifications !== null}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setMessage('');
            setNotifications(null);
          }}
        >
          <View style={s.modalShade}>
            <View style={s.modal}>
              <Txt heading style={styles.subtitle}>
                {notifications !== null
                  ? ar
                    ? 'التنبيهات'
                    : 'Notifications'
                  : 'BeanMora'}
              </Txt>
              <ScrollView style={{ maxHeight: 350 }}>
                {message ? (
                  <Txt>{message}</Txt>
                ) : notifications?.length ? (
                  notifications.map((n, i) => (
                    <Txt key={i} style={{ paddingVertical: 10 }}>
                      {n}
                    </Txt>
                  ))
                ) : (
                  <Txt style={styles.muted}>
                    {ar
                      ? 'لا توجد تنبيهات حالياً.'
                      : 'No notifications right now.'}
                  </Txt>
                )}
              </ScrollView>
              <Action
                title={ar ? 'إغلاق' : 'Close'}
                onPress={() => {
                  setMessage('');
                  setNotifications(null);
                }}
                selected
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Language.Provider>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
      <MotionProvider>
        <Shell />
      </MotionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  header: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    height: 68,
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 18,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  libraryNav: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    minHeight: 62,
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  libraryNavContent: { width:'100%', flexDirection: 'row', gap: 6, paddingVertical: 2 },
  libraryButton: {
    flexGrow: 1,
    flexBasis: '22%',
    flexShrink: 0,
    minWidth: 60,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.paper,
    minHeight: 46,
  },
  headerActions: {
    flexDirection: 'row',
    flexShrink: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  headerBrand: { flex: 1, minWidth: 0, alignItems: 'center' },
  catalogTabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  nav: {
    flexShrink: 0,
    borderTopWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  navInner: {
    width: '100%',
    maxWidth: 780,
    alignSelf: 'center',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 46,
  },
  modalShade: {
    flex: 1,
    backgroundColor: '#0007',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.paper,
    borderRadius: 22,
    padding: 22,
    gap: 18,
  },
});
