import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, AppState, BackHandler, FlatList, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StatusBar, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { configured, supabase } from './src/client';
import { loadData, type Bundle, type CoffeeItem, type RecipeItem } from './src/data';
import { recommendCoffees, recommendRecipes, METHODS, type Method } from './src/core/engine';
import { copy, caveats, methods, reasons, type Locale } from './src/copy';
import { searchText } from './src/guards';
import { OutcomeForm } from './src/OutcomeForm';
import { Action, Field, Language, Txt, styles, useCopy } from './src/ui';

type Tab = 'beans' | 'recipes' | 'forYou' | 'account';
type Detail = { type: 'coffee'; item: CoffeeItem } | { type: 'recipe'; item: RecipeItem };
type Loaded = Bundle & { owner: string | null; locale: Locale; method: Method | undefined };

function Account({ session, tablet = false }: { session: Session | null; tablet?: boolean }) {
  const t = useCopy(); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const inFlight = useRef(false);
  async function authenticate() {
    if (!supabase || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      if (session) {
        const result = await supabase.auth.signOut({ scope: 'local' });
        if (result.error) setError(t.logoutError);
      } else {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error || !result.data.session) {
          const message = result.error?.message?.toLowerCase() ?? '';
          setError(message.includes('invalid login') ? (t.invalidCredentials ?? t.authError)
            : message.includes('email not confirmed') ? (t.emailNotConfirmed ?? t.authError)
            : message.includes('network') || message.includes('fetch') ? (t.networkError ?? t.authError)
            : result.error?.message || t.authError);
        }
        else setPassword('');
      }
    } catch { setError(session ? t.logoutError : t.authError); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, tablet && { maxWidth: 820, width: '100%', alignSelf: 'center' }]}>
    <View style={styles.profileHero}><View style={styles.avatar}><Txt style={{ fontSize: 28, fontWeight: '800' }}>{(session?.user.email ?? 'B').slice(0,1).toUpperCase()}</Txt></View><View style={{ flex: 1 }}><Txt heading style={styles.title}>{t.account}</Txt><Txt style={styles.muted}>{session ? (t.profileNote) : t.existing}</Txt></View></View>
    <Txt>{session?.user.email ?? t.guest}</Txt><Txt style={styles.muted}>{t.existing}</Txt>
    {!session ? <>
      <Field label={t.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" editable={!busy} style={{ textAlign: 'left', writingDirection: 'ltr' }} />
      <Field label={t.password} value={password} onChangeText={setPassword} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" editable={!busy} />
      <Action title={show ? t.hide : t.show} onPress={() => setShow(v => !v)} />
    </> : <Txt style={styles.muted}>{t.profileNote}</Txt>}
    {error ? <Txt style={styles.error}>{error}</Txt> : null}
    <Action title={session ? t.logout : t.login} onPress={() => void authenticate()} disabled={busy || (!session && (!email.trim() || !password))} selected />
    <Txt style={styles.warning}>{t.authNote}</Txt>
  </ScrollView>;
}
function MotionItem({ index, children }: { index: number; children: ReactNode }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(value, { toValue: 1, duration: 260, delay: Math.min(index, 8) * 38, useNativeDriver: true }).start();
  }, [index, value]);
  return <Animated.View style={{ opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0,1], outputRange: [12,0] }) }] }}>{children}</Animated.View>;
}
function DetailView({ detail, record }: { detail: Detail; record: () => void }) {
  const t = useCopy(); const locale = useContext(Language); const [linkError, setLinkError] = useState(false);
  const c = detail.type === 'coffee' ? detail.item : null; const r = detail.type === 'recipe' ? detail.item : null;
  async function openVerified(url: string | null) {
    if (!url) return;
    setLinkError(false); try { await Linking.openURL(url); } catch { setLinkError(true); }
  }
  async function source() {
    if (!c?.sourceUrl) return;
    await openVerified(c.sourceUrl);
  }
  return <ScrollView contentContainerStyle={styles.content}>
    <View style={styles.hero}>{(c?.logoUrl || r?.coverUrl) ? <Image source={{ uri: c?.logoUrl ?? r?.coverUrl ?? '' }} style={styles.detailImage} resizeMode="cover" /> : <View style={styles.imageFallback}><Txt style={{ fontSize: 38 }}>☕</Txt></View>}<Txt heading style={styles.title}>{c?.name ?? r?.title}</Txt>
      <Txt style={styles.muted}>{c?.roaster ?? (r ? methods[locale][r.method] : '')}</Txt></View>
    {c ? <>
      <Txt>{c.origin}</Txt><Txt>{c.description || t.noNotes}</Txt>
      <Txt>{c.flavors.join(' · ')}</Txt><Txt style={styles.warning}>{t.stockUnknown}</Txt>
      <Txt style={styles.muted}>{t.verified}: {c.verifiedAt && Number.isFinite(Date.parse(c.verifiedAt)) ? new Date(c.verifiedAt).toLocaleDateString(locale + '-u-nu-latn') : t.unknown}</Txt>
      {c.sourceUrl ? <Action title={t.source} onPress={() => void source()} /> : null}
      {linkError ? <Txt style={styles.error}>{t.sourceError}</Txt> : null}
    </> : null}
    {r ? <>
      <View style={styles.card}><Txt>{t.dose}: {r.dose ?? t.unknown}</Txt><Txt>{t.water}: {r.water ?? t.unknown}</Txt></View>
      {r.method === 'xbloom' ? <View style={styles.xbloomCard}>
        <Txt heading style={styles.subtitle}>xBloom</Txt>
        <Txt>{locale === 'ar' ? 'ملف التحضير المتوافق' : 'Compatible brew profile'}: {r.xBloom?.deviceModel ?? t.unknown}</Txt>
        {r.xBloom?.grindSetting ? <Txt>{locale === 'ar' ? 'الطحنة' : 'Grind'}: {r.xBloom.grindSetting}</Txt> : null}
        {r.xBloom?.temp ? <Txt>{locale === 'ar' ? 'الحرارة' : 'Temperature'}: {r.xBloom.temp}°C</Txt> : null}
        {Array.isArray(r.xBloom?.pours) && r.xBloom!.pours.length ? <View style={styles.timeline}>{r.xBloom!.pours.map((p: any, i: number) => <MotionItem key={i} index={i}><View style={styles.timelineRow}><View style={styles.timelineDot}/><View style={{ flex: 1 }}><Txt style={{ fontWeight: '700' }}>{locale === 'ar' ? `الصبة ${i + 1}` : `Pour ${i + 1}`}</Txt><Txt style={styles.muted}>{[p?.water_grams ?? p?.grams ?? p?.amount, p?.duration_seconds ?? p?.seconds].filter(v => v != null).join(' · ')}</Txt></View></View></MotionItem>)}</View> : null}
        {r.videoUrl ? <Action title={locale === 'ar' ? 'فتح رابط وصفة xBloom' : 'Open xBloom recipe link'} onPress={() => void openVerified(r.videoUrl)} selected /> : <Txt style={styles.muted}>{locale === 'ar' ? 'لا يوجد رابط موثّق لهذه الوصفة حالياً.' : 'No verified recipe link is stored yet.'}</Txt>}
      </View> : r.videoUrl ? <Action title={locale === 'ar' ? 'فتح رابط الوصفة' : 'Open recipe link'} onPress={() => void openVerified(r.videoUrl)} /> : null}
      {linkError ? <Txt style={styles.error}>{t.sourceError}</Txt> : null}
      <Txt>{r.notes || t.noNotes}</Txt><Txt heading style={styles.subtitle}>{t.instructions}</Txt>
      {r.steps.length ? r.steps.map(s => <View key={s.number} style={styles.card}><Txt style={styles.subtitle}>{s.number}. {s.title}</Txt><Txt>{s.description}</Txt></View>) : <Txt style={styles.warning}>{t.noSteps}</Txt>}
      <Action title={t.record} onPress={record} selected />
    </> : null}
  </ScrollView>;
}
function Shell() {
  const { width } = useWindowDimensions();
  const tablet = width >= 760;
  const entrance = useRef(new Animated.Value(0)).current;
  const tabMotion = useRef(new Animated.Value(1)).current;
  const switchTab = (next: Tab) => {
    if (next === tab) return;
    Animated.timing(tabMotion, { toValue: 0, duration: 90, useNativeDriver: true }).start(() => {
      setTab(next); setSearch('');
      tabMotion.setValue(0);
      Animated.spring(tabMotion, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 180 }).start();
    });
  };
  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 120 }).start();
  }, [entrance]);
  const [locale, setLocale] = useState<Locale>('ar'); const t = copy[locale];
  const [session, setSession] = useState<Session | null>(null); const userId = session && !session.user.is_anonymous ? session.user.id : null;
  const [tab, setTab] = useState<Tab>('beans'); const [method, setMethod] = useState<Method>(); const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null); const [recording, setRecording] = useState(false);
  const [bundle, setBundle] = useState<Loaded | null>(null); const [homeMode, setHomeMode] = useState<'all'|'new'|'xbloom'>('all'); const [visibleCount, setVisibleCount] = useState(30); const [refreshing, setRefreshing] = useState(false); const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, value) => { setSession(value); });
    const apply = (state: string) => { if (state === 'active') supabase?.auth.startAutoRefresh(); else supabase?.auth.stopAutoRefresh(); };
    apply(AppState.currentState);
    const listener = AppState.addEventListener('change', apply);
    return () => { subscription.unsubscribe(); listener.remove(); supabase?.auth.stopAutoRefresh(); };
  }, []);
  useEffect(() => {
    let active = true; setRefreshing(true); setBundle(null);
    if (!supabase) { setRefreshing(false); return; }
    loadData(supabase, locale, userId, method).then(data => {
      if (active) setBundle({ ...data, owner: userId, locale, method });
    }).catch(() => {
      if (active) setBundle(null);
    }).finally(() => { if (active) setRefreshing(false); });
    return () => { active = false; };
  }, [locale, userId, method, revision]);
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (recording) { setRecording(false); return true; }
      if (detail) { setDetail(null); return true; }
      if (tab !== 'beans') { setTab('beans'); return true; }
      return false;
    });
    return () => back.remove();
  }, [detail, recording, tab]);
  // Never render old personalized results for a different identity or filter while a new read is pending.
  const data = bundle?.owner === userId && bundle.locale === locale && bundle.method === method ? bundle : null;
  const filter = searchText(search);
  const coffees = data?.coffees.filter(c => c.reviewed && c.published && (!method || c.methods.includes(method)) && searchText(c.name + ' ' + c.roaster + ' ' + c.flavors.join(' ')).includes(filter)) ?? [];
  const recipesAll = data?.recipes.filter(r => r.public && searchText(r.title + ' ' + r.flavors.join(' ')).includes(filter)) ?? [];
  const recipes = homeMode === 'xbloom' ? recipesAll.filter(r => r.method === 'xbloom') : homeMode === 'new' ? recipesAll.slice(0, 40) : recipesAll;
  const rankedCoffee = data ? recommendCoffees(data.coffees, data.profile, Date.now(), method) : [];
  const rankedRecipes = data ? recommendRecipes(data.recipes, data.profile, method) : [];
  function back() { if (recording) setRecording(false); else setDetail(null); }
  function startRecord() { if (!userId) { setDetail(null); setTab('account'); } else setRecording(true); }
  useEffect(() => { setVisibleCount(30); }, [tab, method, search]);
  function resetLanguage() { setLocale(l => l === 'ar' ? 'en' : 'ar'); setDetail(null); setRecording(false); }
  const refresh = () => setRevision(n => n + 1);
  return <Language.Provider value={locale}><SafeAreaView style={styles.fill}>
    <StatusBar barStyle="dark-content" />
    <View style={[styles.row, { paddingHorizontal: tablet ? 32 : 16, paddingVertical: 12, flexDirection: locale === 'ar' ? 'row-reverse' : 'row', justifyContent: 'space-between' }]}>
      <Txt style={{ fontSize: 23, fontWeight: '800' }}>BeanMora</Txt>
      <View style={styles.row}>{detail ? <Action title={t.back} onPress={back} /> : null}<Action title={locale === 'ar' ? 'English' : 'العربية'} onPress={resetLanguage} /></View>
    </View>
    <Animated.View style={{ flex: 1, opacity: Animated.multiply(entrance, tabMotion), transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }, { translateX: tabMotion.interpolate({ inputRange: [0, 1], outputRange: [0, 0] }) }] }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {!configured ? <View style={styles.content}><Txt heading style={styles.title}>{t.setup}</Txt><Txt>{t.setupNote}</Txt></View>
    : recording && detail?.type === 'recipe' && userId ? <OutcomeForm key={userId + detail.item.id} userId={userId} recipe={detail.item} done={() => { setRecording(false); setDetail(null); setTab('forYou'); refresh(); }} />
    : detail ? <DetailView key={detail.item.id + locale} detail={detail} record={startRecord} />
    : tab === 'account' ? <Account key={userId ?? 'public'} session={session} tablet={tablet} />
    : <>
      <View style={{ paddingHorizontal: tablet ? 32 : 18, gap: 10, maxWidth: tablet ? 1180 : undefined, width: '100%', alignSelf: 'center' }}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Txt heading style={styles.statValue}>{data?.coffees.length ?? '—'}</Txt><Txt style={styles.muted}>{locale === 'ar' ? 'بن' : 'Coffees'}</Txt></View>
          <View style={styles.statCard}><Txt heading style={styles.statValue}>{data?.recipes.length ?? '—'}</Txt><Txt style={styles.muted}>{locale === 'ar' ? 'وصفة' : 'Recipes'}</Txt></View>
          <View style={styles.statCard}><Txt heading style={styles.statValue}>{data?.recipes.filter(r => r.method === 'xbloom').length ?? '—'}</Txt><Txt style={styles.muted}>xBloom</Txt></View>
        </View>
        <View style={styles.visualHero}>
          <View style={{ flex: 1, gap: 8 }}>
            <Txt heading style={[styles.title,{fontSize: tablet ? 34 : 28}]}>{locale === 'ar' ? 'اكتشف عالم القهوة.' : 'Discover the world of coffee.'}</Txt>
            <Txt style={styles.muted}>{locale === 'ar' ? 'من الحبوب إلى الكوب، تجربة أفضل كل يوم.' : 'From bean to cup, a better experience every day.'}</Txt>
            <View style={{alignSelf: locale === 'ar' ? 'flex-end' : 'flex-start'}}><Action title={locale === 'ar' ? 'استكشف الآن' : 'Explore now'} onPress={() => switchTab('beans')} selected /></View>
          </View>
          <View style={styles.beanOrb}><Txt style={{ fontSize: tablet ? 42 : 30 }}>☕</Txt></View>
        </View>
        <View style={{flexDirection: locale === 'ar' ? 'row-reverse':'row',justifyContent:'space-between',alignItems:'center'}}><Txt heading style={styles.subtitle}>{tab === 'forYou' ? t.forYou : tab === 'beans' ? (locale === 'ar' ? 'أحدث الحبوب' : 'Latest beans') : t.tagline}</Txt>{tab === 'beans' ? <Txt style={styles.muted}>{locale === 'ar' ? 'عرض الكل ←' : 'View all →'}</Txt> : null}</View>
        {tab === 'recipes' ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          <Action title={locale === 'ar' ? 'الكل' : 'All'} selected={homeMode === 'all'} onPress={() => setHomeMode('all')} />
          <Action title={locale === 'ar' ? 'الجديد' : 'New'} selected={homeMode === 'new'} onPress={() => setHomeMode('new')} />
          <Action title="xBloom" selected={homeMode === 'xbloom'} onPress={() => { setHomeMode('xbloom'); setMethod('xbloom'); }} />
        </ScrollView> : null}
        <Txt style={styles.muted}>{t.preview}</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, { paddingVertical: 7 }]}>
          <Action title={t.all} selected={!method} onPress={() => setMethod(undefined)} />
          {METHODS.map(m => <Action key={m} title={methods[locale][m]} selected={method === m} onPress={() => setMethod(m)} />)}
        </ScrollView>
        {tab !== 'forYou' ? <Field label={t.search} value={search} onChangeText={setSearch} /> : <Txt style={styles.muted}>{t.ruleNote}</Txt>}
        {data?.warnings || (!data && !refreshing) ? <Txt style={styles.warning}>{t.partial}</Txt> : null}
        {data?.limited ? <Txt style={styles.warning}>{t.limited}</Txt> : null}
      </View>
      {refreshing && !data ? <View style={styles.content}>
        {[0,1,2].map(i => <Animated.View key={i} style={[styles.skeletonCard, { opacity: entrance }]}><View style={styles.skeletonImage}/><View style={styles.skeletonLineWide}/><View style={styles.skeletonLine}/></Animated.View>)}
        <Txt>{t.loading}</Txt>
      </View>
      : tab === 'forYou' ? <ScrollView contentContainerStyle={styles.content}>
        <Action title={t.refresh} onPress={refresh} />
        <Txt heading style={styles.subtitle}>{t.beans}</Txt>
        {rankedCoffee.length === 0 ? <Txt>{t.empty}</Txt> : rankedCoffee.map((row, index) => <View key={row.item.kind + row.item.id} style={[styles.card, index === 0 && styles.featuredCard]}>
          <Action title={row.item.name} onPress={() => { const item = data?.coffees.find(c => c.id === row.item.id && c.kind === row.item.kind); if (item) setDetail({ type: 'coffee', item }); }} />
          <Txt>{t.matching}: {row.reasons.length ? row.reasons.map(r => reasons[locale][r]).join(' · ') : t.general}</Txt>
          {row.caveats.map(c => <Txt key={c} style={styles.muted}>{caveats[locale][c]}</Txt>)}
        </View>)}
        <Txt heading style={styles.subtitle}>{t.recipes}</Txt>
        {rankedRecipes.length === 0 ? <Txt>{t.empty}</Txt> : rankedRecipes.map((row, index) => <View key={row.item.id} style={[styles.card, index === 0 && styles.featuredCard]}>
          <Action title={row.item.title} onPress={() => { const item = data?.recipes.find(r => r.id === row.item.id); if (item) setDetail({ type: 'recipe', item }); }} />
          <Txt>{t.matching}: {row.reasons.length ? row.reasons.map(r => reasons[locale][r]).join(' · ') : t.general}</Txt>
          {row.caveats.map(c => <Txt key={c} style={styles.muted}>{caveats[locale][c]}</Txt>)}
        </View>)}
      </ScrollView>
      : tab === 'beans' ? <FlatList data={coffees.slice(0, visibleCount)} keyExtractor={c => c.kind + c.id} refreshing={refreshing} onRefresh={refresh} contentContainerStyle={styles.content}
        ListEmptyComponent={<Txt>{data?.warnings ? t.partial : t.empty}</Txt>}
        ListFooterComponent={<View style={{ gap: 8 }}>{coffees.length > visibleCount ? <Action title={locale === 'ar' ? `عرض المزيد (${coffees.length - visibleCount})` : `Load more (${coffees.length - visibleCount})`} onPress={() => setVisibleCount(n => n + 30)} selected /> : null}<Action title={t.refresh} onPress={refresh} /></View>}
        renderItem={({ item, index }) => <MotionItem index={index}><Pressable accessibilityRole="button" accessibilityLabel={item.name} onPress={() => setDetail({ type: 'coffee', item })} style={styles.card}>
          {item.logoUrl ? <Image source={{ uri: item.logoUrl }} style={styles.cardImage} resizeMode="cover" /> : <View style={styles.cardImageFallback}><Txt style={{ fontSize: 28 }}>☕</Txt></View>}
          <Txt style={styles.muted}>{item.roaster}</Txt><Txt heading style={styles.subtitle}>{item.name}</Txt><Txt>{item.origin}</Txt><Txt style={styles.muted}>{item.flavors.join(' · ')}</Txt><Txt style={styles.muted}>{t.stockUnknown}</Txt>
        </Pressable></MotionItem>} />
      : <FlatList data={recipes.slice(0, visibleCount)} keyExtractor={r => r.id} refreshing={refreshing} onRefresh={refresh} contentContainerStyle={styles.content}
        ListEmptyComponent={<Txt>{data?.warnings ? t.partial : t.empty}</Txt>}
        ListFooterComponent={<View style={{ gap: 8 }}>{recipes.length > visibleCount ? <Action title={locale === 'ar' ? `عرض المزيد (${recipes.length - visibleCount})` : `Load more (${recipes.length - visibleCount})`} onPress={() => setVisibleCount(n => n + 30)} selected /> : null}<Action title={t.refresh} onPress={refresh} /></View>}
        renderItem={({ item, index }) => <MotionItem index={index}><Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={() => setDetail({ type: 'recipe', item })} style={styles.card}>
          {item.coverUrl ? <Image source={{ uri: item.coverUrl }} style={styles.cardImage} resizeMode="cover" /> : <View style={styles.cardImageFallback}><Txt style={{ fontSize: 28 }}>☕</Txt></View>}
          <Txt style={styles.muted}>{methods[locale][item.method]}</Txt><Txt heading style={styles.subtitle}>{item.title}</Txt><Txt>{t.dose}: {item.dose ?? t.unknown} · {t.water}: {item.water ?? t.unknown}</Txt>
        </Pressable></MotionItem>} />}
    </>}
    </KeyboardAvoidingView></Animated.View>
    {!detail && configured ? <View style={[styles.bottomNav, { flexDirection: locale === 'ar' ? 'row-reverse' : 'row', paddingHorizontal: tablet ? 28 : 9 }]}>
      {(['beans','recipes','forYou','account'] as const).map(key => <View key={key} style={{ flex: 1 }}><Action title={t[key]} selected={tab === key} onPress={() => switchTab(key)} /></View>)}
    </View> : null}
  </SafeAreaView></Language.Provider>;
}
export default function App() { return <SafeAreaProvider><Shell /></SafeAreaProvider>; }
