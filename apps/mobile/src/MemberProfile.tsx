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
import { useLabels,
  Action,
  Field,
  Icon,
  IconButton,
  Language,
  Txt,
  styles,
  colors,
  type IconName,
} from "./ui";
import { AvatarEditor } from "./AvatarEditor";
import { MemberAvatar } from "./MemberAvatar";
import { ProfileCover } from "./ProfileCover";
import { ProfilePhotoActions } from "./ProfilePhotoActions";
import { CommunityScreen } from "./CommunityScreen";
import type { CoffeeItem, RecipeItem } from "./data";
import { TabRail } from "./TabRail";
import { SelectionMenu } from "./SelectionMenu";
import { categoryLabel } from "./catalog";
import { catalogName, methodLabel } from "./localizedContent";
import { useContentMedia } from "./useContentMedia";
import { CatalogPhoto } from "./CatalogPhoto";
import { safeUrl } from "./guards";
import { accountCountryFlag, accountCountryName } from './core/account-profile';
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
  const L = useLabels();
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
        {L("حسابات coffeeHO", "coffeeHO accounts")}
      </Txt>
      <Field
        label={
          L("ابحث بالاسم أو اسم المستخدم", "Search by name or username")
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
          title={L("إعادة تحميل الحسابات", "Retry accounts")}
          onPress={() => setRevision((n) => n + 1)}
        />
      ) : !busy && !rows.length ? (
        <Txt>{L("لا توجد حسابات مطابقة.", "No matching accounts.")}</Txt>
      ) : null}
      {busy ? (
        <Txt>{L("جارٍ التحميل…", "Loading…")}</Txt>
      ) : more ? (
        <Action
          title={L("حسابات إضافية", "More accounts")}
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
  const L = useLabels();
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
            ? L("حساب خاص", "Private account")
            : L("حساب عام", "Public account")}
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
function CollectionPhoto({
  url,
  status,
  name,
  bean = false,
  large = false,
}: {
  url?: string | null;
  status?: string | null;
  name: string;
  bean?: boolean;
  large?: boolean;
}) {
  const allowed = ["source_linked", "rights_confirmed"].includes(status ?? "");
  const resolved = useContentMedia(allowed ? (url ?? null) : null);
  return (
    <View style={{ width: large ? 180 : 88, flexShrink: 0 }}>
      <CatalogPhoto
        uri={safeUrl(resolved)}
        height={large ? 168 : 88}
        icon={bean ? "bean" : "gear"}
        alt={name}
      />
    </View>
  );
}
type Props = {
  userId: string | null;
  username?: string;
  refreshKey?: number;
  openMember: (username: string) => void;
  openItem: (
    kind: "recipe" | "bean" | "product" | "equipment",
    id: string,
  ) => void;
  manage: (kind: "bags" | "equipment" | "recipes") => void;
  login: () => void;
  messages?: (member?: MemberIdentity) => void;
  shareDirect?: (id: string) => void;
  recipes?: RecipeItem[];
  coffees?: CoffeeItem[];
  openRoast?: (id?: string) => void;
};
export function MemberProfile({
  userId,
  username,
  refreshKey = 0,
  openMember,
  openItem,
  manage,
  login,
  messages, shareDirect, recipes = [], coffees = [], openRoast,
}: Props) {
  const locale = useContext(Language),
    ar = locale === "ar";
  const L = useLabels();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<MemberProfileData | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [tab, setTab] = useState("equipment"),
    [editing, setEditing] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [notice, setNotice] = useState("");
  const [moreSections, setMoreSections] = useState(true);
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
          setError(L("تعذّر تحميل الملف.", "Could not load profile."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [username, userId, revision, ar, refreshKey]);
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
          ? L("اسم المستخدم مستخدم؛ اختر اسمًا آخر.", "Username is taken. Choose another.")
          : code === "PROFILE_FIELDS"
            ? L("أدخل اسمًا من حرفين واسم مستخدم من ٣ إلى ٣٠ حرفًا إنجليزيًا صغيرًا أو رقمًا أو شرطة سفلية.", "Use a name of at least 2 characters and a username of 3–30 lowercase letters, numbers or underscores.")
            : L("تعذّر تأكيد العملية. تحقق من الاتصال وأعد المحاولة.", "Could not confirm the action. Check your connection and retry."),
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
        L("اختر صورة JPEG أو PNG أو WebP لا تتجاوز ٥ ميغابايت.", "Choose JPEG, PNG or WebP under 5 MB."),
      );
    }
  };
  if (loading)
    return <Txt>{L("جارٍ تحميل الملف…", "Loading profile…")}</Txt>;
  if (!data)
    return (
      <View style={{ gap: 12 }}>
        <Txt>
          {error || (L("لم يُعثر على الحساب.", "Account not found."))}
        </Txt>
        <Action
          title={L("إعادة المحاولة", "Retry profile")}
          onPress={() => setRevision((n) => n + 1)}
        />
      </View>
    );
  const { profile: p } = data,
    own = data.is_owner;
  const sections = [
    ["equipment", "المعدات", "Equipment"],
    ["beans", "البن", "Coffee"],
    ["recipes", "الوصفات", "Recipes"],
    ["posts", "منشوراتي", "Posts"],
    ["favorites", "الوصفات المفضلة", "Favorite recipes"],
    ["comments", "التعليقات", "Comments"],
    ["photos", "الاستخلاص وركن القهوة", "Brews & coffee corner"],
    ["followers", "المتابعون", "Followers"],
    ["following", "أتابع", "Following"],
  ];
  const wide = width >= 700;
  const avatarSize = wide ? 112 : 80;
  const extraSections = sections.slice(4);
  const selectedExtra = extraSections.find((section) => section[0] === tab);
  const selectSection = (key: string) => {
    setTab(key);
    setEditing(false);
  };
  return (
    <View style={{ gap: 16 }} testID="member-profile">
      <View testID="profile-identity" style={{ gap: 8 }}>
        <ProfileCover compact={!wide} />
        <View style={{ paddingHorizontal: wide ? 20 : 10, gap: 8 }}>
          <View
            style={{
              marginTop: wide ? -52 : -32,
              flexDirection: ar ? "row-reverse" : "row",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            {own && userId ? (
              <AvatarEditor
                key={userId}
                owner={userId}
                name={p.name}
                url={p.avatar_url}
                size={avatarSize}
                saved={(url) => {
                  setData((current) =>
                    current
                      ? {
                          ...current,
                          profile: { ...current.profile, avatar_url: url },
                        }
                      : current,
                  );
                  setNotice(
                    L("تم حفظ الصورة الشخصية.", "Profile photo saved."),
                  );
                }}
              />
            ) : (
              <View
                style={{
                  borderWidth: 4,
                  borderColor: colors.cream,
                  borderRadius: avatarSize / 2 + 4,
                }}
              >
                <MemberAvatar
                  name={p.name}
                  url={p.avatar_url}
                  size={avatarSize}
                />
              </View>
            )}
            <View style={{ maxWidth: wide ? 240 : "62%", paddingBottom: 6 }}>
              {own ? (
                <ProfileAction
                  title={L("تعديل الملف", "Edit profile")}
                  icon="edit"
                  disabled={busy}
                  onPress={() => {
                    setEditing((v) => !v);
                    setNotice("");
                  }}
                />
              ) : (
                <ProfileAction
                  selected
                  disabled={busy}
                  title={
                    data.relationship === "accepted"
                      ? L("إلغاء المتابعة", "Unfollow")
                      : data.relationship === "pending"
                        ? L("إلغاء طلب المتابعة", "Cancel follow request")
                        : L("متابعة", "Follow")
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
          {messages && !own ? <View style={{ alignSelf: ar ? "flex-end" : "flex-start" }}><IconButton name="inbox" label={L("رسالة خاصة", "Direct message")} onPress={() => { if (!userId) login(); else messages(own ? undefined : p); }} /></View> : null}
          <View
            style={{
              gap: 2,
              minWidth: 0,
              marginTop: wide ? -58 : 0,
              ...(wide
                ? ar
                  ? { marginRight: avatarSize + 24, marginLeft: 260 }
                  : { marginLeft: avatarSize + 24, marginRight: 260 }
                : {}),
            }}
          >
            <Txt
              heading
              numberOfLines={2}
              style={{
                fontSize: wide ? 26 : 22,
                lineHeight: wide ? 34 : 30,
                fontWeight: "700",
              }}
            >
              {p.name}
            </Txt>
            <View
              style={{
                flexDirection: ar ? "row-reverse" : "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <Pressable
                accessibilityRole={own ? "button" : undefined}
                accessibilityLabel={
                  own
                    ? L("تغيير اسم المستخدم", "Change username")
                    : undefined
                }
                disabled={!own || busy}
                onPress={() => {
                  setEditing(true);
                  setNotice("");
                }}
                style={{
                  minHeight: 44,
                  justifyContent: "center",
                  minWidth: 0,
                  maxWidth: "100%",
                }}
              >
                <Txt
                  numberOfLines={1}
                  style={{
                    fontWeight: "700",
                    color: colors.teal,
                    writingDirection: "ltr",
                  }}
                >
                  @{p.username}
                </Txt>
              </Pressable>
              {accountCountryFlag(p.country) ? <View testID="profile-country-flag" accessible accessibilityLabel={accountCountryName(p.country, locale)}>
                <Txt style={{ fontSize: 20 }}>{accountCountryFlag(p.country)}</Txt>
              </View> : null}
              <View
                style={{
                  flexDirection: ar ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Icon
                  name={p.is_private ? "lock" : "globe"}
                  size={14}
                  color={colors.muted}
                />
                <Txt style={styles.muted}>
                  {p.is_private
                    ? L("حساب خاص", "Private account")
                    : L("حساب عام", "Public account")}
                </Txt>
              </View>
            </View>
            <View testID="profile-bio" style={{ gap: 4 }}>
              {p.bio ? <>
                <Txt numberOfLines={bioExpanded ? undefined : 3}>{p.bio}</Txt>
                {p.bio.length > 160 || p.bio.includes('\n') ? <Action compact title={bioExpanded ? L('عرض أقل', 'Show less') : L('عرض النبذة كاملة', 'Show full bio')} onPress={() => setBioExpanded(v => !v)} /> : null}
              </> : null}
              {own && !editing ? <View style={{ alignSelf: ar ? 'flex-end' : 'flex-start' }}>
                <Action compact title={p.bio ? L('تعديل النبذة', 'Edit bio') : L('أضف نبذة عنك', 'Add a bio')} disabled={busy} onPress={() => { setEditing(true); setNotice(''); }} />
              </View> : null}
            </View>
          </View>
          <View
            style={{
              flexDirection: ar ? "row-reverse" : "row",
              gap: 14,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <ProfileCount
              count={data.follower_count}
              label={L("متابع", "followers")}
              onPress={() => selectSection("followers")}
            />
            <Txt style={styles.muted}>·</Txt>
            <ProfileCount
              count={data.following_count}
              label={L("أتابع", "following")}
              onPress={() => selectSection("following")}
            />
          </View>
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
            label={L("الاسم", "Name")}
            value={draft.name}
            onChangeText={(name) => setDraft((v) => ({ ...v, name }))}
            maxLength={100}
            editable={!busy}
          />
          <Field
            label={L("اسم المستخدم", "Username")}
            value={draft.username}
            onChangeText={(username) => setDraft((v) => ({ ...v, username }))}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
            editable={!busy}
          />
          <Txt style={styles.muted}>
            {L("من 3 إلى 30 حرفًا إنجليزيًا أو رقمًا أو شرطة سفلية. يظهر اسم المستخدم في ملفك وبحث coffeeHO.", "3–30 letters, numbers or underscores. Your username appears on your profile and in coffeeHO search.")}
          </Txt>
          <Field
            label={L("نبذة عني", "Bio")}
            value={draft.bio}
            onChangeText={(bio) => setDraft((v) => ({ ...v, bio }))}
            multiline
            maxLength={2000}
            editable={!busy}
            placeholder={L('عرّف بنفسك واهتماماتك بالقهوة…', 'Tell us about yourself and your coffee interests…', 'あなた自身やコーヒーの好みを紹介しましょう…')}
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />
          <Txt style={styles.muted}>{draft.bio.length} / 2000</Txt>
          <View style={styles.row}>
            <Action
              title={L("عام", "Public")}
              selected={!draft.is_private}
              onPress={() => setDraft((v) => ({ ...v, is_private: false }))}
            />
            <Action
              title={L("خاص", "Private")}
              selected={draft.is_private}
              onPress={() => setDraft((v) => ({ ...v, is_private: true }))}
            />
          </View>
          <Txt style={styles.muted}>
            {L("الاسم واسم المستخدم ظاهران في البحث. الحساب الخاص يعرض محتوى ملفك للمتابعين المقبولين فقط.", "Name and username remain searchable. Private profile content is visible only to approved followers.")}
          </Txt>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={
              L("مشاركة معداتي والبن والمفضلة", "Share equipment, coffee and favorites")
            }
            accessibilityState={{ checked: draft.share_collection }}
            onPress={() =>
              setDraft((v) => ({ ...v, share_collection: !v.share_collection }))
            }
            style={{ paddingVertical: 12 }}
          >
            <Txt>
              {(draft.share_collection ? "☑ " : "☐ ") +
                (L("عرض معداتي والبن والمفضلة لمن يستطيع مشاهدة ملفي", "Show equipment, coffee and favorites to people who can view my profile"))}
            </Txt>
          </Pressable>
          <Action
            selected
            disabled={busy}
            title={L("حفظ الملف", "Save profile")}
            onPress={() =>
              void run(async () => {
                const handle = await updateMemberProfile(
                  supabase!,
                  userId!,
                  draft,
                );
                setEditing(false);
                setNotice(
                  L("تم تحديث الاسم واسم المستخدم وإعدادات الملف.", "Name, username and profile settings updated."),
                );
                if (username && handle !== username) openMember(handle);
                else setRevision((n) => n + 1);
              })
            }
          />
          <Action
            title={L("إلغاء التعديل", "Cancel editing")}
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
          <Txt heading>{L("طلبات المتابعة", "Follow requests")}</Txt>
          {data.requests!.map((r) => (
            <View key={r.id} style={styles.card}>
              <MemberLink member={r} open={openMember} />
              <View style={styles.row}>
                <Action
                  title={L("قبول", "Accept")}
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
                  title={L("رفض", "Decline")}
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
          {L("هذا الحساب خاص. أرسل طلب متابعة لعرض تفاصيله بعد الموافقة.", "This account is private. Request to follow to view details after approval.")}
        </Txt>
      ) : (
        <>
          <View
            testID="profile-stats"
            style={{
              flexDirection: ar ? "row-reverse" : "row",
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: colors.line,
            }}
          >
            {(
              [
                [
                  "equipment",
                  data.equipment?.length ?? 0,
                  L("معدات القهوة", "Equipment"),
                  "gear",
                ],
                [
                  "beans",
                  data.beans?.length ?? 0,
                  L("أكياس البن", "Coffee bags"),
                  "bean",
                ],
                [
                  "recipes",
                  data.recipes?.length ?? 0,
                  L("وصفاتي", "My recipes"),
                  "espresso",
                ],
                [
                  "photos",
                  data.photos?.length ?? 0,
                  L("الركن والاستخلاص", "Corner & brews"),
                  "eye",
                ],
              ] as const
            ).map(([key, count, label, icon], index) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={label + " (" + count + ")"}
                onPress={() => selectSection(key)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 72,
                  justifyContent: "center",
                  paddingVertical: 10,
                  paddingHorizontal: wide ? 16 : 4,
                  gap: 4,
                }}
              >
                <View
                  style={{
                    flexDirection: ar ? "row-reverse" : "row",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: wide ? 12 : 6,
                    ...(wide && index < 3
                      ? {
                          borderLeftWidth: ar ? 1 : 0,
                          borderRightWidth: ar ? 0 : 1,
                          borderColor: colors.line,
                        }
                      : {}),
                  }}
                >
                  <Icon name={icon} size={22} color={colors.teal} />
                  {wide ? (
                    <Txt style={[styles.muted, { flexShrink: 1 }]}>{label}</Txt>
                  ) : null}
                  <Txt
                    style={{ fontSize: 22, lineHeight: 28, fontWeight: "700" }}
                  >
                    {count}
                  </Txt>
                </View>
                {!wide ? (
                  <Txt
                    numberOfLines={2}
                    style={[
                      styles.muted,
                      { textAlign: "center", fontSize: 11, lineHeight: 16 },
                    ]}
                  >
                    {label}
                  </Txt>
                ) : null}
              </Pressable>
            ))}
          </View>
          <View
            testID="profile-sections"
            style={{
              flexDirection: ar ? "row-reverse" : "row",
              alignItems: "stretch",
              borderBottomWidth: 1,
              borderColor: colors.line,
            }}
          >
            <View style={{ flex: 4, minWidth: 0 }}>
              <TabRail
                equal compact
                value={tab}
                onChange={selectSection}
                items={sections.slice(0, 4).map((section) => ({
                  id: section[0],
                  label: L(section[1], section[2]),
                }))}
              />
            </View>
            <View
              style={{
                flex: 1,
                minWidth: 0,
                justifyContent: "center",
                borderBottomWidth: 3,
                borderBottomColor: selectedExtra ? colors.teal : "transparent",
              }}
            >
              <Pressable accessibilityRole="button" accessibilityLabel={L("المزيد من أقسام الحساب", "More profile sections")} accessibilityState={{ expanded: moreSections }} onPress={() => setMoreSections(v => !v)} style={{ minHeight: 44, flexDirection: ar ? 'row-reverse' : 'row', gap: 3, alignItems: 'center', justifyContent: 'center' }}>
                <Txt numberOfLines={1} style={{ fontSize: 12 }}>{L('المزيد', 'More')}</Txt>
                <Icon name="chevronDown" size={12} color={colors.teal} />
              </Pressable>
            </View>
          </View>
          {moreSections ? <TabRail testID="profile-extra-sections" compact wrap value={tab} items={extraSections.map(section => ({ id: section[0], label: L(section[1], section[2]) }))} onChange={selectSection} /> : null}
          {selectedExtra ? (
            <Txt heading style={styles.subtitle}>
              {L(selectedExtra[1], selectedExtra[2])}
            </Txt>
          ) : null}
          {tab === "posts" ? <CommunityScreen key={p.id} embedded authorId={p.id} userId={userId} recipes={recipes} coffees={coffees} login={login} brew={() => manage("recipes")} browse={() => manage("recipes")} openRecipe={r => openItem("recipe", r.id)} openCoffee={c => openItem(c.kind, c.beanId ?? c.id)} roast={id => openRoast?.(id)} tools={() => manage("equipment")} members={() => setTab("following")} openMember={openMember} shareDirect={shareDirect} /> : null}
          {tab === "equipment" ? (
            <View style={{ gap: 14 }}>
              <View
                testID="profile-collection"
                style={{
                  flexDirection: wide ? (ar ? "row-reverse" : "row") : "column",
                  gap: 14,
                }}
              >
                <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
                  {data.equipment?.map((e) => (
                    <CollectionCard
                      key={e.id}
                      name={
                        ar ? e.name_ar || catalogName(e.name, "ar") : e.name
                      }
                      subtitle={categoryLabel(e.category, locale)}
                      note={e.operation?.[ar ? 0 : 1]}
                      url={e.image_url}
                      status={e.image_usage_status}
                      large={wide}
                      onPress={() => {
                        if (e.equipment_model_id)
                          openItem("equipment", e.equipment_model_id);
                        else if (own) manage("equipment");
                      }}
                      manage={own ? () => manage("equipment") : undefined}
                    />
                  ))}
                  {!data.equipment?.length ? <Empty ar={ar} /> : null}
                </View>
                {wide && data.beans?.[0] ? (
                  <View
                    testID="profile-bean-preview"
                    style={{ flex: 0.62, minWidth: 0, gap: 8 }}
                  >
                    <CollectionCard
                      bean
                      large={width >= 1100}
                      name={
                        ar
                          ? data.beans[0].name_ar ||
                            catalogName(data.beans[0].name_en, "ar")
                          : data.beans[0].name_en || data.beans[0].name_ar
                      }
                      subtitle={L("من أكياس البن", "From my coffee bags")}
                      url={data.beans[0].image_url}
                      status={data.beans[0].image_usage_status}
                      onPress={() =>
                        openItem(data.beans![0].kind, data.beans![0].coffee_id)
                      }
                      manage={own ? () => manage("bags") : undefined}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        L("عرض كل البن", "View all coffee")
                      }
                      onPress={() => selectSection("beans")}
                      style={{ minHeight: 44, justifyContent: "center" }}
                    >
                      <Txt style={{ color: colors.teal, fontSize: 13 }}>
                        {L("عرض كل البن", "View all coffee")}
                      </Txt>
                    </Pressable>
                  </View>
                ) : null}
              </View>
              {own ? (
                <ProfileAction
                  dashed
                  title={L("إضافة معدة", "Add equipment")}
                  icon="plus"
                  onPress={() => manage("equipment")}
                />
              ) : null}
            </View>
          ) : null}
          {tab === "beans" ? (
            <View style={{ gap: 10 }}>
              {data.beans?.map((b) => (
                <CollectionCard
                  key={b.id}
                  bean
                  name={
                    ar
                      ? b.name_ar || catalogName(b.name_en, "ar")
                      : b.name_en || b.name_ar
                  }
                  url={b.image_url}
                  status={b.image_usage_status}
                  large={wide}
                  onPress={() => openItem(b.kind, b.coffee_id)}
                  manage={own ? () => manage("bags") : undefined}
                />
              ))}
              {!data.beans?.length ? <Empty ar={ar} /> : null}
              {own ? (
                <ProfileAction
                  dashed
                  title={L("إدارة أكياسي", "Manage my bags")}
                  icon="bean"
                  onPress={() => manage("bags")}
                />
              ) : null}
            </View>
          ) : null}
          {tab === "recipes" || tab === "favorites" ? (
            <View style={{ gap: 10 }}>
              {own && tab === "recipes" ? (
                <Action
                  title={L("إضافة وصفة", "Add recipe")}
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
                      ? " · " + (L("خاصة", "Private"))
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
                      title={L("صورة استخلاص", "Brew photo")}
                      selected={kind === "extraction"}
                      disabled={locked}
                      onPress={() => setKind("extraction")}
                    />
                    <Action
                      compact
                      title={L("ركن القهوة", "Coffee corner")}
                      selected={kind === "corner"}
                      disabled={locked}
                      onPress={() => setKind("corner")}
                    />
                  </View>
                  <Field
                    label={L("وصف الصورة", "Photo caption")}
                    value={caption}
                    onChangeText={setCaption}
                    maxLength={2000}
                    editable={!locked}
                  />
                  <Action
                    title={L("اختيار صورة", "Choose photo")}
                    disabled={locked || busy}
                    onPress={() => void selectPhoto()}
                  />
                  {photo ? (
                    <>
                      <Image
                        source={{ uri: photo.uri }}
                        accessibilityLabel={
                          L("الصورة المختارة", "Selected photo")
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
                            (L("أملك حق مشاركة الصورة", "I have permission to share the photo"))}
                        </Txt>
                      </Pressable>
                      <Action
                        selected
                        disabled={busy || !rights}
                        title={
                          locked
                            ? L("إعادة حفظ الصورة", "Retry photo")
                            : L("حفظ الصورة", "Save photo")
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
                        ? L("ركن القهوة", "Coffee corner")
                        : L("صورة استخلاص", "Brew photo"))
                    }
                  />
                  <Txt>
                    {p.kind === "corner"
                      ? L("ركن القهوة", "Coffee corner")
                      : L("استخلاص", "Brew")}
                  </Txt>
                  {p.caption ? <Txt>{p.caption}</Txt> : null}
                  {own && userId ? <ProfilePhotoActions owner={userId} photo={p} saved={() => setRevision(n => n + 1)} /> : null}
                </View>
              ))}
              {!data.photos?.length ? <Empty ar={ar} /> : null}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
function ProfileAction({
  title,
  icon,
  onPress,
  selected = false,
  disabled = false,
  dashed = false,
}: {
  title: string;
  icon?: IconName;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  dashed?: boolean;
}) {
  const ar = useContext(Language) === "ar";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: dashed ? 52 : 44,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderStyle: dashed ? "dashed" : "solid",
        borderColor: selected ? colors.teal : colors.line,
        backgroundColor: selected ? colors.teal : colors.paper,
        flexDirection: ar ? "row-reverse" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: disabled || pressed ? 0.55 : 1,
      })}
    >
      {icon ? (
        <Icon
          name={icon}
          size={20}
          color={selected ? "#FFF" : dashed ? colors.teal : colors.ink}
        />
      ) : null}
      <Txt
        style={{
          color: selected ? "#FFF" : dashed ? colors.teal : colors.ink,
          fontWeight: "700",
          fontSize: 14,
          textAlign: "center",
          flexShrink: 1,
        }}
      >
        {title}
      </Txt>
    </Pressable>
  );
}
function ProfileCount({
  count,
  label,
  onPress,
}: {
  count: number;
  label: string;
  onPress: () => void;
}) {
  const ar = useContext(Language) === "ar";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${count} ${label}`}
      onPress={onPress}
      style={{
        minHeight: 44,
        flexDirection: ar ? "row-reverse" : "row",
        gap: 6,
        alignItems: "center",
      }}
    >
      <Txt style={{ fontWeight: "700", writingDirection: "ltr" }}>{count}</Txt>
      <Txt style={styles.muted}>{label}</Txt>
    </Pressable>
  );
}
function CollectionCard({
  name,
  subtitle,
  note,
  url,
  status,
  bean = false,
  large = false,
  onPress,
  manage,
}: {
  name: string;
  subtitle?: string;
  note?: string;
  url?: string | null;
  status?: string | null;
  bean?: boolean;
  large?: boolean;
  onPress: () => void;
  manage?: () => void;
}) {
  const ar = useContext(Language) === "ar";
  const L = useLabels();
  return (
    <View style={[styles.card, { padding: 14, marginBottom: 0, gap: 0 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name}
        onPress={onPress}
        style={{
          minHeight: large ? 168 : 94,
          flexDirection: ar ? "row-reverse" : "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <CollectionPhoto
          name={name}
          url={url}
          status={status}
          bean={bean}
          large={large}
        />
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Txt
            heading
            numberOfLines={3}
            style={{
              fontSize: large ? 20 : 16,
              lineHeight: large ? 28 : 24,
              fontWeight: "700",
            }}
          >
            {name}
          </Txt>
          {subtitle ? <Txt style={styles.muted}>{subtitle}</Txt> : null}
          {note ? <Txt style={styles.muted}>{note}</Txt> : null}
        </View>
      </Pressable>
      {manage ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            bean
              ? L("إدارة أكياسي", "Manage my bags")
              : L("إدارة معداتي", "Manage my equipment")
          }
          onPress={manage}
          style={{
            alignSelf: ar ? "flex-start" : "flex-end",
            minHeight: 44,
            minWidth: 44,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 12,
          }}
        >
          <Icon name="edit" size={18} color={colors.ink} />
        </Pressable>
      ) : null}
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
