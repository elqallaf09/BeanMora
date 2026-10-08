import { useContext, useEffect, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "./native";
import * as ImagePicker from "expo-image-picker";
import { randomUUID } from "expo-crypto";
import { supabase } from "./client";
import { Action, Field, Icon, Language, Txt, styles, colors } from "./ui";
import { MemberAvatar } from "./MemberAvatar";
import { categoryLabel } from "./catalog";
import { catalogName, methodLabel } from "./localizedContent";
import { useContentMedia } from "./useContentMedia";
import {
  contributionImage,
  uploadContributionImage,
} from "./core/member-contributions";
import {
  memberDirectory,
  memberProfile,
  ownUsername,
  updateMemberProfile,
  changeMemberFollow,
  decideMemberRequest,
  saveProfilePhoto,
  type MemberIdentity,
  type MemberProfileData,
} from "./core/member-social";

export function MemberDirectory({
  open,
}: {
  open: (username: string) => void;
}) {
  const ar = useContext(Language) === "ar";
  const [query, setQuery] = useState(""),
    [rows, setRows] = useState<MemberIdentity[]>([]),
    [offset, setOffset] = useState(0),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false),
    [revision, setRevision] = useState(0),
    [more, setMore] = useState(false);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setFailed(false);
    const timer = setTimeout(() => {
      if (!supabase) {
        setFailed(true);
        setBusy(false);
        return;
      }
      void memberDirectory(supabase, query, offset)
        .then((data) => {
          if (active) {
            setRows((previous) => (offset ? [...previous, ...data] : data));
            setMore(data.length === 24);
          }
        })
        .catch(() => {
          if (active) setFailed(true);
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, offset, revision]);
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: 18,
        gap: 14,
        width: "100%",
        maxWidth: 780,
        alignSelf: "center",
      }}
    >
      <Txt heading style={styles.title}>
        {ar ? "حسابات coffeeHO" : "coffeeHO accounts"}
      </Txt>
      <Field
        label={
          ar ? "ابحث بالاسم أو اسم المستخدم" : "Search by name or username"
        }
        value={query}
        onChangeText={(v) => {
          setRows([]);
          setOffset(0);
          setQuery(v);
        }}
        autoCapitalize="none"
      />
      {rows.map((p) => (
        <MemberLink key={p.id} member={p} open={open} />
      ))}
      {failed ? (
        <Action
          title={ar ? "إعادة تحميل الحسابات" : "Retry accounts"}
          onPress={() => setRevision((n) => n + 1)}
        />
      ) : !busy && !rows.length ? (
        <Txt>{ar ? "لا توجد حسابات مطابقة." : "No matching accounts."}</Txt>
      ) : null}
      {busy ? (
        <Txt>{ar ? "جارٍ التحميل…" : "Loading…"}</Txt>
      ) : more ? (
        <Action
          title={ar ? "حسابات إضافية" : "More accounts"}
          onPress={() => setOffset((n) => n + 24)}
        />
      ) : null}
    </ScrollView>
  );
}
function MemberLink({
  member,
  open,
}: {
  member: MemberIdentity;
  open: (username: string) => void;
}) {
  const ar = useContext(Language) === "ar";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={member.name + " @" + member.username}
      onPress={() => open(member.username)}
      style={[
        styles.card,
        {
          padding: 15,
          gap: 12,
          flexDirection: ar ? "row-reverse" : "row",
          alignItems: "center",
        },
      ]}
    >
      <MemberAvatar name={member.name} url={member.avatar_url} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt style={{ fontWeight: "700" }}>{member.name}</Txt>
        <Txt style={styles.muted}>
          @{member.username} ·{" "}
          {member.is_private
            ? ar
              ? "حساب خاص"
              : "Private account"
            : ar
              ? "حساب عام"
              : "Public account"}
        </Txt>
      </View>
      <Icon name="arrow" size={18} color={colors.muted} />
    </Pressable>
  );
}
function ProfileImage({ url, caption }: { url: string; caption: string }) {
  const uri = useContentMedia(url);
  return uri ? (
    <Image
      source={{ uri }}
      accessibilityLabel={caption}
      resizeMode="cover"
      style={{ height: 240, width: "100%", borderRadius: 14 }}
    />
  ) : (
    <View style={{ height: 80, backgroundColor: colors.paper }} />
  );
}
type Props = {
  userId: string | null;
  username?: string;
  openMember: (username: string) => void;
  openItem: (
    kind: "recipe" | "bean" | "product" | "equipment",
    id: string,
  ) => void;
  manage: (kind: "bags" | "equipment" | "recipes") => void;
  login: () => void;
};
export function MemberProfile({
  userId,
  username,
  openMember,
  openItem,
  manage,
  login,
}: Props) {
  const locale = useContext(Language),
    ar = locale === "ar";
  const { width } = useWindowDimensions();
  const [data, setData] = useState<MemberProfileData | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [tab, setTab] = useState("equipment"),
    [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const sectionScroll = useRef<ScrollView>(null);
  const sectionViewport = useRef(0);
  const sectionLayouts = useRef<Record<string, { x: number; width: number }>>(
    {},
  );
  const revealSection = () => {
    const layout = sectionLayouts.current[tab];
    if (layout && sectionViewport.current)
      sectionScroll.current?.scrollTo({
        x: Math.max(0, layout.x - (sectionViewport.current - layout.width) / 2),
        animated: false,
      });
  };
  useEffect(revealSection, [tab, ar, width]);
  const [draft, setDraft] = useState({
    name: "",
    username: "",
    bio: "",
    is_private: false,
    share_collection: false,
  });
  const [photo, setPhoto] = useState<{ uri: string; bytes: Uint8Array } | null>(
      null,
    ),
    [kind, setKind] = useState<"extraction" | "corner">("extraction"),
    [caption, setCaption] = useState(""),
    [rights, setRights] = useState(false),
    [locked, setLocked] = useState(false);
  const photoAttempt = useRef<{
    id: string;
    kind: "extraction" | "corner";
    caption: string;
    path?: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    setData(null);
    setLoading(true);
    setError("");
    if (!supabase || (!username && !userId)) {
      setLoading(false);
      return;
    }
    const db = supabase;
    void (async () => {
      const handle = username ?? (await ownUsername(db, userId!));
      const next = await memberProfile(db, handle);
      if (active) {
        setData(next);
        if (next)
          setDraft({
            name: next.profile.name,
            username: next.profile.username,
            bio: next.profile.bio ?? "",
            is_private: next.profile.is_private,
            share_collection: next.profile.share_collection ?? false,
          });
      }
    })()
      .catch(() => {
        if (active)
          setError(ar ? "تعذّر تحميل الملف." : "Could not load profile.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [username, userId, revision, ar]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setError(
        code === "USERNAME_TAKEN"
          ? ar
            ? "اسم المستخدم مستخدم؛ اختر اسمًا آخر."
            : "Username is taken. Choose another."
          : code === "PROFILE_FIELDS"
            ? ar
              ? "أدخل اسمًا من حرفين واسم مستخدم من ٣ إلى ٣٠ حرفًا إنجليزيًا صغيرًا أو رقمًا أو شرطة سفلية."
              : "Use a name of at least 2 characters and a username of 3–30 lowercase letters, numbers or underscores."
            : ar
              ? "تعذّر تأكيد العملية. تحقق من الاتصال وأعد المحاولة."
              : "Could not confirm the action. Check your connection and retry.",
      );
    } finally {
      setBusy(false);
    }
  };
  const selectPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        exif: false,
        quality: 0.85,
      });
      if (result.canceled) return;
      const a = result.assets[0];
      if (!a.base64) throw Error();
      const bytes = Uint8Array.from(atob(a.base64), (c) => c.charCodeAt(0));
      contributionImage(bytes);
      setPhoto({ uri: a.uri, bytes });
      setRights(false);
    } catch {
      setError(
        ar
          ? "اختر صورة JPEG أو PNG أو WebP لا تتجاوز ٥ ميغابايت."
          : "Choose JPEG, PNG or WebP under 5 MB.",
      );
    }
  };
  if (loading)
    return <Txt>{ar ? "جارٍ تحميل الملف…" : "Loading profile…"}</Txt>;
  if (!data)
    return (
      <View style={{ gap: 12 }}>
        <Txt>
          {error || (ar ? "لم يُعثر على الحساب." : "Account not found.")}
        </Txt>
        <Action
          title={ar ? "إعادة المحاولة" : "Retry profile"}
          onPress={() => setRevision((n) => n + 1)}
        />
      </View>
    );
  const { profile: p } = data,
    own = data.is_owner;
  const sections = [
    ["equipment", "معدات القهوة", "Equipment"],
    ["beans", "البن", "Coffee"],
    ["recipes", "الوصفات", "Recipes"],
    ["favorites", "الوصفات المفضلة", "Favorite recipes"],
    ["comments", "التعليقات", "Comments"],
    ["photos", "الاستخلاص وركن القهوة", "Brews & coffee corner"],
    ["followers", "المتابعون", "Followers"],
    ["following", "أتابع", "Following"],
  ];
  return (
    <View style={{ gap: 16 }} testID="member-profile">
      <View style={[styles.card, { padding: 0, gap: 0, overflow: "hidden" }]}>
        <View
          style={{
            height: 64,
            backgroundColor: colors.chip,
            padding: 16,
            alignItems: ar ? "flex-start" : "flex-end",
          }}
        >
          <Txt style={{ fontSize: 18, fontWeight: "700", color: colors.teal }}>
            coffeeHO
          </Txt>
        </View>
        <View style={{ padding: 16, paddingTop: 0, gap: 10 }}>
          <View
            style={{
              marginTop: -30,
              flexDirection: ar ? "row-reverse" : "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <View
              style={{
                borderWidth: 4,
                borderColor: colors.paper,
                borderRadius: 44,
              }}
            >
              <MemberAvatar name={p.name} url={p.avatar_url} size={64} />
            </View>
            <View
              style={{
                flexDirection: ar ? "row-reverse" : "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Icon
                name={p.is_private ? "lock" : "globe"}
                size={15}
                color={colors.muted}
              />
              <Txt style={styles.muted}>
                {p.is_private
                  ? ar
                    ? "حساب خاص"
                    : "Private account"
                  : ar
                    ? "حساب عام"
                    : "Public account"}
              </Txt>
            </View>
          </View>
          <Txt
            heading
            style={{ fontSize: 26, lineHeight: 36, fontWeight: "700" }}
          >
            {p.name}
          </Txt>
          <Pressable
            accessibilityRole={own ? "button" : undefined}
            accessibilityLabel={
              own ? (ar ? "تغيير اسم المستخدم" : "Change username") : undefined
            }
            disabled={!own || busy}
            onPress={() => {
              setEditing(true);
              setNotice("");
            }}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Txt
              style={{
                fontWeight: "700",
                color: colors.teal,
                writingDirection: "ltr",
              }}
            >
              @{p.username}
            </Txt>
          </Pressable>
          {p.bio ? <Txt>{p.bio}</Txt> : null}
          <View
            style={[styles.row, { flexDirection: ar ? "row-reverse" : "row" }]}
          >
            <Action
              compact
              title={`${data.follower_count} ${ar ? "متابع" : "followers"}`}
              onPress={() => setTab("followers")}
            />
            <Action
              compact
              title={`${data.following_count} ${ar ? "أتابع" : "following"}`}
              onPress={() => setTab("following")}
            />
          </View>
          {own ? (
            <Action
              title={ar ? "تعديل الملف والخصوصية" : "Edit profile and privacy"}
              selected
              disabled={busy}
              onPress={() => {
                setEditing((v) => !v);
                setNotice("");
              }}
            />
          ) : (
            <Action
              selected
              disabled={busy}
              title={
                data.relationship === "accepted"
                  ? ar
                    ? "إلغاء المتابعة"
                    : "Unfollow"
                  : data.relationship === "pending"
                    ? ar
                      ? "إلغاء طلب المتابعة"
                      : "Cancel follow request"
                    : ar
                      ? "متابعة"
                      : "Follow"
              }
              onPress={() => {
                if (!userId) {
                  login();
                  return;
                }
                void run(async () => {
                  await changeMemberFollow(
                    supabase!,
                    userId,
                    p.id,
                    data.relationship,
                  );
                  setRevision((n) => n + 1);
                });
              }}
            />
          )}
        </View>
      </View>
      {notice ? (
        <View accessibilityLiveRegion="polite">
          <Txt style={styles.success}>{notice}</Txt>
        </View>
      ) : null}
      {error ? (
        <Txt accessibilityRole="alert" style={styles.error}>
          {error}
        </Txt>
      ) : null}
      {own && editing ? (
        <View style={[styles.card, { padding: 15, gap: 12 }]}>
          <Field
            label={ar ? "الاسم" : "Name"}
            value={draft.name}
            onChangeText={(name) => setDraft((v) => ({ ...v, name }))}
            maxLength={100}
            editable={!busy}
          />
          <Field
            label={ar ? "اسم المستخدم" : "Username"}
            value={draft.username}
            onChangeText={(username) => setDraft((v) => ({ ...v, username }))}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
            editable={!busy}
          />
          <Txt style={styles.muted}>
            {ar
              ? "من 3 إلى 30 حرفًا إنجليزيًا أو رقمًا أو شرطة سفلية. يظهر اسم المستخدم في ملفك وبحث coffeeHO."
              : "3–30 letters, numbers or underscores. Your username appears on your profile and in coffeeHO search."}
          </Txt>
          <Field
            label={ar ? "نبذة عني" : "Bio"}
            value={draft.bio}
            onChangeText={(bio) => setDraft((v) => ({ ...v, bio }))}
            multiline
            maxLength={2000}
            editable={!busy}
          />
          <View style={styles.row}>
            <Action
              title={ar ? "عام" : "Public"}
              selected={!draft.is_private}
              onPress={() => setDraft((v) => ({ ...v, is_private: false }))}
            />
            <Action
              title={ar ? "خاص" : "Private"}
              selected={draft.is_private}
              onPress={() => setDraft((v) => ({ ...v, is_private: true }))}
            />
          </View>
          <Txt style={styles.muted}>
            {ar
              ? "الاسم واسم المستخدم ظاهران في البحث. الحساب الخاص يعرض محتوى ملفك للمتابعين المقبولين فقط."
              : "Name and username remain searchable. Private profile content is visible only to approved followers."}
          </Txt>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={
              ar
                ? "مشاركة معداتي والبن والمفضلة"
                : "Share equipment, coffee and favorites"
            }
            accessibilityState={{ checked: draft.share_collection }}
            onPress={() =>
              setDraft((v) => ({ ...v, share_collection: !v.share_collection }))
            }
            style={{ paddingVertical: 12 }}
          >
            <Txt>
              {(draft.share_collection ? "☑ " : "☐ ") +
                (ar
                  ? "عرض معداتي والبن والمفضلة لمن يستطيع مشاهدة ملفي"
                  : "Show equipment, coffee and favorites to people who can view my profile")}
            </Txt>
          </Pressable>
          <Action
            selected
            disabled={busy}
            title={ar ? "حفظ الملف" : "Save profile"}
            onPress={() =>
              void run(async () => {
                const handle = await updateMemberProfile(
                  supabase!,
                  userId!,
                  draft,
                );
                setEditing(false);
                setNotice(
                  ar
                    ? "تم تحديث الاسم واسم المستخدم وإعدادات الملف."
                    : "Name, username and profile settings updated.",
                );
                if (username && handle !== username) openMember(handle);
                else setRevision((n) => n + 1);
              })
            }
          />
          <Action
            title={ar ? "إلغاء التعديل" : "Cancel editing"}
            disabled={busy}
            onPress={() => {
              setDraft({
                name: p.name,
                username: p.username,
                bio: p.bio ?? "",
                is_private: p.is_private,
                share_collection: p.share_collection ?? false,
              });
              setEditing(false);
              setError("");
            }}
          />
        </View>
      ) : null}
      {own && (data.requests?.length ?? 0) > 0 ? (
        <View style={{ gap: 9 }}>
          <Txt heading>{ar ? "طلبات المتابعة" : "Follow requests"}</Txt>
          {data.requests!.map((r) => (
            <View key={r.id} style={styles.card}>
              <MemberLink member={r} open={openMember} />
              <View style={styles.row}>
                <Action
                  title={ar ? "قبول" : "Accept"}
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await decideMemberRequest(
                        supabase!,
                        userId!,
                        r.request_id!,
                        true,
                      );
                      setRevision((n) => n + 1);
                    })
                  }
                />
                <Action
                  title={ar ? "رفض" : "Decline"}
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await decideMemberRequest(
                        supabase!,
                        userId!,
                        r.request_id!,
                        false,
                      );
                      setRevision((n) => n + 1);
                    })
                  }
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {!data.can_view ? (
        <Txt>
          {ar
            ? "هذا الحساب خاص. أرسل طلب متابعة لعرض تفاصيله بعد الموافقة."
            : "This account is private. Request to follow to view details after approval."}
        </Txt>
      ) : (
        <>
          <View
            style={{
              flexDirection: ar ? "row-reverse" : "row",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {(
              [
                [
                  "equipment",
                  data.equipment?.length ?? 0,
                  ar ? "معدات القهوة" : "Equipment",
                  "gear",
                ],
                [
                  "beans",
                  data.beans?.length ?? 0,
                  ar ? "أكياس البن" : "Coffee bags",
                  "bean",
                ],
                [
                  "recipes",
                  data.recipes?.length ?? 0,
                  ar ? "وصفاتي" : "My recipes",
                  "espresso",
                ],
                [
                  "photos",
                  data.photos?.length ?? 0,
                  ar ? "الركن والاستخلاص" : "Corner & brews",
                  "eye",
                ],
              ] as const
            ).map(([key, count, label, icon]) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={label + " (" + count + ")"}
                onPress={() => setTab(key)}
                style={[
                  styles.card,
                  {
                    flexGrow: 1,
                    flexBasis: width >= 700 ? "21%" : "44%",
                    padding: 14,
                    gap: 6,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: ar ? "row-reverse" : "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Icon name={icon} size={22} color={colors.teal} />
                  <Txt
                    style={{ fontSize: 24, lineHeight: 30, fontWeight: "700" }}
                  >
                    {count}
                  </Txt>
                </View>
                <Txt style={styles.muted}>{label}</Txt>
              </Pressable>
            ))}
          </View>
          <ScrollView
            ref={sectionScroll}
            testID="profile-sections"
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            onLayout={(event) => {
              sectionViewport.current = event.nativeEvent.layout.width;
              revealSection();
            }}
            onContentSizeChange={revealSection}
            contentContainerStyle={{
              flexDirection: ar ? "row-reverse" : "row",
              gap: 6,
              paddingVertical: 4,
            }}
          >
            {sections.map((s) => (
              <View
                key={s[0]}
                onLayout={(event) => {
                  sectionLayouts.current[s[0]] = event.nativeEvent.layout;
                  if (tab === s[0]) revealSection();
                }}
              >
                <Action
                  compact
                  title={s[ar ? 1 : 2]}
                  selected={tab === s[0]}
                  onPress={() => setTab(s[0])}
                />
              </View>
            ))}
          </ScrollView>
          {tab === "equipment" ? (
            <View style={{ gap: 10 }}>
              {own ? (
                <Action
                  title={ar ? "إدارة معداتي" : "Manage my equipment"}
                  onPress={() => manage("equipment")}
                />
              ) : null}
              {data.equipment?.map((e) => (
                <Pressable
                  key={e.id}
                  accessibilityRole="button"
                  onPress={() => {
                    if (e.equipment_model_id)
                      openItem("equipment", e.equipment_model_id);
                  }}
                  style={[styles.card, { padding: 14, gap: 5 }]}
                >
                  <Txt heading>
                    {ar ? e.name_ar || catalogName(e.name, "ar") : e.name}
                  </Txt>
                  <Txt>{categoryLabel(e.category, locale)}</Txt>
                  {e.operation ? (
                    <Txt style={styles.muted}>{e.operation[ar ? 0 : 1]}</Txt>
                  ) : null}
                </Pressable>
              ))}
              {!data.equipment?.length ? <Empty ar={ar} /> : null}
            </View>
          ) : null}
          {tab === "beans" ? (
            <View style={{ gap: 10 }}>
              {own ? (
                <Action
                  title={ar ? "إدارة أكياسي" : "Manage my bags"}
                  onPress={() => manage("bags")}
                />
              ) : null}
              {data.beans?.map((b) => (
                <Action
                  key={b.id}
                  title={
                    ar
                      ? b.name_ar || catalogName(b.name_en, "ar")
                      : b.name_en || b.name_ar
                  }
                  onPress={() => openItem(b.kind, b.coffee_id)}
                />
              ))}
              {!data.beans?.length ? <Empty ar={ar} /> : null}
            </View>
          ) : null}
          {tab === "recipes" || tab === "favorites" ? (
            <View style={{ gap: 10 }}>
              {own && tab === "recipes" ? (
                <Action
                  title={ar ? "إضافة وصفة" : "Add recipe"}
                  onPress={() => manage("recipes")}
                />
              ) : null}
              {(tab === "recipes" ? data.recipes : data.favorites)?.map((r) => (
                <View key={r.id} style={[styles.card, { padding: 12 }]}>
                  <Action
                    title={
                      ar ? r.title_ar || catalogName(r.title, "ar") : r.title
                    }
                    onPress={() => openItem("recipe", r.id)}
                  />
                  <Txt style={styles.muted}>
                    {methodLabel(r.brew_method, locale)}
                    {r.visibility && r.visibility !== "public"
                      ? " · " + (ar ? "خاصة" : "Private")
                      : ""}
                  </Txt>
                </View>
              ))}
              {!(tab === "recipes" ? data.recipes : data.favorites)?.length ? (
                <Empty ar={ar} />
              ) : null}
            </View>
          ) : null}
          {tab === "comments" ? (
            <View style={{ gap: 12 }}>
              {data.comments?.map((c) => (
                <View
                  key={c.kind + c.id}
                  style={[styles.card, { padding: 14, gap: 7 }]}
                >
                  <Txt>{c.body}</Txt>
                  <Action
                    compact
                    title={
                      ar
                        ? c.name_ar || catalogName(c.name_en, "ar")
                        : c.name_en || c.name_ar
                    }
                    onPress={() => openItem(c.kind, c.target_id)}
                  />
                </View>
              ))}
              {!data.comments?.length ? <Empty ar={ar} /> : null}
            </View>
          ) : null}
          {tab === "followers" || tab === "following" ? (
            <View style={{ gap: 8 }}>
              {(tab === "followers" ? data.followers : data.following)?.map(
                (m) => (
                  <MemberLink key={m.id} member={m} open={openMember} />
                ),
              )}
              {!(tab === "followers" ? data.followers : data.following)
                ?.length ? (
                <Empty ar={ar} />
              ) : null}
            </View>
          ) : null}
          {tab === "photos" ? (
            <View style={{ gap: 14 }}>
              {own ? (
                <View style={[styles.card, { padding: 14, gap: 10 }]}>
                  <View style={styles.row}>
                    <Action
                      compact
                      title={ar ? "صورة استخلاص" : "Brew photo"}
                      selected={kind === "extraction"}
                      disabled={locked}
                      onPress={() => setKind("extraction")}
                    />
                    <Action
                      compact
                      title={ar ? "ركن القهوة" : "Coffee corner"}
                      selected={kind === "corner"}
                      disabled={locked}
                      onPress={() => setKind("corner")}
                    />
                  </View>
                  <Field
                    label={ar ? "وصف الصورة" : "Photo caption"}
                    value={caption}
                    onChangeText={setCaption}
                    maxLength={2000}
                    editable={!locked}
                  />
                  <Action
                    title={ar ? "اختيار صورة" : "Choose photo"}
                    disabled={locked || busy}
                    onPress={() => void selectPhoto()}
                  />
                  {photo ? (
                    <>
                      <Image
                        source={{ uri: photo.uri }}
                        accessibilityLabel={
                          ar ? "الصورة المختارة" : "Selected photo"
                        }
                        style={{ height: 180, width: "100%" }}
                        resizeMode="contain"
                      />
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: rights }}
                        disabled={locked}
                        onPress={() => setRights((v) => !v)}
                        style={{ padding: 12 }}
                      >
                        <Txt>
                          {(rights ? "☑ " : "☐ ") +
                            (ar
                              ? "أملك حق مشاركة الصورة"
                              : "I have permission to share the photo")}
                        </Txt>
                      </Pressable>
                      <Action
                        selected
                        disabled={busy || !rights}
                        title={
                          locked
                            ? ar
                              ? "إعادة حفظ الصورة"
                              : "Retry photo"
                            : ar
                              ? "حفظ الصورة"
                              : "Save photo"
                        }
                        onPress={() =>
                          void run(async () => {
                            if (!photoAttempt.current) {
                              photoAttempt.current = {
                                id: randomUUID(),
                                kind,
                                caption,
                              };
                              setLocked(true);
                            }
                            const a = photoAttempt.current;
                            if (!a.path)
                              a.path = await uploadContributionImage(
                                supabase!,
                                userId!,
                                a.id,
                                photo.bytes,
                                "profile-gallery",
                              );
                            await saveProfilePhoto(
                              supabase!,
                              userId!,
                              a.id,
                              a.kind,
                              a.path,
                              a.caption,
                            );
                            photoAttempt.current = null;
                            setPhoto(null);
                            setCaption("");
                            setRights(false);
                            setLocked(false);
                            setRevision((n) => n + 1);
                          })
                        }
                      />
                    </>
                  ) : null}
                </View>
              ) : null}
              {data.photos?.map((p) => (
                <View key={p.id} style={{ gap: 8 }}>
                  <ProfileImage
                    url={p.image_url}
                    caption={
                      p.caption ||
                      (p.kind === "corner"
                        ? ar
                          ? "ركن القهوة"
                          : "Coffee corner"
                        : ar
                          ? "صورة استخلاص"
                          : "Brew photo")
                    }
                  />
                  <Txt>
                    {p.kind === "corner"
                      ? ar
                        ? "ركن القهوة"
                        : "Coffee corner"
                      : ar
                        ? "استخلاص"
                        : "Brew"}
                  </Txt>
                  {p.caption ? <Txt>{p.caption}</Txt> : null}
                </View>
              ))}
              {!data.photos?.length ? <Empty ar={ar} /> : null}
            </View>
          ) : null}
          <Txt style={styles.muted}>
            {ar
              ? "تعرض الأقسام أحدث ١٠٠ عنصر متاح للعرض."
              : "Sections show the latest 100 visible items."}
          </Txt>
        </>
      )}
    </View>
  );
}
function Empty({ ar }: { ar: boolean }) {
  return (
    <Txt style={styles.muted}>
      {ar
        ? "لا توجد عناصر متاحة للعرض في هذا القسم."
        : "No visible items in this section."}
    </Txt>
  );
}
