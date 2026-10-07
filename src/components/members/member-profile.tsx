"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
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
} from "@/lib/member-social";
import {
  contributionImage,
  uploadContributionImage,
  requireMember,
} from "@/lib/member-contributions";
import { catalogName } from "@/lib/catalog-names";
import { ImageWithFallback } from "@/components/coffee/image-with-fallback";
import { Button } from "@/components/ui/button";
const card = "rounded-2xl border bg-white p-4";
export function MemberDirectory() {
  const ar = useLocale() === "ar";
  const [query, setQuery] = useState(""),
    [rows, setRows] = useState<MemberIdentity[]>([]),
    [offset, setOffset] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [more, setMore] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError(false);
    const timer = setTimeout(() => {
      void memberDirectory(createClient(), query, offset)
        .then((data) => {
          if (active) {
            setRows((old) => (offset ? [...old, ...data] : data));
            setMore(data.length === 24);
          }
        })
        .catch(() => {
          if (active) setError(true);
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
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
      <h1 className="text-2xl font-bold">
        {ar ? "حسابات المجتمع" : "Community accounts"}
      </h1>
      <input
        aria-label={
          ar ? "ابحث بالاسم أو اسم المستخدم" : "Search by name or username"
        }
        placeholder={ar ? "الاسم أو @اسم_المستخدم" : "Name or @username"}
        value={query}
        onChange={(e) => {
          setRows([]);
          setOffset(0);
          setQuery(e.target.value);
        }}
        className="min-h-11 w-full rounded-xl border p-3"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((p) => (
          <MemberLink key={p.id} member={p} />
        ))}
      </div>
      {busy ? (
        <p>{ar ? "جارٍ التحميل…" : "Loading…"}</p>
      ) : error ? (
        <Button onClick={() => setRevision((n) => n + 1)}>
          {ar ? "إعادة تحميل الحسابات" : "Retry accounts"}
        </Button>
      ) : more ? (
        <Button onClick={() => setOffset((n) => n + 24)}>
          {ar ? "حسابات إضافية" : "More accounts"}
        </Button>
      ) : !rows.length ? (
        <p>{ar ? "لا توجد حسابات مطابقة." : "No matching accounts."}</p>
      ) : null}
    </div>
  );
}
function MemberLink({ member }: { member: MemberIdentity }) {
  const ar = useLocale() === "ar";
  return (
    <Link
      className={card + " block min-w-0 space-y-1"}
      href={"/members/" + member.username}
    >
      <p className="break-words font-bold">{member.name}</p>
      <p dir="ltr" className="break-all text-sm">
        @{member.username}
      </p>
      <p className="text-xs">
        {member.is_private
          ? ar
            ? "حساب خاص"
            : "Private account"
          : ar
            ? "حساب عام"
            : "Public account"}
      </p>
    </Link>
  );
}
export function MemberProfilePanel({ username }: { username?: string }) {
  const locale = useLocale() === "ar" ? "ar" : "en",
    ar = locale === "ar",
    router = useRouter();
  const [data, setData] = useState<MemberProfileData | null>(null),
    [owner, setOwner] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [tab, setTab] = useState("equipment"),
    [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
      name: "",
      username: "",
      bio: "",
      is_private: false,
      share_collection: false,
    }),
    [file, setFile] = useState<File | null>(null),
    [kind, setKind] = useState<"extraction" | "corner">("extraction"),
    [caption, setCaption] = useState(""),
    [rights, setRights] = useState(false),
    [locked, setLocked] = useState(false);
  const photoAttempt = useRef<{
    id: string;
    owner: string;
    kind: "extraction" | "corner";
    caption: string;
    path?: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(null);
    setError("");
    const db = createClient();
    void (async () => {
      const { data: auth } = await db.auth.getUser();
      const id = auth.user && !auth.user.is_anonymous ? auth.user.id : null;
      if (active) setOwner(id);
      if (!username && !id) return;
      const handle = username ?? (await ownUsername(db, id!));
      const profile = await memberProfile(db, handle);
      if (active) {
        setData(profile);
        if (profile)
          setDraft({
            name: profile.profile.name,
            username: profile.profile.username,
            bio: profile.profile.bio ?? "",
            is_private: profile.profile.is_private,
            share_collection: profile.profile.share_collection ?? false,
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
  }, [username, revision, ar]);
  async function run(action: () => Promise<void>) {
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
            ? "اسم المستخدم مستخدم. اختر اسمًا آخر."
            : "Username is taken. Choose another."
          : code === "PROFILE_FIELDS"
            ? ar
              ? "تحقق من الاسم؛ اسم المستخدم من ٣ إلى ٣٠ حرفًا إنجليزيًا صغيرًا أو رقمًا أو شرطة سفلية."
              : "Check your name; usernames use 3–30 lowercase letters, numbers or underscores."
            : ar
              ? "تعذّر تأكيد العملية. تحقق من البيانات والاتصال وأعد المحاولة."
              : "Could not confirm the action. Check the details and connection, then retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <p className="p-6">{ar ? "جارٍ تحميل الملف…" : "Loading profile…"}</p>
    );
  if (!data)
    return (
      <div className="space-y-4 p-6">
        <h1>
          {error ||
            (ar ? "لم يُعثر على حساب مسجل." : "Registered account not found.")}
        </h1>
        <Link href="/login">{ar ? "تسجيل الدخول" : "Sign in"}</Link>
        <Button onClick={() => setRevision((n) => n + 1)}>
          {ar ? "إعادة المحاولة" : "Retry"}
        </Button>
      </div>
    );
  const p = data.profile,
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
  const empty = (
    <p className="text-sm text-[var(--color-muted-text)]">
      {ar
        ? "لا توجد عناصر متاحة للعرض في هذا القسم."
        : "No visible items in this section."}
    </p>
  );
  return (
    <div
      className="mx-auto max-w-4xl space-y-5 px-4 py-6"
      data-testid="member-profile"
    >
      <Link href="/members" className="text-sm underline">
        {ar ? "حسابات المجتمع" : "Community accounts"}
      </Link>
      <header className={card + " space-y-3"}>
        <h1 className="break-words text-2xl font-bold">{p.name}</h1>
        <p dir="ltr" className="break-all font-semibold">
          @{p.username}
        </p>
        {p.bio ? (
          <p className="whitespace-pre-wrap break-words">{p.bio}</p>
        ) : null}
        <p>
          {p.is_private
            ? ar
              ? "حساب خاص"
              : "Private account"
            : ar
              ? "حساب عام"
              : "Public account"}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setTab("followers")}
          >
            {data.follower_count} {ar ? "متابع" : "followers"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setTab("following")}
          >
            {data.following_count} {ar ? "أتابع" : "following"}
          </Button>
        </div>
        {own ? (
          <Button onClick={() => setEditing((v) => !v)}>
            {ar ? "تعديل الملف والخصوصية" : "Edit profile and privacy"}
          </Button>
        ) : owner ? (
          <Button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await changeMemberFollow(
                  createClient(),
                  owner,
                  p.id,
                  data.relationship,
                );
                setRevision((n) => n + 1);
              })
            }
          >
            {data.relationship === "accepted"
              ? ar
                ? "إلغاء المتابعة"
                : "Unfollow"
              : data.relationship === "pending"
                ? ar
                  ? "إلغاء طلب المتابعة"
                  : "Cancel follow request"
                : ar
                  ? "متابعة"
                  : "Follow"}
          </Button>
        ) : (
          <Link href="/login">
            {ar ? "سجّل الدخول للمتابعة" : "Sign in to follow"}
          </Link>
        )}
      </header>
      {error ? (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      ) : null}
      {own && editing ? (
        <form
          className={card + " space-y-4"}
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const handle = await updateMemberProfile(
                createClient(),
                owner!,
                draft,
              );
              setEditing(false);
              if (username && username !== handle)
                router.replace("/members/" + handle);
              else setRevision((n) => n + 1);
            });
          }}
        >
          <label className="block">
            {ar ? "الاسم" : "Name"}
            <input
              aria-label={ar ? "الاسم" : "Name"}
              value={draft.name}
              maxLength={100}
              onChange={(e) =>
                setDraft((v) => ({ ...v, name: e.target.value }))
              }
              className="block min-h-11 w-full rounded-xl border p-3"
            />
          </label>
          <label className="block">
            {ar ? "اسم المستخدم" : "Username"}
            <input
              aria-label={ar ? "اسم المستخدم" : "Username"}
              value={draft.username}
              maxLength={30}
              onChange={(e) =>
                setDraft((v) => ({ ...v, username: e.target.value }))
              }
              className="block min-h-11 w-full rounded-xl border p-3"
            />
          </label>
          <label className="block">
            {ar ? "نبذة عني" : "Bio"}
            <textarea
              value={draft.bio}
              maxLength={2000}
              onChange={(e) => setDraft((v) => ({ ...v, bio: e.target.value }))}
              className="block w-full rounded-xl border p-3"
            />
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={draft.is_private}
              onChange={(e) =>
                setDraft((v) => ({ ...v, is_private: e.target.checked }))
              }
            />
            {ar ? "حساب خاص" : "Private account"}
          </label>
          <p className="text-sm">
            {ar
              ? "الاسم واسم المستخدم يظهران في البحث. محتوى الحساب الخاص يظهر للمتابعين المقبولين فقط."
              : "Name and username remain searchable. Private profile content is visible only to approved followers."}
          </p>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={draft.share_collection}
              onChange={(e) =>
                setDraft((v) => ({ ...v, share_collection: e.target.checked }))
              }
            />
            {ar
              ? "عرض معداتي والبن والمفضلة لمن يستطيع مشاهدة ملفي"
              : "Show equipment, coffee and favorites to people who can view my profile"}
          </label>
          <Button disabled={busy} type="submit">
            {ar ? "حفظ الملف" : "Save profile"}
          </Button>
        </form>
      ) : null}
      {own && data.requests?.length ? (
        <section className="space-y-3">
          <h2 className="font-bold">
            {ar ? "طلبات المتابعة" : "Follow requests"}
          </h2>
          {data.requests.map((r) => (
            <div key={r.id} className={card + " space-y-2"}>
              <MemberLink member={r} />
              <div className="flex gap-3">
                <Button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await decideMemberRequest(
                        createClient(),
                        owner!,
                        r.request_id!,
                        true,
                      );
                      setRevision((n) => n + 1);
                    })
                  }
                >
                  {ar ? "قبول" : "Accept"}
                </Button>
                <Button
                  disabled={busy}
                  variant="secondary"
                  onClick={() =>
                    void run(async () => {
                      await decideMemberRequest(
                        createClient(),
                        owner!,
                        r.request_id!,
                        false,
                      );
                      setRevision((n) => n + 1);
                    })
                  }
                >
                  {ar ? "رفض" : "Decline"}
                </Button>
              </div>
            </div>
          ))}
        </section>
      ) : null}
      {!data.can_view ? (
        <p>
          {ar
            ? "هذا الحساب خاص. أرسل طلب متابعة لعرض التفاصيل بعد الموافقة."
            : "This account is private. Request to follow to view details after approval."}
        </p>
      ) : (
        <>
          <nav
            className="flex flex-wrap gap-2"
            aria-label={ar ? "أقسام الملف" : "Profile sections"}
          >
            {sections.map((s) => (
              <Button
                key={s[0]}
                size="sm"
                variant={tab === s[0] ? "default" : "secondary"}
                onClick={() => setTab(s[0])}
              >
                {s[ar ? 1 : 2]}
              </Button>
            ))}
          </nav>
          {tab === "equipment" ? (
            <section className="space-y-3">
              {own ? (
                <Link href="/gear">
                  {ar ? "إدارة معداتي" : "Manage my equipment"}
                </Link>
              ) : null}
              {data.equipment?.map((e) => (
                <div key={e.id} className={card}>
                  <p className="font-bold">
                    {ar ? e.name_ar || catalogName(e.name, "ar") : e.name}
                  </p>
                  <p>
                    {ar
                      ? ({
                          grinder: "طاحونة",
                          espresso_machine: "مكينة إسبريسو",
                          brewer: "أداة تحضير",
                          dripper: "أداة ترشيح",
                          scale: "ميزان",
                          kettle: "إبريق",
                          roaster: "محمصة",
                          other: "أداة أخرى",
                        }[e.category] ?? catalogName(e.category, "ar"))
                      : e.category.replaceAll("_", " ")}
                  </p>
                  {e.operation ? <p>{e.operation[ar ? 0 : 1]}</p> : null}
                  {e.equipment_model_id ? (
                    <Link
                      href={"/equipment/" + e.equipment_model_id}
                      className="text-sm underline"
                    >
                      {ar ? "عرض المعدة" : "View equipment"}
                    </Link>
                  ) : null}
                </div>
              ))}
              {!data.equipment?.length ? empty : null}
            </section>
          ) : null}
          {tab === "beans" ? (
            <section className="space-y-3">
              {own ? (
                <Link href="/gear/beans">
                  {ar ? "إدارة أكياسي" : "Manage my bags"}
                </Link>
              ) : null}
              {data.beans?.map((b) => (
                <div key={b.id} className={card}>
                  {b.kind === "bean" ? (
                    <Link href={"/beans/" + b.slug}>
                      {ar
                        ? b.name_ar || catalogName(b.name_en, "ar")
                        : b.name_en || b.name_ar}
                    </Link>
                  ) : (
                    <p>
                      {ar
                        ? b.name_ar || catalogName(b.name_en, "ar")
                        : b.name_en || b.name_ar}
                    </p>
                  )}
                </div>
              ))}
              {!data.beans?.length ? empty : null}
            </section>
          ) : null}
          {tab === "recipes" || tab === "favorites" ? (
            <section className="space-y-3">
              {own && tab === "recipes" ? (
                <Link href="/recipes/create">
                  {ar ? "إضافة وصفة" : "Add recipe"}
                </Link>
              ) : null}
              {(tab === "recipes" ? data.recipes : data.favorites)?.map((r) => (
                <Link
                  key={r.id}
                  className={card + " block"}
                  href={"/recipes/" + r.id}
                >
                  {ar ? r.title_ar || catalogName(r.title, "ar") : r.title}
                  {r.visibility && r.visibility !== "public" ? (
                    <span className="mx-2 text-xs">
                      {ar ? "خاصة" : "Private"}
                    </span>
                  ) : null}
                </Link>
              ))}
              {!(tab === "recipes" ? data.recipes : data.favorites)?.length
                ? empty
                : null}
            </section>
          ) : null}
          {tab === "comments" ? (
            <section className="space-y-3">
              {data.comments?.map((c) => (
                <div key={c.kind + c.id} className={card}>
                  <p className="whitespace-pre-wrap break-words">{c.body}</p>
                  <p className="mt-2 text-sm">
                    {ar
                      ? c.name_ar || catalogName(c.name_en, "ar")
                      : c.name_en || c.name_ar}
                  </p>
                  {c.kind === "recipe" ? (
                    <Link
                      href={"/recipes/" + c.target_id}
                      className="text-sm underline"
                    >
                      {ar ? "عرض الوصفة" : "View recipe"}
                    </Link>
                  ) : null}
                </div>
              ))}
              {!data.comments?.length ? empty : null}
            </section>
          ) : null}
          {tab === "followers" || tab === "following" ? (
            <section className="grid gap-3 sm:grid-cols-2">
              {(tab === "followers" ? data.followers : data.following)?.map(
                (m) => (
                  <MemberLink key={m.id} member={m} />
                ),
              )}
              {!(tab === "followers" ? data.followers : data.following)?.length
                ? empty
                : null}
            </section>
          ) : null}
          {tab === "photos" ? (
            <section className="space-y-4">
              {own ? (
                <form
                  className={card + " space-y-4"}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      if (!file || !rights) return;
                      const db = createClient();
                      if (!photoAttempt.current) {
                        contributionImage(
                          new Uint8Array(await file.arrayBuffer()),
                        );
                        await requireMember(db, owner!);
                        photoAttempt.current = {
                          id: crypto.randomUUID(),
                          owner: owner!,
                          kind,
                          caption,
                        };
                        setLocked(true);
                      }
                      const a = photoAttempt.current;
                      if (!a.path)
                        a.path = await uploadContributionImage(
                          db,
                          a.owner,
                          a.id,
                          new Uint8Array(await file.arrayBuffer()),
                          "profile-gallery",
                        );
                      await saveProfilePhoto(
                        db,
                        a.owner,
                        a.id,
                        a.kind,
                        a.path,
                        a.caption,
                      );
                      photoAttempt.current = null;
                      setFile(null);
                      setCaption("");
                      setRights(false);
                      setLocked(false);
                      setRevision((n) => n + 1);
                    });
                  }}
                >
                  <fieldset disabled={locked || busy} className="space-y-3">
                    <select
                      aria-label={ar ? "نوع الصورة" : "Photo type"}
                      value={kind}
                      onChange={(e) => setKind(e.target.value as typeof kind)}
                      className="min-h-11 w-full rounded-xl border p-3"
                    >
                      <option value="extraction">
                        {ar ? "صورة استخلاص" : "Brew photo"}
                      </option>
                      <option value="corner">
                        {ar ? "ركن القهوة" : "Coffee corner"}
                      </option>
                    </select>
                    <input
                      aria-label={ar ? "وصف الصورة" : "Photo caption"}
                      value={caption}
                      maxLength={2000}
                      onChange={(e) => setCaption(e.target.value)}
                      className="min-h-11 w-full rounded-xl border p-3"
                    />
                    <input
                      aria-label={ar ? "اختيار صورة" : "Choose photo"}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        setFile(e.target.files?.[0] ?? null);
                        setRights(false);
                      }}
                      className="block w-full min-w-0"
                    />
                    <label className="flex min-h-11 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={rights}
                        onChange={(e) => setRights(e.target.checked)}
                      />
                      {ar
                        ? "أملك حق مشاركة الصورة"
                        : "I have permission to share the photo"}
                    </label>
                  </fieldset>
                  <Button type="submit" disabled={busy || !rights || !file}>
                    {locked
                      ? ar
                        ? "إعادة حفظ الصورة"
                        : "Retry photo"
                      : ar
                        ? "حفظ الصورة"
                        : "Save photo"}
                  </Button>
                </form>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                {data.photos?.map((p) => (
                  <figure key={p.id} className={card + " space-y-2"}>
                    <div className="relative h-60 overflow-hidden rounded-xl">
                      <ImageWithFallback
                        src={p.image_url}
                        alt={p.caption || (ar ? "صورة قهوة" : "Coffee photo")}
                        fallbackSeed={p.id}
                        fill
                      />
                    </div>
                    <figcaption className="break-words">
                      {p.kind === "corner"
                        ? ar
                          ? "ركن القهوة"
                          : "Coffee corner"
                        : ar
                          ? "استخلاص"
                          : "Brew"}
                      {p.caption ? " · " + p.caption : ""}
                    </figcaption>
                  </figure>
                ))}
              </div>
              {!data.photos?.length ? empty : null}
            </section>
          ) : null}
          <p className="text-xs text-[var(--color-muted-text)]">
            {ar
              ? "تعرض الأقسام أحدث ١٠٠ عنصر متاح للعرض."
              : "Sections show the latest 100 visible items."}
          </p>
        </>
      )}
    </div>
  );
}
