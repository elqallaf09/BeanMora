import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from './native';
import { supabase } from './client';
import {
  mapRecipe,
  RECIPE_FIELDS,
  type CoffeeItem,
  type RecipeItem,
  type RecipeRow,
} from './data';
import { artwork, CoffeePhoto } from './CoffeeScreens';
import { catalogName, methodLabel } from './localizedContent';
import { countryLabel } from './catalog';
import {
  clockTime,
  roastMetrics,
  ROAST_FIELDS,
  type RoastProfile,
} from './roastLab';
import { Action, Language, Txt, Icon, colors, styles } from './ui';

type PostRow = {
  id: string;
  user_id: string;
  recipe_id: string | null;
  roast_profile_id: string | null;
  roast: RoastProfile | null;
  brew_log_id: string | null;
  bean_id: string | null;
  brew_method: string | null;
  dose_grams: number | null;
  water_grams: number | null;
  actual_time_seconds: number | null;
  outcome: string | null;
  body: string | null;
  content_language: string;
  created_at: string;
};
type BrewRow = {
  id: string;
  recipe_id: string | null;
  bean_id: string | null;
  brew_method: string | null;
  dose_grams: number | null;
  water_grams: number | null;
  actual_time_seconds: number | null;
  outcome_submission: unknown;
  created_at: string;
};
type ProfileRow = {
  id: string;
  name: string;
  username: string;
  country: string | null;
};
type LikeRow = { post_id: string; user_id: string };
type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
};
const brewOutcome = (value: unknown) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  typeof (value as Record<string, unknown>).outcome === 'string'
    ? String((value as Record<string, unknown>).outcome)
    : null;
const outcomeLabel = (value: string | null, ar: boolean) =>
  value === 'excellent'
    ? ar
      ? 'ممتازة'
      : 'Excellent'
    : value === 'good'
      ? ar
        ? 'جيدة'
        : 'Good'
      : value === 'needs_adjustment'
        ? ar
          ? 'تحتاج تعديل'
          : 'Needs adjustment'
        : value === 'poor'
          ? ar
            ? 'غير مرضية'
            : 'Poor'
          : ar
            ? 'دون تقييم'
            : 'Unrated';

