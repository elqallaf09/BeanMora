import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Platform,
  ScrollView,
  Share,
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
import { CoffeePhoto } from './CoffeeScreens';
import { catalogName, methodLabel } from './localizedContent';
import { countryLabel } from './catalog';
import {
  clockTime,
  roastMetrics,
  ROAST_FIELDS,
  type RoastProfile,
} from './roastLab';
import { Action, Language, Txt, Icon, IconButton, colors, styles } from './ui';
import { MemberAvatar } from './MemberAvatar';
import { CoffeeStories } from './CoffeeStories';
import { PostComposer, type EditablePost } from './PostComposer';
import { SocialMediaView } from './SocialMedia';
import { deleteCommunityPost } from './core/community-social';

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
  content_type?: 'topic' | 'image' | 'video';
  primary_media_path?: string | null;
  media?: {url: string; media_type: 'image' | 'video'}[];
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
  avatar_url?: string | null;
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
  messages,
  shareDirect,
  authorId,
  embedded = false,
  postId,
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
  openMember: (username: string) => void;
  messages?: () => void;
  shareDirect?: (id: string) => void;
  authorId?: string;
  embedded?: boolean;
  postId?: string | null;
}) {
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const { width } = useWindowDimensions();
  const wide = width >= 950 && !embedded;
  const Container = embedded ? View : ScrollView;
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [linkedRecipes, setLinkedRecipes] = useState<RecipeItem[]>([]);
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [recentBrews, setRecentBrews] = useState<BrewRow[]>([]);
  const [editingPost, setEditingPost] = useState<EditablePost | null>(null);
  const [deletePost, setDeletePost] = useState<PostRow | null>(null);
  const [sharePost, setSharePost] = useState<PostRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pageLimit, setPageLimit] = useState(60);
  const [commentsOpen, setCommentsOpen] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [commentBusy, setCommentBusy] = useState<string | null>(null);
  const [likesBusy, setLikesBusy] = useState<string[]>([]);
  const [interactionErrors, setInteractionErrors] = useState<
    Record<string, string>
  >({});
  const [compose, setCompose] = useState(false);
  const [feed, setFeed] = useState<'all' | 'following'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const active = useRef(true);
  const pendingLikes = useRef(new Set<string>());
  const pendingComment = useRef(false);
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
        let followed: string[] = [];
        if (feed === 'following' && userId) {
          const { data, error } = await db
            .from('follows')
            .select('following_id')
            .eq('follower_id', userId)
            .eq('status', 'accepted');
          if (error) throw error;
          followed = (data ?? []).map((row) => row.following_id as string);
        }
        let query = db
          .from('posts')
          .select(
            'id,user_id,recipe_id,roast_profile_id,roast:roast_profiles(' +
              ROAST_FIELDS +
              '),brew_log_id,bean_id,brew_method,dose_grams,water_grams,actual_time_seconds,outcome,body,content_language,created_at,content_type,primary_media_path,media:post_media(url,media_type)',
          )
          .order('created_at', { ascending: false })
          .limit(pageLimit);
        if (authorId) query = query.eq('user_id', authorId);
        if (!authorId || authorId !== userId) query = query.eq('visibility', 'public').eq('is_hidden', false);
        if (postId) query = query.eq('id', postId);
        if (feed === 'following' && followed.length)
          query = query.in('user_id', followed);
        const result =
          feed === 'following' && !followed.length
            ? { data: [], error: null }
            : await query;
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
            ...(userId ? [userId] : []),
          ]),
        ];
        let members: ProfileRow[] = [];
        if (userIds.length) {
          const result = await db
            .from('profiles')
            .select('id,name,username,country,avatar_url')
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
  }, [locale, userId, revision, feed, authorId, pageLimit, postId]);
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
  const visible = [...posts].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  const toggleLike = async (id: string) => {
    const db = supabase;
    if (!userId || !db) {
      login();
      return;
    }
    if (pendingLikes.current.has(id)) return;
    pendingLikes.current.add(id);
    setLikesBusy((v) => [...v, id]);
    setInteractionErrors((v) => ({ ...v, [id]: '' }));
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
        setLikes((v) =>
          was
            ? [
                ...v.filter((l) => !(l.post_id === id && l.user_id === userId)),
                { post_id: id, user_id: userId },
              ]
            : v.filter((l) => !(l.post_id === id && l.user_id === userId)),
        );
        setInteractionErrors((v) => ({
          ...v,
          [id]: ar
            ? 'تعذّر حفظ الإعجاب. حاول مرة ثانية.'
            : 'Could not save like. Please retry.',
        }));
      }
    } finally {
      pendingLikes.current.delete(id);
      if (active.current) setLikesBusy((v) => v.filter((post) => post !== id));
    }
  };
  const sendComment = async (id: string) => {
    const text = (commentText[id] ?? '').trim();
    if (!text || pendingComment.current) return;
    if (!userId || !supabase) {
      login();
      return;
    }
    pendingComment.current = true;
    setCommentBusy(id);
    setInteractionErrors((v) => ({ ...v, [id]: '' }));
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
        setCommentText((v) => ({ ...v, [id]: '' }));
        setRevision((r) => r + 1);
      }
    } catch {
      if (active.current)
        setInteractionErrors((v) => ({
          ...v,
          [id]: ar
            ? 'تعذّر إرسال التعليق. تعليقك محفوظ هنا للمحاولة مرة ثانية.'
            : 'Could not send comment. Your draft is kept here so you can retry.',
        }));
    } finally {
      pendingComment.current = false;
      if (active.current) setCommentBusy(null);
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
  const write = () => {
    if (!userId) {
      login();
      return;
    }
    setCompose(true);
    setEditingPost(null);
  };
  return (
    <Container
      testID="community-screen"
      {...(embedded ? { style: { gap: 12 } } : { contentContainerStyle: s.page })}
      keyboardShouldPersistTaps="handled"
    >
      {!embedded ? <View
        testID="community-hero"
        style={[
          s.hero,
          { flexDirection: ar ? 'row-reverse' : 'row', alignItems: 'center' },
        ]}
      >
        <Image
          source={require('../assets/brand/mark.png')}
          accessibilityLabel="BeanMora logo"
          resizeMode="contain"
          style={{ height: 44, width: 30 }}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt heading style={[s.heroTitle, width < 380 && { fontSize: 24 }]}>
            coffeeHO
          </Txt>
          {width >= 380 ? (
            <Txt style={s.heroNote}>
              {ar
                ? 'ناس القهوة، وتجارب تستحق المشاركة'
                : 'Coffee people. Experiences worth sharing.'}
            </Txt>
          ) : null}
        </View>
        <IconButton
          name="search"
          label={ar ? 'حسابات coffeeHO' : 'coffeeHO accounts'}
          onPress={members}
        />
        {messages ? <IconButton name="comment" label={ar ? "الرسائل الخاصة" : "Private messages"} onPress={messages} /> : null}
        <IconButton
          name="plus"
          label={ar ? 'شارك تجربة' : 'Share a brew'}
          onPress={() => write()}
        />
      </View> : null}
      {!embedded ? <CoffeeStories owner={userId} login={login} /> : null}
      {postId ? <Txt heading style={styles.subtitle}>{ar ? "المنشور" : "Post"}</Txt> : null}
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
        <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
          {!embedded && !postId ? <View
            style={{
              flexDirection: ar ? 'row-reverse' : 'row',
              borderBottomWidth: 1,
              borderBottomColor: colors.line,
            }}
          >
            {(['all', 'following'] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={
                  value === 'all'
                    ? ar
                      ? 'كل المشاركات'
                      : 'All posts'
                    : ar
                      ? 'أتابع'
                      : 'Following'
                }
                accessibilityState={{ selected: feed === value }}
                onPress={() => {
                  if (value === 'following' && !userId) {
                    login();
                    return;
                  }
                  setPosts([]);
                  setFeed(value);
                }}
                style={{
                  flex: 1,
                  minHeight: 50,
                  justifyContent: 'center',
                  borderBottomWidth: 3,
                  borderBottomColor:
                    feed === value ? colors.teal : 'transparent',
                }}
              >
                <Txt
                  style={{
                    textAlign: 'center',
                    fontWeight: feed === value ? '700' : '500',
                    color: feed === value ? colors.teal : colors.muted,
                  }}
                >
                  {value === 'all'
                    ? ar
                      ? 'كل المشاركات'
                      : 'All posts'
                    : ar
                      ? 'أتابع'
                      : 'Following'}
                </Txt>
              </Pressable>
            ))}
          </View> : null}
          {compose && userId ? (
            <PostComposer key={editingPost?.id ?? 'new'} owner={userId} post={editingPost} brews={recentBrews.map(b => ({ id: b.id, label: brewTitle(b) + ' · ' + methodLabel(b.brew_method, locale) }))} close={() => { setCompose(false); setEditingPost(null); }} saved={() => { setCompose(false); setEditingPost(null); setRevision(r => r + 1); setMessage(ar ? 'تم حفظ المنشور.' : 'Post saved.'); }} />
          ) : (!embedded || authorId === userId) && !postId ? (
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
              <MemberAvatar
                name={userId ? (profiles[userId]?.name ?? '') : '☕'}
                url={userId ? profiles[userId]?.avatar_url : null}
              />
              <View style={{ flex: 1 }}>
                <Txt style={s.cardTitle}>
                  {ar ? 'كيف كان كوبك اليوم؟' : 'What’s brewing?'}
                </Txt>
                <Txt style={styles.muted}>
                  {ar ? 'شارك تجربتك' : 'Share a brew or a thought.'}
                </Txt>
              </View>
              <Icon name="arrow" size={18} color={colors.teal} />
            </Pressable>
          ) : null}
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
          <View
            style={{
              borderWidth: visible.length ? 1 : 0,
              borderColor: colors.line,
              borderRadius: 18,
              overflow: 'hidden',
            }}
          >
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
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        member?.username
                          ? '@' + member.username
                          : ar
                            ? 'حساب العضو'
                            : 'Member account'
                      }
                      disabled={!member?.username}
                      onPress={() =>
                        member?.username && openMember(member.username)
                      }
                    >
                      <MemberAvatar
                        name={member?.name ?? member?.username ?? ''}
                        url={member?.avatar_url}
                      />
                    </Pressable>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          member?.name ??
                          member?.username ??
                          (ar ? 'عضو المجتمع' : 'Community member')
                        }
                        disabled={!member?.username}
                        onPress={() =>
                          member?.username && openMember(member.username)
                        }
                      >
                        <Txt style={s.cardTitle}>
                          {member?.name ??
                            member?.username ??
                            (ar ? 'عضو المجتمع' : 'Community member')}
                        </Txt>
                        {member?.username ? (
                          <Txt
                            style={{
                              fontSize: 12,
                              lineHeight: 18,
                              color: colors.muted,
                              writingDirection: 'ltr',
                            }}
                          >
                            @{member.username}
                          </Txt>
                        ) : null}
                      </Pressable>
                      <Txt style={{ fontSize: 11, color: colors.muted }}>
                        {[
                          member?.country
                            ? countryLabel(member.country, locale)
                            : null,
                          p.roast_profile_id
                            ? ar
                              ? 'تحميص'
                              : 'Roasting'
                            : (p.brew_log_id || p.recipe_id) && (p.brew_method || r?.method)
                              ? methodLabel(p.brew_method ?? r?.method, locale)
                              : ar
                                ? p.content_type === 'image' ? 'صورة' : p.content_type === 'video' ? 'فيديو' : 'موضوع'
                                : p.content_type === 'image' ? 'Photo' : p.content_type === 'video' ? 'Video' : 'Topic',
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
                    {p.user_id === userId ? <View style={{ flexDirection: "row", flexWrap: "wrap" }}><IconButton name="edit" label={ar ? "تعديل المنشور" : "Edit post"} onPress={() => { setEditingPost(p); setCompose(true); }} /><IconButton name="trash" label={ar ? "حذف المنشور" : "Delete post"} onPress={() => { setDeletePost(p); setError(""); }} /></View> : null}
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
                  {p.body ? (
                    <Txt style={{ fontSize: 16, lineHeight: 27 }}>{p.body}</Txt>
                  ) : null}
                  {(p.media ?? []).map((media, index) => <SocialMediaView key={media.url + index} source={media.url} type={media.media_type} label={p.body || (ar ? "وسائط المنشور" : "Post media")} />)}
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
                        accessibilityState={{
                          selected: liked(p.id),
                          disabled: likesBusy.includes(p.id),
                        }}
                        disabled={likesBusy.includes(p.id)}
                        testID={'post-like-' + p.id}
                        {...(Platform.OS === 'web'
                          ? { 'aria-pressed': liked(p.id) }
                          : {})}
                        onPress={() => void toggleLike(p.id)}
                        style={s.social}
                      >
                        <Icon
                          name="heart"
                          size={20}
                          color={liked(p.id) ? colors.teal : colors.muted}
                          filled={liked(p.id)}
                        />
                        <Txt
                          style={{
                            fontSize: 13,
                            color: liked(p.id) ? colors.teal : colors.muted,
                          }}
                        >
                          {ar ? 'إعجاب' : 'Like'} · {likeCount(p.id)}
                        </Txt>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={ar ? 'التعليقات' : 'Comments'}
                        accessibilityState={{ expanded: commentsOpen === p.id }}
                        onPress={() => {
                          setCommentsOpen((v) => (v === p.id ? null : p.id));
                        }}
                        style={s.social}
                      >
                        <Icon name="comment" size={20} color={colors.muted} />
                        <Txt style={{ fontSize: 13, color: colors.muted }}>
                          {ar ? 'تعليق' : 'Comment'} ·{' '}
                          {commentRows(p.id).length}
                        </Txt>
                      </Pressable>
                    </View>
                    <IconButton
                      name="share"
                      label={ar ? 'مشاركة المنشور' : 'Share post'}
                      size={20}
                      onPress={() => setSharePost(p)}
                    />
                  </View>
                  {interactionErrors[p.id] ? (
                    <Txt accessibilityRole="alert" style={styles.error}>
                      {interactionErrors[p.id]}
                    </Txt>
                  ) : null}
                  {commentsOpen === p.id ? (
                    <View testID={'post-comments-' + p.id} style={s.comments}>
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
                      {userId ? (
                        <View style={{ gap: 8 }}>
                          <TextInput
                            accessibilityLabel={
                              ar ? 'اكتب تعليقًا' : 'Write a comment'
                            }
                            multiline
                            maxLength={2000}
                            value={commentText[p.id] ?? ''}
                            onChangeText={(text) =>
                              setCommentText((v) => ({ ...v, [p.id]: text }))
                            }
                            editable={commentBusy !== p.id}
                            placeholder={
                              ar ? 'اكتب تعليقك…' : 'Write your comment…'
                            }
                            placeholderTextColor={colors.muted}
                            style={[
                              s.commentInput,
                              {
                                textAlign: ar ? 'right' : 'left',
                                textAlignVertical: 'top',
                              },
                            ]}
                          />
                          <View
                            style={{
                              alignSelf: ar ? 'flex-start' : 'flex-end',
                            }}
                          >
                            <Action
                              compact
                              selected
                              title={
                                commentBusy === p.id
                                  ? ar
                                    ? 'جارٍ الإرسال…'
                                    : 'Sending…'
                                  : ar
                                    ? 'إرسال التعليق'
                                    : 'Send comment'
                              }
                              disabled={
                                !!commentBusy ||
                                !(commentText[p.id] ?? '').trim()
                              }
                              onPress={() => void sendComment(p.id)}
                            />
                          </View>
                        </View>
                      ) : (
                        <Action
                          compact
                          title={
                            ar ? 'سجّل الدخول للتعليق' : 'Sign in to comment'
                          }
                          onPress={login}
                        />
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
          {!postId && posts.length >= pageLimit && !loading ? <Action compact title={ar ? "منشورات أقدم" : "Older posts"} onPress={() => setPageLimit(n => n + 60)} /> : null}
          {!visible.length && !loading && !error ? (
            <View testID="community-empty" style={s.empty}>
              <Txt heading style={[styles.subtitle, { textAlign: 'center' }]}>
                {feed === 'following'
                  ? ar
                    ? 'لا توجد منشورات بعد'
                    : 'No posts yet'
                  : ar
                    ? 'ابدأ الحديث بكوبك'
                    : 'Start a conversation with your cup'}
              </Txt>
              <Txt style={[styles.muted, { textAlign: 'center' }]}>
                {feed === 'following'
                  ? ar
                    ? 'منشورات الحسابات اللي تتابعها تظهر هنا.'
                    : 'Public posts from accounts you follow appear here.'
                  : ar
                    ? 'شارك تجربة قهوتك.'
                    : 'Share your coffee experience.'}
              </Txt>
              <View style={styles.row}>
                <Action
                  title={
                    feed === 'following'
                      ? ar
                        ? 'اكتشف الحسابات'
                        : 'Discover accounts'
                      : ar
                        ? 'شارك أول تجربة'
                        : 'Share the first experience'
                  }
                  selected
                  onPress={() => (feed === 'following' ? members() : write())}
                />
              </View>
            </View>
          ) : null}
        </View>
        {wide && !postId ? (
          <View style={[s.sidebar, { width: 238 }]}>
            <View
              testID="community-ad-space"
              accessibilityLabel={ar ? 'مساحة إعلانية' : 'Advertising space'}
              style={[
                s.sideCard,
                {
                  height: 164,
                  padding: 18,
                  gap: 14,
                  justifyContent: 'space-between',
                  backgroundColor: colors.chip,
                },
              ]}
            >
              <Txt style={{ color: colors.muted, fontSize: 11 }}>
                {ar ? 'إعلان' : 'Advertisement'}
              </Txt>
              <View
                style={{
                  flexDirection: ar ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    backgroundColor: colors.paper,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="espresso" size={22} color={colors.teal} />
                </View>
                <Txt heading style={{ flex: 1, fontSize: 16 }}>
                  {ar ? 'مساحة إعلانية' : 'Your brand here'}
                </Txt>
              </View>
              <Txt style={{ color: colors.muted, fontSize: 12 }}>
                {ar
                  ? 'للمحامص وعلامات القهوة'
                  : 'For coffee brands and roasters'}
              </Txt>
            </View>
            <Action
              compact
              title={ar ? 'اكتشف الحسابات' : 'Discover accounts'}
              onPress={members}
            />
          </View>
        ) : null}
      </View>
      {sharePost ? <View testID="post-share-options" style={[styles.card, { padding: 16, gap: 10 }]}>
        {shareDirect ? <Action title={ar ? 'مشاركة برسالة خاصة' : 'Share in a private message'} onPress={() => { shareDirect(sharePost.id); setSharePost(null); }} /> : null}
        <Action title={ar ? 'مشاركة خارج التطبيق' : 'Share outside the app'} onPress={() => { void Share.share({ message: [sharePost.body, `beanmora://post/${sharePost.id}`].filter(Boolean).join('\n') }).then(() => setSharePost(null)).catch(() => setError(ar ? 'تعذّرت المشاركة.' : 'Could not share.')); }} />
        <Action compact title={ar ? 'إغلاق المشاركة' : 'Close sharing'} onPress={() => setSharePost(null)} />
      </View> : null}
      {deletePost ? <View testID="post-delete-confirm" style={[styles.card, { padding: 16, gap: 10 }]}>
        <Txt>{ar ? 'حذف المنشور نهائيًا؟ سجل التحضير يبقى محفوظًا.' : 'Delete this post? Your brew record stays saved.'}</Txt>
        <Action title={ar ? 'تأكيد حذف المنشور' : 'Confirm delete post'} disabled={deleting} onPress={() => { if (!supabase || !userId || deleting) return; setDeleting(true); void deleteCommunityPost(supabase, userId, deletePost.id).then(async () => { if (deletePost.primary_media_path) await supabase?.storage.from('post-media').remove([deletePost.primary_media_path]); setDeletePost(null); setRevision(n => n + 1); }).catch(() => setError(ar ? 'تعذّر تأكيد حذف المنشور.' : 'Could not confirm post deletion.')).finally(() => setDeleting(false)); }} />
        <Action compact title={ar ? 'إلغاء حذف المنشور' : 'Cancel post deletion'} disabled={deleting} onPress={() => setDeletePost(null)} />
      </View> : null}
    </Container>
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
    paddingVertical: 8,
    gap: 12,
  },
  eyebrow: { fontSize: 12, lineHeight: 18, color: '#DDB791' },
  heroTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.ink,
  },
  heroNote: { fontSize: 12, lineHeight: 20, color: colors.muted },
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
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
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
    paddingHorizontal: 8,
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
    width: '100%',
    minHeight: 80,
    maxHeight: 160,
    paddingVertical: 12,
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
