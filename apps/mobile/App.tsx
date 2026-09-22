import { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StatusBar, View } from 'react-native';
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

function Account({ session }: { session: Session | null }) {
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
        if (result.error || !result.data.session) setError(t.authError);
        else setPassword('');
      }
    } catch { setError(session ? t.logoutError : t.authError); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Txt heading style={styles.title}>{t.account}</Txt>
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
function DetailView({ detail, record }: { detail: Detail; record: () => void }) {
  const t = useCopy(); const locale = useContext(Language); const [linkError, setLinkError] = useState(false);
  const c = detail.type === 'coffee' ? detail.item : null; const r = detail.type === 'recipe' ? detail.item : null;
  async function source() {
    if (!c?.sourceUrl) return;
    setLinkError(false); try { await Linking.openURL(c.sourceUrl); } catch { setLinkError(true); }
  }
  return <ScrollView contentContainerStyle={styles.content}>
    <View style={styles.hero}><Txt heading style={styles.title}>{c?.name ?? r?.title}</Txt>
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
      <Txt>{r.notes || t.noNotes}</Txt><Txt heading style={styles.subtitle}>{t.instructions}</Txt>
      {r.steps.length ? r.steps.map(s => <View key={s.number} style={styles.card}><Txt style={styles.subtitle}>{s.number}. {s.title}</Txt><Txt>{s.description}</Txt></View>) : <Txt style={styles.warning}>{t.noSteps}</Txt>}
      <Action title={t.record} onPress={record} selected />
    </> : null}
  </ScrollView>;
}
function Shell() {
  const [locale, setLocale] = useState<Locale>('ar'); const t = copy[locale];
  const [session, setSession] = useState<Session | null>(null); const userId = session && !session.user.is_anonymous ? session.user.id : null;
  const [tab, setTab] = useState<Tab>('beans'); const [method, setMethod] = useState<Method>(); const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null); const [recording, setRecording] = useState(false);
  const [bundle, setBundle] = useState<Loaded | null>(null); const [refreshing, setRefreshing] = useState(false); const [revision, setRevision] = useState(0);
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
  const recipes = data?.recipes.filter(r => r.public && searchText(r.title + ' ' + r.flavors.join(' ')).includes(filter)) ?? [];
  const rankedCoffee = data ? recommendCoffees(data.coffees, data.profile, Date.now(), method) : [];
  const rankedRecipes = data ? recommendRecipes(data.recipes, data.profile, method) : [];
  function back() { if (recording) setRecording(false); else setDetail(null); }
  function startRecord() { if (!userId) { setDetail(null); setTab('account'); } else setRecording(true); }
  function resetLanguage() { setLocale(l => l === 'ar' ? 'en' : 'ar'); setDetail(null); setRecording(false); }
  const refresh = () => setRevision(n => n + 1);
  return <Language.Provider value={locale}><SafeAreaView style={styles.fill}>
    <StatusBar barStyle="dark-content" />
    <View style={[styles.row, { paddingHorizontal: 16, paddingVertical: 9, flexDirection: locale === 'ar' ? 'row-reverse' : 'row', justifyContent: 'space-between' }]}>
      <Txt style={{ fontSize: 23, fontWeight: '800' }}>BeanMora</Txt>
      <View style={styles.row}>{detail ? <Action title={t.back} onPress={back} /> : null}<Action title={locale === 'ar' ? 'English' : 'العربية'} onPress={resetLanguage} /></View>
    </View>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {!configured ? <View style={styles.content}><Txt heading style={styles.title}>{t.setup}</Txt><Txt>{t.setupNote}</Txt></View>
    : recording && detail?.type === 'recipe' && userId ? <OutcomeForm key={userId + detail.item.id} userId={userId} recipe={detail.item} done={() => { setRecording(false); setDetail(null); setTab('forYou'); refresh(); }} />
    : detail ? <DetailView key={detail.item.id + locale} detail={detail} record={startRecord} />
    : tab === 'account' ? <Account key={userId ?? 'public'} session={session} />
    : <>
      <View style={{ paddingHorizontal: 18, gap: 8 }}>
        <Txt heading style={styles.title}>{tab === 'forYou' ? t.forYou : t.tagline}</Txt>
        <Txt style={styles.muted}>{t.preview}</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, { paddingVertical: 7 }]}>
          <Action title={t.all} selected={!method} onPress={() => setMethod(undefined)} />
          {METHODS.map(m => <Action key={m} title={methods[locale][m]} selected={method === m} onPress={() => setMethod(m)} />)}
        </ScrollView>
        {tab !== 'forYou' ? <Field label={t.search} value={search} onChangeText={setSearch} /> : <Txt style={styles.muted}>{t.ruleNote}</Txt>}
        {data?.warnings || (!data && !refreshing) ? <Txt style={styles.warning}>{t.partial}</Txt> : null}
        {data?.limited ? <Txt style={styles.warning}>{t.limited}</Txt> : null}
      </View>
      {refreshing && !data ? <View style={styles.content}><ActivityIndicator color="#865735" /><Txt>{t.loading}</Txt></View>
      : tab === 'forYou' ? <ScrollView contentContainerStyle={styles.content}>
        <Action title={t.refresh} onPress={refresh} />
        <Txt heading style={styles.subtitle}>{t.beans}</Txt>
        {rankedCoffee.length === 0 ? <Txt>{t.empty}</Txt> : rankedCoffee.map(row => <View key={row.item.kind + row.item.id} style={styles.card}>
          <Action title={row.item.name} onPress={() => { const item = data?.coffees.find(c => c.id === row.item.id && c.kind === row.item.kind); if (item) setDetail({ type: 'coffee', item }); }} />
          <Txt>{t.matching}: {row.reasons.length ? row.reasons.map(r => reasons[locale][r]).join(' · ') : t.general}</Txt>
          {row.caveats.map(c => <Txt key={c} style={styles.muted}>{caveats[locale][c]}</Txt>)}
        </View>)}
        <Txt heading style={styles.subtitle}>{t.recipes}</Txt>
        {rankedRecipes.length === 0 ? <Txt>{t.empty}</Txt> : rankedRecipes.map(row => <View key={row.item.id} style={styles.card}>
          <Action title={row.item.title} onPress={() => { const item = data?.recipes.find(r => r.id === row.item.id); if (item) setDetail({ type: 'recipe', item }); }} />
          <Txt>{t.matching}: {row.reasons.length ? row.reasons.map(r => reasons[locale][r]).join(' · ') : t.general}</Txt>
          {row.caveats.map(c => <Txt key={c} style={styles.muted}>{caveats[locale][c]}</Txt>)}
        </View>)}
      </ScrollView>
      : tab === 'beans' ? <FlatList data={coffees} keyExtractor={c => c.kind + c.id} refreshing={refreshing} onRefresh={refresh} contentContainerStyle={styles.content}
        ListEmptyComponent={<Txt>{data?.warnings ? t.partial : t.empty}</Txt>}
        ListFooterComponent={<Action title={t.refresh} onPress={refresh} />}
        renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={item.name} onPress={() => setDetail({ type: 'coffee', item })} style={styles.card}>
          <Txt style={styles.muted}>{item.roaster}</Txt><Txt heading style={styles.subtitle}>{item.name}</Txt><Txt>{item.origin}</Txt><Txt style={styles.muted}>{item.flavors.join(' · ')}</Txt><Txt style={styles.muted}>{t.stockUnknown}</Txt>
        </Pressable>} />
      : <FlatList data={recipes} keyExtractor={r => r.id} refreshing={refreshing} onRefresh={refresh} contentContainerStyle={styles.content}
        ListEmptyComponent={<Txt>{data?.warnings ? t.partial : t.empty}</Txt>}
        ListFooterComponent={<Action title={t.refresh} onPress={refresh} />}
        renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={() => setDetail({ type: 'recipe', item })} style={styles.card}>
          <Txt style={styles.muted}>{methods[locale][item.method]}</Txt><Txt heading style={styles.subtitle}>{item.title}</Txt><Txt>{t.dose}: {item.dose ?? t.unknown} · {t.water}: {item.water ?? t.unknown}</Txt>
        </Pressable>} />}
    </>}
    </KeyboardAvoidingView>
    {!detail && configured ? <View style={{ flexDirection: locale === 'ar' ? 'row-reverse' : 'row', padding: 9, gap: 5, borderTopWidth: 1, borderColor: '#DDD2C2' }}>
      {(['beans','recipes','forYou','account'] as const).map(key => <View key={key} style={{ flex: 1 }}><Action title={t[key]} selected={tab === key} onPress={() => { setTab(key); setSearch(''); }} /></View>)}
    </View> : null}
  </SafeAreaView></Language.Provider>;
}
export default function App() { return <SafeAreaProvider><Shell /></SafeAreaProvider>; }