export function CommunityScreen({
  userId,
  recipes,
  coffees,
  login,
  brew,
  browse,
  openRecipe,
  openCoffee,
  roast,
  tools,
  members,
  openMember,
}: {
  userId: string | null;
  recipes: RecipeItem[];
  coffees: CoffeeItem[];
  login: () => void;
  brew: () => void;
  browse: () => void;
  openRecipe: (r: RecipeItem) => void;
  openCoffee: (c: CoffeeItem) => void;
  roast: (id?: string) => void;
  tools: () => void;
  members: () => void;
  openMember:(username:string)=>void;
}) {
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const { width } = useWindowDimensions();
  const wide = width >= 950;
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [linkedRecipes, setLinkedRecipes] = useState<RecipeItem[]>([]);
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [recentBrews, setRecentBrews] = useState<BrewRow[]>([]);
  const [selectedBrew, setSelectedBrew] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [compose, setCompose] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState<'new' | 'liked'>('new');
  const [language, setLanguage] = useState<'locale' | 'all'>('locale');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const active = useRef(true);
  const publishing = useRef(false);
  const pendingLikes = useRef(new Set<string>());
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    let alive = true;
    const db = supabase;
    if (!db) return;
    setLoading(true);
    setError('');
    const run = async () => {
      try {
        const result = await db
          .from('posts')
          .select(
            'id,user_id,recipe_id,roast_profile_id,roast:roast_profiles(' +
              ROAST_FIELDS +
              '),brew_log_id,bean_id,brew_method,dose_grams,water_grams,actual_time_seconds,outcome,body,content_language,created_at',
          )
          .eq('visibility', 'public')
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(60);
        if (result.error) throw result.error;
        const rows = (result.data ?? []) as unknown as PostRow[];
        const ids = rows.map((p) => p.id);
        const [likeResult, commentResult, brewResult, recipeResult] =
          await Promise.all([
            ids.length
              ? db
                  .from('post_likes')
                  .select('post_id,user_id')
                  .in('post_id', ids)
              : Promise.resolve({ data: [], error: null }),
            ids.length
              ? db
                  .from('comments')
                  .select('id,post_id,user_id,body,created_at')
                  .in('post_id', ids)
                  .is('parent_comment_id', null)
                  .eq('is_hidden', false)
                  .order('created_at', { ascending: true })
                  .limit(300)
              : Promise.resolve({ data: [], error: null }),
            userId
              ? db
                  .from('brew_logs')
                  .select(
                    'id,recipe_id,bean_id,brew_method,dose_grams,water_grams,actual_time_seconds,outcome_submission,created_at',
                  )
                  .eq('user_id', userId)
                  .order('created_at', { ascending: false })
                  .limit(12)
              : Promise.resolve({ data: [], error: null }),
            rows.some((p) => p.recipe_id)
              ? db
                  .from('recipes')
                  .select(RECIPE_FIELDS)
                  .eq('visibility', 'public')
                  .in('id', [
                    ...new Set(
                      rows.flatMap((p) => (p.recipe_id ? [p.recipe_id] : [])),
                    ),
                  ])
              : Promise.resolve({ data: [], error: null }),
          ]);
        if (likeResult.error || commentResult.error)
          throw likeResult.error ?? commentResult.error;
        const commentRows = (commentResult.data ?? []) as CommentRow[];
        const userIds = [
          ...new Set([
            ...rows.map((p) => p.user_id),
            ...commentRows.map((c) => c.user_id),
          ]),
        ];
        let members: ProfileRow[] = [];
        if (userIds.length) {
          const result = await db
            .from('profiles')
            .select('id,name,username,country')
            .in('id', userIds);
          members = (result.data ?? []) as ProfileRow[];
        }
        if (!alive) return;
        setPosts(rows);
        setLikes((likeResult.data ?? []) as LikeRow[]);
        setComments(commentRows);
        setRecentBrews((brewResult.data ?? []) as BrewRow[]);
        setProfiles(Object.fromEntries(members.map((p) => [p.id, p])));
        setLinkedRecipes(
          ((recipeResult.data ?? []) as unknown as RecipeRow[]).flatMap(
            (row) => {
              const r = mapRecipe(row, locale);
              return r ? [r] : [];
            },
          ),
        );
      } catch {
        if (alive)
          setError(
            ar
              ? 'تعذّر تحميل المشاركات. أعد المحاولة.'
              : 'Could not load posts. Try again.',
          );
      } finally {
        if (alive) setLoading(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [locale, userId, revision]);
  const recipeRows = useMemo(
    () => [
      ...new Map([...recipes, ...linkedRecipes].map((r) => [r.id, r])).values(),
    ],
    [recipes, linkedRecipes],
  );
  const likeCount = (id: string) =>
    likes.filter((l) => l.post_id === id).length;
  const commentRows = (id: string) => comments.filter((c) => c.post_id === id);
  const liked = (id: string) =>
    !!userId && likes.some((l) => l.post_id === id && l.user_id === userId);
  const visible = posts
    .filter(
      (p) =>
        (language === 'all' ||
          !p.content_language ||
          p.content_language === locale) &&
        (filter === 'all' ||
          (filter === 'roasts' && !!p.roast_profile_id) ||
          (filter === 'brews' &&
            !!(p.brew_log_id || p.recipe_id) &&
            !p.roast_profile_id) ||
          (filter === 'discussion' &&
            !p.recipe_id &&
            !p.brew_log_id &&
            !p.roast_profile_id)),
    )
    .sort((a, b) =>
      sort === 'liked'
        ? likeCount(b.id) - likeCount(a.id) ||
          Date.parse(b.created_at) - Date.parse(a.created_at)
        : Date.parse(b.created_at) - Date.parse(a.created_at),
    );
  const toggleLike = async (id: string) => {
    const db = supabase;
    if (!userId || !db) {
      login();
      return;
    }
    if (pendingLikes.current.has(id)) return;
    pendingLikes.current.add(id);
    const was = liked(id);
    setLikes((v) =>
      was
        ? v.filter((l) => !(l.post_id === id && l.user_id === userId))
        : [...v, { post_id: id, user_id: userId }],
    );
    try {
      const { error } = was
        ? await db
            .from('post_likes')
            .delete()
            .eq('post_id', id)
            .eq('user_id', userId)
        : await db.from('post_likes').insert({ post_id: id, user_id: userId });
      if (error) throw error;
    } catch {
      if (active.current) {
        setRevision((r) => r + 1);
        setError(ar ? 'تعذّر حفظ الإعجاب.' : 'Could not save like.');
      }
    } finally {
      pendingLikes.current.delete(id);
    }
  };
  const sendComment = async (id: string) => {
    const text = commentText.trim();
    if (!text || commentBusy) return;
    if (!userId || !supabase) {
      login();
      return;
    }
    setCommentBusy(true);
    try {
      const { error } = await supabase.from('comments').insert({
        user_id: userId,
        post_id: id,
        recipe_id: null,
        parent_comment_id: null,
        body: text,
        content_language: locale,
        is_hidden: false,
      });
      if (error) throw error;
      if (active.current) {
        setCommentText('');
        setRevision((r) => r + 1);
      }
    } catch {
      if (active.current)
        setError(ar ? 'تعذّر إرسال التعليق.' : 'Could not send comment.');
    } finally {
      if (active.current) setCommentBusy(false);
    }
  };
  const publish = async () => {
    if (!userId || !supabase) {
      login();
      return;
    }
    if (publishing.current) return;
    const text = body.trim(),
      b = recentBrews.find((b) => b.id === selectedBrew) ?? null;
    if (!text && !b?.recipe_id) return;
    publishing.current = true;
    setSending(true);
    setError('');
    try {
      const { error } = await supabase.from('posts').insert({
        user_id: userId,
        body: text || null,
        content_language: locale,
        visibility: 'public',
        is_hidden: false,
        recipe_id: b?.recipe_id ?? null,
        brew_log_id: b?.id ?? null,
        bean_id: b?.bean_id ?? null,
        brew_method: b?.brew_method ?? null,
        dose_grams: b?.dose_grams ?? null,
        water_grams: b?.water_grams ?? null,
        actual_time_seconds: b?.actual_time_seconds ?? null,
        outcome: b ? brewOutcome(b.outcome_submission) : null,
      });
      if (error) throw error;
      if (active.current) {
        setBody('');
        setSelectedBrew(null);
        setCompose(false);
        setMessage(ar ? 'تم نشر تجربتك.' : 'Your experience is published.');
        setRevision((r) => r + 1);
      }
    } catch {
      if (active.current)
        setError(ar ? 'تعذّر نشر التجربة.' : 'Could not publish experience.');
    } finally {
      publishing.current = false;
      if (active.current) setSending(false);
    }
  };
  const brewTitle = (b: BrewRow) => {
    const r = recipeRows.find((r) => r.id === b.recipe_id),
      c = coffees.find((c) => (c.beanId ?? c.id) === b.bean_id);
    return (
      c?.name ??
      r?.discovery?.coffeeName ??
      r?.title ??
      methodLabel(b.brew_method, locale)
    );
  };
  const write = (prompt?: string) => {
    if (!userId) {
      login();
      return;
    }
    setCompose(true);
    if (prompt) setBody(prompt);
  };
  return (
    <ScrollView
      testID="community-screen"
      contentContainerStyle={s.page}
      keyboardShouldPersistTaps="handled"
    >
      <View
        testID="community-hero"
        style={[s.hero, { minHeight: wide ? 180 : 165 }]}
      >
        <Image
          source={artwork.beans}
          resizeMode="cover"
          style={[
            StyleSheet.absoluteFill,
            { width: '100%', height: '100%', opacity: 0.18 },
          ]}
        />
        <View
          style={{
            flexDirection: ar ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <View style={{ flex: 1, gap: 5 }}>
            <Txt style={s.eyebrow}>
              coffeeHO
            </Txt>
            <Txt heading style={s.heroTitle}>
              {ar ? 'كل كوب يستحق حكاية' : 'Every cup has a story'}
            </Txt>
            <Txt style={s.heroNote}>
              {ar
                ? 'جرّب، عدّل، وشارك ما تعلّمته. تفاصيل كوبك تساعد غيرك يصنع كوبه القادم.'
                : 'Brew, adjust and share what you learned. Your cup can inspire someone else’s next brew.'}
            </Txt>
          </View>
          <Image source={require('../assets/brand/mark.png')} accessibilityLabel="BeanMora logo" resizeMode="contain" style={{height:48,width:34}}/>
        </View>
        <View style={styles.row}>
          <Action
            title={ar ? 'شارك تجربة' : 'Share a brew'}
            onPress={() => write()}
            selected
          />
          <Action title={ar ? 'ابدأ تحضيرك' : 'Start brewing'} onPress={brew} />
          <Action title={ar?'حسابات coffeeHO':'coffeeHO accounts'} onPress={members}/>
        </View>
      </View>
      {message ? (
        <View accessibilityLiveRegion="polite">
          <Txt style={styles.success}>{message}</Txt>
        </View>
      ) : null}
      <View
        style={[
          s.columns,
          { flexDirection: wide ? (ar ? 'row-reverse' : 'row') : 'column' },
        ]}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 14 }}>
          {compose ? (
            <View testID="community-composer" style={s.compose}>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Txt heading style={s.cardTitle}>
                  {ar
                    ? 'شارك تجربة قابلة للتكرار'
                    : 'Share a repeatable experience'}
                </Txt>
                <Action
                  title={ar ? 'إغلاق المحرر' : 'Close composer'}
                  onPress={() => setCompose(false)}
                />
              </View>
              {recentBrews.length ? (
                <>
                  <Txt style={styles.muted}>
                    {ar
                      ? 'أرفق تحضيرًا من سجلك ليظهر البن والمقادير والنتيجة.'
                      : 'Attach a saved brew to include coffee, amounts and result.'}
                  </Txt>
                  <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
                    {recentBrews.map((b) => (
                      <Pressable
                        key={b.id}
                        accessibilityRole="button"
                        accessibilityLabel={
                          (ar ? 'إرفاق تحضير: ' : 'Attach brew: ') +
                          brewTitle(b)
                        }
                        accessibilityState={{ selected: selectedBrew === b.id }}
                        onPress={() =>
                          setSelectedBrew((v) => (v === b.id ? null : b.id))
                        }
                        style={[
                          s.brewPick,
                          selectedBrew === b.id && {
                            borderColor: colors.teal,
                            backgroundColor: '#EAF4F0',
                          },
                        ]}
                      >
                        <Txt
                          numberOfLines={2}
                          style={{ fontSize: 13, fontWeight: '700' }}
                        >
                          {brewTitle(b)}
                        </Txt>
                        <Txt style={{ fontSize: 11, color: colors.muted }}>
                          {[
                            b.dose_grams
                              ? b.dose_grams + (ar ? ' غ' : ' g')
                              : null,
                            b.water_grams
                              ? b.water_grams + (ar ? ' غ ماء' : ' g water')
                              : null,
                            b.actual_time_seconds
                              ? clockTime(b.actual_time_seconds)
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Txt>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              ) : (
                <View style={s.tip}>
                  <Txt style={styles.muted}>
                    {ar
                      ? 'لم تسجّل تحضيرًا بعد. يمكنك كتابة سؤال، أو تحضير وصفة ثم مشاركة نتيجتها.'
                      : 'No saved brew yet. Ask a question or brew a recipe and share the result.'}
                  </Txt>
                  <Action
                    title={ar ? 'حضّر وسجّل النتيجة' : 'Brew and record'}
                    onPress={brew}
                  />
                </View>
              )}
              <TextInput
                accessibilityLabel={
                  ar ? 'اكتب تجربتك' : 'Write your experience'
                }
                multiline
                maxLength={3000}
                value={body}
                onChangeText={setBody}
                placeholder={
                  ar
                    ? 'ما البن الذي استخدمته؟ ماذا غيّرت، وكيف صار الطعم؟'
                    : 'Which coffee? What changed? How did it taste?'
                }
                placeholderTextColor={colors.muted}
                style={[
                  s.input,
                  {
                    textAlign: ar ? 'right' : 'left',
                    writingDirection: ar ? 'rtl' : 'ltr',
                  },
                ]}
              />
              <Txt style={{ fontSize: 11, color: colors.muted }}>
                {ar
                  ? 'سيظهر هذا المنشور للمجتمع. مشاركة سجل التحضير اختيارية.'
                  : 'This post will be public. Attaching a brew log is optional.'}
              </Txt>
              <Action
                title={
                  sending
                    ? ar
                      ? 'جارٍ النشر…'
                      : 'Publishing…'
                    : ar
                      ? 'انشر التجربة'
                      : 'Publish'
                }
                selected
                disabled={
                  sending ||
                  (!body.trim() &&
                    !recentBrews.find((b) => b.id === selectedBrew)?.recipe_id)
                }
                onPress={() => void publish()}
              />
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                ar ? 'افتح محرر التجربة' : 'Open experience composer'
              }
              onPress={() => write()}
              style={[
                s.composePrompt,
                { flexDirection: ar ? 'row-reverse' : 'row' },
              ]}
            >
              <View style={s.avatar}>
                <Icon name="plus" size={22} color={colors.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt style={s.cardTitle}>
                  {ar ? 'ما الذي ضبط معك اليوم؟' : 'What worked for you today?'}
                </Txt>
                <Txt style={styles.muted}>
                  {ar
                    ? 'شارك نتيجة، اطرح سؤالًا، أو أرفق تحضيرك.'
                    : 'Share a result, ask a question or attach a brew.'}
                </Txt>
              </View>
              <Icon name="arrow" size={18} color={colors.teal} />
            </Pressable>
          )}
          <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
            {[
              { id: 'all', ar: 'الكل', en: 'All' },
              { id: 'brews', ar: 'تجارب التحضير', en: 'Brew experiences' },
              { id: 'roasts', ar: 'الحمصات', en: 'Roasts' },
              { id: 'discussion', ar: 'النقاشات', en: 'Discussions' },
            ].map((f) => (
              <Action
                key={f.id}
                title={ar ? f.ar : f.en}
                selected={filter === f.id}
                onPress={() => setFilter(f.id)}
              />
            ))}
          </ScrollView>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Txt style={styles.muted}>
              {ar ? 'آخر المشاركات' : 'Member posts'}
            </Txt>
            <View style={styles.row}>
              <Action
                title={ar ? 'الأحدث' : 'Newest'}
                selected={sort === 'new'}
                onPress={() => setSort('new')}
              />
              <Action
                title={ar ? 'الأكثر إعجابًا' : 'Most liked'}
                selected={sort === 'liked'}
                onPress={() => setSort('liked')}
              />
              <Action
                title={
                  language === 'locale'
                    ? ar
                      ? 'كل اللغات'
                      : 'All languages'
                    : ar
                      ? 'العربية فقط'
                      : 'English only'
                }
                onPress={() =>
                  setLanguage((v) => (v === 'locale' ? 'all' : 'locale'))
                }
              />
            </View>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.teal} />
          ) : error ? (
            <View style={s.post}>
              <Txt style={styles.error}>{error}</Txt>
              <Action
                title={ar ? 'إعادة تحميل المشاركات' : 'Reload posts'}
                onPress={() => setRevision((r) => r + 1)}
              />
            </View>
          ) : null}
          <View style={{ gap: 12 }}>
            {visible.map((p) => {
              const member = profiles[p.user_id],
                r = recipeRows.find((r) => r.id === p.recipe_id),
                c = coffees.find((c) => (c.beanId ?? c.id) === p.bean_id),
                m = p.roast ? roastMetrics(p.roast) : null;
              return (
                <View
                  key={p.id}
                  testID={'community-post-' + p.id}
                  style={s.post}
                >
                  <View
                    style={[
                      s.authorRow,
                      { flexDirection: ar ? 'row-reverse' : 'row' },
                    ]}
                  >
                    <View style={s.avatar}>
                      <Txt style={{ fontWeight: '700', color: colors.teal }}>
                        {(member?.name ?? member?.username ?? '?').slice(0, 1)}
                      </Txt>
                    </View>
                    <View style={{ flex: 1 }}>
                      {member?.username?<Action compact title={'@'+member.username} onPress={()=>openMember(member.username)}/>:null}
                      <Txt style={s.cardTitle}>
                        {member?.name ??
                          member?.username ??
                          (ar ? 'عضو المجتمع' : 'Community member')}
                      </Txt>
                      <Txt style={{ fontSize: 11, color: colors.muted }}>
                        {[
                          member?.country
                            ? countryLabel(member.country, locale)
                            : null,
                          p.roast_profile_id
                            ? ar
                              ? 'تحميص'
                              : 'Roasting'
                            : p.brew_method || r?.method
                              ? methodLabel(p.brew_method ?? r?.method, locale)
                              : ar
                                ? 'نقاش'
                                : 'Discussion',
                          '\u2066' +
                            new Date(p.created_at)
                              .toLocaleDateString(locale + '-u-nu-latn')
                              .replace(/[\u200e\u200f]/g, '') +
                            '\u2069',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Txt>
                    </View>
                    {p.content_language && p.content_language !== locale ? (
                      <Txt style={{ fontSize: 11, color: colors.muted }}>
                        {p.content_language === 'en'
                          ? ar
                            ? 'بالإنجليزية'
                            : 'English'
                          : ar
                            ? 'بالعربية'
                            : 'Arabic'}
                      </Txt>
                    ) : null}
                  </View>
                  {p.roast_profile_id && p.roast ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        (ar ? 'فتح الحمصة: ' : 'Open roast: ') +
                        (p.roast.title ?? '')
                      }
                      onPress={() => roast(p.roast_profile_id!)}
                      style={s.brewCard}
                    >
                      <Txt heading style={s.cardTitle}>
                        {p.roast.title}
                      </Txt>
                      <Txt style={styles.muted}>
                        {p.roast.public_coffee?.name}
                      </Txt>
                      <View style={s.metrics}>
                        <Metric
                          value={
                            p.roast.green_weight_g !== null
                              ? p.roast.green_weight_g + (ar ? ' غ' : ' g')
                              : '—'
                          }
                          label={ar ? 'الدفعة' : 'Batch'}
                        />
                        <Metric
                          value={
                            m?.loss !== null && m?.loss !== undefined
                              ? m.loss + '%'
                              : '—'
                          }
                          label={ar ? 'فقدان الوزن' : 'Weight loss'}
                        />
                        <Metric
                          value={m?.total ? clockTime(m.total) : '—'}
                          label={ar ? 'الوقت' : 'Time'}
                        />
                        <Metric
                          value={
                            m?.dtr !== null && m?.dtr !== undefined
                              ? m.dtr + '%'
                              : '—'
                          }
                          label={ar ? 'التطوير' : 'Development'}
                        />
                      </View>
                      <Txt style={{ color: colors.teal, fontSize: 12 }}>
                        {ar
                          ? 'المنحنى والمراحل والمقارنة ←'
                          : 'Curve, stages and comparison →'}
                      </Txt>
                    </Pressable>
                  ) : p.brew_log_id ? (
                    <View style={s.brewCard}>
                      <View
                        style={[
                          s.authorRow,
                          { flexDirection: ar ? 'row-reverse' : 'row' },
                        ]}
                      >
                        {c ? (
                          <View
                            style={{
                              width: 60,
                              height: 66,
                              borderRadius: 10,
                              overflow: 'hidden',
                            }}
                          >
                            <CoffeePhoto
                              uri={c.imageUrl}
                              uris={c.images}
                              kind={c.imageKind}
                            />
                          </View>
                        ) : (
                          <Icon name="bean" size={26} color={colors.copper} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Txt style={s.cardTitle}>
                            {c?.name ??
                              r?.discovery?.coffeeName ??
                              r?.title ??
                              (ar ? 'تحضير محفوظ' : 'Saved brew')}
                          </Txt>
                          <Txt style={styles.muted}>
                            {c?.roaster ?? r?.author}
                          </Txt>
                        </View>
                        <Txt
                          style={{
                            fontSize: 11,
                            color: colors.teal,
                            fontWeight: '700',
                          }}
                        >
                          {outcomeLabel(p.outcome, ar)}
                        </Txt>
                      </View>
                      <View style={s.metrics}>
                        <Metric
                          value={
                            p.dose_grams
                              ? p.dose_grams + (ar ? ' غ' : ' g')
                              : '—'
                          }
                          label={ar ? 'البن' : 'Dose'}
                        />
                        <Metric
                          value={
                            p.water_grams
                              ? p.water_grams + (ar ? ' غ' : ' g')
                              : '—'
                          }
                          label={ar ? 'الماء' : 'Water'}
                        />
                        <Metric
                          value={
                            p.actual_time_seconds
                              ? clockTime(p.actual_time_seconds)
                              : '—'
                          }
                          label={ar ? 'الوقت' : 'Time'}
                        />
                        <Metric
                          value={methodLabel(
                            p.brew_method ?? r?.method,
                            locale,
                          )}
                          label={ar ? 'الطريقة' : 'Method'}
                        />
                      </View>
                      {r ? (
                        <Action
                          title={ar ? 'جرّب الوصفة نفسها' : 'Try this recipe'}
                          onPress={() => openRecipe(r)}
                        />
                      ) : null}
                    </View>
                  ) : r ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        (ar ? 'فتح الوصفة: ' : 'Open recipe: ') + r.title
                      }
                      onPress={() => openRecipe(r)}
                      style={s.brewCard}
                    >
                      <Txt style={s.cardTitle}>{r.title}</Txt>
                      <Txt style={styles.muted}>
                        {ar
                          ? 'وصفة مرتبطة بالمشاركة'
                          : 'Recipe linked to this post'}
                      </Txt>
                    </Pressable>
                  ) : null}
                  {p.body ? (
                    <Txt style={{ fontSize: 15, lineHeight: 25 }}>{p.body}</Txt>
                  ) : null}
                  <View
                    style={[
                      styles.row,
                      {
                        justifyContent: 'space-between',
                        flexDirection: ar ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <View style={styles.row}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={ar ? 'إعجاب' : 'Like'}
                        accessibilityState={{ selected: liked(p.id) }}
                        onPress={() => void toggleLike(p.id)}
                        style={s.social}
                      >
                        <Icon
                          name="heart"
                          size={20}
                          color={liked(p.id) ? colors.teal : colors.muted}
                          filled={liked(p.id)}
                        />
                        <Txt>{likeCount(p.id)}</Txt>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={ar ? 'التعليقات' : 'Comments'}
                        accessibilityState={{ expanded: commentsOpen === p.id }}
                        onPress={() => {
                          setCommentsOpen((v) => (v === p.id ? null : p.id));
                          setCommentText('');
                        }}
                        style={s.social}
                      >
                        <Icon name="more" size={20} color={colors.muted} />
                        <Txt>{commentRows(p.id).length}</Txt>
                      </Pressable>
                    </View>
                    <Txt style={{ fontSize: 11, color: colors.muted }}>
                      {ar ? 'تجربة عضو' : 'Member experience'}
                    </Txt>
                  </View>
                  {commentsOpen === p.id ? (
                    <View style={s.comments}>
                      {commentRows(p.id)
                        .slice(-8)
                        .map((c) => (
                          <View key={c.id} style={{ gap: 3 }}>
                            <Txt
                              style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: colors.teal,
                              }}
                            >
                              {profiles[c.user_id]?.name ??
                                profiles[c.user_id]?.username ??
                                (ar ? 'عضو المجتمع' : 'Member')}
                            </Txt>
                            <Txt>{c.body}</Txt>
                          </View>
                        ))}
                      <View style={styles.row}>
                        <TextInput
                          accessibilityLabel={
                            ar ? 'اكتب تعليقًا' : 'Write a comment'
                          }
                          maxLength={2000}
                          value={commentText}
                          onChangeText={setCommentText}
                          placeholder={
                            ar ? 'شارك ملاحظتك…' : 'Add your observation…'
                          }
                          style={[
                            s.commentInput,
                            { textAlign: ar ? 'right' : 'left' },
                          ]}
                        />
                        <Action
                          title={ar ? 'إرسال التعليق' : 'Send comment'}
                          disabled={commentBusy || !commentText.trim()}
                          onPress={() => void sendComment(p.id)}
                        />
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
          {!visible.length && !loading && !error ? (
            <View testID="community-empty" style={s.empty}>
              <View style={s.emptyIcon}>
                <Icon
                  name={filter === 'roasts' ? 'bean' : 'espresso'}
                  size={34}
                  color={colors.copper}
                />
              </View>
              <Txt heading style={[styles.subtitle, { textAlign: 'center' }]}>
                {filter === 'roasts'
                  ? ar
                    ? 'منحنى حمصتك يستحق المشاركة'
                    : 'Your roast curve is worth sharing'
                  : ar
                    ? 'ابدأ الحديث بكوبك'
                    : 'Start a conversation with your cup'}
              </Txt>
              <Txt style={[styles.muted, { textAlign: 'center' }]}>
                {ar
                  ? 'هذه المساحة تنتظر تجارب فعلية: ما البن، ما الإعداد، وما الذي تغيّر في الطعم؟'
                  : 'This space is for real experiences: which coffee, which settings, and what changed in the cup?'}
              </Txt>
              <View style={styles.row}>
                <Action
                  title={
                    filter === 'roasts'
                      ? ar
                        ? 'افتح مختبر التحميص'
                        : 'Open Roast Lab'
                      : ar
                        ? 'شارك أول تجربة'
                        : 'Share the first experience'
                  }
                  selected
                  onPress={() => (filter === 'roasts' ? roast() : write())}
                />
                <Action
                  title={ar ? 'استكشف وصفة وجربها' : 'Find a recipe to try'}
                  onPress={browse}
                />
              </View>
            </View>
          ) : null}
        </View>
        <View style={[s.sidebar, wide && { width: 290 }]}>
          <View style={s.sideCard}>
            <Txt heading style={s.cardTitle}>
              {ar ? 'أفكار تبدأ منها' : 'Conversation starters'}
            </Txt>
            {[
              {
                ar: 'ما الذي تغيّر عندما عدّلت الطحنة؟',
                en: 'What changed when you adjusted the grind?',
              },
              {
                ar: 'هل غيّرت الحرارة لنفس البن؟',
                en: 'Did you change temperature for the same coffee?',
              },
              {
                ar: 'كيف تغيّر الطعم بعد راحة الحمصة؟',
                en: 'How did roast resting change the taste?',
              },
            ].map((p) => (
              <Pressable
                key={p.en}
                accessibilityRole="button"
                onPress={() => write(ar ? p.ar : p.en)}
                style={[
                  s.prompt,
                  { flexDirection: ar ? 'row-reverse' : 'row' },
                ]}
              >
                <Icon name="plus" color={colors.copper} size={17} />
                <Txt style={{ fontSize: 13, lineHeight: 21, flex: 1 }}>
                  {ar ? p.ar : p.en}
                </Txt>
              </Pressable>
            ))}
          </View>
          <View style={[s.sideCard, { backgroundColor: '#EAF3EE' }]}>
            <Icon name="temp" color={colors.teal} size={28} />
            <Txt heading style={s.cardTitle}>
              {ar ? 'من الحمصة إلى الكوب' : 'From roast to cup'}
            </Txt>
            <Txt style={styles.muted}>
              {ar
                ? 'تابع الحمصات المنشورة، افتح مراحلها، وقارن محاولاتك معها.'
                : 'Explore published roasts, open their stages and compare your attempts.'}
            </Txt>
            <Action
              title={ar ? 'حمصات المجتمع' : 'Community roasts'}
              onPress={() => roast()}
            />
          </View>
          {coffees.length ? (
            <View style={s.sideCard}>
              <Txt heading style={s.cardTitle}>
                {ar ? 'بن تبدأ معه التجربة' : 'Coffee to explore'}
              </Txt>
              {coffees.slice(0, 2).map((c) => (
                <Pressable
                  key={c.kind + c.id}
                  accessibilityRole="button"
                  accessibilityLabel={
                    (ar ? 'استكشف البن: ' : 'Explore coffee: ') + c.name
                  }
                  onPress={() => openCoffee(c)}
                  style={[
                    s.catalogCoffee,
                    { flexDirection: ar ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View
                    style={{
                      width: 56,
                      height: 64,
                      borderRadius: 10,
                      overflow: 'hidden',
                    }}
                  >
                    <CoffeePhoto
                      uri={c.imageUrl}
                      uris={c.images}
                      kind={c.imageKind}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt
                      numberOfLines={2}
                      style={{ fontSize: 13, fontWeight: '700' }}
                    >
                      {c.name}
                    </Txt>
                    <Txt numberOfLines={1} style={styles.muted}>
                      {c.roaster}
                    </Txt>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={s.sideCard}>
            <Txt heading style={s.cardTitle}>
              {ar ? 'غيّر أداتك عن معرفة' : 'Know your tools'}
            </Txt>
            <Txt style={styles.muted}>
              {ar
                ? 'قارن مواصفات الماكينات والطواحين قبل اختيار تجهيزك.'
                : 'Compare machine and grinder specifications before choosing your setup.'}
            </Txt>
            <Action
              title={ar ? 'دليل الأدوات والمقارنة' : 'Equipment and comparison'}
              onPress={tools}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.metric}>
      <Txt style={{ fontSize: 15, lineHeight: 23, fontWeight: '700' }}>
        {value}
      </Txt>
      <Txt style={{ fontSize: 11, color: colors.muted }}>{label}</Txt>
    </View>
  );
}
const s = StyleSheet.create({
  page: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 16,
  },
  hero: {
    borderRadius: 22,
    backgroundColor: colors.brown,
    overflow: 'hidden',
    padding: 22,
    gap: 14,
  },
  eyebrow: { fontSize: 12, lineHeight: 18, color: '#DDB791' },
  heroTitle: { fontSize: 28, lineHeight: 39, fontWeight: '700', color: '#FFF' },
  heroNote: { fontSize: 13, lineHeight: 21, color: '#EEE0D2' },
  columns: { gap: 18, alignItems: 'stretch' },
  sidebar: { gap: 12, minWidth: 0 },
  sideCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    padding: 16,
    gap: 11,
  },
  cardTitle: { fontSize: 16, lineHeight: 24, fontWeight: '700' },
  composePrompt: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    alignItems: 'center',
  },
  compose: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    padding: 15,
    gap: 12,
  },
  input: {
    minHeight: 105,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 13,
    fontSize: 15,
    lineHeight: 24,
    color: colors.ink,
    backgroundColor: '#FAF6EF',
    textAlignVertical: 'top',
  },
  tip: { backgroundColor: '#EAF3EE', padding: 12, borderRadius: 14, gap: 8 },
  brewPick: {
    width: 185,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 11,
    gap: 4,
  },
  post: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    padding: 16,
    gap: 13,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E7EEE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brewCard: {
    backgroundColor: '#F2E9DC',
    borderRadius: 16,
    padding: 12,
    gap: 9,
  },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  metric: {
    flexBasis: '45%',
    flexGrow: 1,
    minWidth: 100,
    borderRadius: 10,
    padding: 9,
    backgroundColor: '#FFFAF2',
  },
  social: {
    minHeight: 44,
    paddingHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  comments: {
    backgroundColor: '#F5EEE4',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  commentInput: {
    flex: 1,
    minWidth: 100,
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.paper,
    fontSize: 14,
    color: colors.ink,
  },
  empty: {
    borderWidth: 1,
    borderColor: '#E0D2C1',
    borderRadius: 22,
    padding: 24,
    backgroundColor: '#F6ECDF',
    gap: 12,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFE1CF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prompt: {
    borderBottomWidth: 1,
    borderColor: colors.line,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
  },
  catalogCoffee: { alignItems: 'center', gap: 9 },
});
